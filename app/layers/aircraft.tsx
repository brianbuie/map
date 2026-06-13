import * as React from 'react';
import type { GeoJSONSource } from 'mapbox-gl';
import { Layer, type MapRef, Source } from 'react-map-gl/mapbox';

type AircraftCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    hex: string;
    flight: string;
    alt_baro: number | 'ground' | null;
    gs: number | null;
    track: number | null;
    squawk: string | null;
    category: string | null;
    t: string | null;
    seen_pos: number | null;
  }
>;

function toAircraftCollection(input: unknown): AircraftCollection | null {
  if (!input || typeof input !== 'object') return null;
  const maybeFeatureCollection = input as {
    type?: unknown;
    features?: unknown;
  };
  if (maybeFeatureCollection.type !== 'FeatureCollection' || !Array.isArray(maybeFeatureCollection.features)) {
    return null;
  }
  return maybeFeatureCollection as AircraftCollection;
}

export const AircraftLayer = ({ mapRef }: { mapRef: React.RefObject<MapRef | null> }) => {
  const [aircraft, setAircraft] = React.useState<AircraftCollection>({
    type: 'FeatureCollection',
    features: [],
  });

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource('aircraft') as GeoJSONSource | undefined;
    source?.setData(aircraft);
  }, [mapRef, aircraft]);

  React.useEffect(() => {
    const controller = new AbortController();

    fetch('/api/layers/adsb/latest', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Aircraft layer unavailable');
        return res.json();
      })
      .then(data => {
        const parsed = toAircraftCollection(data);
        if (parsed) setAircraft(parsed);
      })
      .catch(() => {});

    const stream = new EventSource('/api/layers/adsb/stream');
    stream.onmessage = event => {
      try {
        const data = JSON.parse(event.data) as unknown;
        const parsed = toAircraftCollection(data);
        if (parsed) setAircraft(parsed);
      } catch {
        // Ignore malformed events and keep stream alive.
      }
    };

    return () => {
      controller.abort();
      stream.close();
    };
  }, []);

  return (
    <Source id="aircraft" type="geojson" data={aircraft}>
      <Layer
        id="aircraft-arrow"
        type="symbol"
        source="aircraft"
        minzoom={5}
        layout={{
          'text-field': '^',
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 12, 10, 16],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotate': ['coalesce', ['get', 'track'], 0],
        }}
        paint={{
          'text-color': '#ffd56b',
          'text-halo-color': '#1a1f2b',
          'text-halo-width': 1.2,
        }}
      />
    </Source>
  );
};
