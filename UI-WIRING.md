# New UI wiring guide

All page and layout templates are empty except `/login` and its shared field-error and Google sign-in components. The root template keeps `<router-outlet />` so routing still works. Routes, guards, services, form models, validation and component methods remain available. Login markup and styles are unchanged. Global styles remain because login uses them.

Edit `src/`; `dist/` is generated. The home page and other cleared routes intentionally render blank until you add their replacement UI. Login still redirects to `/schedule` after authentication, which is currently blank. Privacy and terms links also currently lead to blank pages; restore their content when rebuilding those pages.

## Navigation buttons and routes

Use an anchor with `routerLink` for navigation. Import `RouterLink` from `@angular/router` and add it to the new component's `imports` array. Unused template imports were removed from the emptied components; re-add the ones your new markup uses.

| Button / link                   | Destination                           | Access / behaviour                                                                     |
| ------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------- |
| Logo / Home                     | `/`                                   | Public; `features/landing/landing.html`                                                |
| Lift Club                       | `/lift-club`                          | Public; `features/lift-club/lift-club.html`                                            |
| Referral Business               | `/referral-business`                  | Public; `features/referral-business/referral-business.html`                            |
| Log in / Create account         | `/login`                              | Signed-out users; both modes are inside the preserved login page                       |
| My Schedule                     | `/schedule`                           | Signed-in users only                                                                   |
| Book a lift                     | `/schedule?service=lift-club`         | Preselects the lift-club service                                                       |
| Book a referral consultation    | `/schedule?service=referral-business` | Preselects the referral service                                                        |
| General enquiry / Choose a time | `/schedule?service=general`           | Preselects the general-enquiry service                                                 |
| Privacy Policy                  | `/privacy`                            | Public; `features/privacy-policy/privacy-policy.html`                                  |
| Terms of Service                | `/terms`                              | Public; inline template in `features/terms-of-service/terms-of-service.ts`             |
| Back home from a 404            | `/`                                   | Unknown URLs render `features/not-found/not-found.ts`; its template is currently empty |
| About / Work / Contact          | No existing route                     | Add section anchors or new routes if your design needs them                            |

```html
<a routerLink="/">Home</a>
<a routerLink="/login">Log in</a>
<a routerLink="/schedule" [queryParams]="{ service: 'lift-club' }">Book a lift</a>
<a routerLink="/schedule" [queryParams]="{ service: 'referral-business' }">Book a consultation</a>
```

`authGuard` sends a signed-out visitor to `/login?returnUrl=<original URL>`, including the service query string. Successful login returns them there; otherwise it defaults to `/schedule`. `guestGuard` redirects an already signed-in visitor away from `/login` to `/schedule`. There is no separate `/signup` or password-reset route.

## Login buttons — already wired

Source: `src/app/features/login/login.ts` and `login.html`. These templates retain their Angular imports.

| Control                        | Binding / action                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Log in tab                     | `(click)="setMode('signin')"`                                                                                                       |
| Create account tab             | `(click)="setMode('signup')"`                                                                                                       |
| Submit credentials             | `<form [formRoot]="loginForm">` with `<button type="submit">`; the configured submission action calls the private `submit()` method |
| Name, surname, email, password | `[formField]="loginForm.name"`, `.surname`, `.email`, `.password`                                                                   |
| Google sign-in                 | `<app-google-sign-in-button (credential)="onGoogleCredential($event)" />`; shown when `googleClientId` is configured                |
| Submit busy state              | `loginForm().submitting()                                                                                                           |     | googlePending()` |
| API error                      | `serverError()`                                                                                                                     |
| Legal links                    | `/terms` and `/privacy`                                                                                                             |

## Schedule form — logic retained, template empty

Source: `src/app/features/date-time-form/date-time-form.ts`. Re-add `FormField` and `FormRoot` from `@angular/forms/signals` to its component imports. Re-add `FieldErrors` from `../../shared/field-errors/field-errors` for validation messages and `DatePipe` from `@angular/common` if using `| date`.

