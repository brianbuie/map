import { useEffect, useRef, useState } from 'react';
import type { GeoJSONSource } from 'mapbox-gl';
import Map, { Layer, type LayerProps, type MapRef, Source } from 'react-map-gl/mapbox';
import { type MapboxConfig } from '../api/fetchers/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';

type AircraftProperties = {
  hex: string;
  flight: string;
  alt_baro: number | 'ground' | null;
  gs: number | null;
  track: number | null;
  squawk: string | null;
  category: string | null;
  seen_pos: number | null;
};

type AircraftCollection = GeoJSON.FeatureCollection<GeoJSON.Point, AircraftProperties>;

const EMPTY_AIRCRAFT: AircraftCollection = {
  type: 'FeatureCollection',
  features: [],
};

const aircraftArrowLayer: LayerProps = {
  id: 'aircraft-arrows',
  type: 'symbol',
  source: 'aircraft',
  minzoom: 5,
  layout: {
    'text-field': '^',
    'text-size': ['interpolate', ['linear'], ['zoom'], 5, 12, 10, 16],
    'text-allow-overlap': true,
    'text-ignore-placement': true,
    'text-rotate': ['coalesce', ['get', 'track'], 0],
  },
  paint: {
    'text-color': '#ffd56b',
    'text-halo-color': '#1a1f2b',
    'text-halo-width': 1.2,
  },
};

const aircraftAltitudeLayer: LayerProps = {
  id: 'aircraft-altitude',
  type: 'circle',
  source: 'aircraft',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 1.5, 9, 4],
    'circle-color': [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', 'alt_baro'], 0],
      0,
      '#41d3bd',
      5000,
      '#72efdd',
      12000,
      '#ffd166',
      18000,
      '#ff8a5b',
      25000,
      '#ef476f',
    ],
    'circle-opacity': 0.6,
  },
};

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

function useAircraftSourceSync(mapRef: React.RefObject<MapRef | null>, aircraft: AircraftCollection): void {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource('aircraft') as GeoJSONSource | undefined;
    source?.setData(aircraft);
  }, [mapRef, aircraft]);
}

export function App() {
  const mapRef = useRef<MapRef | null>(null);
  const [config, setConfig] = useState<MapboxConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aircraft, setAircraft] = useState<AircraftCollection>(EMPTY_AIRCRAFT);

  useAircraftSourceSync(mapRef, aircraft);

  const syncAircraftNow = () => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource('aircraft') as GeoJSONSource | undefined;
    source?.setData(aircraft);
  };

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then((data: MapboxConfig & { error?: string }) => {
        if (data.error || !data.MAPBOX_PUBLIC_TOKEN) {
          setError(data.error ?? 'Failed to load config');
        } else {
          setConfig(data);
        }
      })
      .catch(() => setError('Failed to load config'));
  }, []);

  useEffect(() => {
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
      .catch(() => {
        // Ignore initial availability failures; live stream will populate once data exists.
      });

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

  if (error) return <div className="error">{error}</div>;
  if (!config) return null;

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={config.MAPBOX_PUBLIC_TOKEN}
      initialViewState={{
        longitude: Number(config.MAP_LONG),
        latitude: Number(config.MAP_LAT),
        zoom: Number(config.MAP_ZOOM),
      }}
      style={{ width: '100vw', height: '100vh' }}
      mapStyle={config.MAP_STYLE}
      onLoad={syncAircraftNow}
    >
      <Source id="aircraft" type="geojson" data={aircraft}>
        <Layer {...aircraftAltitudeLayer} />
        <Layer {...aircraftArrowLayer} />
      </Source>
    </Map>
  );
}

export default App;
