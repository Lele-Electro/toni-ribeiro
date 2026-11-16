/**
 * Routes whose pages have no content yet. Menus show them as disabled and logging in never
 * lands on them. Remove a path from this list once its page is ready.
 */
export const UNAVAILABLE_PATHS: readonly string[] = [
  '/referral-business',
  '/schedule',
  '/privacy',
  '/terms',
];

/** Where members arrive after logging in: the lift club booking table. */
export const AFTER_LOGIN_URL = '/lift-club';

/** True when the URL (query string and fragment ignored) leads to an unfinished page. */
export function isUnavailable(url: string): boolean {
  const path = url.split(/[?#]/)[0];
  return UNAVAILABLE_PATHS.includes(path);
}
