import {
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { GoogleButtonText, GoogleIdentityService } from '../../core/auth/google-identity.service';

/**
 * The official Google-rendered "Sign in with Google" button. Using Google's own button
 * (rather than a custom one) keeps it compliant with the branding guidelines automatically.
 */
@Component({
  selector: 'app-google-sign-in-button',
  template: `
    <div #buttonHost class="google-button"></div>
    @if (loadFailed()) {
      <p class="field__error" animate.enter="fade-enter">
        Google sign-in couldn't load. Check your connection, or use your email address instead.
      </p>
    }
  `,
  styles: `
    .google-button {
      display: flex;
      justify-content: center;
      min-height: 44px;
    }
  `,
})
export class GoogleSignInButton {
  readonly text = input<GoogleButtonText>('continue_with');
  /** Emits the Google ID token (a JWT) once the user picks an account. */
  readonly credential = output<string>();

  protected readonly loadFailed = signal(false);
  private readonly google = inject(GoogleIdentityService);
  private readonly buttonHost = viewChild.required<ElementRef<HTMLElement>>('buttonHost');

  constructor() {
    afterNextRender(() => {
      this.google
        .renderButton(this.buttonHost().nativeElement, this.text(), (credential) =>
          this.credential.emit(credential),
        )
        .catch(() => this.loadFailed.set(true));
    });
  }
}
