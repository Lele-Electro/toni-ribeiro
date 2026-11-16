import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, PRIMARY_OUTLET, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { isUnavailable } from '../../core/navigation';

interface MenuItem {
  key: string;
  label: string;
  path: string;
  query?: Record<string, string>;
  /** The page has no content yet: listed, but not a link. */
  disabled?: boolean;
}

const CLOSE_MS = 220;

/**
 * Phone navigation: a top bar with the brand and a hamburger that opens a full-screen
 * menu. The menu is a modal <dialog>, which supplies the focus trap, Escape handling and
 * an inert page behind it; this component adds the scroll lock and the animation.
 */
@Component({
  selector: 'app-mobile-menu',
  imports: [RouterLink],
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss',
})
export class MobileMenu {
  readonly appearance = input<'solid' | 'frosted'>('solid');
  readonly authenticated = input(false);
  readonly logout = output<void>();

  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('menu');
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly currentUrl = signal(this.router.url);
  private closeTimer?: ReturnType<typeof setTimeout>;

  /** Drives the hamburger-to-X morph and the overlay fade. */
  protected readonly phase = signal<'closed' | 'open' | 'closing'>('closed');

  /** Every destination of the desktop navbar, including those under its "Other" menu. */
  protected readonly items: MenuItem[] = (
    [
      { key: 'home', label: 'Home', path: '/' },
      { key: 'lift-club', label: 'Private Lift Club', path: '/lift-club' },
      { key: 'referral-business', label: 'Referral Business', path: '/referral-business' },
      { key: 'schedule', label: 'My Schedule', path: '/schedule' },
      { key: 'contact', label: 'Contact', path: '/schedule', query: { service: 'general' } },
      { key: 'privacy', label: 'Privacy Policy', path: '/privacy' },
      { key: 'terms', label: 'Terms of Service', path: '/terms' },
    ] satisfies MenuItem[]
  ).map((item) => ({ ...item, disabled: isUnavailable(item.path) }));

  protected readonly activeKey = computed(() => {
    const url = this.router.parseUrl(this.currentUrl());
    const route =
      url.root.children[PRIMARY_OUTLET]?.segments.map((segment) => segment.path).join('/') ?? '';
    if (route === '') return 'home';
    if (route === 'schedule')
      return url.queryParams['service'] === 'general' ? 'contact' : 'schedule';
    if (['login', 'forgot-password', 'reset-password'].includes(route)) return 'account';
    return route;
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.close();
      });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.closeTimer);
      this.lockScroll(false);
    });
  }

  protected open(): void {
    const dialog = this.dialog()?.nativeElement;
    if (!dialog || dialog.open) return;
    clearTimeout(this.closeTimer);
    dialog.showModal?.();
    this.lockScroll(true);
    // One frame later, so the overlay and the icon transition from their closed state.
    const view = this.document.defaultView;
    if (view?.requestAnimationFrame) view.requestAnimationFrame(() => this.phase.set('open'));
    else this.phase.set('open');
  }

  /** Fades out, then closes the dialog, which hands focus back to the hamburger. */
  protected close(): void {
    const dialog = this.dialog()?.nativeElement;
    if (!dialog?.open || this.phase() === 'closing') return;
    this.phase.set('closing');
    const reduced = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
    const finish = () => {
      dialog.close?.();
      this.phase.set('closed');
      this.lockScroll(false);
      this.trigger()?.nativeElement.focus({ preventScroll: true });
    };
    if (reduced?.matches) finish();
    else this.closeTimer = setTimeout(finish, CLOSE_MS);
  }

  /** Escape: run the same animated close rather than the dialog's instant one. */
  protected onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  /** A tap on the empty overlay (not on a link or button) closes the menu. */
  protected onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected signOut(): void {
    this.close();
    this.logout.emit();
  }

  private lockScroll(locked: boolean): void {
    this.document.documentElement.classList.toggle('nav-open', locked);
  }
}
