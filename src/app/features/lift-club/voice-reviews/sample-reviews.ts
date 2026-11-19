import { ReviewTrack } from './review-audio';

export interface VoiceReview extends ReviewTrack {
  initials: string;
  /** Placeholder audio: labelled "Sample" on the page until real recordings replace it. */
  sample?: boolean;
}

/**
 * PLACEHOLDERS, labelled "Sample" on the page. The names are invented and each clip says
 * aloud that it is a sample. They show only while nobody has published a real review
 * (real reviews come from the backend, see ReviewStore) and disappear with the first one.
 *
 * The audio is in public/reviews/. scripts/review-peaks.mjs measures a clip's length and
 * waveform (see SCHEDULER.md, "Voice reviews").
 */
export const VOICE_REVIEWS: readonly VoiceReview[] = [
  {
    id: 'sample-1',
    name: 'Thandiwe M.',
    initials: 'TM',
    sample: true,
    src: 'reviews/sample-1.m4a',
    duration: 8.85,
    peaks: [
      0.06, 0.47, 0.73, 0.47, 0.42, 0.47, 0.82, 0.56, 0.69, 0.45, 0.8, 0.58, 0.16, 0.81, 0.43, 1,
      0.8, 0.81, 0.69, 0.66, 0.56, 0.68, 0.49, 0.3, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06,
      0.06, 0.06, 0.43, 0.6, 0.81, 0.69, 0.56, 0.71, 0.08, 0.16, 0.63, 0.62, 0.49, 0.66, 0.59,
      0.62, 0.14, 0.64, 0.22, 0.69, 0.63, 0.61, 0.54, 0.53, 0.09, 0.58, 0.63, 0.46, 0.62, 0.38,
      0.16, 0.06, 0.06, 0.06, 0.07, 0.59, 0.77, 0.83, 0.54, 0.59, 0.66, 0.3, 0.65, 0.62, 0.42,
      0.57, 0.35, 0.44, 0.64, 0.34, 0.56, 0.63, 0.45, 0.74, 0.68, 0.65, 0.52, 0.08, 0.36, 0.8,
      0.58, 0.44, 0.09, 0.06, 0.06,
    ],
  },
  {
    id: 'sample-2',
    name: 'Pieter V.',
    initials: 'PV',
    sample: true,
    src: 'reviews/sample-2.m4a',
    duration: 7.98,
    peaks: [
      0.06, 0.06, 0.14, 0.91, 0.84, 0.4, 0.98, 0.8, 0.61, 0.67, 0.92, 0.31, 0.86, 0.52, 0.06,
      0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.33, 0.77, 0.14, 0.83, 0.77, 0.25,
      0.67, 0.65, 0.22, 0.8, 0.91, 0.71, 0.52, 0.6, 0.63, 0.69, 0.49, 0.52, 1, 0.66, 0.8, 0.36,
      0.69, 0.69, 0.8, 0.73, 0.65, 0.06, 0.29, 0.75, 0.69, 0.42, 0.88, 0.7, 0.47, 0.51, 0.11,
      0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.64, 0.78, 0.84, 0.28, 0.61,
      0.19, 0.46, 0.86, 0.68, 0.17, 0.86, 0.49, 0.74, 0.45, 0.35, 0.59, 0.18, 0.48, 0.84, 0.59,
      0.45, 0.3, 0.06, 0.06, 0.06,
    ],
  },
  {
    id: 'sample-3',
    name: 'Ayesha K.',
    initials: 'AK',
    sample: true,
    src: 'reviews/sample-3.m4a',
    duration: 5.36,
    peaks: [
      0.06, 0.06, 0.06, 0.08, 0.31, 0.92, 0.82, 0.51, 0.81, 0.5, 0.12, 0.96, 1, 0.63, 0.41, 0.12,
      0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.83, 0.85,
      0.44, 0.98, 0.96, 0.36, 0.06, 0.11, 0.79, 0.77, 0.78, 0.85, 0.84, 0.76, 0.55, 0.61, 0.41,
      0.21, 0.76, 0.69, 0.49, 0.42, 0.31, 0.07, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.35,
      0.71, 0.29, 0.09, 0.7, 0.74, 0.71, 0.73, 0.73, 0.8, 0.49, 0.12, 0.67, 0.86, 0.74, 0.58,
      0.13, 0.74, 0.8, 0.48, 0.58, 0.46, 0.15, 0.67, 0.77, 0.79, 0.48, 0.64, 0.47, 0.49, 0.33,
      0.14, 0.06, 0.06, 0.06, 0.06,
    ],
  },
];
