import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PasswordRecovery } from './password-recovery';

describe('PasswordRecovery', () => {
  const auth = { forgotPassword: vi.fn(), resetPassword: vi.fn() };
  let fixture: ComponentFixture<PasswordRecovery>;
  let element: HTMLElement;

  async function setup(reset = false, fragment = '') {
    auth.forgotPassword
      .mockReset()
      .mockResolvedValue({ message: 'If an account exists, check your inbox.' });
    auth.resetPassword.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      imports: [PasswordRecovery],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    // Preserve the real route for RouterLink; only change the snapshot used by the component.
    const route = TestBed.inject(ActivatedRoute);
    Object.defineProperty(route, 'snapshot', {
      value: { ...route.snapshot, data: { resetPassword: reset }, fragment },
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(PasswordRecovery);
    element = fixture.nativeElement;
    await fixture.whenStable();
    fixture.detectChanges();
  }
  function type(selector: string, value: string) {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }
  async function submit() {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('validates the email and shows the generic success response', async () => {
    await setup();
    type('#recovery-email', 'invalid');
    await submit();
    expect(auth.forgotPassword).not.toHaveBeenCalled();
    type('#recovery-email', 'ann@example.com');
    await submit();
    expect(auth.forgotPassword).toHaveBeenCalledWith('ann@example.com');
    expect(element.textContent).toContain('If an account exists');
  });

  it('removes the token fragment and requires matching passwords before submitting', async () => {
    const token = 'a'.repeat(64);
    await setup(true, `token=${token}`);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ replaceUrl: true, fragment: undefined }),
    );
    type('#new-password', 'new-password-123');
    type('#confirm-password', 'different-password');
    await submit();
    expect(auth.resetPassword).not.toHaveBeenCalled();
    expect(element.textContent).toContain('passwords do not match');
    type('#confirm-password', 'new-password-123');
    await submit();
    expect(auth.resetPassword).toHaveBeenCalledWith(token, 'new-password-123');
    expect(element.textContent).toContain('Your password has been changed');
    expect(element.querySelector('form')).toBeNull();
  });

  it('offers a replacement link when the token is missing', async () => {
    await setup(true);
    expect(element.textContent).toContain('missing or invalid');
    expect(element.querySelector('form')).toBeNull();
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });
});
