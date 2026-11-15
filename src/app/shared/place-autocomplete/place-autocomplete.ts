import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { BookingPlace } from '../../core/lift-bookings/lift-bookings.service';
import {
  GooglePlacesService,
  PlaceSuggestion,
  PlacesSession,
} from '../../core/maps/google-places.service';

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 3;

/**
 * An address field with Google Places suggestions (an ARIA combobox). Whatever the member
 * types is itself a valid address, so the field keeps working without Google Maps.
 */
@Component({
  selector: 'app-place-autocomplete',
  templateUrl: './place-autocomplete.html',
  styleUrl: './place-autocomplete.scss',
})
export class PlaceAutocomplete {
  readonly inputId = input.required<string>();
  readonly place = model<BookingPlace>({ address: '' });
  readonly placeholder = input('');
  readonly disabled = input(false);
  readonly invalid = input(false);
  /** IDs of the hint and error elements that describe this field. */
  readonly describedBy = input('');

  protected readonly places = inject(GooglePlacesService);
  protected readonly suggestions = signal<PlaceSuggestion[]>([]);
  protected readonly open = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly searching = signal(false);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private session: PlacesSession | null = null;
  private timer?: ReturnType<typeof setTimeout>;
  private requestId = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      this.requestId++;
    });
  }

  focus(): void {
    this.field().nativeElement.focus();
  }

  /** Maps loads the first time an address field is focused, not with the page. */
  protected warmUp(): void {
    void this.places.ready();
  }

  protected onInput(event: Event): void {
    const address = (event.target as HTMLInputElement).value;
    // Edited text no longer matches the chosen place, so drop its ID and coordinates.
    this.place.set({ address });
    clearTimeout(this.timer);
    const query = address.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      this.requestId++;
      this.close();
      return;
    }
    this.timer = setTimeout(() => void this.search(query), DEBOUNCE_MS);
  }

  private async search(query: string): Promise<void> {
    const request = ++this.requestId;
    this.searching.set(true);
    try {
      this.session ??= await this.places.newSession();
      if (!this.session) return;
      const suggestions = await this.places.suggest(query, this.session);
      if (request !== this.requestId) return;
      this.suggestions.set(suggestions);
      this.activeIndex.set(-1);
      this.open.set(suggestions.length > 0);
    } finally {
      if (request === this.requestId) this.searching.set(false);
    }
  }

  protected async choose(suggestion: PlaceSuggestion): Promise<void> {
    this.requestId++;
    clearTimeout(this.timer);
    this.close();
    // Show the chosen text immediately; the formatted address and coordinates follow.
    this.place.set({
      address: [suggestion.primary, suggestion.secondary].filter(Boolean).join(', '),
      placeId: suggestion.id,
    });
    const request = this.requestId;
    this.session = null; // Place Details ends the session; typing again starts a new one.
    const place = await this.places.resolve(suggestion);
    if (request === this.requestId) this.place.set(place);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.open()) return;
    const count = this.suggestions().length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.activeIndex.update(
        (index) => (index + step + count + (index < 0 && step < 0 ? 1 : 0)) % count,
      );
    } else if (event.key === 'Enter' && this.activeIndex() >= 0) {
      event.preventDefault();
      void this.choose(this.suggestions()[this.activeIndex()]);
    } else if (event.key === 'Escape') {
      // Close the list only; a second Escape closes the booking dialog.
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }

  protected close(): void {
    this.open.set(false);
    this.suggestions.set([]);
    this.activeIndex.set(-1);
  }
}
