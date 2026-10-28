export type ServiceKind = 'lift-club' | 'referral-business' | 'general';

export const SERVICE_LABELS: Record<ServiceKind, string> = {
  'lift-club': 'Private lift club',
  'referral-business': 'Referral business consultation',
  general: 'General enquiry',
};

/** A date and time a user picked, as stored by /api/ribeiro/date-selections. */
export interface DateSelection {
  _id: string;
  user: string;
  /** YYYY-MM-DD in the user's own time zone. */
  selectedDate: string;
  /** HH:mm (24-hour) in the user's own time zone. */
  selectedTime: string;
  timeZone?: string;
  /** The same moment as an ISO-8601 UTC instant. */
  scheduledFor: string;
  service: ServiceKind;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewDateSelection = Pick<
  DateSelection,
  'selectedDate' | 'selectedTime' | 'timeZone' | 'scheduledFor' | 'service' | 'note'
>;
