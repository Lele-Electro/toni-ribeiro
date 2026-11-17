import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DayScheduler } from '../../shared/day-scheduler/day-scheduler';

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

  /**
   * On phones the video plays alone for about three seconds before the booking widget fades
   * in (a CSS animation, see lift-club.scss), on every visit, including after a refresh.
   * Touching the page skips the rest of the wait, for this visit only.
   */
  protected readonly introSkipped = signal(false);

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
    this.introSkipped.set(true);
  }
}
