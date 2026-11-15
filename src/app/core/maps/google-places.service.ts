import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { BookingPlace } from '../lift-bookings/lift-bookings.service';

/** The subset of the Maps JavaScript API's Places library (new) that this app uses. */
interface PlacePrediction {
  placeId: string;
  text: { text: string };
  mainText?: { text: string } | null;
  secondaryText?: { text: string } | null;
  toPlace(): {
    id: string;
    formattedAddress?: string | null;
    location?: { lat(): number; lng(): number } | null;
    fetchFields(options: { fields: string[] }): Promise<unknown>;
  };
}

interface PlacesLibrary {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(request: {
      input: string;
      sessionToken: object;
      includedRegionCodes?: string[];
      region?: string;
      language?: string;
    }): Promise<{ suggestions: { placePrediction: PlacePrediction | null }[] }>;
  };
}

interface MapsWindow {
  google?: { maps?: { importLibrary?(name: string): Promise<unknown> } };
  gm_authFailure?: () => void;
  __ribeiroMapsReady?: () => void;
  fetch: typeof fetch;
}

export interface PlaceSuggestion {
  id: string;
  primary: string;
  secondary: string;
  /** Kept opaque for callers; resolved by GooglePlacesService.resolve(). */
  prediction: unknown;
}

export type PlacesSession = object;

const MAPS_URL = 'https://maps.googleapis.com/maps/api/js';
const LOAD_TIMEOUT_MS = 10_000;

/**
 * Loads Google Maps Places on demand (never during server rendering or before the booking
 * form asks for it) and wraps Autocomplete (New). When the key is missing or Maps cannot
 * be reached, `unavailable` becomes true and the form falls back to typed addresses.
 */
@Injectable({ providedIn: 'root' })
export class GooglePlacesService {
  private readonly document = inject(DOCUMENT);
  private library?: Promise<PlacesLibrary | null>;

  /** True once a load attempt has failed; the booking form then explains manual entry. */
  readonly unavailable = signal(false);

  /** Starts loading Maps if needed. Resolves to false when address search can't be used. */
  async ready(): Promise<boolean> {
    return (await this.load()) !== null;
  }

  /** One token groups a member's keystrokes and the final selection into one billed session. */
  async newSession(): Promise<PlacesSession | null> {
    const library = await this.load();
    return library ? new library.AutocompleteSessionToken() : null;
  }

  async suggest(input: string, session: PlacesSession): Promise<PlaceSuggestion[]> {
    const library = await this.load();
    if (!library) return [];
    try {
      const { suggestions } = await library.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: session,
        includedRegionCodes: ['za'],
        region: 'za',
        language: 'en',
      });
      return suggestions
        .map((suggestion) => suggestion.placePrediction)
        .filter((prediction): prediction is PlacePrediction => prediction !== null)
        .slice(0, 5)
        .map((prediction) => ({
          id: prediction.placeId,
          primary: prediction.mainText?.text ?? prediction.text.text,
          secondary: prediction.secondaryText?.text ?? '',
          prediction,
        }));
    } catch {
      this.fail();
      return [];
    }
  }

  /**
   * Fetches only the formatted address and coordinates (the cheapest Place Details
   * fields). This also ends the autocomplete session that produced the suggestion.
   */
  async resolve(suggestion: PlaceSuggestion): Promise<BookingPlace> {
    const prediction = suggestion.prediction as PlacePrediction;
    const typed = [suggestion.primary, suggestion.secondary].filter(Boolean).join(', ');
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'location'] });
      const formatted = place.formattedAddress?.trim();
      // A business's formatted address omits its name, so keep the name the member chose.
      const address =
        formatted && !formatted.toLowerCase().startsWith(suggestion.primary.toLowerCase())
          ? `${suggestion.primary}, ${formatted}`
          : formatted || typed;
      return {
        address: address.slice(0, 300),
        placeId: prediction.placeId,
        ...(place.location ? { lat: place.location.lat(), lng: place.location.lng() } : {}),
      };
    } catch {
      // The suggestion's own text is still a usable address.
      return { address: typed.slice(0, 300), placeId: prediction.placeId };
    }
  }

  private fail(): void {
    this.unavailable.set(true);
    this.library = Promise.resolve(null);
  }

  private load(): Promise<PlacesLibrary | null> {
    this.library ??= this.loadLibrary().catch(() => null);
    return this.library.then((library) => {
      if (!library) this.unavailable.set(true);
      return library;
    });
  }

  private async loadLibrary(): Promise<PlacesLibrary | null> {
    const view = this.document.defaultView as unknown as MapsWindow | null;
    if (!view || typeof view.fetch !== 'function') return null;
    const key = await this.apiKey(view);
    if (!key) return null;

    // Google calls this when the key is rejected (wrong referrer, API not enabled, billing).
    view.gm_authFailure = () => this.fail();
    if (!view.google?.maps?.importLibrary) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Google Maps timed out')), LOAD_TIMEOUT_MS);
        const script = this.document.createElement('script');
        view.__ribeiroMapsReady = () => {
          clearTimeout(timer);
          resolve();
        };
        script.src = `${MAPS_URL}?key=${encodeURIComponent(key)}&v=weekly&loading=async&libraries=places&callback=__ribeiroMapsReady`;
        script.async = true;
        script.onerror = () => {
          clearTimeout(timer);
          script.remove();
          reject(new Error('Could not load Google Maps'));
        };
        this.document.head.appendChild(script);
      });
    }
    return (await view.google!.maps!.importLibrary!('places')) as PlacesLibrary;
  }

  private async apiKey(view: MapsWindow): Promise<string> {
    if (environment.googleMapsApiKey) return environment.googleMapsApiKey;
    try {
      const response = await view.fetch('/app-config.json', { cache: 'no-store' });
      if (!response.ok) return '';
      const config = (await response.json()) as { googleMapsApiKey?: unknown };
      return typeof config.googleMapsApiKey === 'string' ? config.googleMapsApiKey : '';
    } catch {
      return '';
    }
  }
}
