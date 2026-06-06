import { saveSnapshot } from '../db';
import { getOpenSkyToken } from './opensky-token';

const LAT = Number(process.env.MAP_LAT);
const LONG = Number(process.env.MAP_LONG);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const BBOX_RADIUS_DEGREES = clamp(Number(process.env.AIRCRAFT_BBOX_RADIUS_DEGREES ?? 1), 0.1, 5);

// Bounding box around configured center location.
const BBOX = {
  lamin: LAT - BBOX_RADIUS_DEGREES,
  lamax: LAT + BBOX_RADIUS_DEGREES,
  lomin: LONG - BBOX_RADIUS_DEGREES,
  lomax: LONG + BBOX_RADIUS_DEGREES,
};

// OpenSky state vector field indices
const IDX = {
  icao24: 0,
  callsign: 1,
  timePosition: 3,
  lon: 5,
  lat: 6,
  altitude: 7,
  velocity: 9,
  heading: 10,
  squawk: 14,
  category: 17,
};

const AIRCRAFT_CATEGORY_LABELS = {
  0: 'no_information',
  1: 'no_adsb_emitter_category',
  2: 'light',
  3: 'small',
  4: 'large',
  5: 'high_vortex_large',
  6: 'heavy',
  7: 'high_performance',
  8: 'rotorcraft',
  9: 'glider',
  10: 'lighter_than_air',
  11: 'parachutist',
  12: 'ultralight',
  13: 'reserved',
  14: 'uav',
  15: 'space_vehicle',
  16: 'surface_emergency_vehicle',
  17: 'surface_service_vehicle',
  18: 'point_obstacle',
  19: 'cluster_obstacle',
  20: 'line_obstacle',
} as const;

type StateVector = (string | number | boolean | null)[];

export type AircraftFeature = GeoJSON.Feature<
  GeoJSON.Point,
  {
    icao24: string;
    callsign: string;
    time_position: number | null;
    altitude: number | null;
    velocity: number | null;
    heading: number | null;
    squawk: string | null;
    category: string | null;
  }
>;

function toCategoryLabel(category: number | null) {
  if (category == null) return null;
  const key = `${category}` as unknown as keyof typeof AIRCRAFT_CATEGORY_LABELS;
  return AIRCRAFT_CATEGORY_LABELS[key] ?? 'unknown';
}

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
        time_position: s[IDX.timePosition] as number | null,
        altitude: s[IDX.altitude] as number | null,
        velocity: s[IDX.velocity] as number | null,
        heading: s[IDX.heading] as number | null,
        squawk: s[IDX.squawk] as string | null,
        category: toCategoryLabel(s[IDX.category] as number | null),
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
