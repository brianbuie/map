import * as React from 'react';
import type { GeoJSONSource } from 'mapbox-gl';
import { Layer, Source } from 'react-map-gl/mapbox';
import type { SymbolLayerSpecification } from 'mapbox-gl';
import { useMapConfig } from './base-map';
import type { AircraftFeatureCollection, Aircraft } from '#types/Aircraft';
import { makeSvgString } from './aircraft-icon';

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

export const AircraftLayer = (props: Partial<SymbolLayerSpecification> = {}) => {
  const { ref } = useMapConfig();
  const [aircraft, setAircraft] = React.useState<AircraftFeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  });

  React.useEffect(() => {
    const map = ref.current;
    if (!map) return;

    // Add aircraft icon images to the map
    aircraft.features.forEach(async feature => {
      const a = feature.properties;
      const { hex } = a;
      if (!hex) return;
      const { svg, width, height } = makeSvgString(a);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        map.addImage(hex, ctx.getImageData(0, 0, width, height));
      };
      img.onerror = e => {
        console.error(`[renderSvg] Error`, e);
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
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
      } catch {}
    };

    return () => {
      controller.abort();
      stream.close();
    };
  }, []);

  const layerProps = {
    type: 'symbol',
    source: 'aircraft',
    minzoom: 5,
    ...props,
  } as any;

  return (
    <Source id="aircraft" type="geojson" data={aircraft}>
      <Layer id="aircraft-arrow" {...layerProps} />
    </Source>
  );
};
