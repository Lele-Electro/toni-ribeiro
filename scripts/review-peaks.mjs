// Prints a voice review's length and waveform, ready to paste into
// src/app/features/lift-club/voice-reviews/sample-reviews.ts.
// Needs ffmpeg on PATH, or its location in the FFMPEG environment variable.
//
//   node scripts/review-peaks.mjs public/reviews/lerato.m4a
//
// The envelope matches envelope() in review-audio.ts: 96 RMS values scaled to 0–1.
import { spawnSync } from 'node:child_process';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/review-peaks.mjs <audio file>');
  process.exit(1);
}

const RATE = 8000;
const BINS = 96;
const ffmpeg = spawnSync(
  process.env.FFMPEG || 'ffmpeg',
  ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', '-'],
  { maxBuffer: 1 << 28 },
);
if (ffmpeg.error || ffmpeg.status !== 0) {
  console.error(ffmpeg.error?.message ?? ffmpeg.stderr.toString());
  process.exit(1);
}

const samples = new Float32Array(Uint8Array.from(ffmpeg.stdout).buffer);
const per = samples.length / BINS;
const raw = Array.from({ length: BINS }, (_, bin) => {
  const start = Math.floor(bin * per);
  const end = Math.max(start + 1, Math.floor((bin + 1) * per));
  let sum = 0;
  for (let i = start; i < end && i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / (end - start));
});
const loudest = Math.max(...raw) || 1;
const peaks = raw.map((value) => Math.round(Math.max(0.06, (value / loudest) ** 0.7) * 100) / 100);
const duration = Math.round((samples.length / RATE) * 100) / 100;

console.log(JSON.stringify({ duration, peaks }));
