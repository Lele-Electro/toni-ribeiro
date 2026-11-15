import { Component } from '@angular/core';

/**
 * The "you're booked" marker: Toni and the car beside the thank-you line. Rendered only
 * for the signed-in member's own reservation, in the desktop row and the mobile widget.
 */
@Component({
  selector: 'app-booked-marker',
  template: `
    <span class="marker__art">
      <img
        class="marker__toni"
        src="toni-home-page.png"
        alt="Toni Ribeiro, your driver"
        width="48"
        height="48"
        decoding="async"
      />
      <img
        class="marker__car"
        src="volvo_PNG78.png"
        alt="Toni’s red Volvo S60"
        width="85"
        height="44"
        decoding="async"
      />
    </span>
    <span class="marker__copy">Thanks, Toni will be there 5 minutes early</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 0;
      animation: marker-in 420ms var(--ease-out) both;
    }
    .marker__art {
      display: flex;
      flex-shrink: 0;
      align-items: flex-end;
    }
    .marker__toni {
      width: 3rem;
      height: 3rem;
      border: 2px solid #fff;
      border-radius: 50%;
      background: #1b4f43;
      object-fit: cover;
      object-position: 30% 15%;
      box-shadow: 0 2px 8px rgb(16 35 29 / 25%);
    }
    .marker__car {
      width: 5.3rem;
      height: auto;
      margin: 0 0 -0.15rem -0.9rem;
      filter: drop-shadow(0 4px 4px rgb(16 35 29 / 28%));
      animation: marker-car 620ms 120ms var(--ease-out) both;
    }
    .marker__copy {
      min-width: 0;
      font-size: 0.8125rem;
      font-weight: 700;
      line-height: 1.3;
      text-wrap: balance;
    }
    @keyframes marker-in {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }
    @keyframes marker-car {
      from {
        opacity: 0;
        transform: translateX(-1.5rem);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host,
      .marker__car {
        animation: none;
      }
    }
  `,
})
export class BookedMarker {}
