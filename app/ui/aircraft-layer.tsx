import * as React from 'react';
import type { GeoJSONSource } from 'mapbox-gl';
import { Layer, type SymbolLayerSpecification, Source } from 'react-map-gl/mapbox';
import { useMapConfig } from './base-map';
import type { AircraftFeatureCollection } from '#types/Aircraft';

function toAircraftCollection(input: unknown): AircraftFeatureCollection | null {
  if (!input || typeof input !== 'object') return null;
  const maybeFeatureCollection = input as {
    type?: unknown;
    features?: unknown;
  };
  if (maybeFeatureCollection.type !== 'FeatureCollection' || !Array.isArray(maybeFeatureCollection.features)) {
    return null;
  }
  return maybeFeatureCollection as AircraftFeatureCollection;
}

export const AircraftLayer = ({ ...props }: Partial<SymbolLayerSpecification>) => {
  const { ref } = useMapConfig();
  const [aircraft, setAircraft] = React.useState<AircraftFeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  });

  React.useEffect(() => {
    const map = ref.current;
    if (!map) return;
    const source = map.getSource('aircraft') as GeoJSONSource | undefined;
    source?.setData(aircraft);
  }, [ref, aircraft]);

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
      <Layer id="aircraft-arrow" type="symbol" source="aircraft" minzoom={5} {...props} />
    </Source>
  );
};
