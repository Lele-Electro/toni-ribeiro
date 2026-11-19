import { Injectable, inject, signal } from '@angular/core';
import {
  PublishedReview,
  VoiceReviewsService,
} from '../../../core/voice-reviews/voice-reviews.service';

/**
 * The review panel's view of the backend: everyone's published reviews and the signed-in
 * member's own. Publishing or deleting updates both at once, so the list never waits for
 * a reload. Provided by VoiceReviews and shared with its recorder.
 */
@Injectable()
export class ReviewStore {
  private readonly api = inject(VoiceReviewsService);

  /** Everyone's reviews, newest first; null until the first load finishes. */
  readonly published = signal<PublishedReview[] | null>(null);
  readonly loadFailed = signal(false);
  /** The signed-in member's own review, if they have published one. */
  readonly mine = signal<PublishedReview | null>(null);
  private version = 0;

  async load(): Promise<void> {
    this.loadFailed.set(false);
    try {
      this.published.set(await this.api.list());
    } catch {
      this.loadFailed.set(true);
    }
  }

  /** Switches to an account's own review (or to none when signed out). */
  async use(userId: string | null): Promise<void> {
    const version = ++this.version;
    this.mine.set(null);
    if (!userId) return;
    try {
      const review = await this.api.mine();
      if (version === this.version) this.mine.set(review);
    } catch {
      // Their review, if any, still shows in the public list.
    }
  }

  /** Makes the recording public, replacing the member's earlier review. Throws on failure. */
  async publish(audio: Blob, duration: number, peaks: readonly number[]): Promise<PublishedReview> {
    const review = await this.api.publish(audio, duration, peaks);
    this.mine.set(review);
    this.published.update((list) => [review, ...(list ?? []).filter((item) => item.id !== review.id)]);
    return review;
  }

  /** Takes the member's review down. Throws on failure. */
  async remove(): Promise<void> {
    const id = this.mine()?.id;
    await this.api.remove();
    this.mine.set(null);
    this.published.update((list) => list?.filter((item) => item.id !== id) ?? null);
  }

  audioUrl(review: PublishedReview): string {
    return this.api.audioUrl(review);
  }
}
