import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DateSelection, NewDateSelection } from '../../core/date-selections/date-selection.model';
import { DateSelectionsService } from '../../core/date-selections/date-selections.service';
import { DateTimeForm } from './date-time-form';

describe('DateTimeForm', () => {
  let fixture: ComponentFixture<DateTimeForm>;
  let element: HTMLElement;
  const nextYear = new Date().getFullYear() + 1;
  const selections = signal<DateSelection[]>([]);
  const dateSelections = {
    selections,
    load: vi.fn(),
    remove: vi.fn(),
    create: vi.fn(
      async (payload: NewDateSelection) => ({ ...payload, _id: 'new' }) as DateSelection,
    ),
  };

  beforeEach(async () => {
    selections.set([]);
    dateSelections.load.mockReset().mockResolvedValue(undefined);
    dateSelections.create.mockClear();
    TestBed.configureTestingModule({
      imports: [DateTimeForm],
      providers: [
        provideRouter([]),
        { provide: DateSelectionsService, useValue: dateSelections },
        {
          provide: AuthService,
          useValue: { user: signal({ name: 'Ann', email: 'ann@example.com' }) },
        },
      ],
    });
    fixture = TestBed.createComponent(DateTimeForm);
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

  it('loads the saved selections', () => {
    expect(dateSelections.load).toHaveBeenCalled();
    expect(element.textContent).toContain('No dates yet');
  });

  it('preselects the service from the query string', async () => {
    fixture.componentRef.setInput('service', 'referral-business');
    await fixture.whenStable();
    expect(element.querySelector<HTMLSelectElement>('#service')!.value).toBe('referral-business');
  });

  it('saves the chosen date and time', async () => {
    type('#date', `${nextYear}-03-14`);
    type('#time', '07:30');
    type('#note', 'Main gate');
    await submit();

    expect(dateSelections.create).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'lift-club',
        selectedDate: `${nextYear}-03-14`,
        selectedTime: '07:30',
        scheduledFor: new Date(nextYear, 2, 14, 7, 30).toISOString(),
        note: 'Main gate',
      }),
    );
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      `${nextYear}-03-14 at 07:30`,
    );
    expect(element.querySelector<HTMLInputElement>('#date')!.value).toBe('');
  });

  it('requires a date and time', async () => {
    await submit();
    expect(dateSelections.create).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Please choose a date');
    expect(element.textContent).toContain('Please choose a time');
  });

  it('rejects a moment in the past', async () => {
    type('#date', '2001-01-01');
    type('#time', '09:00');
    await submit();
    expect(dateSelections.create).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Please choose a date and time in the future');
  });
});
