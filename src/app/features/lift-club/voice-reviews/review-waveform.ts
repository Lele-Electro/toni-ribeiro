import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { bars, formatTime } from './review-audio';

/**
 * A recording's waveform. The played part fills with dark green as the audio advances. A
 * transparent range input covers the bars, so it can be dragged, tapped or moved with the
 * arrow keys (one second per step) to seek.
 */
@Component({
  selector: 'app-review-waveform',
  template: `
    <div class="bars" aria-hidden="true">
      @for (bar of shape(); track $index) {
        <span [style.height.%]="bar * 100"></span>
      }
    </div>
    <div class="bars bars--played" aria-hidden="true">
      @for (bar of shape(); track $index) {
        <span [style.height.%]="bar * 100"></span>
      }
    </div>
    <input
      class="seek"
      type="range"
      min="0"
      step="any"
      [max]="duration()"
      [value]="progress() * duration()"
      [attr.aria-label]="label()"
      [attr.aria-valuetext]="valueText()"
      (input)="onSeek($event)"
    />
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      min-width: 0;
      height: 2.5rem;
      border-radius: 0.4rem;
    }
    :host:has(.seek:focus-visible) {
      outline: 3px solid #c9831f;
      outline-offset: 3px;
    }
    .bars {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .bars span {
      flex: 1 1 0;
      min-width: 1px;
      min-height: 3px;
      border-radius: 2px;
      background: #bacbc0;
    }
    .bars--played {
      clip-path: inset(0 calc(100% - var(--progress) * 100%) 0 0);
    }
    .bars--played span {
      background: #1b4f43;
    }
    .seek {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    }
  `,
  host: { '[style.--progress]': 'progress()' },
})
export class ReviewWaveform {
  readonly peaks = input.required<readonly number[]>();
  /** 0–1 */
  readonly progress = input(0);
  /** Seconds */
  readonly duration = input.required<number>();
  /** Accessible name of the seek control, such as "Position in review from Pieter V.". */
  readonly label = input.required<string>();
  /** A fraction 0–1 of the recording. */
  readonly seek = output<number>();

  /** Bars that fit the current width at about 5px each; measured in the browser. */
  private readonly count = signal(48);
  protected readonly shape = computed(() => bars(this.peaks(), this.count()));
  protected readonly valueText = computed(
    () => `${formatTime(this.progress() * this.duration())} of ${formatTime(this.duration())}`,
  );

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => {
        const width = entry.contentRect.width;
        if (width) this.count.set(Math.min(96, Math.max(16, Math.round(width / 5))));
      });
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onSeek(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (this.duration()) this.seek.emit(value / this.duration());
  }
}
