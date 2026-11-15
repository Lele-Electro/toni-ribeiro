# Toni Ribeiro Website — Claude Fable Build Brief

I have attached four reference images. You are authorized to work directly in the existing repository and use my active browser session for the Google Cloud setup described below.

Work autonomously: inspect first, then implement and verify the work. Do not stop after presenting a plan unless you encounter a genuine blocker, need a required credential, or reach a billing/payment confirmation step.

## Project

Repository:

`C:\development\toni-ribeiro`

Preserve existing working functionality, routes, authentication, booking logic, and design language unless this brief explicitly changes them.

Before changing code, inspect the project architecture, components, booking form/modal, email-delivery setup, asset inventory, environment-variable conventions, and current responsive breakpoints. Then proceed with implementation.

## Reference-image mapping — mandatory

Use each supplied image only for the purpose assigned below. Do not confuse or reuse a reference for another section.

1. **Reference A — Google Cloud Console screenshot**
   - Operational context only.
   - It is not a visual reference for the website.
   - The existing Cloud project is labelled **“Maps and Routes API Account.”**
   - Do not create a duplicate Cloud project.

2. **Reference B — desktop schedule/table screenshot**
   - Use only as the reference for the desktop Lift Club schedule/table layout.
   - This includes the compact navbar/heading proportions and the booked-row visual marker.

3. **Reference C — mobile booking-widget screenshot**
   - Use only as the reference for the mobile Lift Club booking widget.
   - This replaces the desktop table on mobile; do not merely shrink the desktop table.

4. **Reference D — Home-page hero screenshot**
   - Use only as the reference for the desktop Home-page hero and video layout.
   - Do not apply this composition to the Lift Club page.

Do not use any reference screenshot itself as a website image or background. Recreate the layouts in code using the project’s real assets.

## Google Maps Places and browser setup

The Google Cloud free trial has ended. Use my active browser session to inspect the existing **“Maps and Routes API Account”** project and configure the Google Maps integration.

You may:

- Inspect billing, API, credentials, quota, and budget settings.
- Enable the APIs necessary for this implementation.
- Create a new, dedicated browser API key for this website.
- Apply API and HTTP-referrer restrictions.
- Add the resulting key only to the correct local environment file; never commit it.
- Configure budget alerts only if an existing budget limit is already defined.

Do not:

- Delete, disable, rotate, or alter unrelated keys, projects, APIs, billing accounts, or resources.
- Expose, print, commit, or paste any API key into source code, chat, documentation, or final output.
- Use a temporary/demo key in production code.
- Link a billing account, add a payment method, accept billing terms, upgrade an account, or create a paid commitment without first showing me the exact pending action and asking for confirmation.
- Invent a budget-alert amount. Ask me if one is required and none exists.

Implementation requirements:

- Add required `Pickup location` and `Drop-off location` fields to the booking modal/form.
- Both fields are required.
- Use current Google Maps Places Autocomplete for both fields.
- Enable the required Google Maps services, including:
  - Maps JavaScript API
  - Places API
  - Places API (New), where required by the chosen integration
- Create a restricted browser key:
  - Restrict it to the actual APIs used.
  - Restrict it to localhost development URLs and the real production domain(s).
  - Use separate development/production restrictions or keys if the existing project convention supports this.
- Store the key using the project’s correct public browser environment-variable convention, for example `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` or `VITE_GOOGLE_MAPS_API_KEY`.
- Add only a placeholder to `.env.example`; no real secret belongs in Git.
- Lazy-load Maps/Places only when the booking interface needs it.
- Use autocomplete session tokens and request only required place data to control cost.
- Store the formatted address and, where the data model supports it, Place ID and coordinates.
- Provide a graceful manual-address fallback if Maps fails, the key is absent, or the service is unavailable.
- Clearly report the configured API restrictions and required environment-variable name in the final handoff, but never reveal the key value.

## Mobile navigation

For mobile breakpoints:

- Replace standard navigation with a hamburger trigger.
- Animate the hamburger smoothly into a close “X” when open.
- Show a full-screen navigation overlay containing every existing navigation item.
- Lock background scroll while open.
- Support Escape to close, keyboard navigation, visible focus states, sensible focus management, and tap-outside/close behaviour where appropriate.
- Use polished but restrained animation.
- Respect `prefers-reduced-motion`.

## Booking form changes

Update the booking form/modal:

- Rename the mobile-number field to exactly: `WhatsApp number`
- Make it mandatory.
- Validate it clearly and accessibly.
- Add the required Pickup and Drop-off fields described in the Google Maps section.
- Preserve and extend the existing booking submission/data flow; do not create a static visual-only form.

## Booking confirmation and emails

Update post-booking communication to include this exact sentence:

> Please allow Toni to confirm the details with you on WhatsApp.

All booking-related emails must be professionally designed, responsive HTML emails aligned with the Lift Club visual identity.

Use this existing template as the structure and quality reference:

`C:\development\digiterra-challenge\backend\email-templates\welcome-to-matla.html`

Create or update all necessary booking emails, including the booking confirmation and any relevant booking notification emails.

Use the project’s existing imagery where suitable:

- `email-car-pic.webp`
- `toni-olive-suit.webp`
- `toni-olive-suit (3)` — verify its real filename and extension before use
- `volvo_PNG78.png`
- `volvo-on-bridge.webp`

