import { DEFAULT_SHARE_IMAGE, LIFT_CLUB_PAGE, fullTitle, pageTags } from './page-tags';

const contentOf = (tags: ReturnType<typeof pageTags>, key: string) =>
  tags.find((tag) => ('property' in tag ? tag.property : tag.name) === key)?.content;

describe('pageTags', () => {
  const tags = pageTags({
    siteName: 'Toni Ribeiro',
    siteUrl: 'https://toniribeiro.co.za',
    title: fullTitle('Toni Ribeiro', LIFT_CLUB_PAGE.title),
    description: LIFT_CLUB_PAGE.description,
    url: 'https://toniribeiro.co.za/lift-club',
    robots: 'index, follow',
    image: LIFT_CLUB_PAGE.image,
  });

  it("shares the lift club with its own wide image, as an absolute URL", () => {
    expect(contentOf(tags, 'og:image')).toBe('https://toniribeiro.co.za/share-lift-club.jpg');
    expect(contentOf(tags, 'og:image:width')).toBe('1200');
    expect(contentOf(tags, 'og:image:height')).toBe('630');
    expect(contentOf(tags, 'og:image:alt')).toBe(LIFT_CLUB_PAGE.image.alt);
    expect(contentOf(tags, 'twitter:card')).toBe('summary_large_image');
  });

  it("keeps the page's own title and description", () => {
    expect(contentOf(tags, 'og:title')).toBe('Private Lift Club | Toni Ribeiro');
    expect(contentOf(tags, 'og:description')).toBe(LIFT_CLUB_PAGE.description);
    expect(contentOf(tags, 'description')).toBe(LIFT_CLUB_PAGE.description);
    expect(contentOf(tags, 'og:url')).toBe('https://toniribeiro.co.za/lift-club');
  });

  it('shares every other page with the portrait and leaves out tags that are not given', () => {
    const shell = pageTags({
      siteName: 'Toni Ribeiro',
      siteUrl: 'https://toniribeiro.co.za',
      title: 'Toni Ribeiro',
      description: 'About Toni',
    });
    expect(contentOf(shell, 'og:url')).toBeUndefined();
    expect(contentOf(shell, 'robots')).toBeUndefined();
    expect(contentOf(shell, 'og:image')).toBe('https://toniribeiro.co.za/share-toni-ribeiro.jpg');
    expect(contentOf(shell, 'og:image:width')).toBe(String(DEFAULT_SHARE_IMAGE.width));
    expect(contentOf(shell, 'og:image:height')).toBe(String(DEFAULT_SHARE_IMAGE.height));
    expect(contentOf(shell, 'twitter:card')).toBe('summary');
  });
});
