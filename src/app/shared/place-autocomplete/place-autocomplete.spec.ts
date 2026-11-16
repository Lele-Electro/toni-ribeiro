import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingPlace } from '../../core/lift-bookings/lift-bookings.service';
import { AddressSearchService, PlaceSuggestion } from '../../core/maps/address-search.service';
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
    id: 'W1',
    primary: 'Rosebank Mall',
    secondary: 'Bath Avenue, Saxonwold, Rosebank, 2121',
    place: {
      address: 'Rosebank Mall, Bath Avenue, Saxonwold, Rosebank, 2121',
      lat: -26.146,
      lng: 28.041,
    },
  };
  const places = { unavailable: signal(false), suggest: vi.fn() };

  beforeEach(async () => {
    vi.useFakeTimers();
    places.unavailable.set(false);
    places.suggest.mockReset().mockResolvedValue([suggestion]);
    TestBed.configureTestingModule({
      imports: [PlaceAutocomplete],
      providers: [{ provide: AddressSearchService, useValue: places }],
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
    await vi.advanceTimersByTimeAsync(350);
    await stable();
  };

  it('does not search until three characters are typed', async () => {
    input().dispatchEvent(new Event('focus'));
    await type('Ro');
    expect(places.suggest).not.toHaveBeenCalled();
  });

  it('debounces lookups and stores the chosen place', async () => {
    input().value = 'Ros';
    input().dispatchEvent(new Event('input'));
    await type('Roseb');
    expect(places.suggest).toHaveBeenCalledOnce();
    expect(places.suggest.mock.calls[0][0]).toBe('Roseb');
    expect(input().getAttribute('aria-expanded')).toBe('true');
    const options = element.querySelectorAll<HTMLElement>('[role="option"]');
    expect(options).toHaveLength(1);
    expect(element.querySelector('.place__attribution')!.textContent).toContain('OpenStreetMap');

    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await stable();
    expect(input().getAttribute('aria-activedescendant')).toBe(options[0].id);
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    await stable();

    expect(emitted.at(-1)).toEqual(suggestion.place);
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.place__pin')).toBeTruthy();
  });

  it('cancels the lookup in flight when the member keeps typing', async () => {
    await type('Roseb');
    const first: AbortSignal = places.suggest.mock.calls[0][1];
    expect(first.aborted).toBe(false);
    await type('Rosebank');
    expect(first.aborted).toBe(true);
  });

  it('drops the coordinates when the address is edited by hand', async () => {
    fixture.componentRef.setInput('place', { address: 'Rosebank Mall', lat: 1, lng: 2 });
    await stable();
    places.suggest.mockResolvedValue([]);
    await type('Rosebank Mall, entrance 3');
    expect(emitted.at(-1)).toEqual({ address: 'Rosebank Mall, entrance 3' });
  });

  it('accepts a typed address and explains the fallback when search is unavailable', async () => {
    places.suggest.mockResolvedValue([]);
    places.unavailable.set(true);
    await type('14 Jan Smuts Avenue');
    expect(emitted.at(-1)).toEqual({ address: '14 Jan Smuts Avenue' });
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.place__fallback')!.textContent).toContain(
      'type the full address',
    );
  });
});
