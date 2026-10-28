import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let element: HTMLElement;
  const auth = { signIn: vi.fn(), signUp: vi.fn(), signInWithGoogle: vi.fn() };
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    Object.values(auth).forEach((fn) => fn.mockReset().mockResolvedValue({}));
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  const type = (selector: string, value: string) => {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  const submit = async () => {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  const clickTab = async (label: string) => {
    [...element.querySelectorAll<HTMLButtonElement>('.auth__tabs button')]
      .find((button) => button.textContent?.trim() === label)!
      .click();
    await fixture.whenStable();
  };

  it('signs in and returns to the page the user came from', async () => {
    fixture.componentRef.setInput('returnUrl', '/schedule?service=lift-club');
    type('#email', 'ann@example.com');
    type('#password', 'secret-123');
    await submit();

    expect(auth.signIn).toHaveBeenCalledWith({ email: 'ann@example.com', password: 'secret-123' });
    expect(navigateByUrl).toHaveBeenCalledWith('/schedule?service=lift-club');
  });

  it('ignores return URLs that point off-site', async () => {
    fixture.componentRef.setInput('returnUrl', '//evil.example/phish');
    type('#email', 'ann@example.com');
    type('#password', 'secret-123');
    await submit();

    expect(navigateByUrl).toHaveBeenCalledWith('/schedule');
  });

  it('does not submit an invalid form and shows why', async () => {
    type('#email', 'not-an-email');
    await submit();

    expect(auth.signIn).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Please enter a valid email address');
    expect(element.textContent).toContain('Please enter your password');
  });

  it('shows the message the API returns', async () => {
    auth.signIn.mockRejectedValue(
      new HttpErrorResponse({ status: 401, error: { message: 'Invalid email or password' } }),
    );
    type('#email', 'ann@example.com');
    type('#password', 'wrong-pass');
    await submit();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Invalid email or password',
    );
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('requires a name and an 8+ character password to create an account', async () => {
    await clickTab('Create account');
    type('#email', 'new@example.com');
    type('#password', 'short');
    await submit();

    expect(auth.signUp).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Please enter your first name');
    expect(element.textContent).toContain('Use at least 8 characters');

    type('#name', 'Neo');
    type('#password', 'long-enough-1');
    await submit();

    expect(auth.signUp).toHaveBeenCalledWith({
      name: 'Neo',
      surname: undefined,
      email: 'new@example.com',
      password: 'long-enough-1',
    });
  });

  it('signs in with a Google credential', async () => {
    await fixture.componentInstance['onGoogleCredential']('google-id-token');
    expect(auth.signInWithGoogle).toHaveBeenCalledWith('google-id-token');
    expect(navigateByUrl).toHaveBeenCalledWith('/schedule');
  });
});
