Password recovery is available from **Log in → Forgot your password?**

The frontend calls the backend under `/api/ribeiro/user`:

- `POST /forgot-password` with `{ "email": "..." }` queues a reset email and returns the same HTTP 202 response whether the account exists or not.
- `POST /reset-password` with `{ "token": "...", "password": "..." }` changes the password. It does not sign the user in automatically.

Reset links use `/reset-password#token=...`. The browser removes the fragment after opening the page. Links expire 30 minutes after issuance, are single use, and are replaced by a later request after a 60-second cooldown. Requests are limited per email and IP using MongoDB counters. Existing sessions are revoked on reset, including booking and date-selection APIs. A password-change notification is queued too.

Email delivery uses the existing verified Ribeiro SMTP configuration. The reset token is hashed for lookup and encrypted while waiting for delivery; the encrypted copy is removed after sending. Pending delivery survives restarts in MongoDB. Node polls every 15 seconds; Cloudflare uses Durable Object alarms plus its once-per-minute recovery cron. Failed SMTP deliveries retry after a minute until link expiry. No passwords or reset tokens are written to application logs.

The backend repository is `C:\development\digiterra-challenge` (its Express sources are in `backend`). Its ignored root `.env` now contains a persistent local `JWT_SECRET`, fixing the `secretOrPrivateKey must have a value` error. Restart a backend process that was started before this setting was added. Keep this key private and stable; changing it invalidates sessions and pending encrypted reset emails. Production keeps its existing Cloudflare secret.

Set `RIBEIRO_APP_URL` to the frontend origin for requests without a browser Origin. The local `.env` uses `http://localhost:4200`; Cloudflare uses `https://www.toniribeiro.com`. For browser requests, links follow the requesting origin only if explicitly trusted in `CORS_ALLOWED_ORIGINS` or one of the built-in local/production origins. Add each staging frontend's HTTPS origin to the backend configuration. Arbitrary Host headers and redirect URLs are never used.

Backend checks: `npm run test:api`. Frontend checks: `npm test -- --watch=false` and `npm run build`. Backend deployment: `npm run deploy:cloudflare`, which immediately updates existing Durable Objects. Deploy the frontend changes through your normal frontend hosting flow to make the new screens available publicly.
