import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminOverview, AdminService } from '../../core/admin/admin.service';
import { Admin } from './admin';

describe('Admin', () => {
  let fixture: ComponentFixture<Admin>;
  let element: HTMLElement;
  const api = {
    overview: vi.fn(),
    removeBooking: vi.fn(),
    deleteAccount: vi.fn(),
    reset: vi.fn(),
  };
  const data = (): AdminOverview => ({
    accounts: [
      {
        userId: 'owner',
        name: 'Toni',
        email: 'owner@example.com',
        createdAt: '2026-11-01T08:00:00.000Z',
        isAdmin: true,
        bookings: 0,
      },
      {
        userId: 'ann',
        name: 'Ann',
        email: 'ann@example.com',
        createdAt: '2026-11-10T08:00:00.000Z',
        isAdmin: false,
        bookings: 1,
      },
    ],
    bookings: [
      {
        _id: 'booking-1',
        serviceDate: '2026-11-20',
        startHour: 8,
        scheduledFor: '2026-11-20T06:00:00.000Z',
        passengers: 2,
        whatsapp: '0821234567',
        pickup: { address: 'Rosebank Mall' },
        dropoff: { address: 'OR Tambo' },
        status: 'pending',
        member: { userId: 'ann', name: 'Ann', email: 'ann@example.com' },
      },
    ],
  });

  beforeEach(async () => {
    Object.values(api).forEach((fn) => fn.mockReset().mockResolvedValue(undefined));
    api.overview.mockResolvedValue(data());
    TestBed.configureTestingModule({
      imports: [Admin],
      providers: [{ provide: AdminService, useValue: api }],
    });
    fixture = TestBed.createComponent(Admin);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  const button = (label: string, within: ParentNode = element) =>
    [...within.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === label,
    );
  const click = async (label: string, within?: ParentNode) => {
    button(label, within)!.click();
    await fixture.whenStable();
  };
  const card = (id: string) => element.querySelector(`[aria-labelledby="${id}"]`)!;

  it('lists upcoming bookings with their member, and every account', () => {
    const bookings = card('admin-bookings').textContent!;
    expect(bookings).toContain('Upcoming bookings (1)');
    expect(bookings).toContain('ann@example.com');
    expect(bookings).toContain('08:00');
    expect(bookings).toContain('Rosebank Mall');
    const accounts = card('admin-accounts');
    expect(accounts.textContent).toContain('Accounts (2)');
    // The owner's own account offers no delete button.
    expect(accounts.querySelectorAll('.admin__row')[0].querySelector('button')).toBeNull();
  });

  it('removes a booking only after a second click', async () => {
    await click('Remove booking');
    expect(api.removeBooking).not.toHaveBeenCalled();
    await click('Keep');
    expect(button('Yes, remove')).toBeUndefined();

    await click('Remove booking');
    api.overview.mockResolvedValue({ ...data(), bookings: [] });
    await click('Yes, remove');
    expect(api.removeBooking).toHaveBeenCalledWith('booking-1');
    expect(element.querySelector('[role="status"]')!.textContent).toContain('slot is open again');
    expect(card('admin-bookings').textContent).toContain('Every slot is open');
  });

  it('deletes a member account after confirmation and shows API errors', async () => {
    await click('Delete account', card('admin-accounts'));
    expect(api.deleteAccount).not.toHaveBeenCalled();
    api.deleteAccount.mockRejectedValue(
      new HttpErrorResponse({ status: 409, error: { message: 'Not allowed.' } }),
    );
    await click('Yes, delete');
    expect(api.deleteAccount).toHaveBeenCalledWith('ann');
    expect(element.querySelector('[role="alert"]')!.textContent).toContain('Not allowed.');
  });

  it('resets everything only after confirmation', async () => {
    expect(card('admin-reset').textContent).toContain('all 1 member account');
    await click('Reset accounts and bookings');
    expect(api.reset).not.toHaveBeenCalled();
    await click('Yes, reset everything');
    expect(api.reset).toHaveBeenCalledOnce();
    expect(api.overview).toHaveBeenCalledTimes(2);
  });
});
