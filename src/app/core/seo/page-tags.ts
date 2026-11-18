// No imports on purpose: scripts/build-afrihost.mjs loads this file too (Node strips the
// types), so the static pages uploaded to Afrihost carry exactly the tags the app sets.

export const DEFAULT_DESCRIPTION =
  'Toni Ribeiro runs a private lift club for safe, scheduled shared commuting, and a referral business that rewards you for introductions.';

/** The picture shown when a page is shared, for example on WhatsApp or Facebook. */
export interface ShareImage {
  /** File in public/, relative to the site root. */
  path: string;
  type: string;
  width: number;
  height: number;
  alt: string;
  /** "summary" shows a square thumbnail; "summary_large_image" a wide banner. */
  twitterCard: 'summary' | 'summary_large_image';
}

/** Shared with every page except the lift club. Keep share images under 300 KB for WhatsApp. */
export const DEFAULT_SHARE_IMAGE: ShareImage = {
  path: 'share-toni-ribeiro.jpg',
  type: 'image/jpeg',
  width: 1022,
  height: 1104,
  alt: 'Toni Ribeiro, smiling, above the address www.toniribeiro.co.za',
  // A large card would crop the portrait to a wide strip through the face.
  twitterCard: 'summary',
};

/**
 * The lift club is rendered in the browser, never ahead of time, so the Afrihost build writes
 * these values into a static copy of the app shell for link previews (which never run
 * JavaScript). app.routes.ts uses the same values.
 */
export const LIFT_CLUB_PAGE = {
  path: 'lift-club',
  title: 'Private Lift Club',
  description:
    'Toni Ribeiro runs a private lift club for safe, scheduled shared commuting. Rosebank, Illovo, Sandton, Morningside, and Bryanston are the main pickup points. Join the club to get a lift or refer a friend to earn rewards.',
  image: {
    path: 'share-lift-club.jpg',
    type: 'image/jpeg',
    width: 1200,
    height: 630,
    alt: 'The TR logo beside Toni’s red Volvo S60',
    twitterCard: 'summary_large_image',
  },
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
  /** Defaults to {@link DEFAULT_SHARE_IMAGE}. */
  image?: ShareImage;
}

/** A `<meta>` tag, identified by `name` or, for Open Graph, by `property`. */
export type PageTag = { name: string; content: string } | { property: string; content: string };

/** The browser tab title for a route's `title` (or for a route without one). */
export function fullTitle(siteName: string, pageTitle?: string): string {
  return pageTitle ? `${pageTitle} | ${siteName}` : `${siteName} | Tailored Services`;
}

/** Search and link-preview tags for a page. */
export function pageTags(page: PageTagInput): PageTag[] {
  const share = page.image ?? DEFAULT_SHARE_IMAGE;
  const image = new URL(share.path, page.siteUrl).href;
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
    { property: 'og:image:type', content: share.type },
    { property: 'og:image:width', content: String(share.width) },
    { property: 'og:image:height', content: String(share.height) },
    { property: 'og:image:alt', content: share.alt },
    { name: 'twitter:card', content: share.twitterCard },
  );
  return tags;
}
