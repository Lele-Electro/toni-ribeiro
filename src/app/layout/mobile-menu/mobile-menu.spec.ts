import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MobileMenu } from './mobile-menu';

@Component({ template: '' })
class Destination {}

describe('MobileMenu', () => {
  let fixture: ComponentFixture<MobileMenu>;
  let element: HTMLElement;
  let router: Router;

  // Fake timers also hold back Angular's own scheduler, so let it run explicitly.
  const stable = async () => {
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value() {
        this.setAttribute('open', '');
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value() {
        this.removeAttribute('open');
      },
    });
    TestBed.configureTestingModule({
      imports: [MobileMenu],
      providers: [provideRouter([{ path: '**', component: Destination }])],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(MobileMenu);
    element = fixture.nativeElement;
    // The component is display:none above phone widths, where nothing in it can take focus.
    element.style.display = 'block';
    await stable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  const trigger = () => element.querySelector<HTMLButtonElement>('.bar .burger')!;
  const dialog = () => element.querySelector<HTMLDialogElement>('dialog')!;
  const settle = async (ms = 300) => {
    await vi.advanceTimersByTimeAsync(ms);
    await stable();
  };
  const open = async () => {
    trigger().click();
    await settle(50);
  };

  it('opens a full-screen dialog with every navigation item and locks page scrolling', async () => {
    expect(dialog().hasAttribute('open')).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    await open();
    expect(dialog().hasAttribute('open')).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().classList.contains('burger--open')).toBe(true);
    expect(document.documentElement.classList.contains('nav-open')).toBe(true);
    // Pages without content yet are listed with a "Soon" tag instead of a link.
    const links = [...dialog().querySelectorAll<HTMLElement>('.overlay__link')];
    expect(
      links.map((link) => [link.firstChild!.textContent!.trim(), link.getAttribute('href')]),
    ).toEqual([
      ['Home', '/'],
      ['Private Lift Club', '/lift-club'],
      ['Referral Business', null],
      ['My Schedule', null],
      ['Contact', null],
      ['Privacy Policy', null],
      ['Terms of Service', null],
    ]);
    expect(dialog().querySelectorAll('.overlay__link.is-disabled')).toHaveLength(5);
    expect(dialog().querySelector('.overlay__auth')!.getAttribute('href')).toBe('/login');
    expect(dialog().querySelector('[aria-current="page"]')!.textContent!.trim()).toBe('Home');
  });

  it('closes on Escape, the close button and a tap on the empty overlay, restoring focus', async () => {
    for (const close of [
      () => dialog().dispatchEvent(new Event('cancel', { cancelable: true })),
      () => dialog().querySelector<HTMLButtonElement>('.overlay__bar .burger')!.click(),
      () => dialog().click(),
    ]) {
      await open();
      close();
      await stable();
      // Still open while it fades out.
      expect(dialog().hasAttribute('open')).toBe(true);
      await settle();
      expect(dialog().hasAttribute('open')).toBe(false);
      expect(document.documentElement.classList.contains('nav-open')).toBe(false);
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger());
    }
  });

  it('closes after navigating and marks the current page', async () => {
    await open();
    dialog().querySelector<HTMLAnchorElement>('a[href="/lift-club"]')!.click();
    await settle();
    expect(router.url).toBe('/lift-club');
    expect(dialog().hasAttribute('open')).toBe(false);
    expect(dialog().querySelector('[aria-current="page"]')!.textContent!.trim()).toBe(
      'Private Lift Club',
    );
    // /events and /reviews are the lift club page too.
    for (const url of ['/events', '/reviews']) {
      await router.navigateByUrl(url);
      await settle();
      expect(dialog().querySelector('[aria-current="page"]')!.textContent!.trim()).toBe(
        'Private Lift Club',
      );
    }
  });

  it('offers Log out to signed-in members', async () => {
    const logout = vi.fn();
    fixture.componentInstance.logout.subscribe(logout);
    fixture.componentRef.setInput('authenticated', true);
    await open();
    const button = dialog().querySelector<HTMLButtonElement>('button.overlay__auth')!;
    expect(button.textContent!.trim()).toBe('Log out');
    button.click();
    expect(logout).toHaveBeenCalledOnce();
  });
});
