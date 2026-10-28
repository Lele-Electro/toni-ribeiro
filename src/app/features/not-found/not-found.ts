import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="section">
      <div class="container section-heading">
        <span class="eyebrow">404</span>
        <h1>We couldn't find that page</h1>
        <p class="lead">The link may be broken, or the page may have moved.</p>
        <a routerLink="/" class="btn btn--primary">Back to the home page</a>
      </div>
    </section>
  `,
  host: {
    class: 'page',
    'animate.enter': 'page-enter',
    'animate.leave': 'page-leave',
  },
})
export class NotFound {}
