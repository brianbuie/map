import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';
import { Cron } from 'croner';
import { fetchAndSaveAdsb } from './fetchers/adsb';
import { mapboxClientConfig } from './fetchers/mapbox';
import { layerRoutes } from './routes/layers';
import { pruneOldSnapshots } from './db';

const app = new Hono();

app.use(logger());

// --- API routes ---
// Returns the public (pk.) Mapbox token for browser map rendering.
// The secret (sk.) token stays server-side for scheduled data fetching.
app.get('/api/config', c => {
  const config = mapboxClientConfig();
  if (!config.MAPBOX_PUBLIC_TOKEN) {
    return c.json({ error: 'MAPBOX_PUBLIC_TOKEN not configured' }, 500);
  }
  return c.json(config);
});

app.route('/api/layers', layerRoutes);

// --- Background jobs ---

const pollAdsb = async () => {
  try {
    await fetchAndSaveAdsb();
    new BroadcastChannel('layer:adsb').postMessage('refresh');
  } catch (err) {
    console.error('[adsb poll]', err);
  } finally {
    setTimeout(() => void pollAdsb(), 1000);
  }
};

void pollAdsb();

// Prune old snapshots daily at midnight
new Cron('0 0 * * *', pruneOldSnapshots);

// --- Static files (Vite build output) ---
app.use('/assets/*', serveStatic({ root: './.app' }));
app.use('/favicon.ico', serveStatic({ root: './.app' }));
app.get('/*', serveStatic({ path: './.app/index.html' }));

const port = Number(process.env.PORT ?? 3000);
const idleTimeout = Number(process.env.IDLE_TIMEOUT_SECONDS ?? 60);
console.log(`Server running at http://localhost:${port}`);

export default { port, idleTimeout, fetch: app.fetch };
