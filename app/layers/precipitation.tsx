import * as React from 'react';
import { Layer, Source, type RasterLayerSpecification } from 'react-map-gl/mapbox';

export const PrecipitationLayer = (props: Partial<RasterLayerSpecification>) => {
  const [radarEpoch, setRadarEpoch] = React.useState(() => Math.floor(Date.now() / (5 * 60 * 1000)));

  React.useEffect(() => {
    const id = setInterval(() => {
      setRadarEpoch(Math.floor(Date.now() / (5 * 60 * 1000)));
    }, 60 * 1000); // check every minute, update only when the 5-min window turns
    return () => clearInterval(id);
  }, []);

  return (
    <Source
      id="radar"
      type="raster"
      tiles={[`/api/layers/radar/wms?bbox={bbox-epsg-3857}&width=256&height=256&t=${radarEpoch}`]}
      tileSize={256}
    >
      <Layer id="radar-layer" type="raster" {...props} />
    </Source>
  );
};
