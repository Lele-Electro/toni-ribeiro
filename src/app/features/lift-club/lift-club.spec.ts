import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../core/auth/auth.service';
import { LiftBookingsService } from '../../core/lift-bookings/lift-bookings.service';
import { AddressSearchService } from '../../core/maps/address-search.service';
import {
  PublishedReview,
  VoiceReviewsService,
} from '../../core/voice-reviews/voice-reviews.service';
import { LiftClub } from './lift-club';

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

describe('LiftClub booking card', () => {
  let fixture: ComponentFixture<LiftClub>;
  let element: HTMLElement;
  const api = {
    availability: vi.fn().mockResolvedValue([]),
    mine: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
    cancel: vi.fn(),
  };

  const card = () => element.querySelector('.flip-card')!;
  const front = () => element.querySelector('.flip-card__face--front')!;
  const back = () => element.querySelector('.flip-card__face--back')!;
  const selectedDay = () => element.querySelector('.day.selected')!.textContent!.trim();
  const settle = async () => {
    for (let i = 0; i < 3; i++) await fixture.whenStable();
  };

  beforeEach(async () => {
    published = [];
    // Reduced motion: the faces swap at once, so the test needn't wait out a turn.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduced-motion'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      imports: [LiftClub],
      providers: [
        provideRouter([]),
        { provide: LiftBookingsService, useValue: api },
        {
          provide: AuthService,
          useValue: { isAuthenticated: signal(false), user: signal(null) },
        },
        {
          provide: AddressSearchService,
          useValue: { unavailable: signal(true), suggest: async () => [] },
        },
        reviewsApi,
      ],
    });
    fixture = TestBed.createComponent(LiftClub);
    element = fixture.nativeElement;
    await settle();
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts on the booking face with the reviews out of reach', () => {
    expect(card().classList.contains('is-flipped')).toBe(false);
    expect(front().hasAttribute('inert')).toBe(false);
    expect(back().hasAttribute('inert')).toBe(true);
    expect(element.querySelector('.day-hint + .see-reviews')!.textContent).toContain('See reviews');
  });

  it('turns to the reviews and back, keeping the chosen day and moving focus', async () => {
    element.querySelectorAll<HTMLButtonElement>('.day')[3].click();
    await settle();
    const day = selectedDay();

    element.querySelector<HTMLButtonElement>('.day-pane .see-reviews')!.click();
    await settle();
    expect(card().classList.contains('is-flipped')).toBe(true);
    expect(front().hasAttribute('inert')).toBe(true);
    expect(back().hasAttribute('inert')).toBe(false);
    expect(document.activeElement?.id).toBe('reviews-heading');
    expect(element.querySelectorAll('.review').length).toBeGreaterThan(0);

    element.querySelector<HTMLButtonElement>('.reviews__back')!.click();
    await settle();
    expect(card().classList.contains('is-flipped')).toBe(false);
    expect(back().hasAttribute('inert')).toBe(true);
    expect(selectedDay()).toBe(day);
  });

  it('asks signed-out visitors to sign in before recording', () => {
    const link = back().querySelector<HTMLAnchorElement>('app-voice-recorder a')!;
    expect(link.textContent).toContain('Sign in to record a review');
    expect(back().querySelector('button.btn--record')).toBeNull();
  });

  it('gives each reviewer’s circle its own colour', () => {
    const colours = [...element.querySelectorAll<HTMLElement>('.review__avatar')].map((avatar) =>
      avatar.style.getPropertyValue('--avatar'),
    );
    expect(colours.every(Boolean)).toBe(true);
    expect(new Set(colours).size).toBe(colours.length);
  });

  it('shows published reviews in place of the samples', async () => {
    expect(element.querySelectorAll('.review__tag')[0].textContent).toContain('Sample');
    fixture.destroy();
    published = [
      { id: 'r1', name: 'Naledi M.', initials: 'NM', duration: 12, peaks: [0.5], revision: 2, createdAt: '', updatedAt: '' },
    ];
    fixture = TestBed.createComponent(LiftClub);
    element = fixture.nativeElement;
    await settle();
    const rows = element.querySelectorAll('.review');
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector('.review__name')!.textContent).toBe('Naledi M.');
    expect(rows[0].querySelector('.review__tag')).toBeNull();
    expect(rows[0].querySelector('.review__time')!.textContent).toBe('0:12');
  });

  it('turns back to booking on Escape', async () => {
    element.querySelector<HTMLButtonElement>('.day-pane .see-reviews')!.click();
    await settle();
    back().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    expect(card().classList.contains('is-flipped')).toBe(false);
  });
});

describe('LiftClub returning from sign-in', () => {
  it('opens on the reviews face for ?reviews=1, then tidies the address', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduced-motion'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'lift-club', component: LiftClub }]),
        {
          provide: LiftBookingsService,
          useValue: { availability: async () => [], mine: async () => [] },
        },
        {
          provide: AuthService,
          useValue: { isAuthenticated: signal(true), user: signal({ userId: 'rider-1', name: 'Ann' }) },
        },
        {
          provide: AddressSearchService,
          useValue: { unavailable: signal(true), suggest: async () => [] },
        },
        reviewsApi,
      ],
    });
    const harness = await RouterTestingHarness.create('/lift-club?reviews=1');
    for (let i = 0; i < 3; i++) await harness.fixture.whenStable();
    const page: HTMLElement = harness.routeNativeElement!;

    expect(page.querySelector('.flip-card')!.classList.contains('is-flipped')).toBe(true);
    expect(page.querySelector('.flip-card')!.classList.contains('has-turned')).toBe(false);
    expect(page.querySelector('.flip-card__face--back')!.hasAttribute('inert')).toBe(false);
    expect(page.querySelector('.btn--record')!.textContent).toContain('Record a voice review');
    expect(TestBed.inject(Router).url).toBe('/lift-club');

    harness.fixture.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
