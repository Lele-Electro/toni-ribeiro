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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { DayScheduler } from '../../shared/day-scheduler/day-scheduler';
import { SchedulerView } from '../../shared/day-scheduler/slot-view';
import { LIFT_CLUB_VIEW_URLS, LiftClubView } from './lift-club.routes';
import { VoiceReviews } from './voice-reviews/voice-reviews';

/** The view the address asks for: /lift-club, /events or /reviews (lift-club.routes.ts). */
function viewOf(route: ActivatedRouteSnapshot): LiftClubView {
  const view = route.firstChild?.data['liftClubView'];
  return view === 'events' || view === 'reviews' ? view : 'times';
}

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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly front = viewChild.required<ElementRef<HTMLElement>>('front');
  private readonly back = viewChild.required<ElementRef<HTMLElement>>('back');
  private readonly reviews = viewChild.required(VoiceReviews);
  private readonly scheduler = viewChild.required(DayScheduler);

  /**
   * What the address shows: the booking times (/lift-club), the events in their place
   * (/events) or the voice reviews on the back of the card (/reviews). The page stays on
   * screen as the address changes, so Back and Forward move between the views too.
   */
  protected readonly view = signal<LiftClubView>(viewOf(this.route.snapshot));
  /** The booking face's own view, kept while the reviews show so that Back returns to it. */
  protected readonly frontView = signal<SchedulerView>(
    this.view() === 'events' ? 'events' : 'times',
  );
  /** Which face of the booking card is showing. */
  protected readonly showReviews = computed(() => this.view() === 'reviews');
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
    // A link straight to /events or /reviews (an email, a sign-in return): open on that view
    // with no turn and no phone intro, and take focus to it.
    const arrival = this.view();
    if (arrival !== 'times') {
      this.introSkipped.set(true);
      afterNextRender(() =>
        this.focusWhenShown(() =>
          arrival === 'reviews'
            ? this.reviews().focusHeading()
            : this.scheduler().focusEventsHeading(),
        ),
      );
    }
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.arrive(viewOf(this.route.snapshot)));
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
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
        ?.saveData;
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
   * "See reviews" and "Back to booking": goes to /reviews, or back to the booking face's view
   * (/lift-club or /events). The card turns when the address changes (see arrive). A turn
   * always completes: a second request during one is ignored, because reversing mid-way
   * would show a face from behind (the faces swap visibility at the half-way point; see
   * lift-club.scss).
   */
  protected flip(toReviews: boolean): void {
    if (this.showReviews() === toReviews || this.turning) return;
    void this.router.navigateByUrl(LIFT_CLUB_VIEW_URLS[toReviews ? 'reviews' : this.frontView()]);
  }

  /** The booking table asked for its other view: /events or back to /lift-club. */
  protected showFront(view: SchedulerView): void {
    if (!this.showReviews()) void this.router.navigateByUrl(LIFT_CLUB_VIEW_URLS[view]);
  }

  /** The address changed: show its view, turning the card if the face changes. */
  private arrive(view: LiftClubView): void {
    const turn = (view === 'reviews') !== this.showReviews();
    this.view.set(view);
    if (view !== 'reviews') this.frontView.set(view);
    if (turn) this.turn(view === 'reviews');
  }

  /**
   * Turns the card to the face the address now shows. Focus follows: to the reviews
   * heading, or back to the "See reviews" button the member started from.
   */
  private turn(toReviews: boolean): void {
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (!reduced) {
      this.turning = true;
      setTimeout(() => (this.turning = false), TURN_MS);
    }
    this.turned.set(true);
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
