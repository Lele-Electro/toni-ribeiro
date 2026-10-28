import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, SignInCredentials, SignUpDetails, UserInformation } from './auth.models';
import { GoogleIdentityService } from './google-identity.service';

const STORAGE_KEY = 'ribeiro.session';

interface Session {
  token: string;
  /** Epoch milliseconds after which the backend will reject the token. */
  expiresAt: number;
  user: UserInformation;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly googleIdentity = inject(GoogleIdentityService);
  private readonly storage = isPlatformBrowser(inject(PLATFORM_ID))
    ? globalThis.localStorage
    : null;
  private readonly baseUrl = `${environment.apiUrl}/user`;

  private readonly session = signal<Session | null>(this.restoreSession());
  private expiryTimer?: ReturnType<typeof setTimeout>;

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  constructor() {
    const session = this.session();
    if (session) {
      this.scheduleExpiry(session.expiresAt);
    }
  }

  signIn(credentials: SignInCredentials): Promise<UserInformation> {
    return this.authenticate(this.http.post<AuthResponse>(`${this.baseUrl}/signin`, credentials));
  }

  signUp(details: SignUpDetails): Promise<UserInformation> {
    return this.authenticate(this.http.post<AuthResponse>(`${this.baseUrl}/signup`, details));
  }

  /** Exchanges a Google ID token for this app's own JWT. */
  signInWithGoogle(credential: string): Promise<UserInformation> {
    return this.authenticate(
      this.http.post<AuthResponse>(`${this.baseUrl}/google`, { credential }),
    );
  }

  logout(): void {
    this.endSession();
    this.googleIdentity.disableAutoSelect();
    void this.router.navigateByUrl('/');
  }

  /** Called when the token runs out or the API rejects it. */
  expireSession(): void {
    this.endSession();
    // Re-run guards so a protected page the user is sitting on sends them to log in again
    void this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
  }

  async deleteAccount(): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/me`));
    this.logout();
  }

  private async authenticate(request: Observable<AuthResponse>): Promise<UserInformation> {
    const response = await firstValueFrom(request);
    const session: Session = {
      token: response.token,
      expiresAt: Date.now() + response.expiresIn * 1000,
      user: response.userInformationOnSignIn,
    };
    this.session.set(session);
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(session));
    this.scheduleExpiry(session.expiresAt);
    return session.user;
  }

  private endSession(): void {
    clearTimeout(this.expiryTimer);
    this.session.set(null);
    this.storage?.removeItem(STORAGE_KEY);
  }

  private scheduleExpiry(expiresAt: number): void {
    clearTimeout(this.expiryTimer);
    this.expiryTimer = setTimeout(() => this.expireSession(), expiresAt - Date.now());
  }

  private restoreSession(): Session | null {
    try {
      const session = JSON.parse(this.storage?.getItem(STORAGE_KEY) ?? 'null') as Session | null;
      if (session?.token && session.expiresAt > Date.now()) {
        return session;
      }
    } catch {
      // Corrupt or unreadable storage is treated as signed out
    }
    this.storage?.removeItem(STORAGE_KEY);
    return null;
  }
}
