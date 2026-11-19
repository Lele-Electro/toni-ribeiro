import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DayScheduler } from '../../shared/day-scheduler/day-scheduler';
import { VoiceReviews } from './voice-reviews/voice-reviews';

@Component({
  selector: 'app-lift-club',
  imports: [DayScheduler, VoiceReviews],
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
   * Touching the page skips the rest of the wait, for this visit only. So does a video that
   * cannot play, so nobody waits in front of a still image.
   */
  protected readonly introSkipped = signal(false);

  private readonly injector = inject(Injector);
  private readonly front = viewChild.required<ElementRef<HTMLElement>>('front');
  private readonly back = viewChild.required<ElementRef<HTMLElement>>('back');
  private readonly reviews = viewChild.required(VoiceReviews);

  /** Which face of the booking card is showing. */
  protected readonly showReviews = signal(false);
  /** Set by the first turn, so the lift animation never plays on page load. */
  protected readonly turned = signal(false);
  private readonly faceHeights = signal<{ front: number; back: number } | null>(null);
  private turning = false;
  /**
   * On phones each face is as tall as its content, so the card takes the height of the face
   * that is showing and eases between the two as it turns (see lift-club.scss). Desktop
   * ignores it: both faces fill the card and the review list scrolls inside.
   */
  protected readonly cardHeight = computed(() => {
    const heights = this.faceHeights();
    return heights ? heights[this.showReviews() ? 'back' : 'front'] : null;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    // ?reviews=1, where sign-in returns a member who wants to record: open on the reviews
    // face with no turn and no phone intro, then tidy the address.
    const route = inject(ActivatedRoute);
    if (route.snapshot.queryParamMap.has('reviews')) {
      this.showReviews.set(true);
      this.introSkipped.set(true);
      const router = inject(Router);
      afterNextRender(() => {
        this.focusWhenShown(() => this.reviews().focusHeading());
        void router.navigate([], {
          relativeTo: route,
          queryParams: { reviews: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
    }
    afterNextRender(() => {
      if (typeof ResizeObserver !== 'undefined') {
        // offsetHeight: the layout height, which the faces' rotation doesn't change.
        const measure = () =>
          this.faceHeights.set({
            front: this.front().nativeElement.offsetHeight,
            back: this.back().nativeElement.offsetHeight,
          });
        const observer = new ResizeObserver(measure);
        observer.observe(this.front().nativeElement);
        observer.observe(this.back().nativeElement);
        destroyRef.onDestroy(() => observer.disconnect());
      }
    });
    afterNextRender(() => {
      const video = this.video().nativeElement;
      const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData;
      const sync = () => {
        if (reducedMotion?.matches || saveData) {
          // Leave the poster showing as a still image.
          video.pause();
          this.introSkipped.set(true);
          return;
        }
        // Angular sets `muted` as an attribute after creating the element, which browsers
        // ignore for autoplay; the property is what permits muted playback.
        video.muted = true;
        video.play()?.catch(() => {
          // Autoplay refused (for example in a power-saving mode): the poster remains.
          this.introSkipped.set(true);
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

  /**
   * Turns the card. Focus follows to the face that is now showing: the reviews heading, or
   * back to the "See reviews" button the member started from. A turn always completes: a
   * second request during one is ignored, because reversing mid-way would show a face from
   * behind (the faces swap visibility at the half-way point; see lift-club.scss).
   */
  protected flip(toReviews: boolean): void {
    if (this.showReviews() === toReviews || this.turning) return;
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (!reduced) {
      this.turning = true;
      setTimeout(() => (this.turning = false), TURN_MS);
    }
    this.turned.set(true);
    this.showReviews.set(toReviews);
    afterNextRender(
      () =>
        this.focusWhenShown(() => {
          if (toReviews) return this.reviews().focusHeading();
          const button = this.seeReviewsButton();
          button?.focus({ preventScroll: true });
          return !button || document.activeElement === button;
        }),
      { injector: this.injector },
    );
  }

  /** The incoming face can't take focus until it appears half-way through the turn. */
  private focusWhenShown(focus: () => boolean, frames = 90): void {
    if (!focus() && frames > 0) requestAnimationFrame(() => this.focusWhenShown(focus, frames - 1));
  }

  /** The desktop and phone layouts each have a button; only one is displayed. */
  private seeReviewsButton(): HTMLElement | undefined {
    const buttons = this.front().nativeElement.querySelectorAll<HTMLElement>('[data-see-reviews]');
    return [...buttons].find((button) => button.getClientRects().length > 0);
  }
}

/** Length of a turn; matches --turn in lift-club.scss. */
const TURN_MS = 850;
