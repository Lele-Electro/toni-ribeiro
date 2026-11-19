import { Injectable, OnDestroy, signal } from '@angular/core';

/** Anything the review panel can play: a published review or the member's own recording. */
export interface ReviewTrack {
  id: string;
  /** Used in labels, as in "Play review from Thandiwe M.". */
  name: string;
  src: string;
  /** Seconds. Supplied up front because recordings from MediaRecorder report no duration. */
  duration: number;
  /** Loudness envelope, 0–1, drawn as the waveform. */
  peaks: readonly number[];
}

/** 0:07, 1:00 */
export const formatTime = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/** Number of loudness values kept per recording; the waveform resamples them to its width. */
export const ENVELOPE_SIZE = 96;

/**
 * Reduces audio samples (or a list of meter readings) to `size` loudness values between
 * 0 and 1. Quiet stretches keep a sliver of height so the waveform never breaks apart.
 */
export function envelope(samples: ArrayLike<number>, size = ENVELOPE_SIZE): number[] {
  if (!samples.length) return Array<number>(size).fill(0.06);
  const raw: number[] = [];
  const per = samples.length / size;
  for (let bin = 0; bin < size; bin++) {
    const start = Math.floor(bin * per);
    const end = Math.max(start + 1, Math.floor((bin + 1) * per));
    let sum = 0;
    for (let i = start; i < end && i < samples.length; i++) sum += samples[i] * samples[i];
    raw.push(Math.sqrt(sum / (end - start)));
  }
  const loudest = Math.max(...raw) || 1;
  return raw.map((value) => Math.round(Math.max(0.06, (value / loudest) ** 0.7) * 100) / 100);
}

/** Resamples an envelope to `count` bars, keeping the loudest value in each group. */
export function bars(peaks: readonly number[], count: number): number[] {
  if (!peaks.length) return Array<number>(count).fill(0.06);
  return Array.from({ length: count }, (_, bar) => {
    const start = Math.floor((bar * peaks.length) / count);
    const end = Math.max(start + 1, Math.floor(((bar + 1) * peaks.length) / count));
    return Math.max(...peaks.slice(start, end));
  });
}

/** Decodes a recording to measure its true length and loudness. Resolves null if it can't. */
export async function analyseRecording(
  blob: Blob,
): Promise<{ duration: number; peaks: number[] } | null> {
  try {
    const Context = globalThis.OfflineAudioContext;
    if (!Context) return null;
    const audio = await new Context(1, 1, 44100).decodeAudioData(await blob.arrayBuffer());
    return { duration: audio.duration, peaks: envelope(audio.getChannelData(0)) };
  } catch {
    return null;
  }
}

/**
 * One audio element for the whole review panel, so only one review (or the member's own
 * preview) plays at a time. Provided by VoiceReviews and shared with its recorder.
 */
@Injectable()
export class ReviewPlayer implements OnDestroy {
  /** The track loaded into the player, playing or paused. */
  readonly activeId = signal<string | null>(null);
  /** True from the moment play is requested until it pauses, ends or fails. */
  readonly playing = signal(false);
  /** True while the browser is still fetching enough audio to start or continue. */
  readonly buffering = signal(false);
  /** Seconds into the active track. */
  readonly position = signal(0);
  /** The track that last failed to load. */
  readonly failedId = signal<string | null>(null);

  private audio?: HTMLAudioElement;
  private frame = 0;

  isPlaying(id: string): boolean {
    return this.playing() && this.activeId() === id;
  }

  progress(track: ReviewTrack): number {
    if (this.activeId() !== track.id || !track.duration) return 0;
    return Math.min(1, this.position() / track.duration);
  }

  /**
   * Like a WhatsApp voice note: the length until the track is started, then the position.
   * Short enough to stay beside the name on a phone; the seek slider announces both.
   */
  time(track: ReviewTrack): string {
    const started = this.activeId() === track.id && (this.playing() || this.position() > 0);
    return formatTime(started ? this.progress(track) * track.duration : track.duration);
  }

  toggle(track: ReviewTrack): void {
    if (this.isPlaying(track.id)) this.pause();
    else this.play(track);
  }

  play(track: ReviewTrack): void {
    const audio = this.load(track);
    this.failedId.set(null);
    this.playing.set(true);
    // A finished track starts again from the beginning.
    if (audio.ended) audio.currentTime = 0;
    audio.play()?.catch((error: unknown) => {
      // AbortError: a newer request (pause or another track) replaced this one.
      if ((error as DOMException)?.name !== 'AbortError') this.fail(track.id);
    });
  }

  pause(): void {
    this.audio?.pause();
    this.playing.set(false);
    this.buffering.set(false);
  }

  /** Moves to a point in a track (0–1) without starting it. */
  seek(track: ReviewTrack, fraction: number): void {
    const audio = this.load(track);
    const seconds = Math.min(Math.max(fraction, 0), 1) * track.duration;
    audio.currentTime = seconds;
    this.position.set(seconds);
  }

  /** Pauses and unloads, for example when a preview is discarded. */
  release(id?: string): void {
    if (id && this.activeId() !== id) return;
    this.pause();
    this.audio?.removeAttribute('src');
    this.audio?.load();
    this.activeId.set(null);
    this.position.set(0);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.release();
  }

  private load(track: ReviewTrack): HTMLAudioElement {
    const audio = (this.audio ??= this.create());
    if (this.activeId() !== track.id) {
      audio.pause();
      audio.src = track.src;
      this.activeId.set(track.id);
      this.position.set(0);
    }
    return audio;
  }

  private create(): HTMLAudioElement {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('playing', () => {
      this.buffering.set(false);
      this.tick();
    });
    audio.addEventListener('waiting', () => this.buffering.set(true));
    audio.addEventListener('loadstart', () => this.buffering.set(this.playing()));
    audio.addEventListener('pause', () => {
      this.playing.set(false);
      this.buffering.set(false);
    });
    audio.addEventListener('ended', () => {
      this.playing.set(false);
      this.position.set(0);
    });
    audio.addEventListener('error', () => {
      const id = this.activeId();
      if (id && audio.getAttribute('src')) this.fail(id);
    });
    return audio;
  }

  /** Follows the playhead once per frame, so the waveform fills smoothly. */
  private tick(): void {
    cancelAnimationFrame(this.frame);
    const step = () => {
      const audio = this.audio;
      if (!audio || audio.paused) return;
      this.position.set(audio.currentTime);
      this.frame = requestAnimationFrame(step);
    };
    step();
  }

  private fail(id: string): void {
    this.failedId.set(id);
    this.playing.set(false);
    this.buffering.set(false);
  }
}
