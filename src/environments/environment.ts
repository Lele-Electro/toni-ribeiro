export const environment = {
  production: true,
  /** Public origin of this site, used for canonical URLs and social tags. */
  siteUrl: 'https://www.toniribeiro.com',
  /** Base URL of the Ribeiro routes on the digiterra backend. */
  apiUrl: 'https://digiterra-backend.toni101ribeiro.workers.dev/api/ribeiro',
  /** OAuth 2.0 Web client ID from Google Cloud Console. Leave empty to hide Google sign-in. */
  googleClientId: '',
  /**
   * Leave empty in Git. The browser key for Maps JavaScript and Places comes from the
   * GOOGLE_MAPS_API_KEY environment variable at runtime (see .env.example). A value here
   * is only a build-time fallback for hosting without the Node server.
   */
  googleMapsApiKey: '',
};
