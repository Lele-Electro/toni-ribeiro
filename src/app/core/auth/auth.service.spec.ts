import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthResponse } from './auth.models';
import { AuthService } from './auth.service';
import { GoogleIdentityService } from './google-identity.service';

const STORAGE_KEY = 'ribeiro.session';

const authResponse = (): AuthResponse => ({
  token: 'jwt-token',
  expiresIn: 3600,
  userInformationOnSignIn: {
    userId: 'user-1',
    email: 'ann@example.com',
    name: 'Ann',
    surname: null,
    picture: null,
    authProviders: ['password'],
  },
});

describe('AuthService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('signs in, exposes the user and persists the session', async () => {
    const auth = TestBed.inject(AuthService);
    const result = auth.signIn({ email: 'ann@example.com', password: 'secret-123' });

    const req = http.expectOne(`${environment.apiUrl}/user/signin`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ann@example.com', password: 'secret-123' });
    req.flush(authResponse());
    await result;

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()?.name).toBe('Ann');
    expect(auth.token()).toBe('jwt-token');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.token).toBe('jwt-token');
    expect(stored.expiresAt).toBeGreaterThan(Date.now() + 3500 * 1000);
  });

  it('signs up through the signup endpoint', async () => {
    const auth = TestBed.inject(AuthService);
    const result = auth.signUp({ name: 'Ann', email: 'ann@example.com', password: 'secret-123' });
    http.expectOne(`${environment.apiUrl}/user/signup`).flush(authResponse());
    await result;
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('exchanges a Google ID token for an app session', async () => {
    const auth = TestBed.inject(AuthService);
    const result = auth.signInWithGoogle('google-id-token');

    const req = http.expectOne(`${environment.apiUrl}/user/google`);
    expect(req.request.body).toEqual({ credential: 'google-id-token' });
    req.flush(authResponse());
    await result;

    expect(auth.token()).toBe('jwt-token');
  });

  it('restores an unexpired session from storage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: 'saved',
        expiresAt: Date.now() + 60_000,
        user: authResponse().userInformationOnSignIn,
      }),
    );
    expect(TestBed.inject(AuthService).token()).toBe('saved');
  });

  it('discards an expired or corrupt session', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: 'old',
        expiresAt: Date.now() - 1,
        user: authResponse().userInformationOnSignIn,
      }),
    );
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    TestBed.resetTestingModule();
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
  });

  it('logs out by clearing the session and disabling Google auto-select', async () => {
    const auth = TestBed.inject(AuthService);
    const disableAutoSelect = vi.spyOn(TestBed.inject(GoogleIdentityService), 'disableAutoSelect');
    const result = auth.signIn({ email: 'ann@example.com', password: 'secret-123' });
    http.expectOne(`${environment.apiUrl}/user/signin`).flush(authResponse());
    await result;

    auth.logout();

    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(disableAutoSelect).toHaveBeenCalled();
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('deletes the account and then logs out', async () => {
    const auth = TestBed.inject(AuthService);
    const result = auth.deleteAccount();
    const req = http.expectOne(`${environment.apiUrl}/user/me`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Account deleted' });
    await result;
    expect(auth.isAuthenticated()).toBe(false);
  });
});
