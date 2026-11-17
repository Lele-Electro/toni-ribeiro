import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SITE_NAME } from '../site.config';
import { DEFAULT_DESCRIPTION, fullTitle, pageTags } from './page-tags';

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
    const title = fullTitle(SITE_NAME, this.buildTitle(snapshot));
    const data = this.deepestChild(snapshot.root).data as SeoRouteData;
    const url = new URL(snapshot.url, environment.siteUrl);
    url.search = '';
    url.hash = '';

    this.title.setTitle(title);
    for (const tag of pageTags({
      siteName: SITE_NAME,
      siteUrl: environment.siteUrl,
      title,
      description: data.description ?? DEFAULT_DESCRIPTION,
      url: url.href,
      robots: data.robots ?? 'index, follow',
    })) {
      this.meta.updateTag(tag);
    }
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
