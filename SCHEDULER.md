# Lift club scheduler

The scheduler is on `/lift-club`, over the existing building photograph. Its desktop
panel spans 81% of the viewport, matching the reference; on mobile it spans 90% and
the seven-day picker becomes a horizontally scrollable strip above the slots.

Days and bookings use `Africa/Johannesburg` (SAST, UTC+02:00), regardless of the
visitor's device time zone. A service day offers 21 one-hour slots, from 05:00–06:00
through 01:00–02:00 the next calendar morning. The selected date above the days
updates when a day is chosen. Past departures cannot be booked.

Visitors can inspect availability without logging in. Booking requires the existing
account login; the chosen day and hour are retained through login. The modal accepts
1–3 **total travellers, including the person booking**. Saving reserves the whole
hour. The row is greyed out for other visitors. The owner can reopen it to change the
traveller count or cancel. Cancelling releases the hour immediately. Availability
refreshes every 30 seconds; a MongoDB unique index protects against simultaneous
bookings even between refreshes. Failed availability requests disable new bookings.

## Journey details, address search and phone layout

Every booking now also requires a **WhatsApp number**, a **Pickup location** and a
**Drop-off location**. The API validates all three (`backend/services/lift-schedule.js`)
and stores the address plus, when the member picked a Google suggestion, the Place ID
and coordinates. Older reservations without these fields stay readable; editing one
asks for the missing details.

Address search uses Google Places Autocomplete (New) through the Maps JavaScript API.
Maps loads only when an address field is first focused, each search uses a session
token, and Place Details requests only `formattedAddress` and `location`. The browser
key is read at runtime from `GOOGLE_MAPS_API_KEY` (see `.env.example`; `.env` is ignored
by Git) and served to the browser by `src/server.ts` at `/app-config.json`. Without a
key, or if Maps fails, the fields accept a typed address.

At phone widths (40rem and below) the table is replaced by `MobileBookingWidget`, which
shows one day at a time, a swipeable row of hours and one action button. It reads the
same slots and opens the same booking dialog as the desktop table. The page background
is `public/background-vid-create-2.mp4`; on a phone's first visit the widget fades in
after the video has played for about three seconds, and not again once the member has
interacted with the page in that browser session.

Two HTML emails are sent after the five-minute quiet period: the member's confirmation
and a notification to Toni (`RIBEIRO_BOOKING_NOTIFY_TO`, defaulting to the sender).
Their images are the files in `public/email/`, loaded from the production site
(`RIBEIRO_EMAIL_ASSETS_URL`, default `https://www.toniribeiro.com/email`), so this
frontend must be deployed for the images to appear.

## Backend and email setup

Backend changes are in `C:\development\digiterra-challenge`:

- `backend/models/lift-booking.js`: reservations, revisions, confirmation due dates,
  delivery leases and a unique index on departure time.
- `backend/routes/lift-bookings.js`: anonymous availability; authenticated booking,
  editing and cancellation. Ownership and traveller limits are checked on the server.
- `backend/services/lift-schedule.js`: server-side seven-day window and SAST validation.
- `backend/services/lift-confirmations.js`: durable confirmation queue and SMTP delivery.
- `backend/tests/lift-bookings.test.js`: API and delivery behavior using disposable
  MongoDB and a fake mail transport. No real email is sent by the tests.

The existing backend's `server.js` starts the confirmation worker. Account deletion
also deletes lift bookings. No changes are needed to existing date-selection records.

Set the backend environment variables before starting or deploying it:

| Variable             | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `MONGODB_URI`        | Persistent production MongoDB database                  |
| `JWT_SECRET`         | Existing authentication signing secret                  |
| `RIBEIRO_SMTP_HOST` | `smtp.gmail.com` |
| `RIBEIRO_SMTP_PORT` | `465` (implicit TLS) |
| `RIBEIRO_SMTP_USER` | `toni101ribeiro@gmail.com` |
| `RIBEIRO_SMTP_PASSWORD` | Google app password, stored as a secret |
| `RIBEIRO_EMAIL_FROM` | `toni101ribeiro@gmail.com` |

Local SMTP is configured in the backend's ignored `.env`. Gmail is the permanent
sender for registration, password recovery and booking confirmation emails. On
3 November 2026, Gmail authentication succeeded locally and on Cloudflare, and a
configuration test sent to the Gmail account was accepted. Credentials stay on the backend.
The env file loads from the backend root regardless of the shell's working directory,
and platform environment variables take precedence. Run `npm run smtp:verify` in
the backend to verify the connection without sending another email.

Cloudflare deployments need these same settings in their production/preview variables
and secrets. The password belongs in an encrypted secret, not Git or the frontend.
Dedicated `RIBEIRO_SMTP_*` settings prevent interference with other applications
sharing the backend. The legacy `SMTP_*` settings remain supported as a fallback.

Run the persistent backend with `npm run start:server` (development) or `node server.js`
(production). The worker checks MongoDB every 15 seconds. It sends to the account's
email after five unchanged minutes, normally within a further 15 seconds while the
server is running. Every edit increments the revision and starts another five-minute
wait. Cancellation deletes the queued work. A short lease prevents concurrent workers
from mailing the same revision and prevents edits while that revision is being sent.
Failed delivery retries after one minute; expired leases are recovered after a crash.
Pending work is recovered on startup, so an outage delays mail rather than discarding it.

SMTP delivery is at least once: a crash after the provider accepts a message but before
MongoDB records success can cause a retry. Each revision has a stable Message-ID.
The Node interval worker needs an always-running Node process. On Cloudflare Workers,
use a scheduled handler, Durable Object alarm or durable workflow to process due
confirmations; returning from a serverless HTTP request cannot keep a five-minute
timer alive. The existing Cloudflare Worker is `digiterra-backend`, at
`https://digiterra-backend.toni101ribeiro.workers.dev`, in account
`b8695c2cc37084b09551db6af0fc5427`. The frontend production API now points there.
The supplied DNS guide's `api.toniribeiro.com` remains a proposed, unresolved address.

Cloudflare has no connected Git repository, so a Git push will not automatically
update this Worker. The backend was deployed directly on 2 November 2026 as version
`9a992316-f660-4f6f-b82e-5029136a21a9`, with immediate Durable Object code updates.
The existing namespace and encrypted database/JWT settings were preserved.

Production SMTP is configured and verified. The live booking API and production CORS
preflight pass. Durable alarms handle the five-minute quiet period, with a minute
cron to recover pending jobs after downtime. The first scheduled invocation verifies
SMTP once per code version without sending an extra diagnostic email. The live
`/api/health` reports `bookingEmailConfigured: true` and `bookingEmailVerified: true`.

Future backend releases use `npm run deploy:cloudflare` from the backend checkout.
It applies code immediately so an active Durable Object cannot keep serving the old
API while the edge Worker has updated. See the backend's `SMTP.md` and
`CLOUDFLARE-RELEASE.md` for setup, validation and rollback details.

## Verification

Frontend: `npm run build` and `npm test -- --watch=false`.

Backend (in `C:\development\digiterra-challenge`): `npm run test:api`.

The backend tests cover simultaneous slot reservations, data ownership, invalid
passenger counts, overnight slots, the five-minute boundary, edit/reset behavior,
cancellation, account deletion, delivery retries and worker recovery.
