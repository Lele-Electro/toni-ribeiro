import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';
import { SeoRouteData } from './core/seo/seo-title.strategy';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'lift-club',
    title: 'Private Lift Club',
    data: {
      description:
        'Join a private lift club with vetted drivers, fixed routes and booked seats. Share the commute, split the cost and travel with people you know.',
    } satisfies SeoRouteData,
    loadComponent: () => import('./features/lift-club/lift-club').then((m) => m.LiftClub),
  },
  {
    path: 'referral-business',
    title: 'Referral Business',
    data: {
      description:
        'Refer clients and earn commission on every successful introduction. Learn how the Toni Ribeiro referral business works and book a consultation.',
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('./features/referral-business/referral-business').then((m) => m.ReferralBusiness),
  },
  {
    path: 'login',
    title: 'Log in',
    canActivate: [guestGuard],
    data: {
      description: 'Log in or create an account to book lift club seats and consultations.',
      robots: 'noindex, follow',
    } satisfies SeoRouteData,
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'schedule',
    title: 'Choose a date and time',
    canActivate: [authGuard],
    // Lets AuthService.expireSession() re-run the guard on the page the user is already on
    runGuardsAndResolvers: 'always',
    data: { robots: 'noindex, nofollow' } satisfies SeoRouteData,
    loadComponent: () =>
      import('./features/date-time-form/date-time-form').then((m) => m.DateTimeForm),
  },
  {
    path: 'privacy',
    title: 'Privacy Policy',
    data: {
      description:
        'How Toni Ribeiro collects, uses, stores, shares and deletes your personal information, including data received from Google Sign-In.',
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('./features/privacy-policy/privacy-policy').then((m) => m.PrivacyPolicy),
  },
  {
    path: 'terms',
    title: 'Terms of Service',
    data: {
      description: 'The terms that apply when you use the Toni Ribeiro website and services.',
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('./features/terms-of-service/terms-of-service').then((m) => m.TermsOfService),
  },
  {
    path: '**',
    title: 'Page not found',
    data: { robots: 'noindex, follow' } satisfies SeoRouteData,
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
