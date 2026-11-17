// No imports on purpose: scripts/build-afrihost.mjs loads this file too (Node strips the
// types), so the static pages uploaded to Afrihost carry exactly the tags the app sets.

export const DEFAULT_DESCRIPTION =
  'Toni Ribeiro runs a private lift club for safe, scheduled shared commuting, and a referral business that rewards you for introductions.';

/** The picture shown whenever any page is shared, for example on WhatsApp or Facebook. */
export const SHARE_IMAGE = {
  path: 'booking-secure-face.jpg',
  type: 'image/jpeg',
  width: 400,
  height: 557,
  alt: 'Toni Ribeiro, smiling',
} as const;

/**
 * The lift club is rendered in the browser, never ahead of time, so the Afrihost build writes
 * these values into a static copy of the app shell for link previews (which never run
 * JavaScript). app.routes.ts uses the same values.
 */
export const LIFT_CLUB_PAGE = {
  path: 'lift-club',
  title: 'Private Lift Club',
  description:
    'Join a private lift club with vetted drivers, fixed routes and booked seats. Share the commute, split the cost and travel with people you know.',
} as const;

export interface PageTagInput {
  siteName: string;
  /** Public origin of the site, for example https://toniribeiro.co.za */
  siteUrl: string;
  /** The full title, as shown in the browser tab. */
  title: string;
  description: string;
  /** Absolute canonical URL. Leave out for a page served at many addresses. */
  url?: string;
  robots?: string;
}

/** A `<meta>` tag, identified by `name` or, for Open Graph, by `property`. */
export type PageTag = { name: string; content: string } | { property: string; content: string };

/** The browser tab title for a route's `title` (or for a route without one). */
export function fullTitle(siteName: string, pageTitle?: string): string {
  return pageTitle ? `${pageTitle} | ${siteName}` : `${siteName} | Tailored Services`;
}

/** Search and link-preview tags for a page, all sharing the same image. */
export function pageTags(page: PageTagInput): PageTag[] {
  const image = new URL(SHARE_IMAGE.path, page.siteUrl).href;
  const tags: PageTag[] = [{ name: 'description', content: page.description }];
  if (page.robots) tags.push({ name: 'robots', content: page.robots });
  tags.push(
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: page.siteName },
    { property: 'og:title', content: page.title },
    { property: 'og:description', content: page.description },
  );
  if (page.url) tags.push({ property: 'og:url', content: page.url });
  tags.push(
    { property: 'og:image', content: image },
    { property: 'og:image:type', content: SHARE_IMAGE.type },
    { property: 'og:image:width', content: String(SHARE_IMAGE.width) },
    { property: 'og:image:height', content: String(SHARE_IMAGE.height) },
    { property: 'og:image:alt', content: SHARE_IMAGE.alt },
    // "summary" shows the portrait as a square thumbnail; a large card would crop the face.
    { name: 'twitter:card', content: 'summary' },
  );
  return tags;
}
