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

    // Aircraft v2
    ADSB_URL: string;
  }
}
