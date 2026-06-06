declare module 'bun' {
  interface Env {
    MAP_LONG: string;
    MAP_LAT: string;
    MAP_ZOOM: string;
    MAP_STYLE: string;
    HISTORY_DAYS: string;

    MAPBOX_TOKEN: string;
    MAPBOX_PUBLIC_TOKEN: string;

    OPENSKY_CLIENT: string;
    OPENSKY_SECRET: string;
  }
}
