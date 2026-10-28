import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { authGuard, guestGuard } from './auth.guards';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  const isAuthenticated = signal(false);
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/schedule?service=lift-club' } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { isAuthenticated } }],
    });
  });

  const run = (guard: typeof authGuard) => TestBed.runInInjectionContext(() => guard(route, state));
  const serialize = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  it('authGuard lets signed-in users through', () => {
    isAuthenticated.set(true);
    expect(run(authGuard)).toBe(true);
  });

  it('authGuard sends signed-out users to login with a return URL', () => {
    isAuthenticated.set(false);
    expect(serialize(run(authGuard))).toBe('/login?returnUrl=%2Fschedule%3Fservice%3Dlift-club');
  });

  it('guestGuard keeps signed-in users off the login page', () => {
    isAuthenticated.set(true);
    expect(serialize(run(guestGuard))).toBe('/schedule');

    isAuthenticated.set(false);
    expect(run(guestGuard)).toBe(true);
  });
});
