declare module 'bun' {
  interface Env {
    // Global Settings
    HISTORY_DAYS: string;
    MAP_LONG: string;
    MAP_LAT: string;

    // Base Map
    MAP_ZOOM: string;
    MAP_STYLE: string;
    MAPBOX_TOKEN: string;
    MAPBOX_PUBLIC_TOKEN: string;

    // Aircraft
    AIRCRAFT_BBOX_RADIUS_DEGREES: string;
    AIRCRAFT_POLL_SECONDS: string;
    OPENSKY_CLIENT: string;
    OPENSKY_SECRET: string;
  }
}
