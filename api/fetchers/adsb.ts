import type { ADSBResponse, Aircraft, AircraftFeature, AircraftFeatureCollection } from '#types/Aircraft';
import { saveSnapshot } from '../db';

export async function getAdsb(): Promise<ADSBResponse> {
  return fetch(process.env.ADSB_URL).then(r => {
    if (!r.ok) throw new Error('ADSB failed: ' + r.status);
    return r.json();
  });
}

function toGeoJSON(aircraft: Aircraft[]): AircraftFeatureCollection {
  const features: AircraftFeature[] = [];
  for (const a of aircraft) {
    if (a.lat == null || a.lon == null || a.seen_pos == null) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
      properties: a,
    });
  }
  return { type: 'FeatureCollection', features };
}

export async function fetchAndSaveAdsb(): Promise<AircraftFeatureCollection> {
  const response = await getAdsb();
  const geojson = toGeoJSON(response.aircraft);
  // Only persist positions seen within the last 30 seconds
  const fresh = {
    type: 'FeatureCollection',
    features: geojson.features.filter(f => (f.properties as Aircraft).seen_pos! <= 30),
  };
  saveSnapshot('adsb', fresh);
  return geojson;
}
