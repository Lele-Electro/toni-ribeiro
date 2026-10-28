import { HttpErrorResponse } from '@angular/common/http';

/** A message suitable for showing to the user, preferring the API's own `message`. */
export function httpErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return "We couldn't reach the server. Check your connection and try again.";
    }
    const message = (error.error as { message?: unknown } | null)?.message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }
  return fallback;
}
