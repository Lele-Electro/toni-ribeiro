import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import {
  BookingPlace,
  LiftBooking,
  LiftBookingsService,
} from '../../core/lift-bookings/lift-bookings.service';
import { httpErrorMessage } from '../../core/http-error-message';
import { PlaceAutocomplete } from '../place-autocomplete/place-autocomplete';
import { BookedMarker } from '../booked-marker/booked-marker';
import { EventBrowser } from '../../features/lift-club/events/event-browser';
import { EventStore } from '../../features/lift-club/events/event-store';
import { MobileBookingWidget } from './mobile-booking-widget';
import { SchedulerView, SlotView } from './slot-view';
import {
  SLOT_HOURS,
  dateAfter,
  hourLabel,
  scheduleDays,
  slotInstant,
  slotLabel,
} from './scheduler-time';

type ContactField = 'whatsapp' | 'pickup' | 'dropoff';

/** Shown after a booking is saved and repeated in the confirmation email. */
export const WHATSAPP_NOTE = 'Please allow Toni to confirm the details with you on WhatsApp.';

const normaliseWhatsapp = (value: string) => value.trim().replace(/[\s().-]/g, '');

@Component({
  selector: 'app-day-scheduler',
  imports: [RouterLink, PlaceAutocomplete, MobileBookingWidget, BookedMarker, EventBrowser],
  templateUrl: './day-scheduler.html',
  styleUrl: './day-scheduler.scss',
  // One list of events and one search, shared by the desktop table and the phone widget.
  providers: [EventStore],
})
export class DayScheduler {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(LiftBookingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly events = inject(EventStore);
  /** "See reviews" was pressed, on the desktop table or the mobile widget. */
  readonly seeReviews = output<void>();
  /**
   * What the table shows: the booking times, or the events in their place. The page decides
   * (from its address: /lift-club or /events); the table asks for a change through
   * viewChange. Both views stay mounted, so the day, the hour chosen on the phone and any
   * message survive a visit to the events.
   */
  readonly view = input<SchedulerView>('times');
  readonly viewChange = output<SchedulerView>();
  /** Where focus goes once a view this table asked for shows; null to leave it. */
  private pendingFocus: string | null = null;
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('bookingDialog');
  private readonly whatsappField = viewChild<ElementRef<HTMLInputElement>>('whatsappField');
  private readonly pickupField = viewChild<PlaceAutocomplete>('pickupField');
  private readonly dropoffField = viewChild<PlaceAutocomplete>('dropoffField');
  protected readonly days = signal(scheduleDays());
  protected readonly selectedDate = signal(this.days()[0].key);
  protected readonly selectedDay = computed(() =>
    this.days().find((day) => day.key === this.selectedDate())!,
  );
  protected readonly hours = SLOT_HOURS;
  protected readonly hourLabel = hourLabel;
  protected readonly slotLabel = slotLabel;
  protected readonly whatsappNote = WHATSAPP_NOTE;
  protected readonly nextDate = computed(() => dateAfter(this.selectedDate(), 1));
  protected readonly now = signal(Date.now());
  protected readonly taken = signal<string[]>([]);
  protected readonly bookings = signal<LiftBooking[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly message = signal('');
  protected readonly modalHour = signal<number | null>(null);
  protected readonly editing = signal<LiftBooking | undefined>(undefined);
  protected readonly passengers = signal(1);
  protected readonly whatsapp = signal('');
  protected readonly pickup = signal<BookingPlace>({ address: '' });
  protected readonly dropoff = signal<BookingPlace>({ address: '' });
  /** Inline messages for the contact fields; shown once the member tries to save. */
  protected readonly fieldErrors = signal<Partial<Record<ContactField, string>>>({});
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly loginReturnUrl = computed(
    () => `/lift-club?day=${this.selectedDate()}&hour=${this.modalHour() ?? 5}`,
  );
  /** The selected day's hours, shared by the desktop table and the mobile widget. */
  protected readonly slots = computed<SlotView[]>(() => {
    const bookable = !this.loading() && !this.loadError();
    return SLOT_HOURS.map((hour) => {
      const booking = this.ownBooking(hour);
      const past = this.isPast(hour);
      return {
        hour,
        label: hourLabel(hour),
        range: slotLabel(hour),
        state: booking ? 'mine' : past ? 'past' : this.isTaken(hour) ? 'taken' : 'available',
        bookable: bookable && !past,
        booking,
      };
    });
  });
  /**
   * True at phone widths. The widget (and its ticking clock) is created only there, and
   * only in the browser; the server can't know the viewport.
   */
  protected readonly mobile = signal(false);
  private requestVersion = 0;
  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.requestVersion++;
    });
    // The events load when they first show, including at /events, but never on the server.
    // A switch this table asked for moves focus to its view once that has rendered.
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    let shown: SchedulerView | undefined;
    effect(() => {
      const view = this.view();
      untracked(() => {
        if (view === 'events' && browser) void this.events.load();
        const focus = shown !== undefined && shown !== view ? this.pendingFocus : null;
        this.pendingFocus = null;
        shown = view;
        if (focus)
          afterNextRender(() => void this.focusVisible(focus), { injector: this.injector });
      });
    });
    afterNextRender(() => {
      const phone = globalThis.matchMedia?.('(max-width: 40rem)');
      if (phone) {
        const sync = () => this.mobile.set(phone.matches);
        sync();
        phone.addEventListener('change', sync);
        this.destroyRef.onDestroy(() => phone.removeEventListener('change', sync));
      }
      void this.initialize();
      const timer = setInterval(() => {
        this.now.set(Date.now());
        const days = scheduleDays();
        if (days[0].key !== this.days()[0].key) {
          this.days.set(days);
          if (!days.some((day) => day.key === this.selectedDate())) {
            this.selectedDate.set(days[0].key);
            this.dialog()?.nativeElement.close();
            this.message.set('A new day has started. Please choose a departure again.');
          }
        }
        void this.refresh();
      }, 30_000);
      this.destroyRef.onDestroy(() => clearInterval(timer));
    });
  }

  private async initialize(): Promise<void> {
    const query = this.route.snapshot.queryParamMap;
    const day = query.get('day');
    if (day && this.days().some((item) => item.key === day)) this.selectedDate.set(day);
    await this.refresh();
    const hour = Number(query.get('hour'));
    if (
      !this.destroyed &&
      this.auth.isAuthenticated() &&
      day &&
      SLOT_HOURS.includes(hour) &&
      !this.unavailable(hour)
    ) {
      this.openSlot(hour);
      void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  protected showEvents(): void {
    this.request('events', '[data-events-heading]');
  }

  /** Back to the booking times; focus returns to the Events control that opened the events. */
  protected showTimes(): void {
    this.request('times', '[data-events-toggle]');
  }

  protected toggleEvents(): void {
    if (this.view() === 'events') this.showTimes();
    else this.showEvents();
  }

  /** Picking a day is picking a departure, so the booking times come back. Focus stays put. */
  protected selectDay(key: string): void {
    this.selectedDate.set(key);
    this.request('times', null);
  }

  /** Asks the page for another view; focus moves once it shows (see the constructor). */
  private request(view: SchedulerView, focus: string | null): void {
    if (this.view() === view) return;
    this.pendingFocus = focus;
    this.viewChange.emit(view);
  }

  /** The events' heading, where it is on screen. False until it can take focus. */
  focusEventsHeading(): boolean {
    return this.focusVisible('[data-events-heading]');
  }

  /**
   * Focuses the copy on screen: the desktop table and the phone widget each have one, and
   * only one of them is displayed. False if it couldn't take focus (yet).
   */
  private focusVisible(selector: string): boolean {
    const targets = [...this.host.nativeElement.querySelectorAll<HTMLElement>(selector)];
    const target = targets.find((item) => item.getClientRects().length > 0) ?? targets[0];
    target?.focus({ preventScroll: true });
    return !!target && target.ownerDocument.activeElement === target;
  }

  protected async refresh(): Promise<void> {
    const version = ++this.requestVersion;
    try {
      const [taken, bookings] = await Promise.all([
        this.api.availability(),
        this.auth.isAuthenticated() ? this.api.mine() : Promise.resolve([]),
      ]);
      if (version !== this.requestVersion) return;
      this.taken.set(taken);
      this.bookings.set(bookings);
      this.loadError.set('');
    } catch (error) {
      if (version === this.requestVersion)
        this.loadError.set(httpErrorMessage(error, 'Unable to load available slots.'));
    } finally {
      if (version === this.requestVersion) this.loading.set(false);
    }
  }

  protected ownBooking(hour: number): LiftBooking | undefined {
    return this.bookings().find(
      (booking) => booking.scheduledFor === slotInstant(this.selectedDate(), hour),
    );
  }

  protected isPast(hour: number): boolean {
    return Date.parse(slotInstant(this.selectedDate(), hour)) <= this.now();
  }

  protected isTaken(hour: number): boolean {
    return this.taken().includes(slotInstant(this.selectedDate(), hour));
  }

  protected unavailable(hour: number): boolean {
    return this.loading() || !!this.loadError() || this.isPast(hour) || this.isTaken(hour);
  }

  protected openSlot(hour: number, booking?: LiftBooking): void {
    if (this.loading() || this.loadError() || this.isPast(hour) || (this.isTaken(hour) && !booking))
      return;
    this.modalHour.set(hour);
    this.editing.set(booking);
    this.passengers.set(booking?.passengers ?? 1);
    // Start from the booking's own details, then the cellphone number on the account.
    this.whatsapp.set(booking?.whatsapp ?? this.auth.user()?.phone ?? '');
    this.pickup.set(booking?.pickup ?? { address: '' });
    this.dropoff.set(booking?.dropoff ?? { address: '' });
    this.fieldErrors.set({});
    this.formError.set('');
    this.dialog()?.nativeElement.showModal();
  }

  protected closeDialog(): void {
    if (!this.saving()) this.dialog()?.nativeElement.close();
  }

  protected onCancel(event: Event): void {
    if (this.saving()) event.preventDefault();
  }

  protected setPassengers(event: Event): void {
    this.passengers.set(Number((event.target as HTMLInputElement).value));
  }

  protected setWhatsapp(event: Event): void {
    this.whatsapp.set((event.target as HTMLInputElement).value);
    this.clearError('whatsapp');
  }

  protected setPlace(field: 'pickup' | 'dropoff', place: BookingPlace): void {
    this[field].set(place);
    this.clearError(field);
  }

  private clearError(field: ContactField): void {
    if (this.fieldErrors()[field])
      this.fieldErrors.update((errors) => ({ ...errors, [field]: undefined }));
  }

  private validateContact(): Partial<Record<ContactField, string>> {
    const errors: Partial<Record<ContactField, string>> = {};
    const whatsapp = this.whatsapp();
    if (!whatsapp.trim()) errors.whatsapp = 'Enter your WhatsApp number.';
    else if (whatsapp.length > 40 || !/^\+?\d{7,15}$/.test(normaliseWhatsapp(whatsapp)))
      errors.whatsapp = 'Enter a valid WhatsApp number, such as 082 123 4567 or +27 82 123 4567.';
    for (const [field, name] of [
      ['pickup', 'pickup'],
      ['dropoff', 'drop-off'],
    ] as const) {
      const address = this[field]().address.trim();
      if (!address) errors[field] = `Enter your ${name} location.`;
      else if (address.length < 3) errors[field] = `Enter a fuller ${name} address.`;
    }
    return errors;
  }

  private focusField(field: ContactField): void {
    if (field === 'whatsapp') this.whatsappField()?.nativeElement.focus();
    else (field === 'pickup' ? this.pickupField() : this.dropoffField())?.focus();
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    const hour = this.modalHour();
    if (hour === null || this.saving() || !this.auth.isAuthenticated()) return;
    const errors = this.validateContact();
    this.fieldErrors.set(errors);
    const firstInvalid = (['whatsapp', 'pickup', 'dropoff'] as const).find(
      (field) => errors[field],
    );
    if (firstInvalid) {
      this.formError.set('Please complete the highlighted details to reserve your journey.');
      this.focusField(firstInvalid);
      return;
    }
    const passengers = this.passengers();
    if (!Number.isInteger(passengers) || passengers < 1 || passengers > 3) {
      this.formError.set('Choose between 1 and 3 travellers, including yourself.');
      return;
    }
    const place = (value: BookingPlace): BookingPlace => ({
      ...value,
      address: value.address.trim(),
    });
    this.saving.set(true);
    this.formError.set('');
    try {
      const booking = await this.api.save(
        {
          serviceDate: this.selectedDate(),
          startHour: hour,
          passengers,
          whatsapp: normaliseWhatsapp(this.whatsapp()),
          pickup: place(this.pickup()),
          dropoff: place(this.dropoff()),
        },
        this.editing(),
      );
      this.bookings.update((items) => [
        ...items.filter((item) => item._id !== booking._id),
        booking,
      ]);
      this.taken.update((items) => [...new Set([...items, booking.scheduledFor])]);
      this.dialog()?.nativeElement.close();
      this.message.set(
        `Slot reserved. ${WHATSAPP_NOTE} We’ll email your confirmation after 5 minutes without changes.`,
      );
      await this.refresh();
    } catch (error) {
      this.formError.set(
        httpErrorMessage(error, 'Your booking could not be saved. Please try again.'),
      );
      if (error instanceof HttpErrorResponse && error.status === 409) await this.refresh();
    } finally {
      this.saving.set(false);
    }
  }

  protected async cancelBooking(): Promise<void> {
    const booking = this.editing();
    if (!booking || this.saving()) return;
    this.saving.set(true);
    this.formError.set('');
    try {
      await this.api.cancel(booking);
      this.bookings.update((items) => items.filter((item) => item._id !== booking._id));
      this.taken.update((items) => items.filter((instant) => instant !== booking.scheduledFor));
      this.dialog()?.nativeElement.close();
      this.message.set('Booking cancelled. The slot is available again.');
      await this.refresh();
    } catch (error) {
      this.formError.set(httpErrorMessage(error, 'Unable to cancel your booking.'));
    } finally {
      this.saving.set(false);
    }
  }
}
