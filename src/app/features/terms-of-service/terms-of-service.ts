import { Component } from '@angular/core';
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED, SITE_NAME } from '../../core/site.config';

@Component({
  selector: 'app-terms-of-service',
  template: '',
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
