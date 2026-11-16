import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { BookingPlace } from '../lift-bookings/lift-bookings.service';

/** The parts of a Photon (GeoJSON) search result that this app reads. */
interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_type?: string;
    osm_id?: number;
    type?: string;
    countrycode?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    locality?: string;
    city?: string;
    postcode?: string;
  };
}

export interface PlaceSuggestion {
  id: string;
  primary: string;
  secondary: string;
  /** What the booking stores when the member picks this suggestion. */
  place: BookingPlace;
}

const PHOTON_URL = 'https://photon.komoot.io/api/';
/** West, south, east, north: mainland South Africa. */
const SOUTH_AFRICA_BOX = '16.3,-34.9,33.0,-22.1';
/** Nearby results rank first; the lift club runs from Rosebank, Johannesburg. */
const HOME = { lat: '-26.15', lon: '28.04' };
const MAX_SUGGESTIONS = 5;

/**
 * Address suggestions from Photon (https://photon.komoot.io), a free geocoder built on
 * OpenStreetMap that needs no key and has no billing. Its public server is offered under
 * fair use, so callers debounce and only search from three characters. When Photon can't
 * be reached, `unavailable` becomes true and the form falls back to typed addresses.
 */
@Injectable({ providedIn: 'root' })
export class AddressSearchService {
  private readonly document = inject(DOCUMENT);

  /** True while the last lookup failed; the booking form then explains manual entry. */
  readonly unavailable = signal(false);

  /** Resolves to [] when nothing matches, the search fails, or `signal` aborts it. */
  async suggest(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
    const view = this.document.defaultView;
    if (!view || typeof view.fetch !== 'function') return [];
    const params = new URLSearchParams({
      q: query,
      // Neighbouring countries inside the box are filtered out below, so ask for spares.
      limit: String(MAX_SUGGESTIONS + 3),
      lang: 'en',
      bbox: SOUTH_AFRICA_BOX,
      ...HOME,
    });
    try {
      const response = await view.fetch(`${PHOTON_URL}?${params}`, { signal });
      if (!response.ok) throw new Error(`Photon responded ${response.status}`);
      const { features } = (await response.json()) as { features?: PhotonFeature[] };
      this.unavailable.set(false);
      const seen = new Set<string>();
      return (features ?? [])
        .map((feature) => toSuggestion(feature, query))
        .filter((suggestion): suggestion is PlaceSuggestion => {
          if (!suggestion || seen.has(suggestion.place.address)) return false;
          seen.add(suggestion.place.address);
          return true;
        })
        .slice(0, MAX_SUGGESTIONS);
    } catch {
      // A newer keystroke cancelling this lookup is not an outage.
      if (!signal?.aborted) this.unavailable.set(true);
      return [];
    }
  }
}

function toSuggestion(feature: PhotonFeature, query: string): PlaceSuggestion | null {
  const properties = feature.properties ?? {};
  const [lng, lat] = feature.geometry?.coordinates ?? [];
  if (properties.countrycode !== 'ZA' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  // OpenStreetMap knows few South African house numbers, so keep the one that was typed.
  const typedNumber = /^\s*(\d+[a-z]?)\s/i.exec(query)?.[1];
  const number =
    properties.housenumber ?? (properties.type === 'street' ? typedNumber : undefined);
  const streetName = properties.street ?? (properties.type === 'street' ? properties.name : '');
  const streetLine = [number, streetName].filter(Boolean).join(' ');
  const named = properties.name && properties.name !== streetName ? properties.name : '';
  const primary = named || streetLine;
  if (!primary) return null;

  // Districts here are council wards ("Johannesburg Ward 117"), which nobody writes.
  const suburb =
    properties.locality ?? (/\bward\b/i.test(properties.district ?? '') ? '' : properties.district);
  const secondary = [named ? streetLine : '', suburb, properties.city, properties.postcode]
    .filter((part, index, parts) => part && part !== primary && parts.indexOf(part) === index)
    .join(', ');

  return {
    id: `${properties.osm_type ?? ''}${properties.osm_id ?? `${lat},${lng}`}`,
    primary,
    secondary,
    place: {
      address: [primary, secondary].filter(Boolean).join(', ').slice(0, 300),
      lat: lat as number,
      lng: lng as number,
    },
  };
}
