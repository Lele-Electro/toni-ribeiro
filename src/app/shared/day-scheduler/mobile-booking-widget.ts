import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LiftBooking } from '../../core/lift-bookings/lift-bookings.service';
import { AnalogClock } from '../analog-clock/analog-clock';
import { BookedMarker } from '../booked-marker/booked-marker';
import { SlotView } from './slot-view';

interface DayView {
  key: string;
  label: string;
  short: string;
  full: string;
}

/**
 * The phone layout of the lift club scheduler: one day at a time, a swipeable row of
 * hours and a single large action. It holds no booking state of its own; days, slots and
 * availability come from DayScheduler, which also owns the booking dialog.
 */
@Component({
  selector: 'app-mobile-booking-widget',
  imports: [AnalogClock, BookedMarker],
  templateUrl: './mobile-booking-widget.html',
  styleUrl: './mobile-booking-widget.scss',
})
export class MobileBookingWidget {
  readonly days = input.required<DayView[]>();
  readonly selectedDate = input.required<string>();
  readonly slots = input.required<SlotView[]>();
  readonly loading = input(false);
  readonly loadError = input('');
  readonly message = input('');
  readonly dateChange = output<string>();
  readonly book = output<{ hour: number; booking?: LiftBooking }>();
  readonly retry = output<void>();

  private readonly carousel = viewChild<ElementRef<HTMLElement>>('carousel');
  /** The hour the member tapped; null until then, so the first open slot is suggested. */
  private readonly chosenHour = signal<number | null>(null);

  protected readonly dayIndex = computed(() =>
    Math.max(
      0,
      this.days().findIndex((day) => day.key === this.selectedDate()),
    ),
  );
  protected readonly day = computed(() => this.days()[this.dayIndex()]);
  protected readonly selected = computed<SlotView | undefined>(() => {
    const slots = this.slots();
    return (
      slots.find((slot) => slot.hour === this.chosenHour()) ??
      slots.find((slot) => slot.state === 'mine') ??
      slots.find((slot) => slot.state === 'available') ??
      slots[0]
    );
  });
  protected readonly openCount = computed(
    () => this.slots().filter((slot) => slot.state === 'available').length,
  );
  protected readonly canBook = computed(() => {
    const slot = this.selected();
    return !!slot && slot.bookable && (slot.state === 'available' || slot.state === 'mine');
  });

  constructor() {
    // Keep the selected hour in view, including after the day changes.
    afterRenderEffect(() => {
      const hour = this.selected()?.hour;
      this.selectedDate();
      const row = this.carousel()?.nativeElement;
      const chip = row?.querySelector<HTMLElement>(`[data-hour="${hour}"]`);
      if (!row || !chip) return;
      const left = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
      const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      row.scrollTo?.({ left, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  protected stepDay(offset: number): void {
    const next = this.days()[this.dayIndex() + offset];
    if (!next) return;
    this.chosenHour.set(null);
    this.dateChange.emit(next.key);
  }

  protected choose(slot: SlotView): void {
    this.chosenHour.set(slot.hour);
  }

  protected stepHour(offset: number): void {
    const slots = this.slots();
    const index = slots.findIndex((slot) => slot.hour === this.selected()?.hour);
    const next = slots[index + offset];
    if (next) this.chosenHour.set(next.hour);
  }

  protected confirm(): void {
    const slot = this.selected();
    if (slot && this.canBook()) this.book.emit({ hour: slot.hour, booking: slot.booking });
  }

  protected stateLabel(slot: SlotView): string {
    return { available: 'Open', taken: 'Taken', past: 'Elapsed', mine: 'Yours' }[slot.state];
  }
}
