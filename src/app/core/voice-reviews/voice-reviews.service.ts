import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/** A lift club voice review as anyone may see it. */
export interface PublishedReview {
  id: string;
  /** First name and surname initial, e.g. "Naledi M.". */
  name: string;
  initials: string;
  /** Seconds */
  duration: number;
  /** Loudness envelope, 0–1, drawn as the waveform. */
  peaks: number[];
  /** Increases with each new recording; part of the audio URL. */
  revision: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lift club voice reviews on the backend. Anyone may list and play them; a signed-in
 * member may publish one (replacing their earlier one) or delete it. Reviews are public
 * as soon as they are saved.
 */
@Injectable({ providedIn: 'root' })
export class VoiceReviewsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/voice-reviews`;

  async list(): Promise<PublishedReview[]> {
    return (await firstValueFrom(this.http.get<{ reviews: PublishedReview[] }>(this.url))).reviews;
  }

  async mine(): Promise<PublishedReview | null> {
    return (await firstValueFrom(this.http.get<{ review: PublishedReview | null }>(`${this.url}/mine`)))
      .review;
  }

  /** Uploads the recording as it is; its length and waveform travel in the query string. */
  async publish(audio: Blob, duration: number, peaks: readonly number[]): Promise<PublishedReview> {
    const request = this.http.put<{ review: PublishedReview }>(`${this.url}/mine`, audio, {
      params: { duration: duration.toFixed(2), peaks: peaks.join(',') },
      headers: { 'Content-Type': audio.type || 'audio/webm' },
    });
    return (await firstValueFrom(request)).review;
  }

  async remove(): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.url}/mine`));
  }

  /** Where a review's recording plays from; a new recording gets a new address. */
  audioUrl(review: Pick<PublishedReview, 'id' | 'revision'>): string {
    return `${this.url}/${review.id}/audio?v=${review.revision}`;
  }
}

/** "Naledi M.": how the backend names a member on their public review. */
export function publicName(user: { name?: string | null; surname?: string | null } | null): string {
  const words = [user?.name, user?.surname].filter(Boolean).join(' ').trim().split(/\s+/);
  const first = words[0] || 'Rider';
  const last = words.length > 1 ? words[words.length - 1] : '';
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}
