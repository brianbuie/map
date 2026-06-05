import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';

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

// --- Static files (Vite build output) ---
app.use('/assets/*', serveStatic({ root: './.app' }));
app.use('/favicon.ico', serveStatic({ root: './.app' }));
app.get('/*', serveStatic({ path: './.app/index.html' }));

const port = Number(process.env.PORT ?? 3000);
console.log(`Server running at http://localhost:${port}`);

export default { port, fetch: app.fetch };
