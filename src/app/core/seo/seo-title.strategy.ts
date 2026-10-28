import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SITE_NAME } from '../site.config';

const DEFAULT_DESCRIPTION =
  'Toni Ribeiro runs a private lift club for safe, scheduled shared commuting, and a referral business that rewards you for introductions.';

/**
 * Route data understood by {@link SeoTitleStrategy}, alongside the route's `title`.
 * Runs during server rendering too, so crawlers get the tags in the initial HTML.
 */
export interface SeoRouteData {
  description?: string;
  /** Defaults to "index, follow". */
  robots?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    const title = pageTitle
      ? `${pageTitle} | ${SITE_NAME}`
      : `${SITE_NAME} | Private Lift Club & Referral Business`;
    const data = this.deepestChild(snapshot.root).data as SeoRouteData;
    const description = data.description ?? DEFAULT_DESCRIPTION;
    const url = new URL(snapshot.url, environment.siteUrl);
    url.search = '';
    url.hash = '';

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: data.robots ?? 'index, follow' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url.href });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.setCanonical(url.href);
  }

  private deepestChild(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    return route.firstChild ? this.deepestChild(route.firstChild) : route;
  }

  private setCanonical(href: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = href;
  }
}
