import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { DayScheduler } from '../../shared/day-scheduler/day-scheduler';

@Component({
  selector: 'app-lift-club',
  imports: [DayScheduler],
  templateUrl: './lift-club.html',
  styleUrl: './lift-club.scss',
  host: {
    class: 'page',
    'animate.enter': 'page-enter',
    'animate.leave': 'page-leave',
  },
})
export class LiftClub {
  protected readonly playBackground = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const desktopMotion = window.matchMedia('(width > 40rem) and (prefers-reduced-motion: no-preference)');
      const connection = (navigator as Navigator & {
        connection?: EventTarget & { saveData?: boolean; effectiveType?: string };
      }).connection;
      const sync = () => {
        const constrained = connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '');
        this.playBackground.set(document.readyState === 'complete' && desktopMotion.matches && !constrained);
      };

      const listeners = new AbortController();
      const options = { signal: listeners.signal };
      window.addEventListener('load', sync, options);
      desktopMotion.addEventListener('change', sync, options);
      connection?.addEventListener('change', sync, options);
      destroyRef.onDestroy(() => listeners.abort());
      sync();
    });
  }
}
