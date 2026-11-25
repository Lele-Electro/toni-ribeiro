import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router, Routes } from '@angular/router';
import {
  LIFT_CLUB_EVENTS_PAGE,
  LIFT_CLUB_PAGE,
  LIFT_CLUB_REVIEWS_PAGE,
} from '../../core/seo/page-tags';
import { SeoRouteData } from '../../core/seo/seo-title.strategy';

/** What the lift club shows: the booking times, the events in their place, or the reviews. */
export type LiftClubView = 'times' | 'events' | 'reviews';

export interface LiftClubRouteData extends SeoRouteData {
  liftClubView: LiftClubView;
}

/** The address of each view. */
export const LIFT_CLUB_VIEW_URLS: Record<LiftClubView, string> = {
  times: `/${LIFT_CLUB_PAGE.path}`,
  events: `/${LIFT_CLUB_EVENTS_PAGE.path}`,
  reviews: `/${LIFT_CLUB_REVIEWS_PAGE.path}`,
};

/**
 * Links written before /reviews existed (the promotional email, earlier sign-in returns)
 * open the reviews with /lift-club?reviews=1. They now land on /reviews instead.
 */
export const reviewsQueryRedirect: CanActivateFn = (route) =>
  route.queryParamMap.has('reviews')
    ? new RedirectCommand(inject(Router).parseUrl(LIFT_CLUB_VIEW_URLS.reviews), {
        replaceUrl: true,
      })
    : true;

const view = (
  page: { title: string; description: string; image: SeoRouteData['image'] },
  liftClubView: LiftClubView,
) => ({
  title: page.title,
  data: {
    liftClubView,
    description: page.description,
    image: page.image,
  } satisfies LiftClubRouteData,
  // Renders nothing itself (LiftClub draws every view); the router needs a component or
  // children on a route, and an empty list of children is the way to have neither.
  children: [],
});

/**
 * /lift-club, /events and /reviews. They are children of the one route that shows LiftClub
 * (see app.routes.ts), so moving between them keeps the page, and the booking table's day,
 * hour and form, on screen; LiftClub reads `liftClubView` to show the right view.
 */
export const LIFT_CLUB_CHILD_ROUTES: Routes = [
  {
    path: LIFT_CLUB_PAGE.path,
    canActivate: [reviewsQueryRedirect],
    ...view(LIFT_CLUB_PAGE, 'times'),
  },
  { path: LIFT_CLUB_EVENTS_PAGE.path, ...view(LIFT_CLUB_EVENTS_PAGE, 'events') },
  { path: LIFT_CLUB_REVIEWS_PAGE.path, ...view(LIFT_CLUB_REVIEWS_PAGE, 'reviews') },
];
