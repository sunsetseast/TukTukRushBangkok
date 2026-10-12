# Compact Bangkok driving graybox

Starts from main `89ed984836154772de26142d0c149a04eeff43d3` (merged PR #6). Does not depend on or modify the separate real-world map/playable-mode drafts #7 and #8. The approved compact design data is versioned in `artifacts/tuk-tuk-rush/src/game/bangkok/layout.json`.

The main game now opens the compact Bangkok layout preview. The title screen offers the detailed Chinatown district as a comparison (`?world=chinatown`); its authored artwork, street life, missions and checks remain intact.

## What this pass delivers

- A 4.0 x 4.8 km compressed authoring envelope, 11 gameplay regions, 24 landmark sites, 32 named design corridors plus Odeon Circle, three river crossings and two explicitly fictional shortcuts.
- 1,171 connected road nodes / 1,190 sampled edges. At-grade crossings become shared routing junctions. River crossing order and district/landmark relationships follow the saved design; this is not GPS or surveyed lane data.
- The existing vehicle controller, touch controls, fares, pause/restart, recovery, sound and traffic systems operate on the larger world. Ten tour fares use accessible roadside stops, separate from landmark pins and protected footprints. Distance-based fare limits replace neighborhood-length assumptions.
- A buffered river shared by geometry and collision, protected park parcels and a solid gate island. The gate is approached through a clockwise one-way Odeon Circle. No fake vehicle ferry or bridge between Wat Pho and Wat Arun.
- A full north-up map with current vehicle heading/location, fare target/route, pan, pinch/button zoom, recenter and a whole-city view. The local minimap excludes distant road geometry. The map pauses gameplay; it works in portrait and landscape. Closing it in portrait leaves gameplay paused behind the rotation prompt.
- District, landmark-approach and shortcut discovery persists in browser storage, with a safe in-session fallback if storage is unavailable. Browsing the map never discovers places. Areas remain accessible from the start.
- A stylized 24-minute sunset shift: sunset -> blue hour -> night by minute nine, tied to simulation time. Free roam also progresses to night. Pausing freezes both time and lighting.
- Landmark reference pins and roadside stops stay fixed. Visual/collision parcels are fitted nearby on the same river bank, within 180 m of their reference site, rather than shrinking a building to fit a road. Gate stays on its circle island.
- Simple district-colored massing, protected park greenery, reused compatible landmark art, unique tower/wheel/palace blockouts, a continuous ground plane, batched infrastructure and distance-limited scenery.

## Validation completed locally

- TypeScript and production build.
- 10,710 sampled centerline checks for river/obstacle clearance, including 657 bridge samples; all ten fare routes and the directed traffic network are connected.
- All ten fares actually driven through `VehicleController`: 18,321 meters / 1,872 simulated seconds, zero collision frames, no position teleports. Traffic was disabled for this deterministic controller/mission test; traffic is tested separately.
- 313 NPC edge transitions in a 40-second traffic simulation, with one-way and water checks.
- Discovery persistence/idempotence, malformed storage fallback, accessible approach discovery for all 24 sites, transform round trips, protected gate, cross-bank routing, scene construction/disposal, and sunset/night parameter checks.
- Server-rendered map checks: modal semantics, current-location markup, visited-only landmark visibility, undiscovered shortcut hiding, no discovery mutation, local minimap limited to 60 nearby edges in the test view.
- Existing Chinatown gameplay, genuinely driven delivery, street life, roadside collision/escape, signature facades, sign layers and asset checks.

The local environment has no supported browser-control capability, so local WebGL rendering and touch UI execution were not verified. The repository's existing Chromium/WebGL CI workflow now additionally checks map pause, portrait/landscape behavior, basic zoom, and five city inspection views. CI results are separate from local checks. Software-rendered Chromium results do not certify Safari or physical-iPhone frame rate, thermal behavior, touch handling or visual quality.

## Run checks

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/tuk-tuk-rush run typecheck
PORT=24177 BASE_PATH=/ pnpm --filter @workspace/tuk-tuk-rush run build
pnpm --filter @workspace/tuk-tuk-rush run test:bangkok
pnpm --filter @workspace/tuk-tuk-rush run test:gameplay
```

Other existing check commands are unchanged. `node --import tsx scripts/<check>.ts` from the game directory avoids environments that prohibit the tsx CLI's temporary IPC socket.

## What remains before the finished-world art pass

This is a drivable layout prototype, with deliberately simple massing. It does not deliver finished, reference-accurate architecture throughout Bangkok, district asset kits, dense street furniture, full nighttime emissive signage, sophisticated traffic demand or streaming asset loading. Distance culling reduces rendered scenery; it is not sector download/unload streaming. Some long connectors remain visually sparse; drive them on iPhone before deciding whether to shorten or enrich them.

Preserve this shared coordinate/graph foundation when adding district art. Test road widths, sharp turns, landmark sightlines, travel times and touch map readability on the user's iPhone. The protected parcels and centerlines must stay clear of new facades/props. Hero visuals still require photo-reference verification. Career totals, hunger/thirst, food and downtime are later work, after the city and handling feel good.
