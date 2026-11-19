import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { avatarColours } from './avatar-colours';
import { ReviewPlayer } from './review-audio';
import { ReviewStore } from './review-store';
import { ReviewWaveform } from './review-waveform';
import { VOICE_REVIEWS, VoiceReview } from './sample-reviews';
import { VoiceRecorder } from './voice-recorder';

interface ReviewRow extends VoiceReview {
  own?: boolean;
  /** Background of the initials circle. */
  colour: string;
}

/**
 * The reverse face of the lift club booking card: everyone's voice reviews, one playing at
 * a time, and the signed-in member's own at the top. Until the first real review is
 * published, the labelled samples stand in.
 */
@Component({
  selector: 'app-voice-reviews',
  imports: [ReviewWaveform, VoiceRecorder],
  templateUrl: './voice-reviews.html',
  styleUrl: './voice-reviews.scss',
  providers: [ReviewPlayer, ReviewStore],
  host: { '[class.is-active]': 'active()' },
})
export class VoiceReviews {
  /** True while this face of the card is showing. */
  readonly active = input(false);
  readonly back = output<void>();

  protected readonly player = inject(ReviewPlayer);
  protected readonly store = inject(ReviewStore);
  private readonly auth = inject(AuthService);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  /** Null while loading or after a failed load; the template says which. */
  protected readonly reviews = computed<ReviewRow[] | null>(() => {
    const published = this.store.published();
    if (!published) return null;
    const mine = this.store.mine();
    const rows: (VoiceReview & { own?: boolean })[] = [
      ...(mine ? [{ ...mine, src: this.store.audioUrl(mine), own: true }] : []),
      ...published
        .filter((review) => review.id !== mine?.id)
        .map((review) => ({ ...review, src: this.store.audioUrl(review) })),
    ];
    const shown = rows.length ? rows : VOICE_REVIEWS;
    // Real reviewers' colours follow their review (one per account); samples their name.
    const colours = avatarColours(shown.map((row) => (row.sample ? row.name : row.id)));
    return shown.map((row, i) => ({ ...row, colour: colours[i] }));
  });

  constructor() {
    afterNextRender(() => void this.store.load());
    // The signed-in member's own review goes first; signed out, there is none.
    effect(() => {
      const userId = this.auth.user()?.userId ?? null;
      untracked(() => void this.store.use(userId));
    });
    // Nothing keeps playing behind the booking side.
    effect(() => {
      if (!this.active()) untracked(() => this.player.pause());
    });
  }

  /** False while the face is still hidden mid-turn, when nothing in it can take focus. */
  focusHeading(): boolean {
    const heading = this.heading().nativeElement;
    heading.focus({ preventScroll: true });
    return heading.ownerDocument.activeElement === heading;
  }

  protected describe(review: ReviewRow): string {
    return review.own ? 'your review' : `review from ${review.name}`;
  }
}
