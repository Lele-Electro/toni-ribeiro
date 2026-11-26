import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, PRIMARY_OUTLET, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { EntryContext } from './core/entry-context';
import { Navbar } from './layout/navbar/navbar';

@Component({
  imports: [RouterOutlet, Navbar],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  host: { '[class.app--compact-header]': 'compactHeader()' },
})
export class App {
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.router.url);
  private readonly route = computed(() => {
    const url = this.router.parseUrl(this.currentUrl());
    return url.root.children[PRIMARY_OUTLET]?.segments.map((segment) => segment.path) ?? [];
  });
  protected readonly showNavbar = computed(() => this.route().length > 0);
  /** The lift club page keeps its whole schedule in view, so its header sits higher. */
  protected readonly compactHeader = computed(() => this.route()[0] === 'lift-club');

  constructor() {
    // Created here, before the first navigation finishes, so it sees where the visit began.
    inject(EntryContext);
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }
}
