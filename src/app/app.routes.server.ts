import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'forgot-password', renderMode: RenderMode.Server },
  { path: 'reset-password', renderMode: RenderMode.Client },
  {
    // The session lives in the browser, so the server can't know who is signed in here
    path: 'schedule',
    renderMode: RenderMode.Client,
  },
  { path: 'admin', renderMode: RenderMode.Client },
  // These pages are the same for everyone, so they are rendered once at build time. That
  // also gives the static upload (npm run build:afrihost) real HTML for search engines.
  {
    // The home page. While it is switched off (a redirect to /lift-club, see app.routes.ts)
    // nothing is prerendered here; it is kept for when the page returns.
    path: '',
    renderMode: RenderMode.Prerender,
  },
  // The lift club shows today's dates and live availability: never built ahead of time.
  // /events and /reviews are the same page, opened on those views.
  { path: 'lift-club', renderMode: RenderMode.Server },
  { path: 'events', renderMode: RenderMode.Server },
  { path: 'reviews', renderMode: RenderMode.Server },
  {
    path: 'referral-business',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'login',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'privacy',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'terms',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
    status: 404,
  },
];
