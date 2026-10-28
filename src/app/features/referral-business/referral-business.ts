import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-referral-business',
  imports: [RouterLink],
  templateUrl: './referral-business.html',
  host: {
    class: 'page',
    'animate.enter': 'page-enter',
    'animate.leave': 'page-leave',
  },
})
export class ReferralBusiness {
  protected readonly audiences = [
    {
      badge: '1',
      title: 'Professionals',
      text: 'Accountants, agents and advisers who regularly meet people needing trusted services.',
    },
    {
      badge: '2',
      title: 'Community connectors',
      text: 'Church, school and club members who know who needs help, and who can be trusted to give it.',
    },
    {
      badge: '3',
      title: 'Lift club members',
      text: 'Turn the conversations you have on your commute into a second income.',
    },
  ];
}
