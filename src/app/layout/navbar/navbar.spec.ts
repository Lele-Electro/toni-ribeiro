import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { EntryContext } from '../../core/entry-context';
import { Navbar } from './navbar';

@Component({ template: '' })
class Destination {}

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let element: HTMLElement;
  let router: Router;
  const user = signal<{ isAdmin?: boolean } | null>(null);
  const auth = { isAuthenticated: signal(false), user, logout: vi.fn() };
  const homeDisabled = signal(false);

  beforeEach(async () => {
    auth.isAuthenticated.set(false);
    user.set(null);
    auth.logout.mockReset();
    homeDisabled.set(false);
    TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([{ path: '**', component: Destination }]),
        { provide: AuthService, useValue: auth },
        { provide: EntryContext, useValue: { homeDisabled } },
      ],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Navbar);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  const toggle = () => element.querySelector<HTMLButtonElement>('.navbar__other > button')!;
  const dropdown = () => element.querySelector<HTMLUListElement>('.navbar__dropdown')!;

  it('uses the requested headings and disables Contact until its page is ready', () => {
    const links = [...element.querySelectorAll<HTMLElement>('.navbar__link')];
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Home',
      'Private Lift Club',
      'Other',
      'Contact',
      'Log in',
    ]);
    expect(links[3].getAttribute('href')).toBeNull();
    expect(links[3].getAttribute('aria-disabled')).toBe('true');
    expect(element.querySelector('.navbar__link[aria-current="page"]')?.textContent?.trim()).toBe(
      'Home',
    );
    expect(dropdown().hidden).toBe(true);
  });

  it.each([
    ['/lift-club', 'Private Lift Club'],
    ['/lift-club/events', 'Private Lift Club'],
    ['/lift-club/reviews?campaign=email', 'Private Lift Club'],
    ['/referral-business', 'Other'],
    ['/login?returnUrl=%2Fschedule', 'Log in'],
    ['/forgot-password', 'Log in'],
    ['/reset-password', 'Log in'],
    ['/schedule', 'Other'],
    ['/privacy', 'Other'],
    ['/terms', 'Other'],
    ['/unknown-page', 'Other'],
    ['/?campaign=test', 'Home'],
  ])('selects the correct heading for %s', async (url, heading) => {
    await router.navigateByUrl(url);
    await fixture.whenStable();
    const selected = [...element.querySelectorAll('.navbar__link.is-active')];
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent?.trim()).toBe(heading);
  });

  // Every page under Other is listed in UNAVAILABLE_PATHS for now, so the menu can't open.
  it('disables Other while none of its pages are ready', async () => {
    expect(toggle().disabled).toBe(true);
    toggle().click();
    await fixture.whenStable();
    expect(dropdown().hidden).toBe(true);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
  });

  it('gives the owner a Manage bookings link under Other', async () => {
    expect(toggle().disabled).toBe(true);
    auth.isAuthenticated.set(true);
    user.set({ isAdmin: true });
    await fixture.whenStable();
    expect(toggle().disabled).toBe(false);
    toggle().click();
    await fixture.whenStable();
    expect(dropdown().hidden).toBe(false);
    const link = dropdown().querySelector<HTMLAnchorElement>('a')!;
    expect(link.textContent?.trim()).toBe('Manage bookings');
    link.click();
    await fixture.whenStable();
    expect(router.url).toBe('/admin');
    expect(dropdown().hidden).toBe(true);

    user.set({ isAdmin: false });
    await fixture.whenStable();
    expect(toggle().disabled).toBe(true);
  });

  it('keeps account controls visible outside Other and switches to logout', async () => {
    expect(dropdown().querySelectorAll('a')).toHaveLength(0);
    expect(
      [...dropdown().querySelectorAll('[aria-disabled="true"]')].map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(['Referral Business', 'My Schedule', 'Privacy Policy', 'Terms of Service']);
    expect(element.querySelector('.navbar__account a')?.getAttribute('href')).toBe('/login');
    auth.isAuthenticated.set(true);
    await fixture.whenStable();
    expect(dropdown().querySelector('a[href="/login"]')).toBeNull();
    expect(element.querySelector('.navbar__account a')).toBeNull();
    const logout = element.querySelector<HTMLButtonElement>('.navbar__account button')!;
    expect(logout.textContent?.trim()).toBe('Log out');
    logout.click();
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it('disables every way Home for visitors who came to the lift club from outside', async () => {
    await router.navigateByUrl('/lift-club');
    homeDisabled.set(true);
    await fixture.whenStable();

    const home = element.querySelector<HTMLElement>('.navbar__links > li:first-child > *')!;
    expect(home.tagName).toBe('SPAN');
    expect(home.textContent!.trim()).toBe('Home');
    expect(home.getAttribute('aria-disabled')).toBe('true');
    expect(home.classList.contains('is-disabled')).toBe(true);
    expect(home.hasAttribute('href')).toBe(false);
    expect(home.hasAttribute('tabindex')).toBe(false);
    home.click();
    home.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    expect(router.url).toBe('/lift-club');

    // The phone bar's brand, the menu's brand and its Home item lead nowhere either.
    const menu = element.querySelector('app-mobile-menu')!;
    const brands = [...menu.querySelectorAll<HTMLElement>('.bar__brand')];
    expect(brands).toHaveLength(2);
    for (const brand of brands) {
      expect(brand.tagName).toBe('SPAN');
      expect(brand.getAttribute('aria-disabled')).toBe('true');
    }
    const items = [...menu.querySelectorAll<HTMLElement>('.overlay__link')];
    expect(items[0].textContent!.trim()).toBe('Home');
    expect(items[0].classList.contains('is-disabled')).toBe(true);
    expect(items[0].hasAttribute('href')).toBe(false);
    expect(items[0].querySelector('.overlay__soon')).toBeNull();
    expect(items[1].getAttribute('href')).toBe('/lift-club');

    // Signing out stays on the lift club rather than going Home.
    auth.isAuthenticated.set(true);
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('.navbar__account button')!.click();
    expect(auth.logout).toHaveBeenCalledWith('/lift-club');

    homeDisabled.set(false);
    await fixture.whenStable();
    expect(element.querySelector('.navbar__links > li:first-child > a')!.getAttribute('href')).toBe(
      '/',
    );
    expect(menu.querySelector('.bar__brand')!.getAttribute('href')).toBe('/');
  });

  it('uses the solid landing appearance by default and accepts the frosted appearance', async () => {
    expect(element.querySelector('.navbar--frosted')).toBeNull();
    fixture.componentRef.setInput('appearance', 'frosted');
    await fixture.whenStable();
    expect(element.querySelector('.navbar--frosted')).toBeTruthy();
  });
});
