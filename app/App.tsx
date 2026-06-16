import * as React from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import { BaseMap } from '#ui/base-map';
import { AircraftLayer } from '#ui/aircraft-layer';
import { PrecipitationLayer } from '#ui/precipitation-layer';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';

let hotKey = Date.now();
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    hotKey = Date.now();
  });
}

export function App() {
  return (
    <BaseMap
      key={hotKey}
      style={{ width: '100vw', height: '100vh' }}
      config={{
        colorEducation: 'hsla(0, 0%, 100%, 0)',
        show3dObjects: false,
        colorGreenspace: 'hsla(0, 0%, 100%, 0)',
        showPlaceLabels: false,
        theme: 'default',
        colorCommercial: 'hsla(0, 0%, 100%, 0)',
        colorMedical: 'hsla(0, 0%, 100%, 0)',
        colorLand: 'hsl(152, 29%, 65%)',
        showPointOfInterestLabels: false,
        colorWater: 'hsl(196, 76%, 67%)',
        lightPreset: 'day',
        colorRoads: 'hsla(0, 0%, 100%, 0.493)',
        colorTrunks: 'hsl(0, 0%, 100%)',
        colorMotorways: 'hsl(0, 0%, 100%)',
        showTransitLabels: false,
        showAdminBoundaries: false,
        showPedestrianRoads: false,
        colorBuildings: 'hsl(20, 0%, 91%)',
        showRoadLabels: false,
        colorIndustrial: 'hsla(0, 0%, 100%, 0)',
      }}
    >
      <Source id="satellite" type="raster" tiles={['/api/layers/satellite/{z}/{x}/{y}']} tileSize={256} scheme="xyz">
        <Layer
          id="satellite-layer"
          type="raster"
          source="satellite"
          paint={{
            'raster-opacity': 0.6,
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
            'hillshade-highlight-color': 'hsla(0, 0%, 100%, 0.393)',
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
              'hsla(35, 85%, 47%, 0.43)',
              ['heavy'],
              'hsla(19, 82%, 51%, 0.469)',
              ['severe'],
              'hsla(0, 77%, 44%, 0.437)',
              'hsla(302, 0%, 0%, 0)',
            ],
          }}
        />
      </Source>
      <AircraftLayer
        layout={{
          'icon-image': ['get', 'hex'],
          'icon-size': 0.8,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-rotation-alignment': 'map',
          'icon-rotate': ['get', 'track'],
        }}
        paint={{
          'icon-opacity': 1,
        }}
      />
      <PrecipitationLayer paint={{ 'raster-opacity': 0.6 }} />
    </BaseMap>
  );
}

export default App;
