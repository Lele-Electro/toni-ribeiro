import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Sends the JWT to our own API only, and signs the user out if the API rejects it. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isApiRequest = req.url.startsWith(environment.apiUrl);

  const request =
    token && isApiRequest ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (token && isApiRequest && error instanceof HttpErrorResponse && error.status === 401) {
        auth.expireSession();
      }
      return throwError(() => error);
    }),
  );
};
