# Map Dashboard — Technology Research & Recommendations

### TL;DR

**Recommended stack:** MapLibre GL JS (`react-map-gl`) + Mapbox token for traffic + Stadia Maps for tiles + RainViewer for radar + OpenSky Network for aircraft + **Bun + Hono** backend + SQLite + React/Vite frontend.

All of this can run comfortably within free tiers for a personal single-screen dashboard. Total cost could be **$0/mo** if you stay on free tiers.

---

### Map Renderer

**Winner: MapLibre GL JS via `react-map-gl`**

- Fully open-source (BSD), TypeScript-native (the library is written in TS)
- `react-map-gl` is the canonical React wrapper — it supports both MapLibre and Mapbox with the same API, so you're not locked in
- WebGL rendering, smooth 60fps tiles, custom styles, GeoJSON overlays, all the things you'd want
- Excellent for adding custom layers for aircraft icons, weather overlays, etc.

**Runner-up: Mapbox GL JS** (same API, same `react-map-gl` wrapper, proprietary license)

**Why not Google Maps:**

- 2026 pricing is hostile to personal projects — subscription plans start at $100/mo, and the old effectively-free $200/credit PAYG model is being phased out
- Google's JS SDK is fine, but the cost exposure isn't worth it when MapLibre + Mapbox gives you comparable quality

---

### Map Tiles (Base Map)

**Two good free options depending on your needs:**

| Option            | Cost | Limits                   | Notes                                                  |
| ----------------- | ---- | ------------------------ | ------------------------------------------------------ |
| **Stadia Maps**   | Free | 200k tiles/mo            | Non-commercial; great styles (Toner, Terrain, Alidade) |
| **MapTiler Free** | Free | 100k req/mo, 5k sessions | Requires MapTiler logo; good satellite                 |
| **Mapbox**        | Free | 50k map loads/mo         | Traffic included, satellite included                   |

**Recommendation:** Use a **Mapbox token** as your tile source in MapLibre. This gives you free access to:

- Mapbox's polished vector basemap styles
- Real-time traffic layer (the `mapbox.mapbox-traffic-v1` tileset)
- High-res satellite imagery (750k raster tiles/mo free)

A single-screen personal dashboard will never exceed 50k map loads/month. Mapbox is effectively free at personal scale while giving you traffic and satellite for free. If you want to avoid any vendor dependency, Stadia Maps is the best tile-only alternative.

**Satellite imagery:** Available via Mapbox tiles at no extra cost. It can look busy as a base layer, but works beautifully as a toggle-able layer.

---

### Traffic Layer ✅ Confirmed Possible

Real-time traffic is available via the **Mapbox traffic tileset** (`mapbox.mapbox-traffic-v1`), which shows jam severity as colored road overlays — free with a Mapbox token. This is the best option by far for a personal dashboard. HERE Maps also has traffic data with a 250k map views/mo free tier but requires more setup.

---

### Weather

**Radar overlay: RainViewer** ⭐

- **Completely free**, no API key required
- Covers 1,200+ radars across 150+ countries, refreshed every 5 minutes
- Works as a map tile overlay — fetch a JSON manifest, get XYZ tile URLs for the past ~2 hours of frames + nowcast
- Perfect for rain/cloud radar as a map layer
- Attribution required: "Weather data by Rain Viewer"

**Current conditions & stats (displayed outside the map):**

| Option             | Free Tier           | Notes                                                         |
| ------------------ | ------------------- | ------------------------------------------------------------- |
| **NWS API**        | Unlimited (US only) | No API key, US government data, very reliable                 |
| **WeatherAPI.com** | 100k calls/mo       | Global coverage, includes free map tiles for temp/precip/wind |
| **Tomorrow.io**    | Limited             | Best accuracy and layers, free tier is tight                  |

**Recommendation:** NWS API for US conditions (free, no key, very detailed), WeatherAPI.com as a fallback or for non-US coverage. RainViewer for radar tiles — no contest.

---

### Aircraft Tracking ✅ Confirmed Possible

Live aircraft data is very accessible:

| Option                  | Cost                  | Queries/day           | Notes                                                               |
| ----------------------- | --------------------- | --------------------- | ------------------------------------------------------------------- |
| **OpenSky Network**     | Free (non-commercial) | 4,000 (authenticated) | Bounding box queries, ICAO24, callsign, position, heading, altitude |
| **ADS-B Exchange**      | $10/mo (RapidAPI)     | Real-time             | Community ADS-B/MLAT, better coverage                               |
| **FlightAware AeroAPI** | ~$5/mo (feeder bonus) | 600/day               | Bounding box search, most complete data                             |

**Recommendation for starting out:** **OpenSky Network** (free). Create an account, use OAuth2. Each bounding-box query costs 1 credit (25 sq° or less); you get 4,000 credits/day when authenticated. Polling every 15 seconds would cost ~5,760 credits/day — slightly over the free limit. Every 20-30 seconds is comfortable.

OpenSky returns: `ICAO24` hex code, callsign, lat/lon, altitude (baro + geo), velocity, heading/track, squawk code, and aircraft category (light, medium, heavy, rotor, etc.). The squawk code lets you flag special squawks (7700=emergency, 7600=comms failure, 7500=hijack, 7777=military intercept). Military aircraft can be identified via ICAO24 hex ranges (US military blocks are documented).

