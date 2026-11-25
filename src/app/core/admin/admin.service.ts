import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LiftEvent } from '../events/events.service';
import { BookingPlace } from '../lift-bookings/lift-bookings.service';

export interface AdminAccount {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
  /** Administrator accounts can't be deleted from the site. */
  isAdmin: boolean;
  /** How many bookings from today onwards belong to this account. */
  bookings: number;
}

export interface AdminBooking {
  _id: string;
  serviceDate: string;
  startHour: number;
  scheduledFor: string;
  passengers: number;
  whatsapp?: string;
  pickup?: BookingPlace;
  dropoff?: BookingPlace;
  status: 'pending' | 'confirmed';
  /** Null only if the member's account no longer exists. */
  member: { userId: string; name: string; email: string } | null;
}

export interface AdminVoiceReview {
  _id: string;
  /** As shown publicly, e.g. "Naledi M.". */
  name: string;
  initials: string;
  duration: number;
  revision: number;
  updatedAt: string;
  /** Null only if the member's account no longer exists. */
  member: { userId: string; name: string; email: string } | null;
}

export interface AdminOverview {
  accounts: AdminAccount[];
  bookings: AdminBooking[];
  /** Absent from backends older than voice reviews. */
  voiceReviews?: AdminVoiceReview[];
}

/** A lift club event as the owner manages it, drafts included. */
export interface AdminEvent extends LiftEvent {
  /** Shown on the lift club page only when true. */
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

/** What the event form saves. `image` is required for a new event, optional on edits. */
export interface EventDraft {
  title: string;
  description: string;
  url: string;
  attendees: string[];
  published: boolean;
  image?: File | null;
}

export interface PromotionalPreview {
  subject: string;
  /** The complete email, exactly as a recipient receives it. */
  html: string;
}

export interface PromotionalResult {
  email: string;
  status: 'sent' | 'failed';
  /** Why it failed, when it did. */
  message?: string;
}

export interface PromotionalSendResponse {
  /** True when this sendId had already been sent: nothing was emailed again. */
  duplicate: boolean;
  results: PromotionalResult[];
}

/** The owner's tools. The API allows them only for accounts it lists as administrators. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin`;

  /** Every account, and every booking from today onwards (soonest first). */
  overview(): Promise<AdminOverview> {
    return firstValueFrom(this.http.get<AdminOverview>(`${this.url}/overview`));
  }

  /** Every event, drafts included, newest first. */
  async events(): Promise<AdminEvent[]> {
    return (await firstValueFrom(this.http.get<{ events: AdminEvent[] }>(`${this.url}/events`)))
      .events;
  }

  /** Creates an event, or updates the one with `id`. One request, the thumbnail included. */
  async saveEvent(draft: EventDraft, id?: string): Promise<AdminEvent> {
    const form = new FormData();
    form.set('title', draft.title);
    form.set('description', draft.description);
    form.set('url', draft.url);
    form.set('attendees', JSON.stringify(draft.attendees));
    form.set('published', String(draft.published));
    if (draft.image) form.set('image', draft.image, draft.image.name);
    const request = id
      ? this.http.put<{ event: AdminEvent }>(`${this.url}/events/${id}`, form)
      : this.http.post<{ event: AdminEvent }>(`${this.url}/events`, form);
    return (await firstValueFrom(request)).event;
  }

  async publishEvent(id: string, published: boolean): Promise<AdminEvent> {
    const request = this.http.patch<{ event: AdminEvent }>(`${this.url}/events/${id}`, {
      published,
    });
    return (await firstValueFrom(request)).event;
  }

  async deleteEvent(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.url}/events/${id}`));
  }

  /**
   * A thumbnail, drafts' included. It needs the sign-in token, which an <img> can't send,
   * so it comes back as a Blob for an object URL.
   */
  eventImage(event: Pick<AdminEvent, 'id' | 'imageRevision'>): Promise<Blob> {
    return firstValueFrom(
      this.http.get(`${this.url}/events/${event.id}/image`, {
        params: { v: event.imageRevision },
        responseType: 'blob',
      }),
    );
  }

  /** The promotional email exactly as it would be sent. */
  previewPromotionalEmail(name: string, message: string): Promise<PromotionalPreview> {
    return firstValueFrom(
      this.http.post<PromotionalPreview>(`${this.url}/promotional-email/preview`, {
        name,
        message,
      }),
    );
  }

  /**
   * Sends one email per recipient. A repeated `sendId` returns the first send's results
   * instead of emailing anyone again.
   */
  sendPromotionalEmail(payload: {
    sendId: string;
    recipients: string[];
    name: string;
    message: string;
  }): Promise<PromotionalSendResponse> {
    return firstValueFrom(
      this.http.post<PromotionalSendResponse>(`${this.url}/promotional-email/send`, payload),
    );
  }

  /** Deletes one booking and frees its slot. The account stays. */
  async removeBooking(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.url}/bookings/${id}`));
  }

  /** Takes a voice review off the lift club page. The member may record another. */
  async removeVoiceReview(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.url}/voice-reviews/${id}`));
  }

  /** Deletes a member's account and everything stored against it, bookings included. */
  async deleteAccount(userId: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.url}/accounts/${userId}`));
  }

  /** Deletes every member account, booking and voice review. Administrator accounts stay. */
  async reset(): Promise<void> {
    await firstValueFrom(this.http.post(`${this.url}/reset`, { confirm: 'RESET' }));
  }
}
