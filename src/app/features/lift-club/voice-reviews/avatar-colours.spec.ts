import { AVATAR_COLOURS, avatarColours } from './avatar-colours';

/** WCAG contrast ratio of white text on a #rrggbb background. */
const contrastWithWhite = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
};

describe('avatarColours', () => {
  it('keeps white initials readable on every colour', () => {
    for (const colour of AVATAR_COLOURS) expect(contrastWithWhite(colour)).toBeGreaterThan(4.5);
  });

  it('gives the same reviewer the same colour every time', () => {
    expect(avatarColours(['Thandiwe M.'])).toEqual(avatarColours(['Thandiwe M.']));
  });

  it('never gives neighbouring rows the same colour', () => {
    const names = Array.from({ length: 40 }, (_, i) => `Rider ${i % 5}`);
    const colours = avatarColours(names);
    for (let i = 1; i < colours.length; i++) expect(colours[i]).not.toBe(colours[i - 1]);
  });

  it('spreads different reviewers across the palette', () => {
    const names = ['Thandiwe M.', 'Pieter V.', 'Ayesha K.', 'Sipho N.', 'Lerato D.', 'Johan B.'];
    expect(new Set(avatarColours(names)).size).toBeGreaterThan(3);
  });
});
