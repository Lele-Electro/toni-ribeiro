import { DOCUMENT, Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/** The subset of Google Identity Services (accounts.google.com/gsi/client) this app uses. */
interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string; select_by?: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: 'signin' | 'signup' | 'use';
    ux_mode?: 'popup' | 'redirect';
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: GoogleButtonText;
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
    },
  ): void;
  disableAutoSelect(): void;
}

export type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

// Google requires loading the library from this URL; self-hosting it is not supported.
const GSI_CLIENT_URL = 'https://accounts.google.com/gsi/client';

/**
 * Loads Google Identity Services on demand and renders the official "Sign in with Google"
 * button, which always follows Google's current branding guidelines. Browser only.
 */
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private readonly document = inject(DOCUMENT);
  private library?: Promise<GoogleAccountsId>;
  private credentialHandler?: (credential: string) => void;

  readonly isConfigured = environment.googleClientId.length > 0;

  async renderButton(
    host: HTMLElement,
    text: GoogleButtonText,
    onCredential: (credential: string) => void,
  ): Promise<void> {
    const accountsId = await this.load();
    this.credentialHandler = onCredential;
    const prefersDark = this.document.defaultView?.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    accountsId.renderButton(host, {
      type: 'standard',
      theme: prefersDark ? 'filled_black' : 'outline',
      size: 'large',
      text,
      shape: 'rectangular',
      logo_alignment: 'left',
      width: Math.min(400, Math.max(200, host.clientWidth)),
    });
  }

  /** Google asks sites to call this on sign-out so the user isn't signed straight back in. */
  disableAutoSelect(): void {
    this.document.defaultView?.google?.accounts?.id?.disableAutoSelect();
  }

  private load(): Promise<GoogleAccountsId> {
    this.library ??= new Promise<GoogleAccountsId>((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = GSI_CLIENT_URL;
      script.async = true;
      script.onload = () => {
        const accountsId = this.document.defaultView?.google?.accounts?.id;
        if (!accountsId) {
          reject(new Error('Google Identity Services did not initialise'));
          return;
        }
        // initialize() must only run once per page; later buttons just swap the handler
        accountsId.initialize({
          client_id: environment.googleClientId,
          callback: ({ credential }) => this.credentialHandler?.(credential),
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin',
          ux_mode: 'popup',
        });
        resolve(accountsId);
      };
      script.onerror = () => {
        this.library = undefined;
        script.remove();
        reject(new Error('Could not load Google Identity Services'));
      };
      this.document.head.appendChild(script);
    });
    return this.library;
  }
}
