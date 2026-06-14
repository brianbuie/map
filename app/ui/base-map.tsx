import * as React from 'react';
import Map, { type MapRef } from 'react-map-gl/mapbox';

type MapboxConfig = {
  MAP_LONG: string;
  MAP_LAT: string;
  MAP_ZOOM: string;
  MAPBOX_PUBLIC_TOKEN: string;
  ref: React.RefObject<MapRef | null>;
};

const MapConfigContext = React.createContext<MapboxConfig | null>(null);

export function useMapConfig() {
  const context = React.useContext(MapConfigContext);
  if (!context) throw new Error('No Map Config context');
  return context;
}

export function BaseMap({
  children,
  style,
  config,
}: React.PropsWithChildren & {
  style?: React.CSSProperties;
  config: Record<string, unknown>;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [mapConfig, setMapConfig] = React.useState<MapboxConfig | null>(null);
  const ref = React.useRef<MapRef | null>(null);

  React.useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then((data: MapboxConfig & { error?: string }) => {
        if (data.error || !data.MAPBOX_PUBLIC_TOKEN) {
          setError(data.error ?? 'Failed to load config');
        } else {
          setMapConfig(data);
        }
      })
      .catch(() => setError('Failed to load config'));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!mapConfig) return null;

  const value = { ...mapConfig, ref };

  return (
    <Map
      id="basemap"
      ref={ref}
      mapboxAccessToken={mapConfig.MAPBOX_PUBLIC_TOKEN}
      initialViewState={{
        longitude: Number(mapConfig.MAP_LONG),
        latitude: Number(mapConfig.MAP_LAT),
        zoom: Number(mapConfig.MAP_ZOOM),
      }}
      mapStyle="mapbox://styles/mapbox/standard"
      style={style}
      config={{
        basemap: config,
      }}
    >
      <MapConfigContext.Provider value={value}>{children}</MapConfigContext.Provider>
    </Map>
  );
}
