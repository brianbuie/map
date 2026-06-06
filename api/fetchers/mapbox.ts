export function mapboxClientConfig() {
  const { MAP_LONG, MAP_LAT, MAP_ZOOM, MAP_STYLE, MAPBOX_PUBLIC_TOKEN } = process.env;

  return {
    MAP_LONG,
    MAP_LAT,
    MAP_ZOOM,
    MAP_STYLE,
    MAPBOX_PUBLIC_TOKEN,
  };
}

export type MapboxConfig = ReturnType<typeof mapboxClientConfig>;
