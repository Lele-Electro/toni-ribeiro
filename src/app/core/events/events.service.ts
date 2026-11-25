import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/** A published lift club event, as anyone may see it. */
export interface LiftEvent {
  id: string;
  title: string;
  description: string;
  /** The event's own website or Quicket page. */
  url: string;
  /** Up to four names, shown as initials circles. */
  attendees: string[];
  /** Increases with each new thumbnail; part of the image URL. */
  imageRevision: number;
}

/** The lift club's published events. Anyone may list them, signed in or not. */
@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/events`;

  /** Newest first. */
  async list(): Promise<LiftEvent[]> {
    return (await firstValueFrom(this.http.get<{ events: LiftEvent[] }>(this.url))).events;
  }

  /** Where an event's thumbnail loads from; a new thumbnail gets a new address. */
  imageUrl(event: Pick<LiftEvent, 'id' | 'imageRevision'>): string {
    return `${this.url}/${event.id}/image?v=${event.imageRevision}`;
  }
}
