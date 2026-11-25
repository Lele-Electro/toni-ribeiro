import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ReviewPlayer, ReviewTrack, analyseRecording, envelope, formatTime } from './review-audio';
import { httpErrorMessage } from '../../../core/http-error-message';
import { publicName } from '../../../core/voice-reviews/voice-reviews.service';
import { ReviewStore } from './review-store';
import { ReviewWaveform } from './review-waveform';

type RecorderState =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'processing'
  | 'preview'
  | 'saving'
  | 'confirmed'
  | 'error';

type Problem = 'denied' | 'missing' | 'busy' | 'unsupported' | 'insecure' | 'empty' | 'failed';

export const MAX_SECONDS = 60;
const METER_BARS = 28;
/** The first type each browser supports is used: Opus in WebM (Chrome, Firefox), AAC in MP4 (Safari). */
const TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];

const PROBLEMS: Record<Problem, string> = {
  denied:
    'Microphone access is blocked, so we can’t record. Allow the microphone for this site in your browser’s settings, then try again.',
  missing: 'No microphone was found. Connect one, then try again.',
  busy: 'Your microphone is in use by another app. Close that app, then try again.',
  unsupported:
    'This browser can’t record audio. Please try a recent version of Chrome, Safari, Firefox or Edge.',
  insecure: 'Recording needs a secure (https) connection to this site.',
  empty: 'That recording didn’t capture any sound. Please try again.',
  failed: 'Recording stopped unexpectedly. Please try again.',
};

const problemFor = (error: unknown): Problem => {
  switch ((error as DOMException)?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PermissionDeniedError':
      return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
    case 'DevicesNotFoundError':
      return 'missing';
    case 'NotReadableError':
    case 'AbortError':
    case 'TrackStartError':
      return 'busy';
    default:
      return 'failed';
  }
};

interface Session {
  stream: MediaStream;
  recorder: MediaRecorder;
  context?: AudioContext;
  analyser?: AnalyserNode;
  started: number;
  seconds: number;
  /** Every meter reading, kept in case the browser can't decode the finished recording. */
  levels: number[];
  /** Thrown away when stopped, rather than offered as a preview. */
  discarded?: boolean;
}

/** Where sign-in returns to: this page with the reviews face showing (see LiftClub). */
export const REVIEWS_RETURN_URL = '/reviews';

/**
 * Records, previews and publishes the member's voice review. Only signed-in members can
 * record, so every review belongs to an account. Confirming uploads it through
 * ReviewStore, and from then on everyone visiting the page can hear it.
 */
@Component({
  selector: 'app-voice-recorder',
  imports: [ReviewWaveform, RouterLink],
  templateUrl: './voice-recorder.html',
  styleUrl: './voice-recorder.scss',
})
export class VoiceRecorder {
  /** False while the review face is turned away: recording stops and keeps what it has. */
  readonly active = input(true);

  protected readonly player = inject(ReviewPlayer);
  protected readonly store = inject(ReviewStore);
  protected readonly auth = inject(AuthService);
  /** How the review will be credited: "Naledi M.". */
  protected readonly publicName = computed(() => publicName(this.auth.user()));
  protected readonly signInQuery = { returnUrl: REVIEWS_RETURN_URL };
  private readonly injector = inject(Injector);
  private readonly recordButton = viewChild<ElementRef<HTMLButtonElement>>('recordButton');
  private readonly doneTitle = viewChild<ElementRef<HTMLElement>>('doneTitle');

