import { Component, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { LiftEvent } from '../../../core/events/events.service';
import { avatarColours } from '../voice-reviews/avatar-colours';
import { EventStore } from './event-store';
import { initialsOf } from './initials';

interface Attendee {
  name: string;
  initials: string;
  /** Background of the initials circle. */
  colour: string;
}

/** The desktop table and the phone widget each hold one browser; their ids must differ. */
let nextId = 0;

/**
 * The lift club's published events, in place of the booking times (see DayScheduler and
 * MobileBookingWidget, which switch between the two). Open to everyone, signed in or not.
 * The list and the search live in EventStore, shared by both layouts.
 */
@Component({
  selector: 'app-event-browser',
  templateUrl: './event-browser.html',
  styleUrl: './event-browser.scss',
  host: {
    '[class.is-active]': 'active()',
    '(keydown.escape)': 'back.emit()',
  },
})
export class EventBrowser {
  /** True while this view is showing. */
  readonly active = input(false);
  /** "Back to booking times", or Escape. */
  readonly back = output<void>();

  protected readonly store = inject(EventStore);
  protected readonly id = `events-${++nextId}`;
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  private readonly search = viewChild.required<ElementRef<HTMLInputElement>>('search');

  /** False while the view is still hidden, when nothing in it can take focus. */
  focusHeading(): boolean {
    const heading = this.heading().nativeElement;
    heading.focus({ preventScroll: true });
    return heading.ownerDocument.activeElement === heading;
  }

  protected setQuery(event: Event): void {
    this.store.query.set((event.target as HTMLInputElement).value);
  }

  /** Escape in a filled search clears it; in an empty one it leaves the view, like anywhere else. */
  protected clearOnEscape(event: Event): void {
    if (!this.store.query()) return;
    event.preventDefault();
    event.stopPropagation();
    this.store.query.set('');
  }

  protected clearSearch(): void {
    this.store.query.set('');
    this.search().nativeElement.focus();
  }

  /** At most four circles, coloured like the voice reviews' (the same name, the same colour). */
  protected attendees(event: LiftEvent): Attendee[] {
    const names = event.attendees.slice(0, 4);
    const colours = avatarColours(names);
    return names.map((name, i) => ({ name, initials: initialsOf(name), colour: colours[i] }));
  }

  protected count(events: readonly LiftEvent[]): string {
    const total = this.store.events()?.length ?? 0;
    const noun = (n: number) => (n === 1 ? 'event' : 'events');
    return this.store.query().trim()
      ? `${events.length} of ${total} ${noun(total)} ${events.length === 1 ? 'matches' : 'match'}`
      : `${total} ${noun(total)}`;
  }
}
