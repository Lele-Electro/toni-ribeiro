import { LiftBooking } from '../../core/lift-bookings/lift-bookings.service';

/** One hour of the selected day, as both the desktop table and the mobile widget show it. */
export interface SlotView {
  hour: number;
  /** Start time, e.g. "08:00". */
  label: string;
  /** Whole slot, e.g. "08:00 – 09:00". */
  range: string;
  state: 'available' | 'taken' | 'past' | 'mine';
  /** False while availability is loading or unknown, so nothing can be booked blind. */
  bookable: boolean;
  /** The signed-in member's own reservation for this hour. */
  booking?: LiftBooking;
}

/** What the booking table shows: its hours, or the lift club's events in their place. */
export type SchedulerView = 'times' | 'events';
