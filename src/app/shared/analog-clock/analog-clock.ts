import { Component, DOCUMENT, DestroyRef, afterNextRender, inject, signal } from '@angular/core';

/**
 * A decorative analogue clock showing the device's local time. The seconds hand jumps
 * once per second, in step with the device clock. It never touches booking state.
 * With reduced motion the seconds hand is hidden and the face only updates each minute.
 */
@Component({
  selector: 'app-analog-clock',
  template: `
    <svg
      class="clock"
      [class.clock--ready]="ready()"
      viewBox="0 0 100 100"
      role="img"
      aria-label="Analogue clock showing your device's current time"
    >
      <circle class="clock__face" cx="50" cy="50" r="47" />
      @for (tick of ticks; track tick) {
        <line
          class="clock__tick"
          [class.clock__tick--hour]="tick % 3 === 0"
          x1="50"
          [attr.y1]="tick % 3 === 0 ? 8 : 9.5"
          x2="50"
          y2="13"
          [attr.transform]="'rotate(' + tick * 30 + ' 50 50)'"
        />
      }
      <g class="clock__hands">
        <line
          class="clock__hour"
          x1="50"
          y1="54"
          x2="50"
          y2="27"
          [attr.transform]="'rotate(' + hour() + ' 50 50)'"
        />
        <line
          class="clock__minute"
          x1="50"
          y1="56"
          x2="50"
          y2="15"
          [attr.transform]="'rotate(' + minute() + ' 50 50)'"
        />
        @if (ticking()) {
          <line
            class="clock__second"
            x1="50"
            y1="60"
            x2="50"
            y2="12"
            [attr.transform]="'rotate(' + second() + ' 50 50)'"
          />
        }
        <circle class="clock__pin" cx="50" cy="50" r="2.4" />
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: block;
      aspect-ratio: 1;
    }
    .clock {
      display: block;
      width: 100%;
      height: 100%;
    }
    .clock__face {
      fill: rgb(255 255 255 / 92%);
      stroke: #1b4f43;
      stroke-width: 3;
    }
    .clock__tick {
      stroke: #7d9488;
      stroke-width: 1;
      stroke-linecap: round;
    }
    .clock__tick--hour {
      stroke: #1b4f43;
      stroke-width: 2;
    }
    // Hands stay hidden until the browser knows the time (the server can't).
    .clock__hands {
      opacity: 0;
      transition: opacity 300ms ease;
    }
    .clock--ready .clock__hands {
      opacity: 1;
    }
    .clock__hour,
    .clock__minute {
      stroke: #193d33;
      stroke-linecap: round;
    }
    .clock__hour {
      stroke-width: 4;
    }
    .clock__minute {
      stroke-width: 2.6;
    }
    // Thin, with no transition: each second is a discrete tick, never a sweep.
    .clock__second {
      stroke: #c0392b;
      stroke-width: 0.9;
      stroke-linecap: round;
    }
    .clock__pin {
      fill: #c0392b;
    }
    @media (prefers-reduced-motion: reduce) {
      .clock__hands {
        transition: none;
      }
    }
  `,
})
export class AnalogClock {
  protected readonly ticks = Array.from({ length: 12 }, (_, index) => index);
  protected readonly hour = signal(0);
  protected readonly minute = signal(0);
  protected readonly second = signal(0);
  protected readonly ready = signal(false);
  /** False under reduced motion, where the seconds hand is not drawn at all. */
  protected readonly ticking = signal(false);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const reducedMotion = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
      const schedule = () => {
        clearTimeout(this.timer);
        this.ticking.set(!reducedMotion?.matches);
        this.render();
        this.ready.set(true);
        if (document.hidden) return; // Resumes on visibilitychange.
        const now = Date.now();
        // Re-aligning every tick to the next boundary keeps the hand locked to the
        // device's seconds; setInterval would drift.
        const delay = this.ticking() ? 1000 - (now % 1000) : 60_000 - (now % 60_000);
        this.timer = setTimeout(schedule, delay + 5);
      };
      schedule();
      document.addEventListener('visibilitychange', schedule);
      reducedMotion?.addEventListener?.('change', schedule);
      destroyRef.onDestroy(() => {
        clearTimeout(this.timer);
        document.removeEventListener('visibilitychange', schedule);
        reducedMotion?.removeEventListener?.('change', schedule);
      });
    });
  }

  private render(): void {
    const now = new Date();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    this.second.set(seconds * 6);
    this.minute.set(minutes * 6 + (this.ticking() ? seconds * 0.1 : 0));
    this.hour.set((now.getHours() % 12) * 30 + minutes * 0.5);
  }
}
