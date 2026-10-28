import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DateSelection, NewDateSelection } from './date-selection.model';

@Injectable({ providedIn: 'root' })
export class DateSelectionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/date-selections`;

  private readonly items = signal<DateSelection[]>([]);
  /** The signed-in user's selections, soonest first. */
  readonly selections = this.items.asReadonly();

  async load(): Promise<void> {
    const { dateSelections } = await firstValueFrom(
      this.http.get<{ dateSelections: DateSelection[] }>(this.baseUrl),
    );
    this.items.set(dateSelections);
  }

  async create(selection: NewDateSelection): Promise<DateSelection> {
    const { dateSelection } = await firstValueFrom(
      this.http.post<{ dateSelection: DateSelection }>(this.baseUrl, selection),
    );
    this.items.update((items) =>
      [...items, dateSelection].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)),
    );
    return dateSelection;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/${id}`));
    this.items.update((items) => items.filter((item) => item._id !== id));
  }
}

/**
 * Turns the wall-clock date and time a user picked into the payload the API stores,
 * resolving it in the browser's time zone.
 */
export function toNewDateSelection(input: {
  date: string;
  time: string;
  service: NewDateSelection['service'];
  note: string;
}): NewDateSelection {
  // "YYYY-MM-DDTHH:mm" without an offset is parsed as local time
  const scheduledFor = new Date(`${input.date}T${input.time}`);
  return {
    selectedDate: input.date,
    selectedTime: input.time,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    scheduledFor: scheduledFor.toISOString(),
    service: input.service,
    note: input.note.trim() || undefined,
  };
}
