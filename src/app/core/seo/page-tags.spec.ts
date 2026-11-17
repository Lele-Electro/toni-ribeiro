import { LIFT_CLUB_PAGE, SHARE_IMAGE, fullTitle, pageTags } from './page-tags';

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
  });

  it('shares every page with the portrait, as an absolute URL', () => {
    expect(contentOf(tags, 'og:image')).toBe('https://toniribeiro.co.za/booking-secure-face.jpg');
    expect(contentOf(tags, 'og:image:width')).toBe(String(SHARE_IMAGE.width));
    expect(contentOf(tags, 'og:image:height')).toBe(String(SHARE_IMAGE.height));
  });

  it("keeps the page's own title and description", () => {
    expect(contentOf(tags, 'og:title')).toBe('Private Lift Club | Toni Ribeiro');
    expect(contentOf(tags, 'og:description')).toBe(LIFT_CLUB_PAGE.description);
    expect(contentOf(tags, 'description')).toBe(LIFT_CLUB_PAGE.description);
    expect(contentOf(tags, 'og:url')).toBe('https://toniribeiro.co.za/lift-club');
  });

  it('leaves out the URL and robots tags when they are not given', () => {
    const shell = pageTags({
      siteName: 'Toni Ribeiro',
      siteUrl: 'https://toniribeiro.co.za',
      title: 'Toni Ribeiro',
      description: 'About Toni',
    });
    expect(contentOf(shell, 'og:url')).toBeUndefined();
    expect(contentOf(shell, 'robots')).toBeUndefined();
    expect(contentOf(shell, 'og:image')).toBe('https://toniribeiro.co.za/booking-secure-face.jpg');
  });
});
