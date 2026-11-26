import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  PRIMARY_OUTLET,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { EntryContext } from '../../core/entry-context';
import { isLiftClubPath, isUnavailable } from '../../core/navigation';
import { MobileMenu } from '../mobile-menu/mobile-menu';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, MobileMenu],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeMenu(true)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class Navbar {
  readonly appearance = input<'solid' | 'frosted'>('solid');
  /** A slimmer pill, for pages that need the vertical room. */
  readonly compact = input(false);
  private readonly router = inject(Router);
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly otherToggle = viewChild<ElementRef<HTMLButtonElement>>('otherToggle');
  private readonly currentUrl = signal(this.router.url);
  protected readonly auth = inject(AuthService);
  private readonly entry = inject(EntryContext);
  protected readonly menuOpen = signal(false);
  /** Pages under "Other"; those without content yet are shown but can't be opened. */
  private readonly pages = [
    { label: 'Referral Business', path: '/referral-business' },
    { label: 'My Schedule', path: '/schedule' },
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
  ].map((item) => ({ ...item, disabled: isUnavailable(item.path) }));
  /** The owner's account also gets the booking-management page. */
  protected readonly isAdmin = computed(
    () => this.hydrated() && this.auth.isAuthenticated() && this.auth.user()?.isAdmin === true,
  );
  protected readonly otherItems = computed(() =>
    this.isAdmin()
      ? [{ label: 'Manage bookings', path: '/admin', disabled: false }, ...this.pages]
      : this.pages,
  );
  /** With nothing to open under it, the "Other" button itself is disabled. */
  protected readonly otherDisabled = computed(() =>
    this.otherItems().every((item) => item.disabled),
  );
  protected readonly contactDisabled = isUnavailable('/schedule');
  protected readonly activeSection = computed(() => {
    const url = this.router.parseUrl(this.currentUrl());
    const route =
      url.root.children[PRIMARY_OUTLET]?.segments.map((segment) => segment.path).join('/') ?? '';
    if (route === '') return 'home';
    if (isLiftClubPath(route)) return 'lift-club';
    if (route === 'schedule' && url.queryParams['service'] === 'general') return 'contact';
    if (['login', 'forgot-password', 'reset-password'].includes(route)) return 'account';
    return 'other';
  });
  /**
   * The session lives in localStorage, which the server can't see. Session-dependent links
   * wait until after hydration so the browser's first render matches the server's HTML.
   */
  protected readonly hydrated = signal(false);
  /**
   * Home is disabled on the lift club for visitors who arrived there from outside the site
   * (see EntryContext). Known only in the browser, so it waits for hydration like the
   * session-dependent links.
   */
  protected readonly homeDisabled = computed(() => this.hydrated() && this.entry.homeDisabled());

  constructor() {
    afterNextRender(() => this.hydrated.set(true));

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.closeMenu();
      });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(restoreFocus = false): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (restoreFocus) this.otherToggle()?.nativeElement.focus();
  }

  protected onDocumentClick(event: Event): void {
    if (!this.element.nativeElement.contains(event.target as Node)) this.closeMenu();
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!this.element.nativeElement.contains(event.relatedTarget as Node | null)) this.closeMenu();
  }

  protected logout(): void {
    this.closeMenu();
    // Where Home is disabled, signing out mustn't take the visitor there either.
    this.auth.logout(this.homeDisabled() ? this.router.url : '/');
  }
}
