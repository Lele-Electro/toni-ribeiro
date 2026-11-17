export const environment = {
  production: true,
  /** Public origin of this site, used for canonical URLs and social tags. */
  siteUrl: 'https://toniribeiro.co.za',
  /** Base URL of the Ribeiro routes on the digiterra backend. */
  apiUrl: 'https://digiterra-backend.toni101ribeiro.workers.dev/api/ribeiro',
  /** OAuth 2.0 Web client ID from Google Cloud Console. Leave empty to hide Google sign-in. */
  googleClientId: '',
  // Google Maps is switched off (billing); address search uses Photon, which needs no key.
  // googleMapsApiKey: '',
};
