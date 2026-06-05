import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';
import { Cron } from 'croner';
import { fetchAndSaveAircraft } from './fetchers/aircraft';
import { layerRoutes } from './routes/layers';
import { pruneOldSnapshots } from './db';

const app = new Hono();

app.use(logger());

// --- API routes ---
// Returns the public (pk.) Mapbox token for browser map rendering.
// The secret (sk.) token stays server-side for scheduled data fetching.
app.get('/api/config', c => {
  const token = process.env.MAPBOX_PUBLIC_TOKEN;
  if (!token) return c.json({ error: 'MAPBOX_PUBLIC_TOKEN not configured' }, 500);
  return c.json({ mapboxToken: token });
});

app.route('/api/layers', layerRoutes);

// --- Background jobs ---
// Poll OpenSky every 25s and broadcast to SSE clients
new Cron('*/25 * * * * *', async () => {
  try {
    await fetchAndSaveAircraft();
    new BroadcastChannel('layer:aircraft').postMessage('refresh');
  } catch (err) {
    console.error('[aircraft cron]', err);
  }
});

// Prune old snapshots daily at midnight
new Cron('0 0 * * *', pruneOldSnapshots);

// --- Static files (Vite build output) ---
app.use('/assets/*', serveStatic({ root: './.app' }));
app.use('/favicon.ico', serveStatic({ root: './.app' }));
app.get('/*', serveStatic({ path: './.app/index.html' }));

const port = Number(process.env.PORT ?? 3000);
console.log(`Server running at http://localhost:${port}`);

export default { port, fetch: app.fetch };
