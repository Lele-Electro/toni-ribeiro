import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guards';
import { LIFT_CLUB_PAGE } from './core/seo/page-tags';
import { SeoRouteData } from './core/seo/seo-title.strategy';
import { LIFT_CLUB_CHILD_ROUTES } from './features/lift-club/lift-club.routes';

export const routes: Routes = [
  {
    // The home page (features/landing) is switched off: every visit to / opens the lift club.
    // To bring it back, replace redirectTo with
    //   loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
    // and remove the matching redirect in scripts/build-afrihost.mjs.
    path: '',
    pathMatch: 'full',
    redirectTo: LIFT_CLUB_PAGE.path,
  },
  {
    // /lift-club, /events and /reviews: one page, which stays on screen as the address
    // moves between its views (see lift-club.routes.ts).
    path: '',
    loadComponent: () => import('./features/lift-club/lift-club').then((m) => m.LiftClub),
    children: LIFT_CLUB_CHILD_ROUTES,
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
    path: 'forgot-password',
    title: 'Recover your password',
    data: { robots: 'noindex, nofollow' } satisfies SeoRouteData,
    loadComponent: () =>
      import('./features/password-recovery/password-recovery').then((m) => m.PasswordRecovery),
  },
  {
    path: 'reset-password',
    title: 'Reset your password',
    data: { resetPassword: true, robots: 'noindex, nofollow' },
    loadComponent: () =>
      import('./features/password-recovery/password-recovery').then((m) => m.PasswordRecovery),
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
    path: 'admin',
    title: 'Manage bookings',
    canActivate: [adminGuard],
    // Lets AuthService.expireSession() re-run the guard on the page the owner is on
    runGuardsAndResolvers: 'always',
    data: { robots: 'noindex, nofollow' } satisfies SeoRouteData,
    loadComponent: () => import('./features/admin/admin').then((m) => m.Admin),
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
