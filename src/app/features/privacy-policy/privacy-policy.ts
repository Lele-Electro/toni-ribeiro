import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED, SITE_NAME } from '../../core/site.config';

@Component({
  selector: 'app-privacy-policy',
  imports: [RouterLink],
  templateUrl: './privacy-policy.html',
  host: {
    class: 'page',
    'animate.enter': 'page-enter',
    'animate.leave': 'page-leave',
  },
})
export class PrivacyPolicy {
  protected readonly siteName = SITE_NAME;
  protected readonly contactEmail = CONTACT_EMAIL;
  protected readonly lastUpdated = LEGAL_LAST_UPDATED;
}
