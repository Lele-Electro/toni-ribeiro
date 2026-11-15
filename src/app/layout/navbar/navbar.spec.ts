import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Navbar } from './navbar';

@Component({ template: '' })
class Destination {}

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let element: HTMLElement;
  let router: Router;
  const auth = { isAuthenticated: signal(false), logout: vi.fn() };

  beforeEach(async () => {
    auth.isAuthenticated.set(false);
    auth.logout.mockReset();
    TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([{ path: '**', component: Destination }]),
        { provide: AuthService, useValue: auth },
      ],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Navbar);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  const toggle = () => element.querySelector<HTMLButtonElement>('.navbar__other > button')!;
  const dropdown = () => element.querySelector<HTMLUListElement>('.navbar__dropdown')!;

  it('uses the requested headings and the existing general-enquiry flow', () => {
    const links = [...element.querySelectorAll<HTMLElement>('.navbar__link')];
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Home',
      'Private Lift Club',
      'Other',
      'Contact',
      'Log in',
    ]);
    expect(links[3].getAttribute('href')).toBe('/schedule?service=general');
    expect(element.querySelector('.navbar__link[aria-current="page"]')?.textContent?.trim()).toBe(
      'Home',
    );
    expect(dropdown().hidden).toBe(true);
  });

  it.each([
    ['/lift-club', 'Private Lift Club'],
    ['/schedule?service=general', 'Contact'],
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

  it('opens Other and closes it on Escape, outside click, and navigation', async () => {
    toggle().click();
    await fixture.whenStable();
    expect(dropdown().hidden).toBe(false);
    expect(toggle().getAttribute('aria-expanded')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(dropdown().hidden).toBe(true);
    expect(document.activeElement).toBe(toggle());

    toggle().click();
    await fixture.whenStable();
    document.body.click();
    await fixture.whenStable();
    expect(dropdown().hidden).toBe(true);

    toggle().click();
    await fixture.whenStable();
    element.querySelector<HTMLAnchorElement>('a[href="/referral-business"]')!.click();
    await fixture.whenStable();
    expect(router.url).toBe('/referral-business');
    expect(dropdown().hidden).toBe(true);
  });

  it('keeps account controls visible outside Other and switches to logout', async () => {
    expect([...dropdown().querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
      '/referral-business',
      '/schedule',
      '/privacy',
      '/terms',
    ]);
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

  it('uses the solid landing appearance by default and accepts the frosted appearance', async () => {
    expect(element.querySelector('.navbar--frosted')).toBeNull();
    fixture.componentRef.setInput('appearance', 'frosted');
    await fixture.whenStable();
    expect(element.querySelector('.navbar--frosted')).toBeTruthy();
  });
});
