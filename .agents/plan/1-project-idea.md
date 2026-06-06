# Map Project

## Basic Idea

I'd like to set up a small screen near my desk that always shows a map of my location with some basic live-updating information that can be glanced at periodically.

Interactivity is not super important, but I will likely want a lot of configuration options in the UI to find the settings I like most.

## Stack

This will be a web app, using typescript. React would be nice, but I'm open to other frameworks, if they make sense for this use case. I'm somewhat familiar with SVGs, but I have never used any map SDKs. I don't need server-side rendering since this will be long-living page that's communicating with a server for API calls.

I'd like to package this into a Docker container, so I can host it on my NAS.

I'd like to try using Deno or Bun for the back-end, so typescript is supported out of the box. The calls to external API's may be handled via frequent cron jobs and saved to a DB, so historical state can viewed for debugging or fun.

Likely start with Google Maps Platform API for the base map. Open to other options though.

## Layers

- Base map
  - customizable look & feel, zoom, level of detail
  - satelite imagery may be cool, but likely too busy
- Traffic
  - Unsure if it's available via API, would be cool to highlight roads with traffic delays
- Weather
  - Basic stats to display outside of the map
  - Radar for rain/clouds
- Nearby aircraft
  - Flightradar24 API
  - Show icons and flight paths for nearby aircraft
  - Highlight out of the ordinary vehicles (like military)
- Any other live activities that can be found from APIs
