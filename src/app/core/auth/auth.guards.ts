import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AFTER_LOGIN_URL } from '../navigation';
import { AuthService } from './auth.service';

/** Sends signed-out visitors to the login screen, remembering where they were heading. */
export const authGuard: CanActivateFn = (_route, state) =>
  inject(AuthService).isAuthenticated() ||
  inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

/**
 * The owner's pages. Signed-out visitors log in first; members who aren't administrators
 * go to the booking table. The API checks again, so this only decides what is shown.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return auth.user()?.isAdmin === true || router.parseUrl(AFTER_LOGIN_URL);
};

/** Keeps signed-in users off the login screen. */
export const guestGuard: CanActivateFn = () =>
  !inject(AuthService).isAuthenticated() || inject(Router).parseUrl(AFTER_LOGIN_URL);
