import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventsService, LiftEvent } from '../../../core/events/events.service';
import { EventBrowser } from './event-browser';
import { EventStore } from './event-store';
import { initialsOf } from './initials';

describe('EventBrowser', () => {
  let fixture: ComponentFixture<EventBrowser>;
  let element: HTMLElement;
  let store: EventStore;
  const api = {
    list: vi.fn(),
    imageUrl: (event: LiftEvent) => `/events/${event.id}/image?v=${event.imageRevision}`,
  };
  const event = (
    id: string,
    title: string,
    description: string,
    attendees: string[] = [],
  ): LiftEvent => ({
    id,
    title,
    description,
    url: `https://www.quicket.co.za/events/${id}/`,
    attendees,
    imageRevision: 2,
  });
  const events = [
    event('jazz', 'Jazz on the Roof', 'Live music above Maboneng. Doors open at 18:00.', [
      'Thandiwe Mokoena',
      'Pieter van der Merwe',
      'Ayesha',
      'Sipho Dlamini',
      'Extra Person',
    ]),
    event('comedy', 'Comedy Night', 'Stand-up at the Lyric. Rooftop parking available.'),
  ];
  const settle = async () => {
    for (let i = 0; i < 3; i++) await fixture.whenStable();
  };
  const cards = () => [...element.querySelectorAll<HTMLElement>('.event')];
  const search = async (value: string) => {
    const input = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  };
  const state = () => element.querySelector('.events__state')?.textContent?.trim();

  async function create(list: () => Promise<LiftEvent[]>) {
    api.list.mockReset().mockImplementation(list);
    TestBed.configureTestingModule({
      imports: [EventBrowser],
      providers: [EventStore, { provide: EventsService, useValue: api }],
    });
    fixture = TestBed.createComponent(EventBrowser);
    element = fixture.nativeElement;
    store = TestBed.inject(EventStore);
    await settle();
  }

  afterEach(() => fixture.destroy());

  it('shows a loading state, then cards with thumbnail, title, description and attendees in order', async () => {
    let resolve!: (list: LiftEvent[]) => void;
    await create(() => new Promise((done) => (resolve = done)));
    const loading = store.load();
    await settle();
    expect(state()).toBe('Loading events…');
    expect(element.querySelector('.events__scroll')!.getAttribute('aria-busy')).toBe('true');
    resolve(events);
    await loading;
    await settle();

    expect(cards()).toHaveLength(2);
    const first = cards()[0];
    const order = [
      ...first.querySelectorAll(
        '.event__image, .event__title, .event__description, .event__attendees',
      ),
    ].map((node) => node.className);
    expect(order).toEqual([
      'event__image',
      'event__title',
      'event__description',
      'event__attendees',
    ]);
    expect(first.querySelector('img')!.getAttribute('src')).toBe('/events/jazz/image?v=2');
    expect(first.querySelector('img')!.getAttribute('alt')).toBe('');
    const link = first.querySelector<HTMLAnchorElement>('.event__title a')!;
    expect(link.getAttribute('href')).toBe('https://www.quicket.co.za/events/jazz/');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.textContent).toContain('(opens in a new tab)');
    expect(element.querySelector('[role="status"]')!.textContent!.trim()).toBe('2 events');
  });

  it('shows at most four attendees as coloured initials with their names for screen readers', async () => {
    await create(async () => events);
    await store.load();
    await settle();
    const people = [...cards()[0].querySelectorAll<HTMLElement>('.event__avatar')];
    expect(people).toHaveLength(4);
    expect(
      people.map((person) => person.querySelector('[aria-hidden="true"]')!.textContent),
    ).toEqual(['TM', 'PM', 'A', 'SD']);
    expect(people.map((person) => person.querySelector('.sr-only')!.textContent)).toEqual([
      'Thandiwe Mokoena',
      'Pieter van der Merwe',
      'Ayesha',
      'Sipho Dlamini',
    ]);
    expect(cards()[0].querySelector('.event__attendees')!.getAttribute('aria-label')).toBe(
      'Attending',
    );
    const colours = people.map((person) => person.style.getPropertyValue('--avatar'));
    expect(colours.every(Boolean)).toBe(true);
    // Neighbours never share a colour, and the same names always get the same colours.
    colours.slice(1).forEach((colour, i) => expect(colour).not.toBe(colours[i]));
    expect(cards()[1].querySelector('.event__attendees')).toBeNull();
  });

  it('searches titles and full descriptions, ignoring case and surrounding spaces', async () => {
    await create(async () => events);
    await store.load();
    await settle();
    await search('  JAZZ  ');
    expect(cards().map((card) => card.querySelector('.event__title')!.textContent!.trim())).toEqual(
      [expect.stringContaining('Jazz on the Roof')],
    );
    await search('rooftop parking');
    expect(cards()).toHaveLength(1);
    expect(cards()[0].textContent).toContain('Comedy Night');
    expect(element.querySelector('[role="status"]')!.textContent!.trim()).toBe(
      '1 of 2 events matches',
    );

    await search('opera');
    expect(cards()).toHaveLength(0);
    expect(state()).toContain('No events match “opera”.');
    const clear = [...element.querySelectorAll<HTMLButtonElement>('.events__link')].find((button) =>
      button.textContent!.includes('Clear search'),
    )!;
    clear.click();
    await settle();
    expect(cards()).toHaveLength(2);
    expect(document.activeElement).toBe(element.querySelector('input[type="search"]'));
  });

  it('clears a search on Escape, and only then goes back', async () => {
    await create(async () => events);
    await store.load();
    await settle();
    const back = vi.fn();
    fixture.componentInstance.back.subscribe(back);
    await search('jazz');
    const input = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    expect(store.query()).toBe('');
    expect(back).not.toHaveBeenCalled();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(back).toHaveBeenCalledOnce();
    element.querySelector<HTMLButtonElement>('.events__back')!.click();
    expect(back).toHaveBeenCalledTimes(2);
  });

  it('says when nothing is published, and offers a retry after a failure', async () => {
    await create(async () => {
      throw new Error('offline');
    });
    await store.load();
    await settle();
    expect(element.querySelector('[role="alert"]')!.textContent).toContain('couldn’t be loaded');
    api.list.mockResolvedValue([]);
    element.querySelector<HTMLButtonElement>('.events__link')!.click();
    await settle();
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(state()).toContain('No events have been published yet');
  });

  it('loads once, however often the view opens', async () => {
    await create(async () => events);
    await Promise.all([store.load(), store.load()]);
    await store.load();
    expect(api.list).toHaveBeenCalledOnce();
  });
});

describe('initialsOf', () => {
  it('takes the first and last names’ first letters', () => {
    expect(initialsOf('Thandiwe Mokoena')).toBe('TM');
    expect(initialsOf('  anna   van der merwe ')).toBe('AM');
    expect(initialsOf('Sipho')).toBe('S');
    expect(initialsOf('Émile Zola')).toBe('ÉZ');
    expect(initialsOf('   ')).toBe('?');
  });
});
