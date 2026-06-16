import * as React from 'react';
import Map, { type MapRef } from 'react-map-gl/mapbox';

type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

const MapConfigContext = React.createContext<{
  token: string;
  ref: React.RefObject<MapRef | null>;
} | null>(null);

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
  const ref = React.useRef<MapRef | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [viewState, setViewState] = React.useState<ViewState | null>(null);

  React.useEffect(() => {
    if (!viewState || !token) {
      fetch('/api/config')
        .then(res => res.json())
        .then(
          (data: {
            MAP_LONG: string;
            MAP_LAT: string;
            MAP_ZOOM: string;
            MAPBOX_PUBLIC_TOKEN: string;
            ref: React.RefObject<MapRef | null>;
            error?: string;
          }) => {
            if (data.error || !data.MAPBOX_PUBLIC_TOKEN) return console.error(data.error ?? 'Failed to load config');
            setViewState({
              longitude: Number(data.MAP_LONG),
              latitude: Number(data.MAP_LAT),
              zoom: Number(data.MAP_ZOOM),
            });
            setToken(data.MAPBOX_PUBLIC_TOKEN);
          },
        );
    }
  }, []);

  return viewState && token ? (
    <Map
      id="basemap"
      ref={ref}
      mapboxAccessToken={token}
      {...viewState}
      onMove={e => setViewState(e.viewState)}
      mapStyle="mapbox://styles/mapbox/standard"
      style={style}
      config={{
        basemap: config,
      }}
    >
      <MapConfigContext.Provider value={{ token, ref }}>{children}</MapConfigContext.Provider>
    </Map>
  ) : null;
}
