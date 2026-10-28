import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_NAME } from '../../core/site.config';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="container footer__inner">
        <div>
          <p class="footer__brand">{{ siteName }}</p>
          <p class="footer__tagline">Private lift club and referral business.</p>
        </div>
        <nav aria-label="Footer">
          <ul class="footer__links">
            <li><a routerLink="/lift-club">Lift Club</a></li>
            <li><a routerLink="/referral-business">Referral Business</a></li>
            <li><a routerLink="/privacy">Privacy Policy</a></li>
            <li><a routerLink="/terms">Terms of Service</a></li>
          </ul>
        </nav>
      </div>
      <p class="container footer__copy">© {{ year }} {{ siteName }}. All rights reserved.</p>
    </footer>
  `,
  styles: `
    .footer {
      margin-top: var(--space-8);
      padding-block: var(--space-7) var(--space-5);
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
    }
    .footer__inner {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-5);
    }
    .footer__brand {
      margin: 0;
      font-weight: 750;
    }
    .footer__tagline,
    .footer__copy {
      color: var(--color-muted);
      font-size: 0.9rem;
    }
    .footer__links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-5);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .footer__links a {
      color: var(--color-muted);
      text-decoration: none;
    }
    .footer__links a:hover {
      color: var(--color-primary);
      text-decoration: underline;
    }
    .footer__copy {
      margin-top: var(--space-6);
      margin-bottom: 0;
    }
  `,
})
export class Footer {
  protected readonly siteName = SITE_NAME;
  protected readonly year = new Date().getFullYear();
}
