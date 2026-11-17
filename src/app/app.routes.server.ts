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
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    // Shows today's dates and live availability: never built ahead of time.
    path: 'lift-club',
    renderMode: RenderMode.Server,
  },
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
