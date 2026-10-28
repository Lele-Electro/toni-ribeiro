import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // The session lives in the browser, so the server can't know who is signed in here
    path: 'schedule',
    renderMode: RenderMode.Client,
  },
  {
    path: '',
    renderMode: RenderMode.Server,
  },
  {
    path: 'lift-club',
    renderMode: RenderMode.Server,
  },
  {
    path: 'referral-business',
    renderMode: RenderMode.Server,
  },
  {
    path: 'login',
    renderMode: RenderMode.Server,
  },
  {
    path: 'privacy',
    renderMode: RenderMode.Server,
  },
  {
    path: 'terms',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
    status: 404,
  },
];
