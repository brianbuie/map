import sharp from 'sharp';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes for satellite

interface CacheEntry {
  data: Uint8Array;
  contentType: string;
  expiresAt: number;
}

const tileCache = new Map<string, CacheEntry>();

// Evict expired entries periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of tileCache) {
      if (entry.expiresAt <= now) tileCache.delete(key);
    }
  },
  15 * 60 * 1000,
);

async function processImage(imageBuffer: Buffer): Promise<Buffer> {
  // Increase contrast and use lightness to determine transparency
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image dimensions');
  }

  // Increase contrast by normalizing the histogram
  const normalizedBuffer = (await image.normalise().ensureAlpha().raw().toBuffer()) as Buffer;

  // Process each pixel (RGBA) - use lightness to determine alpha
  for (let i = 0; i < normalizedBuffer.length; i += 4) {
    const r = normalizedBuffer[i] || 0;
    const g = normalizedBuffer[i + 1] || 0;
    const b = normalizedBuffer[i + 2] || 0;

    // Calculate lightness: (max + min) / 2 / 255
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let a = (max + min) / 2 / 255;

    // Darker pixels = more transparent, brighter pixels = more opaque
    normalizedBuffer[i + 3] = Math.round(a * 255);
  }

  return await sharp(normalizedBuffer, {
    raw: {
      width: metadata.width,
      height: metadata.height,
      channels: 4,
    },
  })
    .grayscale()
    .modulate({
      brightness: 1.5,
    })
    .png()
    .toBuffer();
}

export async function fetchSatelliteTile(
  z: number,
  x: number,
  y: number,
): Promise<{ data: Uint8Array; contentType: string } | null> {
  try {
    const token = process.env.MAPBOX_TOKEN;
    if (!token) throw new Error('MAPBOX_TOKEN not configured');
    const cacheKey = `sat|${z}|${x}|${y}`;
    const now = Date.now();
    const cached = tileCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return { data: cached.data, contentType: cached.contentType };
    }

    const res = await fetch(`https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}.png?access_token=${token}`, {
      headers: { from: 'brian@buie.dev' },
    });

    if (!res.ok) throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
    const contentType = res.headers.get('content-type') ?? 'image/png';
    if (!contentType.startsWith('image/')) throw new Error('non-image response: ' + contentType);

    const buffer = await res.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);
    const processedData = await processImage(imageBuffer);
    tileCache.set(cacheKey, {
      data: new Uint8Array(processedData),
      contentType: 'image/png',
      expiresAt: now + CACHE_TTL_MS,
    });
    return { data: new Uint8Array(processedData), contentType: 'image/png' };
  } catch (err) {
    console.error('[satellite] Error:', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) {
      console.error('[satellite] stack:', err.stack);
    }
    return null;
  }
}
