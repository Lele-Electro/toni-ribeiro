import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { EntryContext, next } from './entry-context';

@Component({ template: '' })
class Page {}

describe('EntryContext', () => {
  let router: Router;
  let entry: EntryContext;
  const go = (url: string) => router.navigateByUrl(url);
  const stored = () => sessionStorage.getItem('ribeiro.entry');

  function start(platform = 'browser') {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Page }]),
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    router = TestBed.inject(Router);
    entry = TestBed.inject(EntryContext);
  }

  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('disables Home for a visit that begins on the lift club from outside', async () => {
    start();
    await go('/lift-club?reviews=1');
    expect(entry.homeDisabled()).toBe(true);
    expect(stored()).toBe('lift-club');
    // Tidying the address keeps it.
    await go('/lift-club');
    expect(entry.homeDisabled()).toBe(true);
  });

  it('keeps it through signing in and coming back, but not on the sign-in page itself', async () => {
    start();
    await go('/lift-club');
    await go('/login?returnUrl=%2Flift-club');
    expect(entry.homeDisabled()).toBe(false);
    expect(stored()).toBe('lift-club');
    await go('/forgot-password');
    await go('/lift-club?day=2026-11-26&hour=8');
    expect(entry.homeDisabled()).toBe(true);
  });

  it('lets visitors who came from another page of the site keep Home', async () => {
    start();
    await go('/');
    await go('/lift-club');
    expect(entry.homeDisabled()).toBe(false);
    expect(stored()).toBeNull();
  });

  it('clears once an outside visitor reaches another page of the site', async () => {
    start();
    await go('/lift-club');
    await go('/privacy');
    expect(stored()).toBeNull();
    await go('/lift-club');
    expect(entry.homeDisabled()).toBe(false);
  });

  it('survives a refresh of the lift club', async () => {
    sessionStorage.setItem('ribeiro.entry', 'lift-club');
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
      { type: 'reload' } as PerformanceNavigationTiming,
    ]);
    start();
    await go('/lift-club');
    expect(entry.homeDisabled()).toBe(true);
  });

  it('does not invent an outside visit on a refresh after arriving from the site', async () => {
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
      { type: 'reload' } as PerformanceNavigationTiming,
    ]);
    start();
    await go('/lift-club');
    expect(entry.homeDisabled()).toBe(false);
  });

  it('treats a full page load from one of the site’s own pages as coming from the site', async () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(`${location.origin}/`);
    start();
    await go('/lift-club');
    expect(entry.homeDisabled()).toBe(false);
  });

  it('treats an empty or foreign referrer as outside (email, bookmarks, search)', async () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://www.google.com/');
    start();
    await go('/lift-club');
    expect(entry.homeDisabled()).toBe(true);
  });

  it('treats /lift-club/events and /lift-club/reviews as the lift club', async () => {
    start();
    await go('/lift-club/reviews');
    expect(entry.homeDisabled()).toBe(true);
    await go('/lift-club/events');
    await go('/lift-club');
    expect(entry.homeDisabled()).toBe(true);
    await go('/login');
    await go('/lift-club/events');
    expect(entry.homeDisabled()).toBe(true);
  });

  it('keeps Home for in-site visitors who open the events', async () => {
    start();
    await go('/privacy');
    await go('/lift-club/events');
    expect(entry.homeDisabled()).toBe(false);
  });

  it('never disables Home on the server', async () => {
    start('server');
    await go('/lift-club');
    expect(entry.homeDisabled()).toBe(false);
    expect(stored()).toBeNull();
  });

  it('follows one rule from page to page', () => {
    expect(next(false, null, 'lift-club')).toBe(true);
    expect(next(false, '', 'lift-club')).toBe(false);
    expect(next(true, 'login', 'lift-club')).toBe(true);
    expect(next(true, 'lift-club', 'login')).toBe(true);
    expect(next(true, 'lift-club', '')).toBe(false);
    expect(next(true, 'admin', 'lift-club')).toBe(false);
    expect(next(true, null, 'login')).toBe(true);
    expect(next(false, null, '')).toBe(false);
  });
});
