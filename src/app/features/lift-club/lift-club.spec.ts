import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes as appRoutes } from '../../app.routes';
import { AuthService } from '../../core/auth/auth.service';
import { EventsService } from '../../core/events/events.service';
import { LiftBookingsService } from '../../core/lift-bookings/lift-bookings.service';
import { AddressSearchService } from '../../core/maps/address-search.service';
import {
  PublishedReview,
  VoiceReviewsService,
} from '../../core/voice-reviews/voice-reviews.service';
import { LiftClub } from './lift-club';
import { LIFT_CLUB_CHILD_ROUTES } from './lift-club.routes';

/** The reviews API, answering with whatever reviews a test puts here. */
let published: PublishedReview[] = [];
const reviewsApi = {
  provide: VoiceReviewsService,
  useValue: {
    list: async () => published,
    mine: async () => null,
    audioUrl: (review: PublishedReview) => `/reviews/${review.id}`,
  },
};

const eventsList = vi.fn();
const eventsApi = {
  provide: EventsService,
  useValue: { list: eventsList, imageUrl: () => '' },
};

/** /lift-club, /events and /reviews, as app.routes.ts has them. */
const liftClubRoutes: Routes = [
  { path: '', component: LiftClub, children: LIFT_CLUB_CHILD_ROUTES },
];

