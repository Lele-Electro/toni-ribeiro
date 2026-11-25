/**
 * The event form's rules. The API applies the same ones (backend/services/ribeiro-events.js);
 * checking here first gives the owner field-by-field messages before anything uploads.
 */
export const EVENT_LIMITS = {
  title: 120,
  description: 2000,
  url: 500,
  attendee: 60,
  attendees: 4,
  imageBytes: 2 * 1024 * 1024,
} as const;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type EventField = 'title' | 'description' | 'url' | 'image' | 'attendees';
export type EventErrors = Partial<Record<EventField, string>>;

export interface EventFormValue {
  title: string;
  description: string;
  url: string;
  attendees: readonly string[];
  /** A newly chosen thumbnail, if any. */
  image: File | null;
  /** An event that already has a thumbnail may keep it. */
  hasImage: boolean;
}

/** An absolute http(s) address on a public host, such as a Quicket page. */
export function isEventUrl(value: string): boolean {
  const text = value.trim();
  if (!text || text.length > EVENT_LIMITS.url) return false;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return (
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    !url.username &&
    !url.password &&
    host.includes('.') &&
    !host.endsWith('.') &&
    !/^[\d.]+$/.test(host) &&
    !host.startsWith('[')
  );
}

/** Null if the file can be a thumbnail. */
export function imageError(file: File): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type))
    return 'Use a JPEG, PNG or WebP image.';
  if (file.size > EVENT_LIMITS.imageBytes) return 'That image is too large. Use one under 2 MB.';
  return null;
}

/** Attendee names as they will be saved: trimmed, single-spaced, blanks dropped. */
export function attendeeNames(names: readonly string[]): string[] {
  return names.map((name) => name.trim().replace(/\s+/g, ' ')).filter(Boolean);
}

export function validateEvent(value: EventFormValue): EventErrors {
  const errors: EventErrors = {};
  const title = value.title.trim();
  if (!title) errors.title = 'Enter the event’s title.';
  else if (title.length > EVENT_LIMITS.title)
    errors.title = `Keep the title to ${EVENT_LIMITS.title} characters.`;
  const description = value.description.trim();
  if (!description) errors.description = 'Enter a description of the event.';
  else if (description.length > EVENT_LIMITS.description)
    errors.description = `Keep the description to ${EVENT_LIMITS.description} characters.`;
  if (!isEventUrl(value.url))
    errors.url = 'Enter the event’s web address, starting with https://, such as its Quicket page.';
  if (value.image) {
    const problem = imageError(value.image);
    if (problem) errors.image = problem;
  } else if (!value.hasImage) {
    errors.image = 'Choose a thumbnail image.';
  }
  const names = attendeeNames(value.attendees);
  if (names.length > EVENT_LIMITS.attendees) errors.attendees = 'Add at most four attendees.';
  else if (names.some((name) => name.length > EVENT_LIMITS.attendee))
    errors.attendees = `Keep each attendee’s name to ${EVENT_LIMITS.attendee} characters.`;
  return errors;
}
