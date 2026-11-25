import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { filter } from 'rxjs';
import { LIFT_CLUB_SEGMENTS } from './navigation';

const STORAGE_KEY = 'ribeiro.entry';
const LIFT_CLUB = 'lift-club';
/** /lift-club, /events and /reviews are all the lift club page. */
const onLiftClub = (page: string | null) => page !== null && LIFT_CLUB_SEGMENTS.includes(page);
/** Signing in from the lift club and coming back is part of the same visit. */
const SIGN_IN_PAGES = ['login', 'forgot-password', 'reset-password'];

/** The first path segment of a URL: '' for the home page, 'lift-club', 'login', … */
export function firstSegment(router: Router, url: string): string {
  try {
    return router.parseUrl(url).root.children[PRIMARY_OUTLET]?.segments[0]?.path ?? '';
  } catch {
    return '';
  }
}

/**
 * Where this tab's visit began. A visitor who arrives on the lift club from outside the site
 * (an email, a shared or social link, a search result, a bookmark, a typed address) has
 * Home disabled while they are on the lift club. Someone who reaches the lift club from
 * another of the site's pages keeps Home.
 *
 * The answer is kept in sessionStorage, which belongs to this tab, so it survives a
 * refresh and a detour through sign-in. document.referrer is only a hint: email apps,
 * direct visits and privacy settings leave it empty, and an empty referrer counts as
 * outside. On the server nothing is known, so nothing is disabled there or during hydration
 * (consumers also wait for hydration before using it).
 */
@Injectable({ providedIn: 'root' })
export class EntryContext {
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly storage = this.browser ? safeSessionStorage() : null;

  /** True while this tab's visit came from outside straight to the lift club. */
  private readonly fromOutside = signal(false);
  private readonly page = signal<string | null>(null);

  /** Home is disabled while an outside visitor is on the lift club page. */
  readonly homeDisabled = computed(() => this.fromOutside() && onLiftClub(this.page()));

  constructor() {
    if (!this.browser) return;
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => this.arrive(firstSegment(this.router, event.urlAfterRedirects)));
  }

  private arrive(page: string): void {
    const previous = this.page();
    const outside =
      previous === null ? this.firstPage(page) : next(this.fromOutside(), previous, page);
    this.page.set(page);
    this.fromOutside.set(outside);
    try {
      if (outside) this.storage?.setItem(STORAGE_KEY, LIFT_CLUB);
      else this.storage?.removeItem(STORAGE_KEY);
    } catch {
      // Storage full or blocked: the answer still holds for this page.
    }
  }

  /** The first page this document shows: a fresh arrival, a refresh, or Back/Forward. */
  private firstPage(page: string): boolean {
    let stored = false;
    try {
      stored = this.storage?.getItem(STORAGE_KEY) === LIFT_CLUB;
    } catch {
      // Unreadable storage: treat as a fresh visit.
    }
    const type = navigationType();
    // A refresh, or Back/Forward within this tab, carries on the visit as it was.
    if (type === 'reload' || type === 'back_forward') return stored && keeps(page);
    // A new page load: from outside unless the browser says one of our own pages led here.
    const from = sameOriginReferrer(this.router);
    return next(stored, from ?? null, page);
  }
}

/** Whether a visit that came from outside stays that way on this page. */
const keeps = (page: string) => onLiftClub(page) || SIGN_IN_PAGES.includes(page);

/**
 * The rule. `from` is the page the visitor came from (null: outside the site). Arriving on
 * the lift club from outside sets it; sign-in and the lift club itself keep it; any other
 * page of the site clears it, so a later visit to the lift club from there keeps Home.
 */
export function next(current: boolean, from: string | null, page: string): boolean {
  if (onLiftClub(page) && from === null) return true;
  if (!keeps(page)) return false;
  return from === null ? current : keeps(from) && current;
}

function navigationType(): string | undefined {
  const entry = globalThis.performance?.getEntriesByType?.('navigation')[0] as
    PerformanceNavigationTiming | undefined;
  if (entry?.type) return entry.type;
  // Older browsers: 1 is a reload, 2 is Back/Forward.
  const legacy = (globalThis.performance as { navigation?: { type: number } } | undefined)
    ?.navigation?.type;
  return legacy === 1 ? 'reload' : legacy === 2 ? 'back_forward' : undefined;
}

/** The referring page's first segment if it was one of ours; undefined otherwise. */
function sameOriginReferrer(router: Router): string | undefined {
  try {
    const referrer = new URL(globalThis.document?.referrer ?? '');
    if (referrer.origin !== globalThis.location?.origin) return undefined;
    return firstSegment(router, referrer.pathname + referrer.search);
  } catch {
    return undefined;
  }
}

function safeSessionStorage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    // Some privacy modes throw on access.
    return null;
  }
}
