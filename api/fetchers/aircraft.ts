import { saveSnapshot } from '../db';
import { getOpenSkyToken } from './opensky-token';

const LAT = Number(process.env.MAP_LAT);
const LONG = Number(process.env.MAP_LONG);

// 5°×5° box
const BBOX = {
  lamin: LAT - 2.5,
  lamax: LAT + 2.5,
  lomin: LONG - 2.5,
  lomax: LONG + 2.5,
};

// OpenSky state vector field indices
const IDX = { icao24: 0, callsign: 1, lon: 5, lat: 6, altitude: 7, heading: 10, squawk: 14 };

type StateVector = (string | number | boolean | null)[];

export type AircraftFeature = GeoJSON.Feature<
  GeoJSON.Point,
  { icao24: string; callsign: string; altitude: number | null; heading: number | null; squawk: string | null }
>;

function toGeoJSON(states: StateVector[]): GeoJSON.FeatureCollection {
  const features: AircraftFeature[] = [];
  for (const s of states) {
    const lon = s[IDX.lon] as number | null;
    const lat = s[IDX.lat] as number | null;
    if (lon == null || lat == null) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: {
        icao24: (s[IDX.icao24] as string) ?? '',
        callsign: ((s[IDX.callsign] as string) ?? '').trim(),
        altitude: s[IDX.altitude] as number | null,
        heading: s[IDX.heading] as number | null,
        squawk: s[IDX.squawk] as string | null,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

export async function fetchAndSaveAircraft(): Promise<GeoJSON.FeatureCollection> {
  const token = await getOpenSkyToken();
  const url = new URL('https://opensky-network.org/api/states/all');
  url.searchParams.set('lamin', String(BBOX.lamin));
  url.searchParams.set('lomin', String(BBOX.lomin));
  url.searchParams.set('lamax', String(BBOX.lamax));
  url.searchParams.set('lomax', String(BBOX.lomax));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`OpenSky states fetch failed: ${res.status}`);

  const json = (await res.json()) as { states?: StateVector[] };
  const geojson = toGeoJSON(json.states ?? []);
  saveSnapshot('aircraft', geojson);
  return geojson;
}
