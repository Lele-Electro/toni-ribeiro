import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DayScheduler } from '../../shared/day-scheduler/day-scheduler';

const INTRO_SEEN_KEY = 'ribeiro.liftClubIntroSeen';

@Component({
  selector: 'app-lift-club',
  imports: [DayScheduler],
  templateUrl: './lift-club.html',
  styleUrl: './lift-club.scss',
  host: {
    class: 'page',
    'animate.enter': 'page-enter',
    'animate.leave': 'page-leave',
  },
})
export class LiftClub {
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly storage = isPlatformBrowser(inject(PLATFORM_ID))
    ? globalThis.sessionStorage
    : null;

  /**
   * On a phone's first arrival the video plays alone for about three seconds before the
   * booking widget fades in (a CSS animation, see lift-club.scss). Once the member has
   * touched the page, the wait is skipped, now and on later visits in this session.
   */
  protected readonly introSkipped = signal(this.introSeen());

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const video = this.video().nativeElement;
      const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
      const sync = () => {
        if (reducedMotion?.matches) {
          // Leave the poster showing as a still image.
          video.pause();
          return;
        }
        // Angular sets `muted` as an attribute after creating the element, which browsers
        // ignore for autoplay; the property is what permits muted playback.
        video.muted = true;
        video.play()?.catch(() => {
          // Autoplay refused (for example in a power-saving mode): the poster remains.
        });
      };
      sync();
      reducedMotion?.addEventListener?.('change', sync);
      destroyRef.onDestroy(() => reducedMotion?.removeEventListener?.('change', sync));
    });
  }

  protected skipIntro(): void {
    if (this.introSkipped()) return;
    this.introSkipped.set(true);
    try {
      this.storage?.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // Private browsing can refuse storage; the intro then simply replays next visit.
    }
  }

  private introSeen(): boolean {
    try {
      return this.storage?.getItem(INTRO_SEEN_KEY) === '1';
    } catch {
      return false;
    }
  }
}
