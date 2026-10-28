import { DatePipe } from '@angular/common';
import { Component, afterNextRender, inject, input, linkedSignal, signal } from '@angular/core';
import { FormField, FormRoot, form, maxLength, required, validate } from '@angular/forms/signals';
import { AuthService } from '../../core/auth/auth.service';
import {
  DateSelection,
  SERVICE_LABELS,
  ServiceKind,
} from '../../core/date-selections/date-selection.model';
import {
  DateSelectionsService,
  toNewDateSelection,
} from '../../core/date-selections/date-selections.service';
import { httpErrorMessage } from '../../core/http-error-message';
import { FieldErrors } from '../../shared/field-errors/field-errors';

const isServiceKind = (value: unknown): value is ServiceKind =>
  typeof value === 'string' && value in SERVICE_LABELS;

interface Status {
  kind: 'success' | 'error';
  message: string;
}

@Component({
  selector: 'app-date-time-form',
  imports: [FormField, FormRoot, FieldErrors, DatePipe],
  templateUrl: './date-time-form.html',
  styleUrl: './date-time-form.scss',
  host: {
    class: 'page',
    'animate.enter': 'page-enter',
    'animate.leave': 'page-leave',
  },
})
export class DateTimeForm {
  /** Bound from ?service=; the lift club and referral pages link here with it preselected. */
  readonly service = input<string>();

  protected readonly auth = inject(AuthService);
  protected readonly dateSelections = inject(DateSelectionsService);
  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly serviceOptions = Object.entries(SERVICE_LABELS) as [ServiceKind, string][];
  protected readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  protected readonly status = signal<Status | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly removingId = signal<string | null>(null);

  private readonly model = linkedSignal(() => {
    const service = this.service();
    return {
      service: isServiceKind(service) ? service : 'lift-club',
      date: '',
      time: '',
      note: '',
    };
  });

  protected readonly scheduleForm = form(
    this.model,
    (path) => {
      required(path.date, { message: 'Please choose a date' });
      required(path.time, { message: 'Please choose a time' });
      validate(path.time, ({ value, valueOf }) => {
        const date = valueOf(path.date);
        if (!date || !value() || new Date(`${date}T${value()}`).getTime() > Date.now()) {
          return null;
        }
        return { kind: 'past', message: 'Please choose a date and time in the future' };
      });
      maxLength(path.note, 500, { message: 'Notes can be up to 500 characters' });
    },
    { submission: { action: () => this.save() } },
  );

  constructor() {
    afterNextRender(() => void this.loadSelections());
  }

  protected async remove(selection: DateSelection): Promise<void> {
    this.status.set(null);
    this.removingId.set(selection._id);
    try {
      await this.dateSelections.remove(selection._id);
    } catch (error) {
      this.status.set({ kind: 'error', message: httpErrorMessage(error) });
    } finally {
      this.removingId.set(null);
    }
  }

  protected async deleteAccount(): Promise<void> {
    if (!confirm('Delete your account and every date you have saved? This cannot be undone.')) {
      return;
    }
    try {
      await this.auth.deleteAccount();
    } catch (error) {
      this.status.set({ kind: 'error', message: httpErrorMessage(error) });
    }
  }

  private async loadSelections(): Promise<void> {
    try {
      await this.dateSelections.load();
    } catch (error) {
      this.loadError.set(httpErrorMessage(error, "We couldn't load your saved dates."));
    } finally {
      this.loading.set(false);
    }
  }

  private async save(): Promise<null> {
    this.status.set(null);
    try {
      const saved = await this.dateSelections.create(toNewDateSelection(this.model()));
      this.status.set({
        kind: 'success',
        message: `Saved: ${SERVICE_LABELS[saved.service]} on ${saved.selectedDate} at ${saved.selectedTime}.`,
      });
      this.scheduleForm().reset({ ...this.model(), date: '', time: '', note: '' });
    } catch (error) {
      this.status.set({ kind: 'error', message: httpErrorMessage(error) });
    }
    return null;
  }
}
