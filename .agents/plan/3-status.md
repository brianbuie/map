Plan: Map Backend Data + Historical Playback
TL;DR: You don't need to migrate the Mapbox style — it stays exactly as-is. Dynamic data layers are added on top of it in React code. SQLite with a single JSON-column schema handles evolving/incomplete data with zero migration pain. Aircraft (OpenSky) comes first, with both a scrubber and animated replay.

The style migration question — answered
mapbox://styles/... is your base map appearance (roads, labels, water colors). Your aircraft/weather data layers are completely separate — they're added in React as <Source> + <Layer> components that sit on top of the Mapbox style. They coexist naturally and you never touch the Mapbox Studio style again. The only reason to migrate would be cost (50k free loads/month is not a concern at personal NAS scale) or to switch to MapLibre (doable later if ever needed, same API).

The SQLite question — answered
The schema-flexibility concern is real but easily solved. Instead of rigid columns per data field, use one flexible table with a JSON column:

When OpenSky adds a new field, or you start a new data source with totally different fields — zero migrations, just store it. When you query, you transform the JSON into GeoJSON at response time, skipping any records with missing coordinates.

Steps
Phase 1 — Backend Infrastructure (independent steps, can be parallel)

Add croner to package.json for scheduling (Bun doesn't have native cron)
Create api/db.ts — initialize bun:sqlite, create snapshots table + index, export typed query helpers (saveSnapshot, getLatest, getRange)
Create api/fetchers/aircraft.ts — poll OpenSky's bounding-box API every ~25s using the server-side MAPBOX_TOKEN env, save raw response as a snapshot. Handle null positions gracefully (filter at storage time or at query time — query time is more flexible)
Create api/routes/layers.ts — three endpoints: GET /api/layers/:layer/latest (most recent as GeoJSON FeatureCollection), GET /api/layers/:layer/range?from=&to= (array of {timestamp, geojson} for playback), GET /api/layers/:layer/stream (SSE, pushed after each successful fetch)
Update index.ts — import layer routes, start the aircraft cron on startup
Phase 2 — Frontend Data Layer (depends on Phase 1)

Phase 3 — Playback UI (depends on Phase 2)

Create app/components/PlaybackControls.tsx — a fixed overlay with: live/history mode toggle, timestamp scrubber (range input), play/pause/speed controls for animated replay. Wires to the hook from step 6
Phase 4 — Data Hygiene (parallel with Phase 3)

Add a periodic cleanup in api/db.ts to prune snapshots older than N days (configurable via env, e.g. HISTORY_DAYS=7). Prevents unbounded disk growth on NAS
Relevant files
index.ts — add cron startup + route registration
App.tsx — add <Source>/<Layer> components and <PlaybackControls>
New: api/db.ts, api/fetchers/aircraft.ts, api/routes/layers.ts
New: app/hooks/useAircraftLayer.ts, app/components/PlaybackControls.tsx
Verification
Run bun run dev:server and hit /api/layers/aircraft/latest — should return a valid GeoJSON FeatureCollection within 30s of startup
Hit /api/layers/aircraft/range?from=X&to=Y with a 5-minute window — should return multiple snapshots
Open EventSource in browser devtools pointed at /api/layers/aircraft/stream — events should arrive every ~25s
Aircraft dots should appear on the map in live mode
Scrubbing the timeline in history mode should update visible aircraft positions
After N days, verify snapshots table row count stops growing

Decisions
Mapbox style stays as-is — it's not an obstacle, it's just the base tiles
SQLite with JSON columns over DuckDB — simpler, zero-dep via bun:sqlite; DuckDB can always query the SQLite file later for analytics without changing the write path
OpenSky secret token stays server-side; public Mapbox token continues going to browser via /api/config
Aircraft history retention — configurable but defaulting to 7 days on NAS storage
Further considerations
OpenSky bounding box — you'll need to configure the lat/lng bounding box around your location. Should this be hardcoded (Kansas City), pulled from an env var, or eventually user-configurable in the UI?
Storage estimate — at one aircraft snapshot every 25s, you'll accumulate ~250k rows/week. At ~3-10kb per snapshot, that's 1-3GB/week uncompressed. Worth considering whether to store only positions (compressed array) vs. full OpenSky state vectors. Full state is fine for debugging; slimmed-down is better for long-term storage.
Ok, I created an account for opensky-network and added my api credentials to .env. Can you check to make sure their API is going to get what I need? I'm not seeing an obvious way to query aircraft in a given area. https://openskynetwork.github.io/opensky-api/rest.html

Good news and one important update: the bounding box query works exactly as expected via GET /states/all?lamin=&lomin=&lamax=&lomax=. Your credentials are the right shape too (client_id + client_secret).

The one thing to flag: Basic auth is gone. They now require an OAuth2 client credentials flow — you POST to their auth server to get a Bearer token (30 min TTL), then pass it as Authorization: Bearer ... on every request. The fetcher needs a token manager to handle refresh automatically.

A few other things confirmed by the docs that affect the plan:

Credit math — standard account gets 4,000 credits/day for /states/\*. A bounding box ≤25 sq° costs 1 credit per poll. A 5°×5° box around Kansas City is exactly 25 sq°, so polling every 25s = ~3,456 calls/day — safely within limits. Going bigger (e.g. a 6°×6° = 36 sq° box) would cost 2 credits/poll and push you over. Keep the box at ≤25 sq° (roughly ~275mi × ~275mi at that latitude).

Response shape — states come back as a 2D array of positional values (not named keys), so parsing needs index-based field access. Fields 5/6 are lon/lat, 10 is heading (true_track), 14 is squawk. All can be null and should be filtered before storing.

Updated plan — adding a token management step:

Updated Phase 1 steps
1a. Add croner to package.json

1b. Create api/db.ts — SQLite init, snapshots table, saveSnapshot/getLatest/getRange helpers

1c. Create api/fetchers/opensky-token.ts — OAuth2 token manager: POST to https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token with OPENSKY_CLIENT + OPENSKY_SECRET, cache token + expiry, auto-refresh before expiry (using OPENSKY_CLIENT/OPENSKY_SECRET env vars you already have)

1d. Create api/fetchers/aircraft.ts — uses token manager, calls /states/all with bounding box from env (BBOX_LAMIN, BBOX_LOMIN, BBOX_LAMAX, BBOX_LOMAX, defaulting to a 5°×5° box around KC), parses index-based array response, filters null positions, saves to snapshots

1e–1g. Routes, SSE, and index.ts wiring — unchanged from before
