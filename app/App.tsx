import * as React from 'react';
import Map, { type MapRef, Source, Layer } from 'react-map-gl/mapbox';
import { type ConfigSpecification } from 'mapbox-gl';
import { type MapboxConfig } from '../api/fetchers/mapbox';
import { AircraftLayer } from './layers/aircraft';
import { PrecipitationLayer } from './layers/precipitation';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';

export function App() {
  const mapRef = React.useRef<MapRef | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [serverConfig, setServerConfig] = React.useState<MapboxConfig | null>(null);

  React.useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then((data: MapboxConfig & { error?: string }) => {
        if (data.error || !data.MAPBOX_PUBLIC_TOKEN) {
          setError(data.error ?? 'Failed to load config');
        } else {
          setServerConfig(data);
        }
      })
      .catch(() => setError('Failed to load config'));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!serverConfig) return null;

  return (
    <Map
      id="basemap"
      ref={mapRef}
      mapboxAccessToken={serverConfig.MAPBOX_PUBLIC_TOKEN}
      initialViewState={{
        longitude: Number(serverConfig.MAP_LONG),
        latitude: Number(serverConfig.MAP_LAT),
        zoom: Number(serverConfig.MAP_ZOOM),
      }}
      style={{ width: '100vw', height: '100vh' }}
      mapStyle="mapbox://styles/mapbox/standard"
      config={{
        basemap: {
          colorTrunks: 'hsl(0, 0%, 100%)',
          colorEducation: 'hsla(0, 0%, 100%, 0)',
          show3dObjects: false,
          colorGreenspace: 'hsla(0, 0%, 100%, 0)',
          showPlaceLabels: false,
          theme: 'default',
          colorCommercial: 'hsla(0, 0%, 100%, 0)',
          colorMedical: 'hsla(0, 0%, 100%, 0)',
          colorLand: 'hsl(154, 38%, 75%)',
          colorRoads: 'hsla(0, 0%, 100%, 0.61)',
          showPointOfInterestLabels: false,
          colorWater: 'hsl(196, 76%, 67%)',
          lightPreset: 'day',
          showTransitLabels: false,
          colorMotorways: 'hsl(0, 0%, 100%)',
          showAdminBoundaries: false,
          showPedestrianRoads: false,
          colorBuildings: 'hsl(20, 0%, 91%)',
          showRoadLabels: false,
          colorIndustrial: 'hsla(0, 0%, 100%, 0)',
        } as unknown as Record<string, ConfigSpecification>,
      }}
    >
      <Source id="satellite" type="raster" url="mapbox://mapbox.satellite">
        <Layer
          id="satellite-imagery"
          type="raster"
          source="satellite"
          paint={{
            'raster-opacity': 0.25,
            'raster-saturation': -1,
            'raster-contrast': 0.4,
            // 'raster-color': 'yellow',
            // 'raster-color-mix': [0.2126, 0.7152, 0.0722, 0],
          }}
        />
      </Source>
      <Source id="terrain" type="raster-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1">
        <Layer
          id="hillshade"
          type="hillshade"
          source="terrain"
          paint={{
            'hillshade-exaggeration': 1,
            'hillshade-illumination-direction': 231,
            'hillshade-illumination-anchor': 'map',
            'hillshade-shadow-color': 'hsla(116, 0%, 0%, 0.5)',
            'hillshade-accent-color': 'hsla(116, 16%, 62%, 0)',
            'hillshade-highlight-color': 'hsla(107, 0%, 100%, 0.54)',
          }}
        />
      </Source>
      <Source id="traffic" type="vector" url="mapbox://mapbox.mapbox-traffic-v1">
        <Layer
          id="traffic-lines"
          type="line"
          source="traffic"
          source-layer="traffic"
          layout={{
            'line-join': 'round',
            'line-cap': 'round',
          }}
          paint={{
            'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 0, 0.5, 14, 5],
            'line-color': [
              'match',
              ['get', 'congestion'],
              ['moderate'],
              'hsla(35, 90%, 58%, 0.53)',
              ['heavy'],
              'hsla(0, 91%, 55%, 0.7)',
              ['severe'],
              'hsl(0, 91%, 29%)',
              'hsla(302, 0%, 0%, 0)',
            ],
          }}
        />
      </Source>
      <AircraftLayer mapRef={mapRef} />
      <PrecipitationLayer />
    </Map>
  );
}

export default App;
