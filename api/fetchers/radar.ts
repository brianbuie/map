const NOAA_EXPORT_URL =
  'https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer/exportImage';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: Uint8Array;
  contentType: string;
  expiresAt: number;
}

const tileCache = new Map<string, CacheEntry>();

// Evict expired entries periodically to prevent unbounded growth.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of tileCache) {
      if (entry.expiresAt <= now) tileCache.delete(key);
    }
  },
  10 * 60 * 1000,
);

/** Validate that a bbox string is exactly four finite numbers. */
function isValidBbox(bbox: string): boolean {
  const parts = bbox.split(',');
  if (parts.length !== 4) return false;
  return parts.every(p => Number.isFinite(Number(p)));
}

export async function fetchRadarWmsTile(
  bbox: string,
  width: number,
  height: number,
): Promise<{ data: Uint8Array; contentType: string } | null> {
  if (!isValidBbox(bbox)) return null;

  const cacheKey = `${bbox}|${width}|${height}`;
  const now = Date.now();

  const cached = tileCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { data: cached.data, contentType: cached.contentType };
  }

  const params = new URLSearchParams({
    bbox: bbox,
    bboxSR: '3857',
    size: `${width},${height}`,
    imageSR: '3857',
    format: 'png32',
    transparent: 'true',
    f: 'image',
  });

  let res: Response;
  try {
    res = await fetch(`${NOAA_EXPORT_URL}?${params}`, {
      headers: { from: 'brian@buie.dev' },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    const body = await res.text();
    console.error('[radar] exportImage returned non-image response:', contentType, body.slice(0, 500));
    return null;
  }

  const data = new Uint8Array(await res.arrayBuffer());

  tileCache.set(cacheKey, { data, contentType, expiresAt: now + CACHE_TTL_MS });

  return { data, contentType };
}
