import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingPlace } from '../../core/lift-bookings/lift-bookings.service';
import { GooglePlacesService, PlaceSuggestion } from '../../core/maps/google-places.service';
import { PlaceAutocomplete } from './place-autocomplete';

describe('PlaceAutocomplete', () => {
  let fixture: ComponentFixture<PlaceAutocomplete>;
  let element: HTMLElement;
  let emitted: BookingPlace[];

  // Fake timers also hold back Angular's own scheduler, so let it run explicitly.
  const stable = async () => {
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
  };
  const suggestion: PlaceSuggestion = {
    id: 'place-1',
    primary: 'Rosebank Mall',
    secondary: 'Bath Avenue, Johannesburg',
    prediction: {},
  };
  const places = {
    unavailable: signal(false),
    ready: vi.fn(),
    newSession: vi.fn(),
    suggest: vi.fn(),
    resolve: vi.fn(),
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    places.unavailable.set(false);
    places.ready.mockReset().mockResolvedValue(true);
    places.newSession.mockReset().mockResolvedValue({ token: 1 });
    places.suggest.mockReset().mockResolvedValue([suggestion]);
    places.resolve.mockReset().mockResolvedValue({
      address: 'Rosebank Mall, 50 Bath Ave, Rosebank, Johannesburg, 2196',
      placeId: 'place-1',
      lat: -26.146,
      lng: 28.041,
    });
    TestBed.configureTestingModule({
      imports: [PlaceAutocomplete],
      providers: [{ provide: GooglePlacesService, useValue: places }],
    });
    fixture = TestBed.createComponent(PlaceAutocomplete);
    fixture.componentRef.setInput('inputId', 'pickup');
    emitted = [];
    fixture.componentInstance.place.subscribe((place) => emitted.push(place));
    element = fixture.nativeElement;
    await stable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  const input = () => element.querySelector<HTMLInputElement>('#pickup')!;
  const type = async (value: string) => {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(300);
    await stable();
  };

  it('does not contact Google until the field is used', () => {
    expect(places.ready).not.toHaveBeenCalled();
    input().dispatchEvent(new Event('focus'));
    expect(places.ready).toHaveBeenCalledOnce();
  });

  it('debounces lookups, reuses one session token and stores the chosen place', async () => {
    input().value = 'Ros';
    input().dispatchEvent(new Event('input'));
    await type('Roseb');
    expect(places.suggest).toHaveBeenCalledOnce();
    expect(places.suggest).toHaveBeenCalledWith('Roseb', { token: 1 });
    expect(input().getAttribute('aria-expanded')).toBe('true');
    const options = element.querySelectorAll<HTMLElement>('[role="option"]');
    expect(options).toHaveLength(1);
    expect(element.querySelector('.place__attribution')!.textContent).toContain('Google');

    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await stable();
    expect(input().getAttribute('aria-activedescendant')).toBe(options[0].id);
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    await vi.advanceTimersByTimeAsync(0);
    await stable();

    expect(emitted.at(-1)).toEqual({
      address: 'Rosebank Mall, 50 Bath Ave, Rosebank, Johannesburg, 2196',
      placeId: 'place-1',
      lat: -26.146,
      lng: 28.041,
    });
    expect(input().getAttribute('aria-expanded')).toBe('false');

    // A new search after a selection starts a new billing session.
    await type('Sandton');
    expect(places.newSession).toHaveBeenCalledTimes(2);
  });

  it('drops the place ID and coordinates when the address is edited by hand', async () => {
    fixture.componentRef.setInput('place', {
      address: 'Rosebank Mall',
      placeId: 'place-1',
      lat: 1,
      lng: 2,
    });
    await stable();
    places.suggest.mockResolvedValue([]);
    await type('Rosebank Mall, entrance 3');
    expect(emitted.at(-1)).toEqual({ address: 'Rosebank Mall, entrance 3' });
  });

  it('accepts a typed address and explains the fallback when Maps is unavailable', async () => {
    places.newSession.mockResolvedValue(null);
    places.unavailable.set(true);
    await type('14 Jan Smuts Avenue');
    expect(places.suggest).not.toHaveBeenCalled();
    expect(emitted.at(-1)).toEqual({ address: '14 Jan Smuts Avenue' });
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.place__fallback')!.textContent).toContain(
      'type the full address',
    );
  });
});
