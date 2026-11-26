import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import {
  AttendanceResult,
  EVENT_PLACES,
  EventsService,
  LiftEvent,
} from '../../../core/events/events.service';
import { httpErrorMessage } from '../../../core/http-error-message';

/**
 * The Events view's data, shared by the desktop table and the phone widget (DayScheduler
 * provides it), so the list and the search survive switching between them. Nothing loads
 * until a visitor first opens Events. For a signed-in member it also knows which events
 * they have added themselves to.
 */
@Injectable()
export class EventStore {
  private readonly api = inject(EventsService);
  private readonly auth = inject(AuthService);

  /** Published events, newest first; null until the first load finishes. */
  readonly events = signal<LiftEvent[] | null>(null);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  /** As typed in the search field. */
  readonly query = signal('');
  /** The events the signed-in member has added themselves to. */
  readonly joined = signal<ReadonlySet<string>>(new Set());
  /** The event whose "Add me" or "Remove me" is under way. */
  readonly pending = signal<string | null>(null);
  /** Why the last "Add me" or "Remove me" failed, and on which event. */
  readonly attendanceError = signal<{ id: string; message: string } | null>(null);

  /** Matches titles and full descriptions, ignoring case and surrounding spaces. */
  readonly results = computed(() => {
    const events = this.events();
    const query = this.query().trim().toLocaleLowerCase();
    if (!events || !query) return events;
    return events.filter(
      (event) =>
        event.title.toLocaleLowerCase().includes(query) ||
        event.description.toLocaleLowerCase().includes(query),
    );
  });

  private readonly loaded = computed(() => this.events() !== null);

  constructor() {
    // Once the events are on screen, and whenever someone signs in or out, find out which
    // of them this member has joined.
    effect(() => {
      const userId = this.auth.user()?.userId ?? null;
      const loaded = this.loaded();
      untracked(() => {
        this.joined.set(new Set());
        if (userId && loaded) void this.loadJoined(userId);
      });
    });
  }

  /** Loads once; after a failure, loads again when asked. */
  async load(): Promise<void> {
    if (this.loading() || this.events()) return;
    this.loading.set(true);
    this.loadFailed.set(false);
    try {
      this.events.set(await this.api.list());
    } catch {
      this.loadFailed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  isFull(event: LiftEvent): boolean {
    return event.attendees.length >= EVENT_PLACES;
  }

  /** "Add me": puts the signed-in member on the event. */
  join(event: LiftEvent): Promise<void> {
    return this.change(
      event,
      () => this.api.attend(event.id),
      'You couldn’t be added. Please try again.',
    );
  }

  /** "Remove me": takes them off again. */
  leave(event: LiftEvent): Promise<void> {
    return this.change(
      event,
      () => this.api.leave(event.id),
      'You couldn’t be removed. Please try again.',
    );
  }

  imageUrl(event: LiftEvent): string {
    return this.api.imageUrl(event);
  }

  private async loadJoined(userId: string): Promise<void> {
    try {
      const ids = await this.api.joined();
      // Ignore an answer for someone who has since signed out.
      if (this.auth.user()?.userId === userId) this.joined.set(new Set(ids));
    } catch {
      // The buttons then offer "Add me", and adding someone already there changes nothing.
    }
  }

  private async change(
    event: LiftEvent,
    request: () => Promise<AttendanceResult>,
    fallback: string,
  ): Promise<void> {
    if (this.pending()) return;
    this.pending.set(event.id);
    this.attendanceError.set(null);
    try {
      this.apply(await request());
    } catch (error) {
      // A full event comes back as it is now, so its circles catch up too.
      const current = (error as HttpErrorResponse | null)?.error?.event as LiftEvent | undefined;
      if (current?.id === event.id) this.replace(current);
      this.attendanceError.set({ id: event.id, message: httpErrorMessage(error, fallback) });
    } finally {
      this.pending.set(null);
    }
  }

  private apply({ event, joined }: AttendanceResult): void {
    this.replace(event);
    this.joined.update((ids) => {
      const next = new Set(ids);
      if (joined) next.add(event.id);
      else next.delete(event.id);
      return next;
    });
  }

  private replace(event: LiftEvent): void {
    this.events.update(
      (list) => list?.map((item) => (item.id === event.id ? event : item)) ?? null,
    );
  }
}