Requirements:

- Use the Lift Club dark green as the main email colour.
- Prefer existing assets. Only use appropriately licensed stock/generated imagery where a real gap remains.
- Make emails robust across clients: table-based structure where appropriate, email-safe styling, appropriate image sizing, meaningful alt text, and sensible image-off behaviour.
- Do not embed remote development URLs in production email templates.
- Ensure booking details, WhatsApp number, pickup, and drop-off information appear where appropriate.

## Lift Club desktop layout

On the desktop Lift Club page:

- Reduce the navbar background height/padding.
- Scale `Toni’s Schedule` down appropriately.
- Ensure the schedule/booking table is fully visible in the primary desktop viewport at common resolutions, without important content being cut off.
- Use Reference B as the desktop visual direction.
- Keep the design spacious and readable; do not solve this by making type or controls uncomfortably small.

Test at least a common laptop viewport such as 1440 × 900.

## Booked-row marker

When a booking exists, present a designed booked state in the relevant booking-table row.

Use these public assets:

- `toni-home-page.png`
- `volvo_PNG78.png`

Show both images alongside this exact copy:

> Thanks, Toni will be there 5 minutes early

Use Reference B as visual direction. The marker must fit cleanly in the row, remain responsive, include meaningful alt text, and remain connected to real booking status.

## Mobile booking widget

For mobile only, replace the desktop booking table with a purpose-built booking widget based on Reference C.

It must use the real booking availability and booking logic; it must not be a static mock-up.

Include:

- Previous/next date controls.
- Clear current day/date display.
- A touch-friendly time-slot carousel with selected state.
- Clear availability and booked states.
- Toni/car visual treatment where appropriate.
- Large, accessible touch targets.
- Intentional mobile hierarchy and spacing.

### Mobile clock behaviour

The clock illustration in the mobile widget must include a visible thin seconds hand that behaves like a real analogue clock.

- It must tick once per second, synchronised with the device’s current seconds.
- Use discrete one-second ticks, not a continuous sweeping animation.
- Keep hour and minute hands accurate to the current local time.
- The clock is decorative only; it must never alter the selected booking date or booking time.
- Implement it efficiently and clean up timers when the component unmounts.
- For `prefers-reduced-motion`, provide a static accessible fallback.

Test at mobile widths such as 390px and 430px.

## Lift Club video background

Replace the existing desktop Lift Club hero/background image with the project video:

`public/background-vid-create-2.mp4`

Verify the exact asset path and filename in the repository before implementation.

Requirements:

- Autoplay, muted, looped, inline playback, no visible native controls.
- Cover the intended background area without distortion.
- Include an appropriate poster/fallback state.
- Keep foreground text and booking controls readable.

For mobile only:

- The video fills the page/background and is not confined to a shaped container.
- On first arrival, let the video play for approximately three seconds before showing the booking widget.
- Fade the booking widget in after that delay while reducing the video’s visual opacity to approximately 70%.
- Do not repeat this intro delay after the user starts interacting with the booking flow.
- With reduced motion enabled, skip the delay and show the widget immediately with a static/fallback visual.

## Home-page video hero

Build the Home-page desktop hero based exclusively on Reference D.

Use:

`public/create-1.mp4`

Verify the actual path and filename first.

Recreate this visual composition in code:

- A clean white left-side brand area using existing logo/branding.
- A layered deep-green hero background with bold diagonal geometry.
- A large cut-out portrait of Toni emerging from the lower-left portion.
- A rounded-corner video card on the right using `create-1.mp4`.
- A custom visible play control over the video card, similar to the reference.
- The video must be responsive, keyboard accessible, play inline, include a poster/fallback state, and not autoplay with sound.
- A dark horizontal role/marquee strip immediately below the hero, visually similar to the reference, containing:
  - Tailored Graphic Artist
  - Web Developer
  - Private Driver
  - Marketeer
  - Broker
  - Salesman

For mobile, create an intentional responsive composition rather than cropping or shrinking the desktop hero. The full-screen mobile-navigation requirement overrides the desktop nav styling seen in Reference D.

## Animation and UX

Add purposeful, restrained motion throughout the website where it improves usability or polish:

- Navigation opening/closing
- Modal transitions
- Form validation and booking selection feedback
- Booked-state appearance
- Section/hero reveal transitions
- Video/widget reveal sequence
- Buttons, cards, and interactive controls

Do not add animation purely for decoration. Respect `prefers-reduced-motion` globally.

## Engineering, accessibility, and verification

- Reuse existing components, patterns, and styling conventions where sensible.
- Avoid unnecessary dependencies.
- Use semantic HTML, accessible labels, visible focus states, sufficient contrast, and keyboard support.
- Avoid layout shifts and unnecessarily heavy media loading.
- Optimise media loading for device size where possible.
- Do not break desktop booking behaviour, authentication, email sending, routes, or existing integrations.
- Run relevant linting, type checks, tests, and production build.
- Manually validate desktop and mobile layouts.

## Final handoff

When complete, provide:

1. A concise summary of implemented changes.
2. The changed files and purpose of each.
3. Google Cloud actions completed, excluding all secrets.
4. The required environment-variable name and where I must set it.
5. Any billing confirmation or remaining manual action.
6. Test/build results.
7. Any limitations or decisions made because an asset, requirement, or existing implementation differed from this brief.
