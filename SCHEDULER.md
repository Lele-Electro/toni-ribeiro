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
and stores the address plus, when the member picked a suggestion, its coordinates.
Older reservations without these fields stay readable; editing one asks for the
missing details.

Address search uses Photon (`https://photon.komoot.io`), a free OpenStreetMap geocoder
that needs no key (`src/app/core/maps/address-search.service.ts`). Results are limited
to South Africa and ranked from Johannesburg outwards. Photon's public server is
offered under fair use, so lookups wait 300ms after the last keystroke and start at
three characters. If Photon fails, the fields accept a typed address. The earlier
Google Places implementation is commented out in `google-places.service.ts` and
`src/server.ts`; it was switched off because it requires Google Cloud billing.

At phone widths (40rem and below) the table is replaced by `MobileBookingWidget`, which
shows one day at a time, a swipeable row of hours and one action button. It reads the
same slots and opens the same booking dialog as the desktop table. The page background
is a silent loop (`public/background-vid-create-2.webm`, with an `.mp4` fallback) that
autoplays at every width. On phones the widget fades in after the video has played for
about three seconds, on every visit; touching the page skips the wait. With reduced
motion or Data Saver on, the poster shows as a still and the widget appears at once.

Two HTML emails are sent after the five-minute quiet period: the member's confirmation
and a notification to Toni (`RIBEIRO_BOOKING_NOTIFY_TO`, defaulting to the sender).
Their images are the files in `public/email/`, loaded from the production site
(`RIBEIRO_EMAIL_ASSETS_URL`, default `https://www.toniribeiro.com/email`), so this
frontend must be deployed for the images to appear.

## Voice reviews

"See reviews" (under "Choose a time that suits you." on desktop, under the Reserve button
on phones) swivels the booking card to its reverse face, `VoiceReviews`
(`src/app/features/lift-club/voice-reviews/`). Both faces stay mounted, so the chosen day,
time and slot-list position are untouched while the reviews show. The turned-away face is
`inert` and hidden from the half-way point of the turn (Chrome does not honour
`backface-visibility` for faces containing `backdrop-filter`). Focus moves to the reviews
heading, and back to "See reviews" on return. Escape also turns back. With reduced motion
the faces swap without turning and the button does not pulse.

Reviews play one at a time through a single audio element (`ReviewPlayer`). The waveform
doubles as a seek slider for the keyboard and screen readers.

**Reviews are public.** A member's confirmed recording is uploaded and shown to every
visitor straight away, credited as their first name and surname initial ("Naledi M.");
the preview says so before they confirm. One review per account: recording again replaces
it, and "Delete it" (asked twice) takes it down. Toni sees every review on the admin page,
can listen to each and remove any. Deleting an account, or "Reset everything", deletes its
reviews too. Audio downloads only when someone presses play.

**The three reviews in `sample-reviews.ts` are placeholders**: invented names and
synthesised clips that say they are samples, labelled "Sample". They show only until the
first real review is published, then disappear.

Each reviewer's initials circle gets a colour from `avatar-colours.ts`, chosen from their
review (samples: their name), so it looks random but stays the same on every visit;
neighbouring rows never match.

**Recording needs an account.** Signed-out visitors see "Sign in to record a review", which
goes to `/login?returnUrl=/lift-club?reviews=1`; `?reviews=1` opens the page on the reviews
face. Signing out (or the session expiring) mid-recording switches the microphone off and
discards the take.

Recording uses `MediaRecorder` at 64 kbps (Opus/WebM in Chrome, Edge and Firefox; AAC/MP4
in Safari), about half a megabyte a minute. It stops at one minute, and when the card turns
back. A blocked or missing microphone, a microphone in use elsewhere, or a browser without
recording support each get their own message. A failed upload keeps the take for another
try. The page needs https (or localhost) for the microphone.

**Backend** (`C:\development\digiterra-challenge`): `backend/routes/voice-reviews.js`,
`backend/models/voice-review.js`, `backend/services/voice-reviews.js`, tested in
`backend/tests/voice-reviews.test.js`.

| Route (`/api/ribeiro/voice-reviews`) | Who | |
| --- | --- | --- |
| `GET /` | anyone | Every review, newest first, without audio or account details |
| `GET /:id/audio` | anyone | The recording, with byte ranges (Safari needs them) |
| `GET /mine`, `PUT /mine`, `DELETE /mine` | signed in | Own review; the upload is the raw audio body, with `duration` and `peaks` in the query |
| `DELETE /api/ribeiro/admin/voice-reviews/:id` | owner | Takes any review down |

Uploads must be WebM, Ogg or MP4 audio (checked by the file's first bytes), half a second
to a minute long, and at most 3 MB. The audio is stored in MongoDB with the review.

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
