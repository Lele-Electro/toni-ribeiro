import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-lift-club',
  imports: [RouterLink],
  templateUrl: './lift-club.html',
  host: {
    class: 'page',
    'animate.enter': 'page-enter',
    'animate.leave': 'page-leave',
  },
})
export class LiftClub {
  protected readonly benefits = [
    {
      badge: '✓',
      title: 'Vetted drivers',
      text: 'Every driver is verified, licensed and known to the club before they carry members.',
    },
    {
      badge: '⏱',
      title: 'Fixed routes and times',
      text: 'Regular pick-up points and departure times you can plan your day around.',
    },
    {
      badge: 'R',
      title: 'Shared costs',
      text: 'Fuel and tolls are split fairly between members, so everyone pays less than driving alone.',
    },
    {
      badge: '★',
      title: 'Members only',
      text: 'A private group of regular commuters. No strangers, no surge pricing.',
    },
  ];
}
