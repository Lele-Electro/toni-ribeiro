import { Injectable, computed, inject, signal } from '@angular/core';
import { EventsService, LiftEvent } from '../../../core/events/events.service';

/**
 * The Events view's data, shared by the desktop table and the phone widget (DayScheduler
 * provides it), so the list and the search survive switching between them. Nothing loads
 * until a visitor first opens Events.
 */
@Injectable()
export class EventStore {
  private readonly api = inject(EventsService);

  /** Published events, newest first; null until the first load finishes. */
  readonly events = signal<LiftEvent[] | null>(null);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  /** As typed in the search field. */
  readonly query = signal('');

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

  imageUrl(event: LiftEvent): string {
    return this.api.imageUrl(event);
  }
}
