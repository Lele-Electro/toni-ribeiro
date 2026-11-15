import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalogClock } from './analog-clock';

describe('AnalogClock', () => {
  let fixture: ComponentFixture<AnalogClock>;

  // Fake timers also hold back Angular's own scheduler, so let it run explicitly.
  const stable = async () => {
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
  };
  const reducedMotion = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const rotation = (selector: string) =>
    Number(
      /rotate\(([\d.]+)/.exec(
        fixture.nativeElement.querySelector(selector)?.getAttribute('transform') ?? '',
      )?.[1],
    );

  const create = async () => {
    fixture = TestBed.createComponent(AnalogClock);
    await stable();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // 10:15:30.400 local time.
    vi.setSystemTime(new Date(2026, 10, 15, 10, 15, 30, 400));
    reducedMotion.matches = false;
    vi.stubGlobal('matchMedia', () => reducedMotion);
  });

  afterEach(() => {
    fixture?.destroy();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows the local time and ticks once per second on the second boundary', async () => {
    await create();
    expect(rotation('.clock__second')).toBe(180);
    expect(rotation('.clock__minute')).toBe(93);
    expect(rotation('.clock__hour')).toBe(307.5);

    // Not yet the next second: the hand has not moved (no sweep).
    await vi.advanceTimersByTimeAsync(500);
    await stable();
    expect(rotation('.clock__second')).toBe(180);

    await vi.advanceTimersByTimeAsync(110);
    await stable();
    expect(rotation('.clock__second')).toBe(186);

    await vi.advanceTimersByTimeAsync(1000);
    await stable();
    expect(rotation('.clock__second')).toBe(192);
  });

  it('stops its timer when destroyed', async () => {
    await create();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const pending = vi.getTimerCount();
    expect(pending).toBeGreaterThan(0);
    fixture.destroy();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBeLessThan(pending);
  });

  it('is static with reduced motion: no seconds hand and at most one update a minute', async () => {
    reducedMotion.matches = true;
    await create();
    expect(fixture.nativeElement.querySelector('.clock__second')).toBeNull();
    expect(rotation('.clock__minute')).toBe(90);
    await vi.advanceTimersByTimeAsync(20_000);
    await stable();
    expect(rotation('.clock__minute')).toBe(90);
    await vi.advanceTimersByTimeAsync(10_000);
    await stable();
    expect(rotation('.clock__minute')).toBe(96);
  });

  it('has an accessible name and is not a live region', async () => {
    await create();
    const svg: SVGElement = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain('clock');
    expect(fixture.nativeElement.querySelector('[aria-live]')).toBeNull();
  });
});
