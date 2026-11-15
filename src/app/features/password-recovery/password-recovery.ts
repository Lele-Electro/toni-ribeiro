import { Component, afterNextRender, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { httpErrorMessage } from '../../core/http-error-message';

@Component({
  selector: 'app-password-recovery',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './password-recovery.html',
  styleUrls: ['../login/login.scss', './password-recovery.scss'],
  host: { class: 'page' },
})
export class PasswordRecovery {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly builder = inject(FormBuilder).nonNullable;
  protected readonly resetting = this.route.snapshot.data['resetPassword'] === true;
  protected readonly pending = signal(false);
  protected readonly success = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly token = signal('');
  protected readonly ready = signal(!this.resetting);
  protected readonly recoveryForm = this.builder.group({
    email: [
      '',
      this.resetting ? [] : [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    password: [
      '',
      this.resetting
        ? [Validators.required, Validators.minLength(8), Validators.maxLength(72)]
        : [],
    ],
    confirmation: ['', this.resetting ? [Validators.required] : []],
  });

  constructor() {
    afterNextRender(() => {
      if (!this.resetting) return;
      const token = new URLSearchParams(this.route.snapshot.fragment ?? '').get('token') ?? '';
      this.token.set(/^[a-f0-9]{64}$/.test(token) ? token : '');
      this.ready.set(true);
      // Keep the bearer token out of history, subsequent navigation and copied URLs.
      void this.router.navigate([], {
        relativeTo: this.route,
        fragment: undefined,
        replaceUrl: true,
        queryParamsHandling: 'preserve',
      });
    });
  }

  protected async submit(): Promise<void> {
    if (this.pending()) return;
    this.error.set(null);
    this.recoveryForm.markAllAsTouched();
    if (this.recoveryForm.invalid) return;
    const { email, password, confirmation } = this.recoveryForm.getRawValue();
    if (this.resetting && password !== confirmation) {
      this.error.set('Your passwords do not match.');
      return;
    }
    if (this.resetting && new TextEncoder().encode(password).length > 72) {
      this.error.set('Your password must fit within 72 UTF-8 bytes. Try fewer characters.');
      return;
    }
    if (this.resetting && !this.token()) return;
    this.pending.set(true);
    try {
      if (this.resetting) {
        await this.auth.resetPassword(this.token(), password);
        this.token.set('');
        this.recoveryForm.reset();
        this.success.set('Your password has been changed. Sign in with your new password.');
      } else {
        const response = await this.auth.forgotPassword(email.trim());
        this.success.set(response.message);
      }
    } catch (error) {
      this.error.set(httpErrorMessage(error, 'Unable to complete your request. Please try again.'));
    } finally {
      this.pending.set(false);
    }
  }
}