describe('LiftClub', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let element: HTMLElement;
  const signedIn = signal(false);

  const card = () => element.querySelector('.flip-card')!;
  const front = () => element.querySelector('.flip-card__face--front')!;
  const back = () => element.querySelector('.flip-card__face--back')!;
  const times = () => element.querySelector('.slot-pane')!;
  const events = () => element.querySelector('app-event-browser')!;
  const selectedDay = () => element.querySelector('.day.selected')!.textContent!.trim();
  const settle = async () => {
    for (let i = 0; i < 4; i++) await harness.fixture.whenStable();
  };
  const click = async (selector: string) => {
    element.querySelector<HTMLElement>(selector)!.click();
    await settle();
  };

  /** Opens the page at `url`, as a link from outside the site would. */
  async function open(url: string, routes: Routes = liftClubRoutes) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: LiftBookingsService,
          useValue: {
            availability: async () => [],
            mine: async () => [],
            save: vi.fn(),
            cancel: vi.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: signedIn,
            user: signal(signedIn() ? { userId: 'rider-1', name: 'Ann' } : null),
          },
        },
        {
          provide: AddressSearchService,
          useValue: { unavailable: signal(true), suggest: async () => [] },
        },
        reviewsApi,
        eventsApi,
      ],
    });
    harness = await RouterTestingHarness.create(url);
    router = TestBed.inject(Router);
    await settle();
    element = harness.fixture.nativeElement.querySelector('app-lift-club');
  }

  beforeEach(() => {
    published = [];
    signedIn.set(false);
    eventsList.mockReset().mockResolvedValue([]);
    // Reduced motion: the faces swap at once, so the test needn't wait out a turn.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduced-motion'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  });

  afterEach(() => {
    harness?.fixture.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('at /lift-club', () => {
    beforeEach(() => open('/lift-club'));

    it('starts on the booking times with the events and reviews out of reach', () => {
      expect(card().classList.contains('is-flipped')).toBe(false);
      expect(front().hasAttribute('inert')).toBe(false);
      expect(back().hasAttribute('inert')).toBe(true);
      expect(times().hasAttribute('inert')).toBe(false);
      expect(events().hasAttribute('inert')).toBe(true);
      expect(eventsList).not.toHaveBeenCalled();
      expect(
        element.querySelector('.day-hint + .day-divider + .pane-actions .see-reviews')!.textContent,
      ).toContain('See reviews');
    });

    it('moves to /events and back, keeping the chosen day', async () => {
      await click('.day:nth-child(3)');
      const day = selectedDay();
      await click('.day-pane [data-events-toggle]');
      expect(router.url).toBe('/events');
      expect(times().hasAttribute('inert')).toBe(true);
      expect(events().hasAttribute('inert')).toBe(false);
      expect(document.activeElement!.hasAttribute('data-events-heading')).toBe(true);
      expect(selectedDay()).toBe(day);

      await click('.events-pane .events__back');
      expect(router.url).toBe('/lift-club');
      expect(times().hasAttribute('inert')).toBe(false);
      expect(selectedDay()).toBe(day);
    });

    it('turns to /reviews and back, keeping the chosen day and moving focus', async () => {
      await click('.day:nth-child(4)');
      const day = selectedDay();
      await click('.day-pane .see-reviews');
      expect(router.url).toBe('/reviews');
      expect(card().classList.contains('is-flipped')).toBe(true);
      expect(card().classList.contains('has-turned')).toBe(true);
      expect(front().hasAttribute('inert')).toBe(true);
      expect(back().hasAttribute('inert')).toBe(false);
      expect(document.activeElement?.id).toBe('reviews-heading');
      expect(element.querySelectorAll('.review').length).toBeGreaterThan(0);

      await click('.reviews__back');
      expect(router.url).toBe('/lift-club');
      expect(card().classList.contains('is-flipped')).toBe(false);
      expect(back().hasAttribute('inert')).toBe(true);
      expect(selectedDay()).toBe(day);
    });

    it('returns from the reviews to the events if that is where the visitor was', async () => {
      await click('.day-pane [data-events-toggle]');
      await click('.day-pane .see-reviews');
      expect(router.url).toBe('/reviews');
      await click('.reviews__back');
      expect(router.url).toBe('/events');
      expect(card().classList.contains('is-flipped')).toBe(false);
      expect(events().hasAttribute('inert')).toBe(false);
    });

    it('follows the address when it changes, as Back and Forward do', async () => {
      const page = element;
      await router.navigateByUrl('/reviews');
      await settle();
      expect(card().classList.contains('is-flipped')).toBe(true);
      await router.navigateByUrl('/events');
      await settle();
      expect(card().classList.contains('is-flipped')).toBe(false);
      expect(events().hasAttribute('inert')).toBe(false);
      await router.navigateByUrl('/lift-club');
      await settle();
      expect(times().hasAttribute('inert')).toBe(false);
      // The same page throughout: nothing was rebuilt.
      expect(harness.fixture.nativeElement.querySelector('app-lift-club')).toBe(page);
    });

    it('turns back to booking on Escape', async () => {
      await click('.day-pane .see-reviews');
      back().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle();
      expect(router.url).toBe('/lift-club');
      expect(card().classList.contains('is-flipped')).toBe(false);
    });

    it('asks signed-out visitors to sign in before recording, returning to /reviews', () => {
      const link = back().querySelector<HTMLAnchorElement>('app-voice-recorder a')!;
      expect(link.textContent).toContain('Sign in to record a review');
      expect(link.getAttribute('href')).toBe('/login?returnUrl=%2Freviews');
      expect(back().querySelector('button.btn--record')).toBeNull();
    });

    it('gives each reviewer’s circle its own colour', () => {
      const colours = [...element.querySelectorAll<HTMLElement>('.review__avatar')].map((avatar) =>
        avatar.style.getPropertyValue('--avatar'),
      );
      expect(colours.every(Boolean)).toBe(true);
      expect(new Set(colours).size).toBe(colours.length);
      expect(element.querySelectorAll('.review__tag')[0].textContent).toContain('Sample');
    });
  });

  it('shows published reviews in place of the samples', async () => {
    published = [
      {
        id: 'r1',
        name: 'Naledi M.',
        initials: 'NM',
        duration: 12,
        peaks: [0.5],
        revision: 2,
        createdAt: '',
        updatedAt: '',
      },
    ];
    await open('/lift-club');
    const rows = element.querySelectorAll('.review');
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector('.review__name')!.textContent).toBe('Naledi M.');
    expect(rows[0].querySelector('.review__tag')).toBeNull();
    expect(rows[0].querySelector('.review__time')!.textContent).toBe('0:12');
  });

  describe('opened by a link', () => {
    it('to /events shows the events at once, focused, without the phone intro', async () => {
      await open('/events');
      expect(router.url).toBe('/events');
      expect(times().hasAttribute('inert')).toBe(true);
      expect(events().hasAttribute('inert')).toBe(false);
      expect(eventsList).toHaveBeenCalledOnce();
      expect(element.querySelector('.schedule-page')!.classList.contains('intro-skip')).toBe(true);
      expect(document.activeElement!.hasAttribute('data-events-heading')).toBe(true);
      expect(element.querySelector('[data-events-toggle]')!.getAttribute('aria-pressed')).toBe(
        'true',
      );
    });

    it('to /reviews shows the reviews without a turn, focused, without the phone intro', async () => {
      signedIn.set(true);
      await open('/reviews');
      expect(card().classList.contains('is-flipped')).toBe(true);
      expect(card().classList.contains('has-turned')).toBe(false);
      expect(back().hasAttribute('inert')).toBe(false);
      expect(element.querySelector('.schedule-page')!.classList.contains('intro-skip')).toBe(true);
      expect(document.activeElement?.id).toBe('reviews-heading');
      expect(element.querySelector('.btn--record')!.textContent).toContain('Record a voice review');
      // Back from a direct link goes to the booking times.
      await click('.reviews__back');
      expect(router.url).toBe('/lift-club');
    });

    it('written before /reviews existed (/lift-club?reviews=1) lands on /reviews', async () => {
      await open('/lift-club?reviews=1');
      expect(router.url).toBe('/reviews');
      expect(card().classList.contains('is-flipped')).toBe(true);
      expect(card().classList.contains('has-turned')).toBe(false);
    });
  });

  describe('in the app’s routes', () => {
    it('forwards the home page to the lift club', async () => {
      await open('/', appRoutes);
      expect(router.url).toBe('/lift-club');
      expect(element).not.toBeNull();
      expect(times().hasAttribute('inert')).toBe(false);
    });

    it('serves /events and /reviews from the same page', async () => {
      await open('/events', appRoutes);
      expect(events().hasAttribute('inert')).toBe(false);
      await router.navigateByUrl('/reviews?campaign=email');
      await settle();
      expect(card().classList.contains('is-flipped')).toBe(true);
    });
  });
});
