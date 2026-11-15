import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { Navbar } from '../../layout/navbar/navbar';

@Component({
  selector: 'app-landing',
  imports: [Navbar],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  host: {
    class: 'page',
    'animate.enter': 'page-enter',
    'animate.leave': 'page-leave',
  },
})
export class Landing {
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  // Add another entry here to include it in the scrolling strip.
  protected readonly roles = [
    'Tailored Graphic Artist',
    'Web Developer',
    'Private Driver',
    'Marketeer',
    'Broker',
    'Salesman',
  ];

  /** True once the visitor has pressed play; the browser's own controls then appear. */
  protected readonly started = signal(false);
  protected readonly playing = signal(false);

  /** Never autoplays: playback (with sound) starts only from the visitor's own action. */
  protected play(): void {
    const video = this.video().nativeElement;
    this.started.set(true);
    video.play()?.catch(() => this.playing.set(false));
    // The play button is removed while playing, so move focus to the video's controls.
    video.focus({ preventScroll: true });
  }
}
