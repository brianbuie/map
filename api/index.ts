import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';

const app = new Hono();

app.use(logger());

// --- API routes ---
app.get('/api/hello', c => c.json({ message: 'Hello, world!', method: 'GET' }));
app.put('/api/hello', c => c.json({ message: 'Hello, world!', method: 'PUT' }));
app.get('/api/hello/:name', c => c.json({ message: `Hello, ${c.req.param('name')}!` }));

// --- Static files (Vite build output) ---
app.use('/assets/*', serveStatic({ root: './.app' }));
app.use('/favicon.ico', serveStatic({ root: './.app' }));
app.get('/*', serveStatic({ path: './.app/index.html' }));

const port = Number(process.env.PORT ?? 3000);
console.log(`Server running at http://localhost:${port}`);

export default { port, fetch: app.fetch };
