import { NgTemplateOutlet } from '@angular/common';
import { Component, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  protected readonly auth = inject(AuthService);
  protected readonly menuOpen = signal(false);
  /**
   * The session lives in localStorage, which the server can't see. Session-dependent links
   * wait until after hydration so the browser's first render matches the server's HTML.
   */
  protected readonly hydrated = signal(false);

  constructor() {
    afterNextRender(() => this.hydrated.set(true));

    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected logout(): void {
    this.auth.logout();
  }
}
