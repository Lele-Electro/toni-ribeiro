import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * A pickup or drop-off point. The address is always present; the Google Place ID and
 * coordinates exist only when the member picked a Places suggestion.
 */
export interface BookingPlace {
  address: string;
  placeId?: string;
  lat?: number;
  lng?: number;
}

export interface LiftBooking {
  _id: string;
  serviceDate: string;
  startHour: number;
  passengers: number;
  /** Absent only on reservations made before these details were collected. */
  whatsapp?: string;
  pickup?: BookingPlace;
  dropoff?: BookingPlace;
  scheduledFor: string;
  confirmationDueAt: string;
  confirmationSentAt?: string;
  revision: number;
  status: 'pending' | 'confirmed';
}

export interface BookingInput {
  serviceDate: string;
  startHour: number;
  passengers: number;
  whatsapp: string;
  pickup: BookingPlace;
  dropoff: BookingPlace;
}

@Injectable({ providedIn: 'root' })
export class LiftBookingsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/lift-bookings`;

  async availability(): Promise<string[]> {
    const response = await firstValueFrom(
      this.http.get<{ taken: string[] }>(`${this.url}/availability`),
    );
    return response.taken;
  }

  async mine(): Promise<LiftBooking[]> {
    return (await firstValueFrom(this.http.get<{ bookings: LiftBooking[] }>(this.url))).bookings;
  }

  async save(input: BookingInput, booking?: LiftBooking): Promise<LiftBooking> {
    const request = booking
      ? this.http.put<{ booking: LiftBooking }>(`${this.url}/${booking._id}`, {
          ...input,
          revision: booking.revision,
        })
      : this.http.post<{ booking: LiftBooking }>(this.url, input);
    return (await firstValueFrom(request)).booking;
  }

  async cancel(booking: LiftBooking): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.url}/${booking._id}`, { params: { revision: booking.revision } }),
    );
  }
}
