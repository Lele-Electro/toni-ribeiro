/**
 * Avatar circles: deep, muted tones that sit beside the booking table's greens. White
 * initials read at 4.5:1 or better on every one (see avatar-colours.spec.ts).
 */
export const AVATAR_COLOURS = [
  '#1b4f43', // forest (the table's own green)
  '#1f6f78', // teal
  '#a4492f', // terracotta
  '#8f6210', // ochre
  '#6b4a7a', // plum
  '#3d5a80', // slate blue
  '#5b6b2f', // olive
  '#8a3b5c', // raspberry
] as const;

/** FNV-1a: a small, stable string hash. */
const hash = (text: string): number => {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
};

/**
 * Picks each reviewer's colour from their name (or another seed), so it looks random but
 * stays the same on every visit and every device. Neighbouring rows never share a colour.
 */
export function avatarColours(seeds: readonly string[]): string[] {
  let previous = -1;
  return seeds.map((seed) => {
    let index = hash(seed) % AVATAR_COLOURS.length;
    if (index === previous) index = (index + 1) % AVATAR_COLOURS.length;
    previous = index;
    return AVATAR_COLOURS[index];
  });
}
