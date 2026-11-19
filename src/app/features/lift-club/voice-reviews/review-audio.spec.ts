import { TestBed } from '@angular/core/testing';
import { ReviewPlayer, ReviewTrack, bars, envelope, formatTime } from './review-audio';

/** Just enough of HTMLAudioElement for ReviewPlayer. */
class FakeAudio extends EventTarget {
  static created: FakeAudio[] = [];
  src = '';
  preload = '';
  currentTime = 0;
  paused = true;
  ended = false;
  constructor() {
    super();
    FakeAudio.created.push(this);
  }
  play(): Promise<void> {
    this.paused = false;
    this.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  }
  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
  load(): void {}
  getAttribute(name: string): string | null {
    return name === 'src' && this.src ? this.src : null;
  }
  removeAttribute(): void {
    this.src = '';
  }
}

const track = (id: string, duration = 10): ReviewTrack => ({
  id,
  name: id,
  src: `reviews/${id}.m4a`,
  duration,
  peaks: [0.5, 1],
});

describe('review audio helpers', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9.6)).toBe('0:09');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(75.2)).toBe('1:15');
  });

  it('reduces samples to a normalised envelope with a floor for silence', () => {
    const samples = [...Array(50).fill(0), ...Array(50).fill(0.5)];
    const values = envelope(samples, 4);
    expect(values).toEqual([0.06, 0.06, 1, 1]);
    expect(envelope([], 3)).toEqual([0.06, 0.06, 0.06]);
  });

  it('resamples an envelope to the bar count, keeping each group’s peak', () => {
    expect(bars([0.1, 0.9, 0.2, 0.4], 2)).toEqual([0.9, 0.4]);
    expect(bars([0.3, 0.7], 4)).toEqual([0.3, 0.3, 0.7, 0.7]);
  });
});

describe('ReviewPlayer', () => {
  let player: ReviewPlayer;

  beforeEach(() => {
    FakeAudio.created = [];
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('requestAnimationFrame', () => 0);
    TestBed.configureTestingModule({ providers: [ReviewPlayer] });
    player = TestBed.inject(ReviewPlayer);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('plays one track at a time through a single audio element', () => {
    const first = track('first');
    const second = track('second');
    player.toggle(first);
    expect(player.isPlaying('first')).toBe(true);

    player.toggle(second);
    expect(FakeAudio.created).toHaveLength(1);
    expect(FakeAudio.created[0].src).toBe('reviews/second.m4a');
    expect(player.isPlaying('first')).toBe(false);
    expect(player.isPlaying('second')).toBe(true);

    player.toggle(second);
    expect(player.playing()).toBe(false);
    expect(player.activeId()).toBe('second');
  });

  it('reports progress and time for the active track only', () => {
    const first = track('first', 8);
    expect(player.time(first)).toBe('0:08');
    player.seek(first, 0.5);
    expect(FakeAudio.created[0].currentTime).toBe(4);
    expect(player.progress(first)).toBe(0.5);
    expect(player.time(first)).toBe('0:04');
    expect(player.progress(track('other'))).toBe(0);

    // Finished: back to showing the length, like a voice note.
    FakeAudio.created[0].dispatchEvent(new Event('ended'));
    expect(player.time(first)).toBe('0:08');
  });

  it('marks a track that fails to load', () => {
    const first = track('first');
    player.play(first);
    FakeAudio.created[0].dispatchEvent(new Event('error'));
    expect(player.failedId()).toBe('first');
    expect(player.playing()).toBe(false);
  });

  it('releases the active track', () => {
    const first = track('first');
    player.play(first);
    player.release('other');
    expect(player.activeId()).toBe('first');
    player.release('first');
    expect(player.activeId()).toBeNull();
    expect(FakeAudio.created[0].src).toBe('');
  });
});
