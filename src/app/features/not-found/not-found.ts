import { Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  template: '',
  host: {
    class: 'page',
    'animate.enter': 'page-enter',
    'animate.leave': 'page-leave',
  },
})
export class NotFound {}
