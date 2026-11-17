import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './auth.guards';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  const isAuthenticated = signal(false);
  const user = signal<{ isAdmin?: boolean } | null>(null);
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/schedule?service=lift-club' } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { isAuthenticated, user } }],
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

  it('adminGuard admits only the owner', () => {
    isAuthenticated.set(false);
    expect(serialize(run(adminGuard))).toBe('/login?returnUrl=%2Fschedule%3Fservice%3Dlift-club');

    isAuthenticated.set(true);
    user.set({ isAdmin: false });
    expect(serialize(run(adminGuard))).toBe('/lift-club');

    user.set({ isAdmin: true });
    expect(run(adminGuard)).toBe(true);
  });

  it('guestGuard keeps signed-in users off the login page', () => {
    isAuthenticated.set(true);
    expect(serialize(run(guestGuard))).toBe('/lift-club');

    isAuthenticated.set(false);
    expect(run(guestGuard)).toBe(true);
  });
});
