import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LiftBooking } from '../../core/lift-bookings/lift-bookings.service';
import { MobileBookingWidget } from './mobile-booking-widget';
import { SLOT_HOURS, hourLabel, scheduleDays, slotLabel } from './scheduler-time';
import { SlotView } from './slot-view';

describe('MobileBookingWidget', () => {
  let fixture: ComponentFixture<MobileBookingWidget>;
  let element: HTMLElement;
  const days = scheduleDays();
  const mine = { _id: 'booking-1', passengers: 2 } as LiftBooking;
  const slots = (overrides: Record<number, Partial<SlotView>> = {}): SlotView[] =>
    SLOT_HOURS.map((hour) => ({
      hour,
      label: hourLabel(hour),
      range: slotLabel(hour),
      state: 'available',
      bookable: true,
      ...overrides[hour],
    }));
  const set = async (inputs: Record<string, unknown>) => {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  };
  const chip = (hour: number) => element.querySelector<HTMLButtonElement>(`[data-hour="${hour}"]`)!;
  const cta = () => element.querySelector<HTMLButtonElement>('.widget__cta')!;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [MobileBookingWidget] });
    fixture = TestBed.createComponent(MobileBookingWidget);
    element = fixture.nativeElement;
    await set({
      days,
      selectedDate: days[0].key,
      slots: slots({ 5: { state: 'past', bookable: false }, 6: { state: 'taken' } }),
    });
  });

  afterEach(() => fixture.destroy());

  it('shows the current day and steps between days within the seven-day window', async () => {
    const [previous, next] = element.querySelectorAll<HTMLButtonElement>('.widget__step');
    const changes: string[] = [];
    fixture.componentInstance.dateChange.subscribe((key) => changes.push(key));
    expect(element.querySelector('.widget__day-full')!.textContent).toContain(days[0].full);
    expect(previous.disabled).toBe(true);
    next.click();
    expect(changes).toEqual([days[1].key]);

    await set({ selectedDate: days[6].key });
    expect(element.querySelector('.widget__day-full')!.textContent).toContain(days[6].full);
    expect(next.disabled).toBe(true);
    previous.click();
    expect(changes).toEqual([days[1].key, days[5].key]);
  });

  it('offers every hour, preselects the first open one and reserves the chosen slot', async () => {
    const booked: unknown[] = [];
    fixture.componentInstance.book.subscribe((event) => booked.push(event));
    expect(element.querySelectorAll('.chip')).toHaveLength(21);
    expect(chip(7).getAttribute('aria-pressed')).toBe('true');
    expect(chip(5).getAttribute('aria-label')).toContain('Elapsed');
    expect(chip(6).getAttribute('aria-label')).toContain('Taken');
    expect(element.querySelector('.widget__count')!.textContent).toContain('19 slots open');

    chip(9).click();
    await fixture.whenStable();
    expect(chip(9).classList.contains('is-selected')).toBe(true);
    expect(cta().textContent).toContain(`Reserve ${slotLabel(9)}`);
    cta().click();
    expect(booked).toEqual([{ hour: 9, booking: undefined }]);
  });

  it('never books a taken or elapsed slot, or anything while availability is unknown', async () => {
    const booked: unknown[] = [];
    fixture.componentInstance.book.subscribe((event) => booked.push(event));
    chip(6).click();
    await fixture.whenStable();
    expect(cta().disabled).toBe(true);
    expect(cta().textContent).toContain('taken');

    await set({
      slots: slots().map((slot) => ({ ...slot, bookable: false })),
      loadError: 'Unable to load available slots.',
    });
    chip(9).click();
    await fixture.whenStable();
    expect(cta().disabled).toBe(true);
    expect(element.querySelector('[role="alert"]')!.textContent).toContain('Unable to load');
    cta().click();
    expect(booked).toEqual([]);
  });

  it('shows the booked marker and opens the member’s own booking for editing', async () => {
    const booked: unknown[] = [];
    fixture.componentInstance.book.subscribe((event) => booked.push(event));
    expect(element.querySelector('app-booked-marker')).toBeNull();
    await set({ slots: slots({ 8: { state: 'mine', booking: mine } }) });
    expect(chip(8).getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('app-booked-marker')!.textContent).toContain(
      'Thanks, Toni will be there 5 minutes early',
    );
    expect(element.querySelector('.widget__state')!.textContent).toContain('2 travellers');
    cta().click();
    expect(booked).toEqual([{ hour: 8, booking: mine }]);
  });

  it('includes the clock, which is not a control and cannot change the selection', async () => {
    const clock = element.querySelector('app-analog-clock')!;
    expect(clock.querySelector('button, a, input, [tabindex]')).toBeNull();
    const before = element.querySelector('.chip.is-selected')!.getAttribute('data-hour');
    (clock.querySelector('svg') as SVGElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await fixture.whenStable();
    expect(element.querySelector('.chip.is-selected')!.getAttribute('data-hour')).toBe(before);
  });
});
