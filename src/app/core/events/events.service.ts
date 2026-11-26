import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/** An event has room for this many people: the owner's names and members who added themselves. */
export const EVENT_PLACES = 4;

/** A published lift club event, as anyone may see it. */
export interface LiftEvent {
  id: string;
  title: string;
  description: string;
  /** The event's own website or Quicket page. */
  url: string;
  /**
   * Up to four names, shown as initials circles: the owner's, then members who added
   * themselves (by first name and surname initial, e.g. "Naledi M.").
   */
  attendees: string[];
  /** Increases with each new thumbnail; part of the image URL. */
  imageRevision: number;
}

/** The event as it is now, after adding or removing the signed-in member. */
export interface AttendanceResult {
  event: LiftEvent;
  joined: boolean;
}

/**
 * The lift club's published events. Anyone may list them, signed in or not; a signed-in
 * member may add themselves to one ("Add me") and take themselves off again.
 */
@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/events`;

  /** Newest first. */
  async list(): Promise<LiftEvent[]> {
    return (await firstValueFrom(this.http.get<{ events: LiftEvent[] }>(this.url))).events;
  }

  /** The events the signed-in member has added themselves to. */
  async joined(): Promise<string[]> {
    return (await firstValueFrom(this.http.get<{ eventIds: string[] }>(`${this.url}/joined`)))
      .eventIds;
  }

  /** "Add me". Fails with 409 when the event is full. */
  attend(id: string): Promise<AttendanceResult> {
    return firstValueFrom(this.http.post<AttendanceResult>(`${this.url}/${id}/attendance`, {}));
  }

  /** Takes the signed-in member off the event. */
  leave(id: string): Promise<AttendanceResult> {
    return firstValueFrom(this.http.delete<AttendanceResult>(`${this.url}/${id}/attendance`));
  }

  /** Where an event's thumbnail loads from; a new thumbnail gets a new address. */
  imageUrl(event: Pick<LiftEvent, 'id' | 'imageRevision'>): string {
    return `${this.url}/${event.id}/image?v=${event.imageRevision}`;
  }
}
