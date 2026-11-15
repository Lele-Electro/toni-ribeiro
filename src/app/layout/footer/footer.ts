import { Component } from '@angular/core';
import { SITE_NAME } from '../../core/site.config';

@Component({
  selector: 'app-footer',
  template: '',
})
export class Footer {
  protected readonly siteName = SITE_NAME;
  protected readonly year = new Date().getFullYear();
}
