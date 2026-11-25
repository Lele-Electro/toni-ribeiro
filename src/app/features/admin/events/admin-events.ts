import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AdminEvent, AdminService } from '../../../core/admin/admin.service';
import { httpErrorMessage } from '../../../core/http-error-message';
import { avatarColours } from '../../lift-club/voice-reviews/avatar-colours';
import { initialsOf } from '../../lift-club/events/initials';
import {
  EVENT_LIMITS,
  EventErrors,
  EventField,
  attendeeNames,
  imageError,
  validateEvent,
} from './event-rules';

const FIELD_ORDER: EventField[] = ['title', 'description', 'url', 'image', 'attendees'];

/**
 * The admin page's Events section: create, edit, publish or unpublish and delete the events
 * shown in the lift club's Events view. Attendees are names the owner types (up to four);
 * they are not accounts and have nothing to do with bookings.
 */
@Component({
  selector: 'app-admin-events',
  templateUrl: './admin-events.html',
  styleUrl: './admin-events.scss',
})
export class AdminEvents {
  private readonly admin = inject(AdminService);
  private readonly injector = inject(Injector);
  protected readonly limits = EVENT_LIMITS;

  protected readonly events = signal<AdminEvent[] | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  /** Object URLs of the thumbnails, by event id. */
  protected readonly thumbnails = signal<Record<string, string>>({});
  /** The event being edited, 'new' for a new one, or null with the form closed. */
  protected readonly editing = signal<AdminEvent | 'new' | null>(null);
  /** The delete waiting for its second click. */
  protected readonly confirming = signal<string | null>(null);
  protected readonly busy = signal(false);

  // The form.
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly url = signal('');
  protected readonly attendees = signal<string[]>([]);
  protected readonly published = signal(true);
  protected readonly image = signal<File | null>(null);
  protected readonly imagePreview = signal<string | null>(null);
  protected readonly errors = signal<EventErrors>({});
  protected readonly formError = signal<string | null>(null);
  protected readonly saving = signal(false);

  private readonly titleField = viewChild<ElementRef<HTMLInputElement>>('titleField');
  private readonly fileField = viewChild<ElementRef<HTMLInputElement>>('fileField');
  private readonly formElement = viewChild<ElementRef<HTMLFormElement>>('eventForm');

  protected readonly isNew = computed(() => this.editing() === 'new');
  /** The thumbnail the form shows: the new choice, or the event's current one. */
  protected readonly shownImage = computed(() => {
    const editing = this.editing();
    return (
      this.imagePreview() ??
      (editing && editing !== 'new' ? (this.thumbnails()[editing.id] ?? null) : null)
    );
  });
  protected readonly canAddAttendee = computed(
    () => this.attendees().length < EVENT_LIMITS.attendees,
  );

  constructor() {
    // The session lives in the browser, so there is nothing to load on the server.
    afterNextRender(() => void this.load());
    inject(DestroyRef).onDestroy(() => {
      Object.values(this.thumbnails()).forEach((url) => URL.revokeObjectURL(url));
      this.setPreview(null);
    });
  }

  async load(): Promise<void> {
    this.loadError.set(null);
    try {
      const events = await this.admin.events();
      this.events.set(events);
      void this.loadThumbnails(events);
    } catch (error) {
      this.loadError.set(httpErrorMessage(error, 'The events could not be loaded.'));
    }
  }

  /** Drafts' thumbnails need the sign-in token, so each arrives as a Blob. */
  private async loadThumbnails(events: AdminEvent[]): Promise<void> {
    const entries = await Promise.all(
      events.map(async (event) => {
        try {
          return [event.id, URL.createObjectURL(await this.admin.eventImage(event))] as const;
        } catch {
          return null;
        }
      }),
    );
    const previous = this.thumbnails();
    this.thumbnails.set(Object.fromEntries(entries.filter((entry) => entry !== null)));
    Object.values(previous).forEach((url) => URL.revokeObjectURL(url));
  }

  protected initials(name: string): string {
    return initialsOf(name);
  }

  protected colours(event: AdminEvent): string[] {
    return avatarColours(event.attendees);
  }

  protected startNew(): void {
    this.open('new');
  }

  protected edit(event: AdminEvent): void {
    this.open(event);
  }

