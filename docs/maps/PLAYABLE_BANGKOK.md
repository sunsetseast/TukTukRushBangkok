# Tuk Tuk Rush — Bangkok City Tour gameplay expansion

**Work branch:** `game/bangkok-city-adventure` (draft [PR #8](https://github.com/sunsetseast/TukTukRushBangkok/pull/8) based on the real map foundation PR #7).

## Open it
After switching a Replit/GitHub checkout to the PR #8 branch and starting the existing Vite app:
`/bangkok-drive.html` — playable central Bangkok City Tour;
`/bangkok-map.html` — separate real interactive map;
`/` — preserved Chinatown Classic.

The production Vite multi-page build includes these three entry points.

### How to play
- Landscape iPhone recommended, portrait supported.
- Left/Right steer, hold GO to accelerate, BRAKE to reverse/slow,
  BOOST for a short arcade surge, HORN and RECOVER controls.
- **Explore Bangkok**: open-ended trips / famous landmark passport stamps.
- **12-minute Fare Rush**: earn fares and bonus score before time runs out.
- Destinations: tap the **full-city passport map** or choose from a scrollable
  list of 18 named real places. Golden road route and minimap show direction.
- Score includes tourist stamps, fares and safely achieved near-miss bonuses.
- Traffic cars move around actual road centerlines; arcade bumps permit
  recovery instead of indefinitely locking the vehicle.

## Geography, provenance and limits
- Central Bangkok footprint is approximately 8–9 km, **not all metropolitan Bangkok**.
- 1:1 geographic positions and the research dataset's actual WGS84 road centerlines:
  https://github.com/Todai-ops/Planarization-in-Urban-Road-Networks
  specifically `Bangkok_nodes_osm.xlsx` and `Bangkok_edges_osm.xlsx`;
  OSM-derived 1,679 road ways are subdivided into ~10,574 playable segments.
- River centerlines are actual OSM Chao Phraya way coordinates published by
  https://github.com/Olipicus/bangkok-canal-flood/blob/main/data/raw_river.json
  (May 31 2026 OSM snapshot); its stylized **92 m water width is NOT surveyed**
  river-bank geometry or collision-accurate water. Final riverbanks require
  legal OSM water multipolygon extraction. Road crossings use ONLY mapped
  edges/bridges; **no imaginary river bridges** have been added.
- 18 approximate real geographical landmark site centers. Targets snap to
  nearby street nodes, which are NOT validated front gates or safe real-world
  tuk-tuk dropoff locations.
- The research road graph has incomplete directed legal connectivity.
  This **arcade game**, NOT a real navigation app, permits going backwards
  along a *real mapped one-way edge* with a **7× routing penalty** if necessary
  to connect tourist destinations. Driving direction/restrictions are not
  guaranteed to match Bangkok traffic law. Future road export should include
  full turn restrictions/lanes, valid local one-way patterns and legal routes.
- Buildings, Wat Arun, Wat Pho/Reclining Buddha, ICONSIAM, Siam, temple roofs,
  spires and Grand Palace are original **cartoon silhouettes**, **not accurate
  building reproductions**. Original real-storefront signs from classic
  Chinatown are preserved only in Chinatown Classic.
- No Apple Maps/Google Maps proprietary assets or map tiles are embedded.
  Map data © OpenStreetMap contributors, ODbL 1.0.
  See https://www.openstreetmap.org/copyright for attribution / database license.

## QA
- `pnpm --filter @workspace/tuk-tuk-rush run typecheck`
- `pnpm --filter @workspace/tuk-tuk-rush run build`
- `pnpm --filter @workspace/tuk-tuk-rush run test:city`
- `pnpm --filter @workspace/tuk-tuk-rush run test:gameplay`
- GitHub Action `Playable Bangkok City Tour`: drives in browser WebGL,
  verifies forward/backward steering and movement, clickable passport map,
  real river visual data, moving traffic and four landmark routes.
  Screenshots include 1280×800, 844×390, 430×932 and passport map view.
- Browser screenshot verification uses Linux Chromium **software rendering**.
  It cannot certify real-world iPhone framerates or controls. A physical iPhone
  Safari session is required before merging PR #8.

## Next development phases
1. Device performance: actual iPhone 17 Pro Max load time/FPS, touch steering,
   follow-camera, traffic collisions, 10-minute roaming across districts.
2. Populate accurate land-use, riverbank polygons, bridges with ramps and
   geometry, and selected handcrafted landmark models; tile/asset streaming.
3. Add optional island/river ferries as a separate mechanic without pretending
   tuk-tuks can drive through rivers or into temple compounds.
4. Deepen fares: dynamic pickups, zone-specific challenges, tuk-tuk upgrades,
   congestion, landmarks exploration badges and a shift/day-night cycle.

**Never merge automatically.** User should inspect the new central-city
experience in Replit/iPhone first. It can remain an opt-in mode while keeping
the reliable legacy Chinatown Classic intact.
