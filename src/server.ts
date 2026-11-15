import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Security headers. Referrer-Policy and Cross-Origin-Opener-Policy follow Google Identity
 * Services' setup guidance so the Sign in with Google popup can report back to this page.
 */
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

/**
 * Public runtime configuration for the browser. The Maps key is a browser key that is
 * restricted by HTTP referrer and API in Google Cloud; it is read from the environment
 * (or the ignored .env file) so that it never has to be committed.
 */
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the platform's environment variables.
}

app.get('/app-config.json', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env['GOOGLE_MAPS_API_KEY']?.trim() ?? '';
  // The untouched placeholder from .env.example counts as "no key".
  res.json({ googleMapsApiKey: key.startsWith('replace-') ? '' : key });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
