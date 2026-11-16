import { Component, inject, input, isDevMode, signal } from '@angular/core';
import {
  FormField,
  FormRoot,
  email,
  form,
  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { GoogleIdentityService } from '../../core/auth/google-identity.service';
import { httpErrorMessage } from '../../core/http-error-message';
import { AFTER_LOGIN_URL, isUnavailable } from '../../core/navigation';
import { FieldErrors } from '../../shared/field-errors/field-errors';
import { GoogleSignInButton } from '../../shared/google-sign-in-button/google-sign-in-button';

type Mode = 'signin' | 'signup';

@Component({
  selector: 'app-login',
  imports: [FormField, FormRoot, RouterLink, FieldErrors, GoogleSignInButton],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  host: {
    class: 'page',
    'animate.enter': 'page-enter',
    'animate.leave': 'page-leave',
  },
})
export class Login {
  /** Bound from ?returnUrl= by withComponentInputBinding(); set by authGuard. */
  readonly returnUrl = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly googleConfigured = inject(GoogleIdentityService).isConfigured;
  protected readonly showGoogleSetupHint = !this.googleConfigured && isDevMode();

  /** The legal pages are linked only once they have content. */
  protected readonly termsReady = !isUnavailable('/terms');
  protected readonly privacyReady = !isUnavailable('/privacy');

  protected readonly mode = signal<Mode>('signin');
  protected readonly serverError = signal<string | null>(null);
  protected readonly googlePending = signal(false);

  private readonly model = signal({ name: '', surname: '', phone: '', email: '', password: '' });
  protected readonly loginForm = form(
    this.model,
    (path) => {
      const signingUp = () => this.mode() === 'signup';
      required(path.name, { message: 'Please enter your first name', when: signingUp });
      maxLength(path.phone, 40, { message: 'Use 40 characters or fewer', when: signingUp });
      validate(path.phone, ({ value }) => {
        const phone = value().trim();
        if (!signingUp() || !phone || /^\+?\d{7,15}$/.test(phone.replace(/[\s().-]/g, '')))
          return null;
        return {
          kind: 'phone',
          message: 'Enter a cellphone number with 7–15 digits, or leave it blank',
        };
      });
      required(path.email, { message: 'Please enter your email address' });
      email(path.email, { message: 'Please enter a valid email address' });
      required(path.password, { message: 'Please enter your password' });
      minLength(path.password, 8, { message: 'Use at least 8 characters', when: signingUp });
      maxLength(path.password, 72, { message: 'Use 72 characters or fewer' });
    },
    { submission: { action: () => this.submit() } },
  );

  protected setMode(mode: Mode): void {
    this.mode.set(mode);
    this.serverError.set(null);
    this.loginForm().reset();
  }

  protected async onGoogleCredential(credential: string): Promise<void> {
    this.serverError.set(null);
    this.googlePending.set(true);
    try {
      await this.auth.signInWithGoogle(credential);
      await this.continue();
    } catch (error) {
      this.serverError.set(httpErrorMessage(error, 'Google sign-in failed. Please try again.'));
    } finally {
      this.googlePending.set(false);
    }
  }

  private async submit(): Promise<null> {
    this.serverError.set(null);
    const { name, surname, phone, email, password } = this.model();
    try {
      if (this.mode() === 'signup') {
        await this.auth.signUp({
          name,
          surname: surname || undefined,
          phone: phone.trim() || undefined,
          email,
          password,
        });
      } else {
        await this.auth.signIn({ email, password });
      }
      await this.continue();
    } catch (error) {
      this.serverError.set(httpErrorMessage(error));
    }
    return null;
  }

  private continue(): Promise<boolean> {
    const returnUrl = this.returnUrl();
    // Only follow in-app paths, never protocol-relative or absolute URLs, and never a
    // page that has no content yet: those fall back to the booking table.
    const target =
      returnUrl?.startsWith('/') && !returnUrl.startsWith('//') && !isUnavailable(returnUrl)
        ? returnUrl
        : AFTER_LOGIN_URL;
    return this.router.navigateByUrl(target);
  }
}
