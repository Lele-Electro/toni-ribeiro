import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
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

/** The owner's tools. The API allows them only for accounts it lists as administrators. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin`;

  /** Every account, and every booking from today onwards (soonest first). */
  overview(): Promise<AdminOverview> {
    return firstValueFrom(this.http.get<AdminOverview>(`${this.url}/overview`));
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
