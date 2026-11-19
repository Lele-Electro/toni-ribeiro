import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ReviewPlayer } from './review-audio';
import { HttpErrorResponse } from '@angular/common/http';
import { PublishedReview } from '../../../core/voice-reviews/voice-reviews.service';
import { ReviewStore } from './review-store';
import { VoiceRecorder } from './voice-recorder';

class FakeRecorder {
  static created: FakeRecorder[] = [];
  static isTypeSupported = (type: string) => type === 'audio/webm;codecs=opus';
  state = 'inactive';
  mimeType: string;
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  onerror?: () => void;
  constructor(_stream: unknown, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType ?? '';
    FakeRecorder.created.push(this);
  }
  start(): void {
    this.state = 'recording';
  }
  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['voice'], { type: this.mimeType }) });
    this.onstop?.();
  }
}

describe('VoiceRecorder', () => {
  let fixture: ComponentFixture<VoiceRecorder>;
  let element: HTMLElement;
  let clock: number;
  const micTrack = { stop: vi.fn() };
  const getUserMedia = vi.fn();
  const user = signal<{ userId: string; name: string; surname?: string } | null>(null);
  const mine = signal<PublishedReview | null>(null);
  const published = (duration: number): PublishedReview => ({
    id: 'review-1',
    name: 'Naledi M.',
    initials: 'NM',
    duration,
    peaks: [0.5],
    revision: 1,
    createdAt: '2026-11-19T10:00:00.000Z',
    updatedAt: '2026-11-19T10:00:00.000Z',
  });
  /** Stands in for the backend: publishing makes the review the member's own. */
  const store = {
    mine,
    publish: vi.fn(async (_audio: Blob, duration: number) => {
      mine.set(published(duration));
      return mine()!;
    }),
    remove: vi.fn(async () => mine.set(null)),
  };
  const naledi = { userId: 'rider-1', name: 'Naledi', surname: 'Mokoena' };

  const button = (text: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === text,
    )!;
  const settle = async () => {
    for (let i = 0; i < 3; i++) await fixture.whenStable();
  };
  /** Records for `seconds` of the mocked clock and returns once the preview is ready. */
  const record = async (seconds: number) => {
    (element.querySelector<HTMLButtonElement>('.btn--record') ?? button('Record again')).click();
    await settle();
    clock += seconds * 1000;
    button('Stop recording').click();
    await settle();
  };

  beforeEach(async () => {
    FakeRecorder.created = [];
    clock = 1000;
    user.set(naledi);
    mine.set(null);
    store.publish.mockClear();
    store.remove.mockClear();
    micTrack.stop.mockClear();
    getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [micTrack] });
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();

    TestBed.configureTestingModule({
      imports: [VoiceRecorder],
      providers: [
        provideRouter([]),
        ReviewPlayer,
        { provide: ReviewStore, useValue: store },
        { provide: AuthService, useValue: { user, isAuthenticated: () => user() !== null } },
      ],
    });
    fixture = TestBed.createComponent(VoiceRecorder);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('asks signed-out visitors to sign in, returning them to the reviews', async () => {
    user.set(null);
    await settle();
    expect(element.querySelector('button.btn--record')).toBeNull();
    const link = element.querySelector<HTMLAnchorElement>('a.btn')!;
    expect(link.textContent).toContain('Sign in to record a review');
    expect(decodeURIComponent(link.getAttribute('href')!)).toBe(
      '/login?returnUrl=/lift-club?reviews=1',
    );
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('discards the take and frees the microphone when the member signs out', async () => {
    button('Record a voice review').click();
    await settle();
    clock += 2000;
    user.set(null);
    await settle();
    expect(micTrack.stop).toHaveBeenCalled();
    expect(element.querySelector('.rec, .preview')).toBeNull();
    expect(element.querySelector('a.btn')!.textContent).toContain('Sign in');
  });

  it('explains a blocked microphone and offers to try again', async () => {
    getUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    button('Record a voice review').click();
    await settle();

    const problem = element.querySelector('.problem')!;
    expect(problem.getAttribute('role')).toBe('alert');
    expect(problem.textContent).toContain('Microphone access is blocked');
    expect(button('Try again')).toBeTruthy();
    expect(FakeRecorder.created).toHaveLength(0);
  });

  it('says so when the browser cannot record', async () => {
    vi.stubGlobal('MediaRecorder', undefined);
    button('Record a voice review').click();
    await settle();
    expect(element.querySelector('.problem')!.textContent).toContain('can’t record audio');
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('records, previews, records again and confirms', async () => {
    await record(2.5);
    expect(micTrack.stop).toHaveBeenCalled();
    expect(element.querySelector('.preview__time')!.textContent).toContain('0:02');
    expect(element.querySelector('[role="status"]')!.textContent).toContain('Recorded 0:02');

    await record(1.2);
    expect(FakeRecorder.created).toHaveLength(2);
    expect(element.querySelector('.preview__time')!.textContent).toContain('0:01');

    // Before publishing, the member is told it will be public and under what name.
    expect(element.querySelector('.preview .note')!.textContent).toContain('everyone visiting this page');
    expect(element.querySelector('.preview .note strong')!.textContent).toBe('Naledi M.');
    expect(element.querySelector('.preview .note')!.textContent).not.toContain('M..');

    button('Confirm review').click();
    await settle();
    expect(store.publish).toHaveBeenCalledTimes(1);
    const [audio, duration] = store.publish.mock.calls[0];
    expect(audio.type).toBe('audio/webm;codecs=opus');
    expect(duration).toBeCloseTo(1.2);
    expect(element.querySelector('.done__title')!.textContent).toContain('Your review is live');
    expect(element.querySelector('.done .note')!.textContent).toContain('Everyone who visits this page');
    expect(element.querySelector('.done .note')!.textContent).toMatch(/Naledi M\. You can/);
  });

  it('keeps the take and explains when the upload fails', async () => {
    store.publish.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));
    await record(2);
    button('Confirm review').click();
    await settle();
    expect(element.querySelector('.preview')).toBeTruthy();
    expect(element.querySelector('.problem')!.getAttribute('role')).toBe('alert');
    expect(button('Confirm review').disabled).toBe(false);

    button('Confirm review').click();
    await settle();
    expect(store.publish).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.done')).toBeTruthy();
  });

  it('asks before deleting a published review', async () => {
    mine.set(published(5));
    await settle();
    button('Delete it').click();
    await settle();
    expect(store.remove).not.toHaveBeenCalled();
    expect(element.querySelector('.actions__question')!.textContent).toContain('Delete your review');
    button('Yes, delete').click();
    await settle();
    expect(store.remove).toHaveBeenCalledTimes(1);
    expect(button('Record a voice review')).toBeTruthy();
  });

  it('rejects a recording too short to contain anything', async () => {
    await record(0.1);
    expect(element.querySelector('.problem')!.textContent).toContain('didn’t capture any sound');
  });

  it('stops the microphone and keeps the take when the card turns back to booking', async () => {
    button('Record a voice review').click();
    await settle();
    clock += 3000;
    fixture.componentRef.setInput('active', false);
    await settle();
    expect(micTrack.stop).toHaveBeenCalled();
    expect(element.querySelector('.preview')).toBeTruthy();
  });
});
