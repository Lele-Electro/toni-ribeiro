import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { AdminAccount, AdminBooking, AdminOverview, AdminService } from '../../core/admin/admin.service';
import { httpErrorMessage } from '../../core/http-error-message';
import { SCHEDULE_TIME_ZONE, slotLabel } from '../../shared/day-scheduler/scheduler-time';

const DAY = new Intl.DateTimeFormat('en-ZA', {
  timeZone: SCHEDULE_TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const JOINED = new Intl.DateTimeFormat('en-ZA', {
  timeZone: SCHEDULE_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * The owner's page: every upcoming booking and every account, with the means to remove a
 * booking, delete an account or reset everything. Each destructive button asks once more
 * before it acts, because none of these can be undone.
 */
@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
  host: {
    class: 'page',
    'animate.enter': 'page-enter',
    'animate.leave': 'page-leave',
  },
})
export class Admin {
  private readonly admin = inject(AdminService);

  protected readonly overview = signal<AdminOverview | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  /** The action waiting for its second click, for example "booking:<id>" or "reset". */
  protected readonly confirming = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly bookings = computed(() => this.overview()?.bookings ?? []);
  protected readonly accounts = computed(() => this.overview()?.accounts ?? []);
  protected readonly memberCount = computed(
    () => this.accounts().filter((account) => !account.isAdmin).length,
  );

  constructor() {
    // The session lives in the browser, so there is nothing to load on the server.
    afterNextRender(() => void this.load());
  }

  protected day(booking: AdminBooking): string {
    return DAY.format(new Date(booking.scheduledFor));
  }

  protected time(booking: AdminBooking): string {
    return slotLabel(booking.startHour);
  }

  protected joined(account: AdminAccount): string {
    return JOINED.format(new Date(account.createdAt));
  }

  protected isAdminMember(booking: AdminBooking): boolean {
    return this.accounts().some((a) => a.userId === booking.member?.userId && a.isAdmin);
  }

  protected ask(action: string): void {
    this.actionError.set(null);
    this.notice.set(null);
    this.confirming.set(action);
  }

  protected removeBooking(booking: AdminBooking): Promise<void> {
    return this.run(
      () => this.admin.removeBooking(booking._id),
      `Removed the ${this.day(booking)}, ${this.time(booking)} booking. The slot is open again.`,
    );
  }

  protected deleteAccount(userId: string, email: string): Promise<void> {
    return this.run(
      () => this.admin.deleteAccount(userId),
      `Deleted the account ${email} and its bookings.`,
    );
  }

  protected reset(): Promise<void> {
    return this.run(
      () => this.admin.reset(),
      'Reset complete: every member account and every booking has been deleted.',
    );
  }

  protected async load(): Promise<void> {
    this.loadError.set(null);
    try {
      this.overview.set(await this.admin.overview());
    } catch (error) {
      this.loadError.set(httpErrorMessage(error, 'The bookings could not be loaded.'));
    }
  }

  private async run(action: () => Promise<void>, done: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set(null);
    try {
      await action();
      this.notice.set(done);
    } catch (error) {
      this.actionError.set(httpErrorMessage(error, 'That did not work. Please try again.'));
    } finally {
      this.confirming.set(null);
      this.busy.set(false);
      // Reload either way, so the page shows what is really stored.
      await this.load();
    }
  }
}
