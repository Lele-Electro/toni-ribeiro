import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const token = signal<string | null>('jwt-token');
  const expireSession = vi.fn();

  beforeEach(() => {
    token.set('jwt-token');
    expireSession.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token, expireSession } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('adds the bearer token to API requests', () => {
    http.get(`${environment.apiUrl}/date-selections`).subscribe();
    const req = backend.expectOne(`${environment.apiUrl}/date-selections`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush({});
  });

  it('never sends the token to other origins', () => {
    http.get('https://example.com/data').subscribe();
    const req = backend.expectOne('https://example.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('sends no header when signed out', () => {
    token.set(null);
    http.get(`${environment.apiUrl}/user/me`).subscribe({ error: () => undefined });
    const req = backend.expectOne(`${environment.apiUrl}/user/me`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(expireSession).not.toHaveBeenCalled();
  });

  it('expires the session when the API rejects the token', () => {
    let status = 0;
    http
      .get(`${environment.apiUrl}/date-selections`)
      .subscribe({ error: (e) => (status = e.status) });
    backend
      .expectOne(`${environment.apiUrl}/date-selections`)
      .flush({ message: 'Authorization failed' }, { status: 401, statusText: 'Unauthorized' });

    expect(expireSession).toHaveBeenCalledOnce();
    expect(status).toBe(401);
  });
});
