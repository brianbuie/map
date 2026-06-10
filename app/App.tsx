import { useEffect, useRef, useState } from 'react';
import type { GeoJSONSource } from 'mapbox-gl';
import Map, { Layer, type LayerProps, type MapRef, Source } from 'react-map-gl/mapbox';
import { type MapboxConfig } from '../api/fetchers/mapbox';
import { type AdsbProperties } from '../api/fetchers/adsb';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';

type AircraftCollection = GeoJSON.FeatureCollection<GeoJSON.Point, AdsbProperties>;

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

export function App() {
  const mapRef = useRef<MapRef | null>(null);
  const [config, setConfig] = useState<MapboxConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aircraft, setAircraft] = useState<AircraftCollection>({
    type: 'FeatureCollection',
    features: [],
  });

  const syncAircraft = () => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource('aircraft') as GeoJSONSource | undefined;
    source?.setData(aircraft);
  };
  useEffect(() => {
    syncAircraft();
  }, [mapRef, aircraft]);

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
      onLoad={syncAircraft}
    >
      <Source id="aircraft" type="geojson" data={aircraft}>
        <Layer {...aircraftArrowLayer} />
      </Source>
    </Map>
  );
}

export default App;