**If you want better coverage or schedule data:** ADS-B Exchange at $10/mo is the sweet spot.

---

### Other Live Data Ideas

- **ISS tracking:** `wheretheiss.at` — completely free, no auth, real-time lat/lon/altitude/velocity. Easy and fun to add as a layer.
- **Ship tracking (AIS):** MarineTraffic is enterprise-only. Free options exist (`aisstream.io` WebSocket feed, NOAA NAIS) but are more complex to integrate.
- **Earthquake data:** USGS Earthquake API — free, real-time, GeoJSON-native.

---

### Backend

**Winner: Bun + Hono**

- **Bun** — TypeScript out of the box, built-in SQLite (`bun:sqlite`), native WebSockets, ~21x faster than Express on benchmarks
- **Hono** — Lightweight HTTP framework, runs on Bun (and Node/Deno/CF Workers if you ever want to migrate), clean API
- **`bun:sqlite`** — Zero-dependency, built-in, WAL mode supported. Perfect for storing time-series API responses. No extra service to manage.
- **`node-cron` or `croner`** for scheduled data fetching (Bun has Node.js compat)
- **`oven/bun:alpine`** Docker image is small (~79MB)

**Alternative: Deno + Hono**

Deno has the edge with native `Deno.cron()` (though still flagged `--unstable-cron`) and a slightly smaller Docker image (`denoland/deno:distroless` at 53MB). SQLite is more friction (requires FFI + `--allow-ffi`). If native cron is important to you, Deno is a reasonable choice. Hono works identically on both.

**Database: SQLite**

No contest for personal NAS hosting — zero infrastructure, Bun has it built in. Store weather snapshots, aircraft state history, etc. in a local `.db` file. For future analytics, DuckDB can query SQLite files directly as a read-only layer without changing your write path.

**Real-time updates to frontend: SSE (Server-Sent Events)**

For a dashboard that only reads data, SSE is simpler than WebSockets — no handshake complexity, browser reconnects automatically, clean `EventSource` API. The backend pushes new aircraft positions and weather data as server-sent events when cron jobs complete. Upgrade to WebSockets only if you need the frontend to send data back (e.g., live config changes that affect server behavior).

---

### Frontend

**React + Vite** — correct choice for this use case.

- No SSR needed; a long-running SPA is exactly what Vite + React is built for
- `react-map-gl` integrates cleanly with React's component model
- Vite's dev server hot-reloads instantly, great for configuration UI tweaking
- Built output can be served as static files directly from the Hono server

---

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Docker Container                                        │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Bun + Hono Server                              │    │
│  │                                                  │    │
│  │  • Serves static React frontend                 │    │
│  │  • /api/* proxy endpoints (add auth/key hiding) │    │
│  │  • /events SSE stream → pushes live data        │    │
│  │  • Cron jobs:                                    │    │
│  │      - every 30s: OpenSky bounding box fetch     │    │
│  │      - every 5min: NWS/WeatherAPI fetch          │    │
│  │      - on-demand: RainViewer manifest            │    │
│  │  • bun:sqlite → stores fetched data              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  SQLite DB (./data/map.db)                      │    │
│  │  • aircraft_states (time-series)                │    │
│  │  • weather_snapshots                            │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

React Frontend (SPA):
  MapLibre GL JS + react-map-gl
  └── Layers:
      ├── Base: Mapbox vector tiles (via Mapbox token)
      ├── Traffic: mapbox.mapbox-traffic-v1 tileset
      ├── Satellite: toggle-able Mapbox raster layer
      ├── Radar: RainViewer XYZ tile overlay (animated)
      ├── Aircraft: GeoJSON point layer (icons + labels)
      ├── ISS: single point layer
      └── Weather panel: stats outside the map
```

---

### Cost Summary (Personal Dashboard)

| Service           | Free Tier        | Notes                        |
| ----------------- | ---------------- | ---------------------------- |
| MapLibre GL JS    | Free (OSS)       |                              |
| Mapbox token      | 50k map loads/mo | Traffic + satellite included |
| RainViewer        | Free             | No key                       |
| OpenSky Network   | 4k credits/day   | Aircraft, authenticated      |
| NWS API           | Unlimited        | US only, no key              |
| WeatherAPI.com    | 100k calls/mo    | Optional, global coverage    |
| `wheretheiss.at`  | Free             | ISS                          |
| Bun/Docker/SQLite | Free             | Self-hosted                  |
| **Total**         | **$0/month**     | At personal scale            |

---

### Suggested Implementation Order

1. Scaffold **Bun + Hono** server with a static file serve + single `/health` endpoint, packaged in Docker
2. Add **React + Vite** frontend served from the same container; get MapLibre + `react-map-gl` rendering a Mapbox basemap
3. Add the **Mapbox traffic layer** as a toggle
4. Integrate **RainViewer** radar tiles as an animated overlay
5. Hook up **OpenSky Network** cron job → store in SQLite → SSE push → aircraft icon layer
6. Add **NWS weather** cron + display panel
7. Add **ISS tracker** as a fun bonus layer
8. Build the **configuration UI** (zoom defaults, layer toggles, refresh intervals, map style selector)
9. Add **historical data viewer** for debugging (query SQLite)
