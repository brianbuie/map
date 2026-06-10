import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getLatest, getRange } from '../db';
import { fetchAndSaveAdsb } from '../fetchers/adsb';
import { fetchRadarWmsTile } from '../fetchers/radar';

const layers = new Hono();

// Radar: proxy NOAA WMS tiles with 5-minute server-side caching.
// Mapbox raster source uses {bbox-epsg-3857} which becomes the ?bbox= param.
layers.get('/radar/wms', async c => {
  const bbox = c.req.query('bbox') ?? '';
  const width = Math.min(Math.max(Number(c.req.query('width') ?? 256), 1), 2048);
  const height = Math.min(Math.max(Number(c.req.query('height') ?? 256), 1), 2048);

  const result = await fetchRadarWmsTile(bbox, width, height);
  if (!result) return c.body(null, 503);

  c.header('Content-Type', result.contentType);
  c.header('Cache-Control', 'public, max-age=300');
  return c.body(result.data.buffer as ArrayBuffer);
});

// Latest snapshot as GeoJSON
layers.get('/:layer/latest', async c => {
  const { layer } = c.req.param();
  const data = getLatest(layer);
  if (!data) return c.json({ error: 'No data yet' }, 503);
  return c.json(data);
});

// Range of snapshots for playback
layers.get('/:layer/range', c => {
  const { layer } = c.req.param();
  const from = Number(c.req.query('from'));
  const to = Number(c.req.query('to'));
  if (!from || !to) return c.json({ error: 'from and to are required (epoch ms)' }, 400);
  return c.json(getRange(layer, from, to));
});

// SSE stream — pushes after each successful fetch
layers.get('/:layer/stream', c => {
  const { layer } = c.req.param();

  return streamSSE(c, async stream => {
    const sendLatest = async () => {
      const data = getLatest(layer);
      if (data) await stream.writeSSE({ data: JSON.stringify(data) });
    };

    await sendLatest();

    const channel = new BroadcastChannel(`layer:${layer}`);
    channel.onmessage = () => sendLatest();

    await new Promise<void>(resolve => stream.onAbort(resolve));
    channel.close();
  });
});

// Trigger a manual refresh (useful for testing)
layers.post('/:layer/refresh', async c => {
  const { layer } = c.req.param();
  if (layer === 'adsb') {
    const geojson = await fetchAndSaveAdsb();
    new BroadcastChannel(`layer:adsb`).postMessage('refresh');
    return c.json({ ok: true, features: (geojson as any).features.length });
  }
  return c.json({ error: 'Unknown layer' }, 404);
});

export { layers as layerRoutes };
