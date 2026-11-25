/**
 * "Thandiwe Mokoena" → "TM", "Sipho" → "S", "anna van der merwe" → "AM": the first letters
 * of the first and last names, as the voice reviews show their speakers.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  // Array.from keeps letters outside the Basic Multilingual Plane whole.
  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : '';
  return (first + last).toLocaleUpperCase();
}
