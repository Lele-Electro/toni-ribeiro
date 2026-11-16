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
import { AddressSearchService, PlaceSuggestion } from '../../core/maps/address-search.service';

/** Keeps request volume low: Photon's public server is free under fair use. */
const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

/**
 * An address field with OpenStreetMap suggestions from Photon (an ARIA combobox). Whatever
 * the member types is itself a valid address, so the field keeps working without them.
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

  protected readonly places = inject(AddressSearchService);
  protected readonly suggestions = signal<PlaceSuggestion[]>([]);
  protected readonly open = signal(false);
  protected readonly activeIndex = signal(-1);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private timer?: ReturnType<typeof setTimeout>;
  private lookup?: AbortController;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelLookup());
  }

  focus(): void {
    this.field().nativeElement.focus();
  }

  protected onInput(event: Event): void {
    const address = (event.target as HTMLInputElement).value;
    // Edited text no longer matches the chosen place, so drop its coordinates.
    this.place.set({ address });
    this.cancelLookup();
    const query = address.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      this.close();
      return;
    }
    this.timer = setTimeout(() => void this.search(query), DEBOUNCE_MS);
  }

  private async search(query: string): Promise<void> {
    const lookup = (this.lookup = new AbortController());
    const suggestions = await this.places.suggest(query, lookup.signal);
    if (lookup.signal.aborted) return;
    this.suggestions.set(suggestions);
    this.activeIndex.set(-1);
    this.open.set(suggestions.length > 0);
  }

  protected choose(suggestion: PlaceSuggestion): void {
    this.cancelLookup();
    this.close();
    this.place.set(suggestion.place);
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
      this.choose(this.suggestions()[this.activeIndex()]);
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

  /** Stops the pending debounce and any request whose answer is no longer wanted. */
  private cancelLookup(): void {
    clearTimeout(this.timer);
    this.lookup?.abort();
  }
}
