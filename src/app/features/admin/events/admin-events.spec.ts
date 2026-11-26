import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminEvent, AdminService } from '../../../core/admin/admin.service';
import { AdminEvents } from './admin-events';
import { isEventUrl, validateEvent } from './event-rules';

describe('AdminEvents', () => {
  let fixture: ComponentFixture<AdminEvents>;
  let element: HTMLElement;
  const api = {
    events: vi.fn(),
    eventImage: vi.fn(),
    saveEvent: vi.fn(),
    publishEvent: vi.fn(),
    deleteEvent: vi.fn(),
    removeEventMember: vi.fn(),
  };
  const stored = (overrides: Partial<AdminEvent> = {}): AdminEvent => ({
    id: 'e1',
    title: 'Jazz on the Roof',
    description: 'Live jazz above Maboneng.',
    url: 'https://www.quicket.co.za/events/1/',
    attendees: ['Thandiwe Mokoena', 'Pieter V'],
    members: [],
    imageRevision: 1,
    published: true,
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    ...overrides,
  });
  const settle = async () => {
    for (let i = 0; i < 3; i++) await fixture.whenStable();
  };
  const button = (label: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === label,
    )!;
  const click = async (label: string) => {
    button(label).click();
    await settle();
  };
  const type = (selector: string, value: string) => {
    const input = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const choose = async (file: File) => {
    const input = element.querySelector<HTMLInputElement>('#event-image')!;
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change'));
    await settle();
  };
  const submit = async () => {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  };
  const png = (bytes = 1000) =>
    new File([new Uint8Array(bytes)], 'thumb.png', { type: 'image/png' });

  beforeEach(async () => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.events.mockResolvedValue([
      stored(),
      stored({ id: 'e2', title: 'Comedy', published: false, attendees: [] }),
    ]);
    api.eventImage.mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    api.saveEvent.mockImplementation(async (draft) => stored({ ...draft, id: 'new' }));
    api.publishEvent.mockResolvedValue(stored());
    api.deleteEvent.mockResolvedValue(undefined);
    api.removeEventMember.mockResolvedValue(undefined);
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:thumb'), revokeObjectURL: vi.fn() }),
    );
    TestBed.configureTestingModule({
      imports: [AdminEvents],
      providers: [{ provide: AdminService, useValue: api }],
    });
    fixture = TestBed.createComponent(AdminEvents);
    element = fixture.nativeElement;
    await settle();
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('lists every event with its state, thumbnail and attendees', () => {
    expect(element.querySelector('h2')!.textContent).toContain('Events (2)');
    const rows = element.querySelectorAll('.events__row');
    expect(rows[0].textContent).toContain('Published');
    expect(rows[1].textContent).toContain('Draft');
    expect(rows[0].querySelector('img')!.getAttribute('src')).toBe('blob:thumb');
    expect(api.eventImage).toHaveBeenCalledTimes(2);
    const people = [...rows[0].querySelectorAll('.events__people li')];
    expect(people.map((li) => li.querySelector('.sr-only')!.textContent)).toEqual([
      'Thandiwe Mokoena',
      'Pieter V',
    ]);
    expect(people.map((li) => li.querySelector('[aria-hidden]')!.textContent)).toEqual([
      'TM',
      'PV',
    ]);
    expect(button('Unpublish')).toBeTruthy();
    expect(button('Publish')).toBeTruthy();
  });

  it('requires a title, description, valid address and thumbnail for a new event', async () => {
    await click('New event');
    expect(document.activeElement).toBe(element.querySelector('#event-title'));
    await submit();
    expect(api.saveEvent).not.toHaveBeenCalled();
    expect(element.querySelector('#event-title-error')!.textContent).toContain('title');
    expect(element.querySelector('#event-description-error')).not.toBeNull();
    expect(element.querySelector('#event-url-error')).not.toBeNull();
    expect(element.querySelector('#event-image-error')!.textContent).toContain(
      'Choose a thumbnail',
    );
    expect(element.querySelector('#event-title')!.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(element.querySelector('#event-title'));

    type('#event-title', 'Jazz');
    type('#event-description', 'Live jazz.');
    type('#event-url', 'javascript:alert(1)');
    await submit();
    expect(element.querySelector('#event-url-error')!.textContent).toContain('https://');
    expect(document.activeElement).toBe(element.querySelector('#event-url'));
  });

  it('rejects thumbnails of the wrong type or over 2 MB', async () => {
    await click('New event');
    await choose(new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }));
    expect(element.querySelector('#event-image-error')!.textContent).toContain('JPEG, PNG or WebP');
    await choose(png(2 * 1024 * 1024 + 1));
    expect(element.querySelector('#event-image-error')!.textContent).toContain('under 2 MB');
    expect(element.querySelector('.event-form__image img')).toBeNull();
    await choose(png());
    expect(element.querySelector('#event-image-error')).toBeNull();
    expect(element.querySelector('.event-form__image img')!.getAttribute('src')).toBe('blob:thumb');
  });

  it('allows at most four attendees and saves a new event with its thumbnail', async () => {
    await click('New event');
    type('#event-title', '  Jazz on the Roof ');
    type('#event-description', 'Live jazz.\n\nDoors at 18:00.');
    type('#event-url', 'https://www.quicket.co.za/events/1/');
    await choose(png());
    for (let i = 0; i < 4; i++) await click(i ? 'Add attendee' : 'Add attendee');
    expect(button('Four attendees is the most').disabled).toBe(true);
    const inputs = [...element.querySelectorAll<HTMLInputElement>('[data-attendee]')];
    expect(inputs).toHaveLength(4);
    expect(document.activeElement).toBe(inputs[3]);
    ['Thandiwe Mokoena', ' ', 'Pieter  V', 'Ayesha'].forEach((name, i) =>
      type(`#event-attendee-${i}`, name),
    );
    await fixture.whenStable();
    await submit();
    expect(api.saveEvent).toHaveBeenCalledWith(
      {
        title: 'Jazz on the Roof',
        description: 'Live jazz.\n\nDoors at 18:00.',
        url: 'https://www.quicket.co.za/events/1/',
        attendees: ['Thandiwe Mokoena', 'Pieter V', 'Ayesha'],
        published: true,
        image: expect.any(File),
      },
      undefined,
    );
    expect(element.querySelector('[role="status"]')!.textContent).toContain(
      'It is on the lift club page',
    );
    expect(element.querySelector('form')).toBeNull();
    expect(api.events).toHaveBeenCalledTimes(2);
  });

  it('edits an event, keeping its thumbnail unless a new one is chosen', async () => {
    button('Edit').click();
    await settle();
    expect(element.querySelector<HTMLInputElement>('#event-title')!.value).toBe('Jazz on the Roof');
    expect(element.querySelectorAll('[data-attendee]')).toHaveLength(2);
    type('#event-title', 'Jazz on the Roof II');
    element.querySelector<HTMLInputElement>('.event-form__publish input')!.click();
    await submit();
    expect(api.saveEvent).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Jazz on the Roof II', published: false, image: null }),
      'e1',
    );
  });

  it('shows the API’s reason when saving fails', async () => {
    api.saveEvent.mockRejectedValue(
      new HttpErrorResponse({ status: 413, error: { message: 'That image is too large.' } }),
    );
    button('Edit').click();
    await settle();
    await submit();
    expect(element.querySelector('form [role="alert"]')!.textContent).toContain(
      'That image is too large.',
    );
    expect(element.querySelector('form')).not.toBeNull();
  });

  it('lists members who added themselves, and removes one', async () => {
    fixture.destroy();
    const member = { userId: 'u1', name: 'Naledi M.', email: 'naledi@example.com' };
    api.events.mockResolvedValue([stored({ members: [member] })]);
    fixture = TestBed.createComponent(AdminEvents);
    element = fixture.nativeElement;
    await settle();
    const row = element.querySelector('.events__row')!;
    // Everyone on the event, as the lift club page shows them.
    expect(
      [...row.querySelectorAll('.events__people .sr-only')].map((name) => name.textContent),
    ).toEqual(['Thandiwe Mokoena', 'Pieter V', 'Naledi M.']);
    const listed = row.querySelector('.events__members li')!;
    expect(listed.textContent).toContain('Naledi M.');
    expect(listed.querySelector('a')!.getAttribute('href')).toBe('mailto:naledi@example.com');
    const remove = listed.querySelector<HTMLButtonElement>('button')!;
    expect(remove.getAttribute('aria-label')).toBe('Remove Naledi M. from Jazz on the Roof');
    remove.click();
    await settle();
    expect(api.removeEventMember).toHaveBeenCalledWith('e1', 'u1');
    expect(element.querySelector('[role="status"]')!.textContent).toContain(
      'Removed Naledi M. from “Jazz on the Roof”',
    );
  });

  it('leaves room in the form for members who added themselves', async () => {
    fixture.destroy();
    const members = ['a', 'b'].map((id) => ({ userId: id, name: id, email: null }));
    api.events.mockResolvedValue([stored({ members })]);
    fixture = TestBed.createComponent(AdminEvents);
    element = fixture.nativeElement;
    await settle();
    button('Edit').click();
    await settle();
    expect(element.querySelector('.event-form__members')!.textContent).toContain(
      'room for 2 more names',
    );
    // Two names are already typed: no room for a third.
    expect(button('No more room').disabled).toBe(true);
  });

  it('publishes and unpublishes, and deletes only after a second click', async () => {
    await click('Unpublish');
    expect(api.publishEvent).toHaveBeenCalledWith('e1', false);
    await click('Publish');
    expect(api.publishEvent).toHaveBeenCalledWith('e2', true);

    button('Delete').click();
    await settle();
    expect(api.deleteEvent).not.toHaveBeenCalled();
    await click('Keep');
    button('Delete').click();
    await settle();
    await click('Yes, delete');
    expect(api.deleteEvent).toHaveBeenCalledWith('e1');
    expect(element.querySelector('[role="status"]')!.textContent).toContain(
      'Deleted “Jazz on the Roof”',
    );
  });
});

describe('event rules', () => {
  const valid = {
    title: 'Jazz',
    description: 'Live jazz.',
    url: 'https://www.quicket.co.za/events/1/',
    attendees: [],
    image: null,
    hasImage: true,
  };

  it('accepts public web addresses only', () => {
    expect(isEventUrl('https://www.quicket.co.za/events/1/')).toBe(true);
    expect(isEventUrl('http://example.org')).toBe(true);
    for (const bad of [
      '',
      'quicket',
      'ftp://x.com',
      'https://localhost/x',
      'https://127.0.0.1',
      'https://a:b@x.com',
    ]) {
      expect(isEventUrl(bad)).toBe(false);
    }
  });

  it('limits attendees to four names of 60 characters', () => {
    expect(validateEvent({ ...valid, attendees: ['A', 'B', 'C', 'D', ' '] })).toEqual({});
    expect(validateEvent({ ...valid, attendees: ['A', 'B', 'C', 'D', 'E'] }).attendees).toContain(
      'four',
    );
    expect(validateEvent({ ...valid, attendees: ['x'.repeat(61)] }).attendees).toContain('60');
    expect(validateEvent({ ...valid, title: 'x'.repeat(121) }).title).toContain('120');
  });
});
