import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getLatest, getRange } from '../db';
import { fetchAndSaveAdsb } from '../fetchers/adsb';

const layers = new Hono();

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