  protected readonly state = signal<RecorderState>('idle');
  protected readonly problem = signal<Problem | null>(null);
  protected readonly elapsed = signal(0);
  protected readonly levels = signal<number[]>(Array(METER_BARS).fill(0.06));
  protected readonly preview = signal<ReviewTrack | null>(null);
  /** Announced to screen readers at each step. */
  protected readonly status = signal('');
  /** A failed upload or deletion. */
  protected readonly sendError = signal('');
  /** "Delete it" asks once more, because a published review is gone for good. */
  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);
  /** What the panel shows: a published review replaces the plain record button. */
  protected readonly view = computed(() =>
    this.state() === 'idle' && this.store.mine() ? 'confirmed' : this.state(),
  );
  protected readonly message = computed(() => {
    const problem = this.problem();
    return problem ? PROBLEMS[problem] : '';
  });
  protected readonly limit = formatTime(MAX_SECONDS);
  protected readonly formatTime = formatTime;
  /** Ends a sentence after a name, unless the name already ends in one ("Naledi M."). */
  protected fullStop(name: string): string {
    return name.endsWith('.') ? '' : '.';
  }

  private session?: Session;
  private previewBlob?: Blob;
  private frame = 0;
  private limitTimer?: ReturnType<typeof setTimeout>;
  private lastReading = 0;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.endSession();
      const preview = this.preview();
      if (preview) URL.revokeObjectURL(preview.src);
    });
    // Turning back to the booking side never leaves the microphone on.
    effect(() => {
      if (this.active()) return;
      untracked(() => {
        if (this.state() === 'recording') this.stop();
        else if (this.state() === 'starting') this.state.set('idle');
      });
    });
    // Signing out (or the session expiring) mid-way discards the take: a review belongs
    // to the account that recorded it.
    let account: string | null | undefined;
    effect(() => {
      const userId = this.auth.user()?.userId ?? null;
      untracked(() => {
        if (account !== undefined && userId !== account) this.reset();
        account = userId;
      });
    });
  }

  async start(): Promise<void> {
    if (!this.auth.isAuthenticated()) return;
    if (this.state() === 'starting' || this.state() === 'recording') return;
    this.discardPreview();
    this.problem.set(null);
    this.sendError.set('');
    this.confirmingDelete.set(false);
    const media = globalThis.navigator?.mediaDevices;
    if (!media?.getUserMedia || typeof MediaRecorder === 'undefined') {
      return this.fail(globalThis.isSecureContext === false ? 'insecure' : 'unsupported');
    }
    this.player.pause();
    this.state.set('starting');
    this.status.set('Waiting for microphone access.');
    // Created during the click, which Safari requires before it lets audio run.
    const context = this.createContext();

    let stream: MediaStream;
    try {
      stream = await media.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      void context?.close();
      return this.fail(problemFor(error));
    }
    if (this.destroyed || this.state() !== 'starting') {
      // The member turned away while the browser was asking.
      stream.getTracks().forEach((track) => track.stop());
      void context?.close();
      return;
    }

    const type = TYPES.find((candidate) => MediaRecorder.isTypeSupported?.(candidate));
    let recorder: MediaRecorder;
    try {
      // 64 kbps keeps a minute of speech near half a megabyte for the upload.
      recorder = new MediaRecorder(stream, { ...(type && { mimeType: type }), audioBitsPerSecond: 64000 });
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      void context?.close();
      return this.fail('unsupported');
    }
    const chunks: Blob[] = [];
    const session: Session = { stream, recorder, context, started: 0, seconds: 0, levels: [] };
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () =>
      void this.finish(session, new Blob(chunks, { type: recorder.mimeType || type || '' }));
    recorder.onerror = () => {
      if (this.session === session) this.stop();
    };
    if (context) {
      try {
        session.analyser = context.createAnalyser();
        session.analyser.fftSize = 1024;
        context.createMediaStreamSource(stream).connect(session.analyser);
        void context.resume();
      } catch {
        session.analyser = undefined; // The meter stays flat; recording still works.
      }
    }

    this.session = session;
    recorder.start(250);
    session.started = performance.now();
    this.elapsed.set(0);
    this.levels.set(Array(METER_BARS).fill(0.06));
    this.state.set('recording');
    this.status.set('Recording. Press Stop when you have finished.');
    this.limitTimer = setTimeout(() => this.stop(true), MAX_SECONDS * 1000);
    this.track();
  }

  stop(limitReached = false): void {
    const session = this.session;
    if (!session || this.state() !== 'recording') return;
    session.seconds = (performance.now() - session.started) / 1000;
    this.state.set('processing');
    this.status.set(
      limitReached ? 'Recording stopped at the one-minute limit.' : 'Recording stopped.',
    );
    this.endSession();
  }

  /** Publishes the take. If the upload fails, the take stays so the member can retry. */
  protected async confirm(): Promise<void> {
    const preview = this.preview();
    const blob = this.previewBlob;
    if (!preview || !blob || this.state() !== 'preview') return;
    this.state.set('saving');
    this.sendError.set('');
    this.player.pause();
    try {
      await this.store.publish(blob, preview.duration, preview.peaks);
    } catch (error) {
      if (this.state() !== 'saving') return; // Signed out meanwhile: the take is gone.
      this.state.set('preview');
      this.sendError.set(
        httpErrorMessage(error, 'Your review couldn’t be sent. Check your connection and try again.'),
      );
      return;
    }
    this.discardPreview();
    this.state.set('confirmed');
    this.status.set('Your review is live on this page.');
    this.focusAfterRender(() => this.doneTitle()?.nativeElement);
  }

  protected async remove(): Promise<void> {
    if (this.deleting()) return;
    this.deleting.set(true);
    this.sendError.set('');
    const id = this.store.mine()?.id;
    if (id) this.player.release(id);
    try {
      await this.store.remove();
      this.state.set('idle');
      this.status.set('Your review was deleted. It is no longer on this page.');
      this.focusAfterRender(() => this.recordButton()?.nativeElement);
    } catch (error) {
      this.sendError.set(httpErrorMessage(error, 'Your review couldn’t be deleted. Please try again.'));
    } finally {
      this.deleting.set(false);
      this.confirmingDelete.set(false);
    }
  }

  private async finish(session: Session, blob: Blob): Promise<void> {
    if (this.destroyed || session.discarded) return;
    if (!blob.size || session.seconds < 0.4) return this.fail('empty');
    const analysis = await analyseRecording(blob);
    if (this.destroyed || session.discarded) return;
    // MediaRecorder files often report no length, so prefer the decoded one, then our clock.
    const duration =
      analysis && Number.isFinite(analysis.duration) && analysis.duration > 0
        ? analysis.duration
        : session.seconds;
    this.previewBlob = blob;
    this.preview.set({
      id: `preview-${Date.now()}`,
      name: 'your recording',
      src: URL.createObjectURL(blob),
      duration,
      peaks: analysis?.peaks ?? envelope(session.levels),
    });
    this.state.set('preview');
    this.status.set(
      `Recorded ${formatTime(duration)}. Play it back, then confirm it or record again.`,
    );
  }

  /** Back to the start: microphone off, any take thrown away. */
  private reset(): void {
    if (this.session) this.session.discarded = true;
    this.endSession();
    this.discardPreview();
    this.problem.set(null);
    this.sendError.set('');
    this.confirmingDelete.set(false);
    this.state.set('idle');
    this.status.set('');
  }

  private fail(problem: Problem): void {
    this.problem.set(problem);
    this.state.set('error');
    this.status.set('');
  }

  private discardPreview(): void {
    const preview = this.preview();
    if (!preview) return;
    this.player.release(preview.id);
    URL.revokeObjectURL(preview.src);
    this.preview.set(null);
    this.previewBlob = undefined;
  }

  /** Stops the recorder, the microphone and the meter. The recorder then calls finish(). */
  private endSession(): void {
    const session = this.session;
    this.session = undefined;
    cancelAnimationFrame(this.frame);
    clearTimeout(this.limitTimer);
    if (!session) return;
    if (session.recorder.state !== 'inactive') session.recorder.stop();
    session.stream.getTracks().forEach((track) => track.stop());
    void session.context?.close().catch(() => undefined);
  }

  private createContext(): AudioContext | undefined {
    const Context =
      globalThis.AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    try {
      return Context ? new Context() : undefined;
    } catch {
      return undefined;
    }
  }

  /** Updates the timer every frame and the level meter about 16 times a second. */
  private track(): void {
    const samples = new Float32Array(1024);
    const step = (now: number) => {
      const session = this.session;
      if (!session || this.state() !== 'recording') return;
      this.elapsed.set(Math.min(MAX_SECONDS, (now - session.started) / 1000));
      if (session.analyser && now - this.lastReading > 60) {
        this.lastReading = now;
        session.analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += sample * sample;
        const level = Math.min(1, Math.max(0.06, (Math.sqrt(sum / samples.length) * 6) ** 0.7));
        session.levels.push(level);
        this.levels.update((levels) => [...levels.slice(1), level]);
      }
      this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  private focusAfterRender(target: () => HTMLElement | undefined): void {
    afterNextRender(() => target()?.focus(), { injector: this.injector });
  }
}
