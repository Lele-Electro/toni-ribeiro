import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { DateSelection } from './date-selection.model';
import { DateSelectionsService, toNewDateSelection } from './date-selections.service';

const selection = (id: string, scheduledFor: string): DateSelection => ({
  _id: id,
  user: 'user-1',
  selectedDate: scheduledFor.slice(0, 10),
  selectedTime: '08:00',
  scheduledFor,
  service: 'lift-club',
  createdAt: '',
  updatedAt: '',
});

describe('DateSelectionsService', () => {
  const url = `${environment.apiUrl}/date-selections`;
  let service: DateSelectionsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DateSelectionsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads, adds in date order and removes selections', async () => {
    const loading = service.load();
    http.expectOne(url).flush({ dateSelections: [selection('b', '2099-06-01T06:00:00.000Z')] });
    await loading;

    const creating = service.create(
      toNewDateSelection({ date: '2099-05-01', time: '08:00', service: 'lift-club', note: '' }),
    );
    const post = http.expectOne(url);
    expect(post.request.method).toBe('POST');
    post.flush({ dateSelection: selection('a', '2099-05-01T06:00:00.000Z') });
    await creating;
    expect(service.selections().map((s) => s._id)).toEqual(['a', 'b']);

    const removing = service.remove('b');
    const del = http.expectOne(`${url}/b`);
    expect(del.request.method).toBe('DELETE');
    del.flush({});
    await removing;
    expect(service.selections().map((s) => s._id)).toEqual(['a']);
  });
});

describe('toNewDateSelection', () => {
  it('keeps the wall-clock values and resolves the instant in the local time zone', () => {
    const payload = toNewDateSelection({
      date: '2099-05-01',
      time: '08:30',
      service: 'referral-business',
      note: '  Gate B  ',
    });

    expect(payload.selectedDate).toBe('2099-05-01');
    expect(payload.selectedTime).toBe('08:30');
    expect(payload.service).toBe('referral-business');
    expect(payload.note).toBe('Gate B');
    expect(payload.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(payload.scheduledFor).toBe(new Date(2099, 4, 1, 8, 30).toISOString());
  });

  it('omits an empty note', () => {
    expect(
      toNewDateSelection({ date: '2099-05-01', time: '08:30', service: 'general', note: '   ' })
        .note,
    ).toBeUndefined();
  });
});