  private open(target: AdminEvent | 'new'): void {
    const event = target === 'new' ? null : target;
    this.title.set(event?.title ?? '');
    this.description.set(event?.description ?? '');
    this.url.set(event?.url ?? '');
    this.attendees.set([...(event?.attendees ?? [])]);
    this.published.set(event?.published ?? true);
    this.image.set(null);
    this.setPreview(null);
    this.errors.set({});
    this.formError.set(null);
    this.notice.set(null);
    this.actionError.set(null);
    this.confirming.set(null);
    this.editing.set(target);
    afterNextRender(
      () => {
        this.formElement()?.nativeElement.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
        this.titleField()?.nativeElement.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  protected cancel(): void {
    if (this.saving()) return;
    this.editing.set(null);
    this.setPreview(null);
  }

  protected setText(field: 'title' | 'description' | 'url', event: Event): void {
    this[field].set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
    this.clearError(field);
  }

  protected setPublished(event: Event): void {
    this.published.set((event.target as HTMLInputElement).checked);
  }

  protected setAttendee(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.attendees.update((list) => list.map((name, i) => (i === index ? value : name)));
    this.clearError('attendees');
  }

  protected addAttendee(): void {
    if (!this.canAddAttendee()) return;
    this.attendees.update((list) => [...list, '']);
    afterNextRender(
      () => {
        const inputs =
          this.formElement()?.nativeElement.querySelectorAll<HTMLInputElement>('[data-attendee]');
        inputs?.[inputs.length - 1]?.focus();
      },
      { injector: this.injector },
    );
  }

  protected removeAttendee(index: number): void {
    this.attendees.update((list) => list.filter((_, i) => i !== index));
    this.clearError('attendees');
  }

  protected chooseImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.clearError('image');
    if (!file) return;
    const problem = imageError(file);
    if (problem) {
      // Keep the previous choice; say why this one can't be used.
      input.value = '';
      this.errors.update((errors) => ({ ...errors, image: problem }));
      return;
    }
    this.image.set(file);
    this.setPreview(URL.createObjectURL(file));
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    const editing = this.editing();
    if (!editing || this.saving()) return;
    const value = {
      title: this.title(),
      description: this.description(),
      url: this.url(),
      attendees: this.attendees(),
      image: this.image(),
      hasImage: editing !== 'new',
    };
    const errors = validateEvent(value);
    this.errors.set(errors);
    const first = FIELD_ORDER.find((field) => errors[field]);
    if (first) {
      this.formError.set('Please correct the highlighted details.');
      this.focusField(first);
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    try {
      const saved = await this.admin.saveEvent(
        {
          title: value.title.trim(),
          description: value.description.trim(),
          url: value.url.trim(),
          attendees: attendeeNames(value.attendees),
          published: this.published(),
          image: value.image,
        },
        editing === 'new' ? undefined : editing.id,
      );
      this.editing.set(null);
      this.setPreview(null);
      this.notice.set(
        `Saved “${saved.title}”. ${saved.published ? 'It is on the lift club page.' : 'It is a draft: only you can see it.'}`,
      );
      await this.load();
    } catch (error) {
      this.formError.set(
        httpErrorMessage(error, 'The event could not be saved. Please try again.'),
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected togglePublished(event: AdminEvent): Promise<void> {
    return this.run(
      () => this.admin.publishEvent(event.id, !event.published),
      event.published
        ? `“${event.title}” is no longer on the lift club page.`
        : `“${event.title}” is now on the lift club page.`,
    );
  }

  protected ask(id: string): void {
    this.notice.set(null);
    this.actionError.set(null);
    this.confirming.set(id);
  }

  protected remove(event: AdminEvent): Promise<void> {
    return this.run(() => this.admin.deleteEvent(event.id), `Deleted “${event.title}”.`);
  }

  private async run(action: () => Promise<unknown>, done: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    try {
      await action();
      this.notice.set(done);
    } catch (error) {
      this.actionError.set(httpErrorMessage(error, 'That did not work. Please try again.'));
    } finally {
      this.confirming.set(null);
      this.busy.set(false);
      // Reload either way, so the list shows what is really stored.
      await this.load();
    }
  }

  private clearError(field: EventField): void {
    if (this.errors()[field]) this.errors.update((errors) => ({ ...errors, [field]: undefined }));
  }

  private focusField(field: EventField): void {
    const form = this.formElement()?.nativeElement;
    if (field === 'image') this.fileField()?.nativeElement.focus();
    else if (field === 'attendees') form?.querySelector<HTMLElement>('[data-attendee]')?.focus();
    else form?.querySelector<HTMLElement>(`#event-${field}`)?.focus();
  }

  private setPreview(url: string | null): void {
    const previous = this.imagePreview();
    if (previous) URL.revokeObjectURL(previous);
    this.imagePreview.set(url);
  }
}
