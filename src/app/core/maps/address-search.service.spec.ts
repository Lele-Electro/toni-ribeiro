import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AddressSearchService } from './address-search.service';

describe('AddressSearchService', () => {
  const fetch = vi.fn();
  let service: AddressSearchService;

  const feature = (properties: object, coordinates = [28.04, -26.14]) => ({
    geometry: { coordinates },
    properties: { countrycode: 'ZA', osm_type: 'W', osm_id: Math.random(), ...properties },
  });
  const respond = (features: object[], ok = true) =>
    fetch.mockResolvedValue({ ok, status: ok ? 200 : 503, json: async () => ({ features }) });

  beforeEach(() => {
    fetch.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: { fetch } } }],
    });
    service = TestBed.inject(AddressSearchService);
  });

  it('asks Photon for South African results and formats them', async () => {
    respond([
      feature({
        name: 'Rosebank Mall',
        street: 'Bath Avenue',
        district: 'Johannesburg Ward 117',
        locality: 'Saxonwold',
        city: 'Rosebank',
        postcode: '2121',
      }),
      feature({ name: 'Maseru Mall', countrycode: 'LS' }),
    ]);
    const results = await service.suggest('Rosebank Mall');

    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://photon.komoot.io/api/');
    expect(url.searchParams.get('q')).toBe('Rosebank Mall');
    expect(url.searchParams.get('bbox')).toBe('16.3,-34.9,33.0,-22.1');
    expect(results).toHaveLength(1);
    expect(results[0].primary).toBe('Rosebank Mall');
    expect(results[0].secondary).toBe('Bath Avenue, Saxonwold, Rosebank, 2121');
    expect(results[0].place).toEqual({
      address: 'Rosebank Mall, Bath Avenue, Saxonwold, Rosebank, 2121',
      lat: -26.14,
      lng: 28.04,
    });
  });

  it('keeps the typed house number on a street result', async () => {
    respond([feature({ type: 'street', name: 'Oxford Road', locality: 'Saxonwold' })]);
    const [result] = await service.suggest('12 Oxford Road');
    expect(result.place.address).toBe('12 Oxford Road, Saxonwold');
  });

  it('reports an outage, but not a cancelled lookup', async () => {
    respond([], false);
    expect(await service.suggest('Rosebank')).toEqual([]);
    expect(service.unavailable()).toBe(true);

    respond([feature({ name: 'Rosebank Mall' })]);
    await service.suggest('Rosebank');
    expect(service.unavailable()).toBe(false);

    const cancelled = new AbortController();
    cancelled.abort();
    fetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    expect(await service.suggest('Rosebank', cancelled.signal)).toEqual([]);
    expect(service.unavailable()).toBe(false);
  });
});
