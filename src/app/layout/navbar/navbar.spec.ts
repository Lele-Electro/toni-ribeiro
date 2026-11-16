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

  it('uses the solid landing appearance by default and accepts the frosted appearance', async () => {
    expect(element.querySelector('.navbar--frosted')).toBeNull();
    fixture.componentRef.setInput('appearance', 'frosted');
    await fixture.whenStable();
    expect(element.querySelector('.navbar--frosted')).toBeTruthy();
  });
});
