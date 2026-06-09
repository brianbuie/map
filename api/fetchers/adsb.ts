/**
 * This returns all "known" aircraft from the local ADSB receiver
 * An aircraft can be included in this list for a few minutes since the last message or last received position
 * `seen_pos` is important here. If an aircraft doesn't have it, ignore it
 * If `seen_pos` is older than 30 seconds, still return it for the map, but do not save to the Db
 */

async function getAdsb(): Promise<{
  now: number; // unix timestamp
  messages: number;
  aircraft: {
    hex?: string; // 24-bit ICAO identifier
    type?:
      | 'adsb_icao'
      | 'adsb_icao_nt'
      | 'adsr_icao'
      | 'tisb_icao'
      | 'adsc'
      | 'mlat'
      | 'other'
      | 'mode_s'
      | 'adsb_other'
      | 'adsr_other'
      | 'tisb_other'
      | 'tisb_trackfile';
    flight?: string; // callsign
    alt_baro?: number | 'ground'; // barometric altitude in feet or "ground"
    alt_geom?: number; // geometric (GNSS / INS) altitude in feet referenced to the WGS84 ellipsoid
    gs?: number; // ground speed in knots
    ias?: number; // indicated air speed in knots
    tas?: number; // true air speed in knots
    mach?: number; // Mach number
    track?: number; // true track over ground in degrees (0-359)
    track_rate?: number; // rate of change of track, degrees/second
    roll?: number; // Roll, degrees, negative is left roll
    mag_heading?: number; // heading, degrees clockwise from magnetic north
    true_heading?: number; // heading, degrees clockwise from true north, usually only transmitted on ground
    baro_rate?: number; // rate of change of barometric altitude, feet/minute
    geom_rate?: number; // rate of change of geometric (GNSS / INS) altitude, feet/minute
    squawk?: string; // Mode A code (Squawk), encoded as 4 octal digits
    emergency?: 'none' | 'general' | 'lifeguard' | 'minfuel' | 'nordo' | 'unlawful' | 'downed' | 'reserved'; // superset of the 7x00 squawks
    category?:
      | 'A0' // No ADS-B emitter category info, unknown
      | 'A1' // Light (<15,500 lbs)
      | 'A2' // Small (15,500 - 75,000 lbs)
      | 'A3' // Large (75,000 - 300,000 lbs)
      | 'A4' // High vortext large (eg. Boeing 757 generating heavy wake turbulence)
      | 'A5' // Heavy (> 300,000 lbs)
      | 'A6' // High performance (> 5G acceleration and > 400 kts)
      | 'B0' // Unspecified unpowered aircraft, UAV, or spacecraft
      | 'B1' // Glider / sailplane
      | 'B2' // Lighter-than-air (blimp, balloon)
      | 'B3' // parachutist / skydiver
      | 'B4' // Ultralight / hang-glider / paraglider
      | 'B6' // Unmanned aerial vehicle (UAV)
      | 'B7' // Space / Trans-atmospheric vehicle
      | string; // Surface vehicles, reserved, or other unknown
    nav_qnh?: number; // altimeter setting (QFE or QNH/QNE), hPa
    nav_altitude_mcp?: number; // selected altitude from the Mode Control Panel / Flight Control Unit (MCP/FCU) or equivalent equipment
    nav_altitude_fms?: number; // selected altitude from the Flight Management System (FMS)
    nav_heading?: number; // selected heading; true or magnetic is not defined in DO-260B, mostly magnetic as the de facto standard
    nav_modes?: string[]; // set of engaged automation modes: autopilot, vnav, althold, approach, lnav, tcas
    lat?: number; // aircraft latitude in decimal degrees
    lon?: number; // aircraft longitude in decimal degrees
    nic?: number; // Navigation Integrity Category
    rc?: number; // Radius of Containment, meters; a measure of position integrity derived from NIC and supplementary bits
    seen_pos?: number; // how long ago, in seconds before "now", the position was last updated
    version?: number; // ADS-B Version Number 0, 1, 2; 3-7 are reserved
    nic_baro?: number; // Navigation Integrity Category for Barometric Altitude
    nac_p?: number; // Navigation Accuracy for Position
    nac_v?: number; // Navigation Accuracy for Velocity
    sil?: number; // Source Integrity Level
    sil_type?: 'unknown' | 'perhour' | 'persample'; // interpretation of SIL
    gva?: number; // Geometric Vertical Accuracy
    sda?: number; // System Design Assurance
    mlat?: string[]; // list of fields derived from MLAT data
    tisb?: string[]; // list of fields derived from TIS-B data
    messages?: number; // total number of Mode S messages received from this aircraft
    seen?: number; // how long ago, in seconds before "now", a message was last received from this aircraft
    rssi?: number; // recent average RSSI signal power, in dBFS; this will always be negative
    alert?: number; // flight status alert bit
    spi?: number; // flight status special position identification bit
    wd?: number; // wind direction calculated from ground track, true heading, true airspeed, and ground speed
    ws?: number; // wind speed calculated from ground track, true heading, true airspeed, and ground speed
    oat?: number; // outer/static air temperature, C, calculated from mach number and true airspeed
    tat?: number; // total air temperature, C, calculated from mach number and true airspeed
  }[];
}> {
  return fetch(process.env.ADSB_URL).then(r => {
    if (!r.ok) throw new Error('ADSB failed: ' + r.status);
    return r.json();
  });
}

import { saveSnapshot } from '../db';

type AdsbAircraft = Awaited<ReturnType<typeof getAdsb>>['aircraft'][number];

export type AdsbFeature = GeoJSON.Feature<
  GeoJSON.Point,
  {
    hex: string;
    flight: string;
    alt_baro: number | 'ground' | null;
    gs: number | null;
    track: number | null;
    squawk: string | null;
    category: string | null;
    seen_pos: number | null;
  }
>;

function toGeoJSON(aircraft: AdsbAircraft[]): GeoJSON.FeatureCollection {
  const features: AdsbFeature[] = [];
  for (const a of aircraft) {
    if (a.lat == null || a.lon == null || a.seen_pos == null) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
      properties: {
        hex: a.hex ?? '',
        flight: (a.flight ?? '').trim(),
        alt_baro: a.alt_baro ?? null,
        gs: a.gs ?? null,
        track: a.track ?? null,
        squawk: a.squawk ?? null,
        category: a.category ?? null,
        seen_pos: a.seen_pos,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

export async function fetchAndSaveAdsb(): Promise<GeoJSON.FeatureCollection> {
  const response = await getAdsb();
  const geojson = toGeoJSON(response.aircraft);

  // Only persist positions seen within the last 30 seconds
  const fresh: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: geojson.features.filter(f => (f.properties as AdsbFeature['properties']).seen_pos! <= 30),
  };
  saveSnapshot('adsb', fresh);

  return geojson;
}
