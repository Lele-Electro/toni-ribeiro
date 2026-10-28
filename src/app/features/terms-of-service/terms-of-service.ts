import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED, SITE_NAME } from '../../core/site.config';

@Component({
  selector: 'app-terms-of-service',
  imports: [RouterLink],
  template: `
    <section class="section">
      <article class="container prose">
        <span class="eyebrow">Legal</span>
        <h1>Terms of Service</h1>
        <p class="lead">Last updated: {{ lastUpdated }}</p>

        <p>
          These terms apply when you use the {{ siteName }} website, our private lift club and our
          referral business. By creating an account or using the site you agree to them.
        </p>

        <h2>Your account</h2>
        <ul>
          <li>Give accurate information and keep your password secure.</li>
          <li>You are responsible for activity under your account.</li>
          <li>You can delete your account at any time from My Schedule.</li>
        </ul>

        <h2>Lift club</h2>
        <p>
          Choosing a date and time is a request for a seat, not a confirmed booking. A lift is
          confirmed only when we contact you with the route and driver. Members share trip costs as
          agreed before travelling and must treat drivers and fellow passengers with respect.
        </p>

        <h2>Referral business</h2>
        <p>
          Commission is payable only on successful referrals and on the terms agreed with you in
          writing. Only refer people who have agreed to be contacted.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Don't misuse the site, try to access other people's accounts or data, or interfere with
          how the service runs.
        </p>

        <h2>Liability</h2>
        <p>
          We provide the website as is. To the extent the law allows, we are not liable for indirect
          losses arising from your use of it.
        </p>

        <h2>Privacy</h2>
        <p>
          How we handle your information is explained in our
          <a routerLink="/privacy">Privacy Policy</a>.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms: <a [href]="'mailto:' + contactEmail">{{ contactEmail }}</a
          >.
        </p>
      </article>
    </section>
  `,
  host: {
    class: 'page',
    'animate.enter': 'page-enter',
    'animate.leave': 'page-leave',
  },
})
export class TermsOfService {
  protected readonly siteName = SITE_NAME;
  protected readonly contactEmail = CONTACT_EMAIL;
  protected readonly lastUpdated = LEGAL_LAST_UPDATED;
}
