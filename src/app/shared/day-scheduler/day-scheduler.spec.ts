import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LiftBooking, LiftBookingsService } from '../../core/lift-bookings/lift-bookings.service';
import { AddressSearchService } from '../../core/maps/address-search.service';
import { DayScheduler } from './day-scheduler';
import { scheduleDays, slotInstant } from './scheduler-time';

describe('DayScheduler', () => {
  let fixture: ComponentFixture<DayScheduler>;
  let element: HTMLElement;
  const api = { availability: vi.fn(), mine: vi.fn(), save: vi.fn(), cancel: vi.fn() };
  const authenticated = signal(true);
  const user = signal<{ email: string; phone?: string | null }>({ email: 'ann@example.com' });
  const date = () => scheduleDays()[1].key;
  const journey = {
    whatsapp: '0821234567',
    pickup: { address: '12 Oxford Road, Rosebank' },
    dropoff: { address: 'OR Tambo International Airport' },
  };
  const booking = (): LiftBooking => ({
    _id: 'booking-1',
    serviceDate: date(),
    startHour: 8,
    passengers: 2,
    ...journey,
    revision: 1,
    scheduledFor: slotInstant(date(), 8),
    confirmationDueAt: new Date(Date.now() + 300000).toISOString(),
    status: 'pending',
  });

  beforeEach(async () => {
    authenticated.set(true);
    user.set({ email: 'ann@example.com' });
    api.availability.mockReset().mockResolvedValue([]);
    api.mine.mockReset().mockResolvedValue([]);
    api.save.mockReset().mockImplementation(async (payload) => ({ ...booking(), ...payload }));
    api.cancel.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value() {
        this.setAttribute('open', '');
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value() {
        this.removeAttribute('open');
      },
    });
    TestBed.configureTestingModule({
      imports: [DayScheduler],
      providers: [
        provideRouter([]),
        { provide: LiftBookingsService, useValue: api },
        { provide: AuthService, useValue: { isAuthenticated: authenticated, user } },
        {
          // Address search is unavailable in tests: the form must work with typed addresses.
          provide: AddressSearchService,
          useValue: { unavailable: signal(true), suggest: async () => [] },
        },
      ],
    });
    fixture = TestBed.createComponent(DayScheduler);
    element = fixture.nativeElement;
    await fixture.whenStable();
    (element.querySelectorAll('.day')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());
  const slot = (hour: number) => element.querySelectorAll<HTMLButtonElement>('.slot')[hour - 5];
  const type = (selector: string, value: string) => {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const fillJourney = () => {
    type('#whatsapp', '082 123 4567');
    type('#pickup', '12 Oxford Road, Rosebank');
    type('#dropoff', 'OR Tambo International Airport');
  };
  const submit = async () => {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  it('renders seven days and 21 hourly slots with the chosen date above the days', () => {
    expect(element.querySelectorAll('.day')).toHaveLength(7);
    expect(element.querySelectorAll('.slot')).toHaveLength(21);
    expect(element.querySelector('.day-pane h2')!.textContent).toContain(scheduleDays()[1].full);
    expect(element.querySelector('.next-day')!.textContent).toContain('After midnight');
  });

  it('opens a modal and persists the journey then marks the whole slot taken', async () => {
    slot(8).click();
    await fixture.whenStable();
    expect(element.querySelector('dialog')!.hasAttribute('open')).toBe(true);
    type('#travellers', '2');
    fillJourney();
    api.availability.mockResolvedValue([booking().scheduledFor]);
    api.mine.mockResolvedValue([booking()]);
    await submit();
    expect(api.save).toHaveBeenCalledWith(
      { serviceDate: date(), startHour: 8, passengers: 2, ...journey },
      undefined,
    );
    expect(slot(8).closest('.slot-row')!.classList.contains('slot-row--taken')).toBe(true);
    expect(slot(8).textContent).toContain('Your booking');
    expect(element.querySelector('dialog')!.hasAttribute('open')).toBe(false);
    expect(element.querySelector('.booking-message')!.textContent).toContain(
      'Please allow Toni to confirm the details with you on WhatsApp.',
    );
  });

  it('labels the new fields exactly and requires each of them', async () => {
    slot(8).click();
    await fixture.whenStable();
    const label = (id: string) => element.querySelector(`label[for="${id}"]`)!.textContent!.trim();
    expect(label('whatsapp')).toBe('WhatsApp number');
    expect(label('pickup')).toBe('Pickup location');
    expect(label('dropoff')).toBe('Drop-off location');

    await submit();
    expect(api.save).not.toHaveBeenCalled();
    for (const id of ['whatsapp', 'pickup', 'dropoff']) {
      const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
      expect(input.getAttribute('aria-required')).toBe('true');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toContain(`${id}-error`);
      expect(element.querySelector(`#${id}-error`)!.textContent).toMatch(/Enter your/);
    }
    expect(document.activeElement).toBe(element.querySelector('#whatsapp'));
    expect(element.querySelector('[role="alert"]')!.textContent).toContain('highlighted details');

    fillJourney();
    type('#whatsapp', '12345');
    await submit();
    expect(api.save).not.toHaveBeenCalled();
    expect(element.querySelector('#whatsapp-error')!.textContent).toContain(
      'valid WhatsApp number',
    );
    expect(element.querySelector('#pickup-error')).toBeNull();
  });

  it('starts from the account cellphone number, then from the booking being edited', async () => {
    user.set({ email: 'ann@example.com', phone: '+27821234567' });
    slot(9).click();
    await fixture.whenStable();
    expect(element.querySelector<HTMLInputElement>('#whatsapp')!.value).toBe('+27821234567');
    element.querySelector<HTMLButtonElement>('.dialog-close')!.click();

    api.availability.mockResolvedValue([booking().scheduledFor]);
    api.mine.mockResolvedValue([booking()]);
    await (fixture.componentInstance as unknown as { refresh(): Promise<void> }).refresh();
    await fixture.whenStable();
    slot(8).click();
    await fixture.whenStable();
    expect(element.querySelector<HTMLInputElement>('#whatsapp')!.value).toBe('0821234567');
    expect(element.querySelector<HTMLInputElement>('#pickup')!.value).toBe(journey.pickup.address);
    expect(element.querySelector<HTMLInputElement>('#dropoff')!.value).toBe(
      journey.dropoff.address,
    );
  });

  it('shows the booked marker with Toni and the car only on the member’s own booking', async () => {
    expect(element.querySelector('app-booked-marker')).toBeNull();
    api.availability.mockResolvedValue([booking().scheduledFor, slotInstant(date(), 10)]);
    api.mine.mockResolvedValue([booking()]);
    await (fixture.componentInstance as unknown as { refresh(): Promise<void> }).refresh();
    await fixture.whenStable();
    const markers = element.querySelectorAll('app-booked-marker');
    expect(markers).toHaveLength(1);
    expect(slot(8).contains(markers[0])).toBe(true);
    expect(markers[0].textContent).toContain('Thanks, Toni will be there 5 minutes early');
    const images = [...markers[0].querySelectorAll('img')];
    expect(images.map((image) => image.getAttribute('src'))).toEqual([
      'toni-home-page.png',
      'volvo_PNG78.png',
    ]);
    expect(images.every((image) => image.alt.length > 5)).toBe(true);
  });

  it('rejects more than three travellers before calling the API', async () => {
    slot(8).click();
    await fixture.whenStable();
    fillJourney();
    type('#travellers', '4');
    await submit();
    expect(api.save).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')!.textContent).toContain('between 1 and 3');
  });

  it('keeps unavailable rows disabled', async () => {
    api.availability.mockResolvedValue([slotInstant(date(), 8)]);
    await (fixture.componentInstance as unknown as { refresh(): Promise<void> }).refresh();
    await fixture.whenStable();
    expect(slot(8).disabled).toBe(true);
    expect(slot(8).textContent).toContain('Slot taken');
  });

  it('fails closed when availability cannot be loaded', async () => {
    api.availability.mockRejectedValue(new Error('offline'));
    await (fixture.componentInstance as unknown as { refresh(): Promise<void> }).refresh();
    await fixture.whenStable();
    expect(slot(8).disabled).toBe(true);
    expect(element.querySelector('[role="alert"]')!.textContent).toContain('Unable to load');
  });

  it('requires login while retaining the chosen day and hour', async () => {
    authenticated.set(false);
    slot(8).click();
    await fixture.whenStable();
    expect(element.querySelector('form')).toBeNull();
    const link = element.querySelector('dialog a')!;
    expect(link.getAttribute('href')).toContain('/login?returnUrl=');
    expect(decodeURIComponent(link.getAttribute('href')!)).toContain(`day=${date()}&hour=8`);
  });
});