| Control                | Binding / action                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Booking form           | `[formRoot]="scheduleForm"`                                                                         |
| Service selector       | `[formField]="scheduleForm.service"`; options from `serviceOptions`                                 |
| Date input             | `type="date" [formField]="scheduleForm.date"`                                                       |
| Time input             | `type="time" [formField]="scheduleForm.time"`                                                       |
| Optional note          | `[formField]="scheduleForm.note"`; maximum 500 characters                                           |
| Save date and time     | `type="submit"` inside the form; configured submission calls private `save()`                       |
| Save busy state        | `[disabled]="scheduleForm().submitting()"`                                                          |
| Saved items            | `dateSelections.selections()`; track each `selection._id`                                           |
| Remove a saved item    | `(click)="remove(selection)"`; disable while `removingId() === selection._id`                       |
| Delete my account      | `(click)="deleteAccount()"`; method already requests confirmation, deletes the account and logs out |
| Loading / load error   | `loading()` / `loadError()`                                                                         |
| Success / action error | `status()?.message` and `status()?.kind` (`success` or `error`)                                     |
| Current user           | `auth.user()?.name`, `auth.user()?.email`                                                           |
| Local time zone        | `timeZone`; saved items also contain `scheduledFor` as an ISO timestamp                             |

Minimal form wiring inside the schedule component:

```html
<form [formRoot]="scheduleForm">
  <input type="date" [formField]="scheduleForm.date" />
  <app-field-errors [field]="scheduleForm.date" />
  <input type="time" [formField]="scheduleForm.time" />
  <app-field-errors [field]="scheduleForm.time" />
  <button type="submit" [disabled]="scheduleForm().submitting()">Save date and time</button>
</form>
```

Saving requires a future date/time. The initial service comes from `?service=`; valid values are `lift-club`, `referral-business`, and `general`. Invalid or missing values default to `lift-club`. Saved selections load automatically after the component renders.

## Navigation and account actions

The existing `layout/navbar/navbar.ts` retains:

| Control                 | Binding / action                                              |
| ----------------------- | ------------------------------------------------------------- |
| Mobile menu toggle      | `(click)="toggleMenu()"`, `[attr.aria-expanded]="menuOpen()"` |
| Conditional mobile menu | `@if (menuOpen()) { ... }`; closes after navigation           |
| Log out                 | `(click)="logout()"`; clears the session and navigates to `/` |
| Signed-in links         | `hydrated() && auth.isAuthenticated()`                        |
| User name               | `auth.user()?.name`                                           |

The navbar template is empty and its component is no longer mounted in `app.html`. To use it again, import `Navbar` in `app.ts`, add it to the component's `imports`, then place `<app-navbar />` beside the outlet. Do the same with `Footer` / `<app-footer />` if needed. The root wrapper and styles are empty, so your new layout controls page spacing.

For a different navigation component, inject `AuthService` from `core/auth/auth.service.ts`. Use its `user()` / `isAuthenticated()` signals and `logout()` method. With server rendering, wait until `afterNextRender` before showing session-dependent content, as the retained navbar does, to avoid hydration mismatches.

## Where the infrastructure lives

| File                                                      | Purpose                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/app/app.html`                                        | Root outlet; mount the new shared layout here                                         |
| `src/app/app.routes.ts`                                   | URL-to-component mappings and auth guards                                             |
| `src/app/app.routes.server.ts`                            | Rendering modes; `/schedule` is client-rendered and public routes are server-rendered |
| `src/app/app.config.ts`                                   | Router, component input binding, anchor scrolling, HTTP and hydration configuration   |
| `src/app/core/auth/auth.service.ts`                       | Sign in, sign up, Google auth, current user, logout and account deletion              |
| `src/app/core/date-selections/date-selections.service.ts` | Load/create/remove bookings; keep API calls in the service                            |
| `src/app/core/date-selections/date-selection.model.ts`    | Booking types and service labels                                                      |
| `src/app/core/seo/seo-title.strategy.ts`                  | Page titles, descriptions, canonical URLs and social tags from route data             |
| `src/app/core/site.config.ts`                             | Site name, legal contact email and last-updated date                                  |
| `src/environments/environment*.ts`                        | API URL, site URL and Google client ID                                                |

There are no existing project, contact-email, contact-form, or password-reset endpoints wired to UI buttons. Add those explicitly rather than pointing a new button at a guessed route.
