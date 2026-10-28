# Toni Ribeiro

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.4.

Website for Toni Ribeiro's private lift club and referral business. Visitors can create an
account (email and password, or Sign in with Google) and save the dates and times they want
for a lift or a consultation.

## Pages and routes

| Route                | Component          | Access     | Rendering |
| -------------------- | ------------------ | ---------- | --------- |
| `/`                  | `Landing`          | Public     | Server    |
| `/lift-club`         | `LiftClub`         | Public     | Server    |
| `/referral-business` | `ReferralBusiness` | Public     | Server    |
| `/login`             | `Login`            | Signed out | Server    |
| `/schedule`          | `DateTimeForm`     | Signed in  | Client    |
| `/privacy`           | `PrivacyPolicy`    | Public     | Server    |
| `/terms`             | `TermsOfService`   | Public     | Server    |
| `**`                 | `NotFound` (404)   | Public     | Server    |

Every page animates in and out with `animate.enter` / `animate.leave` host bindings. The
classes they apply are defined in `src/styles/_animations.scss`. Each route sets its own
title, description, robots, Open Graph and canonical tags through `SeoTitleStrategy`, so
they are present in the server-rendered HTML.

## Running locally

The API lives in the digiterra backend (`C:\development\digiterra-challenge`), under
`/api/ribeiro/user` and `/api/ribeiro/date-selections`.

1. Start the API. To use a throwaway in-memory MongoDB, with no Atlas access needed, run:

   ```bash
   cd ../digiterra-challenge
   npm run start:server:memory
   ```

   Or run `npm run start:server` with a real database (see the backend's `.env.example`
   for `MONGODB_URI`, `JWT_SECRET` and `GOOGLE_CLIENT_ID`).

2. Start this app with `ng serve` and open `http://localhost:4200/`.

`src/environments/environment.development.ts` points at `http://localhost:3000/api/ribeiro`.
Production values (`siteUrl`, `apiUrl`, `googleClientId`) are in `src/environments/environment.ts`.

## Sign in with Google

The app uses Google Identity Services: Google's own rendered button, the ID-token
(`credential`) flow, and only the non-sensitive `openid email profile` scopes. The browser
sends the ID token to `POST /api/ribeiro/user/google`. The backend verifies the token's
signature, `aud`, `iss` and `exp` with `google-auth-library`, requires `email_verified`, and
issues the app's own JWT. Existing accounts are only linked by email when Google is
authoritative for the address (`@gmail.com` or a Workspace `hd` domain).

To enable it:

1. In [Google Cloud Console](https://console.cloud.google.com/) open **Google Auth Platform**.
   On **Branding**, set the app name, a support email that matches `CONTACT_EMAIL` in
   `src/app/core/site.config.ts`, and a logo if you want one.
   Then set the **Application home page** to `https://<your-domain>/`, the **privacy policy**
   to `https://<your-domain>/privacy` and the **terms of service** to `https://<your-domain>/terms`.
   Add `<your-domain>` under **Authorized domains**.
2. Verify ownership of that domain in [Google Search Console](https://search.google.com/search-console).
3. Under **Data Access**, keep only `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
4. Under **Clients**, create an OAuth client of type **Web application**. Add these as
   **Authorized JavaScript origins**: `https://<your-domain>`, `http://localhost` and `http://localhost:4200`.
5. Put the client ID in `googleClientId` in both environment files, and in `GOOGLE_CLIENT_ID`
   on the backend.
6. On **Audience**, publish the app ("In production"), and submit for brand verification if
   you added a logo.

Google's homepage requirements are already met by the code: the home page describes the
service, is not just a login page, and links to the privacy policy. The privacy policy is on
the same domain and explains how Google user data is accessed, used, stored, shared and
deleted. Users can delete their account from My Schedule.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Server-side rendering

Public routes use request-time server-side rendering, with client hydration enabled.
`/schedule` renders on the client, because the signed-in session only exists in the browser.
SCSS and Angular Router are configured for the application.

To build and run the production SSR server:

```bash
npm run build
npm run serve:ssr:toni-ribeiro
```

Open `http://localhost:4000/`. Set the `PORT` environment variable to use another port.
Localhost, IPv4 loopback, and IPv6 loopback are allowed by default. When deploying,
add the deployment hostname to `projects.toni-ribeiro.architect.build.options.security.allowedHosts`
in `angular.json` before building.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

The backend's API tests run against an in-memory MongoDB:

```bash
cd ../digiterra-challenge
npm run test:api
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
# toni-ribeiro
