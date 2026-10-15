# Validation and review

## Scope and environment

Base: current main `9bd832e`, merged PR #17. Chromium with software WebGL (SwiftShader), touch emulation and real CDP multi-touch events. This is **not physical iPhone Safari verification**. No video, merge or deployment.

The final browser run is recorded in `after/qa.json`; still provenance is in `after/capture.json`. Screenshots use the reduced-motion setting to stabilize captures on the software renderer. The normal 300 ms banner transition is checked separately. The five-second manual timer is exercised in the actual mounted game with Playwright's virtual wall clock, installed before the game starts. Real CDP touches exercise the controls, map and inspection camera. The still-capture script holds simulation time and seeds arrival/end-of-shift positions in actual engine state; independent controller journeys validate real fare and destination behavior.

## Automated coverage

- TypeScript and production Vite build.
- Connected road navigation: every edge of all 11 Bangkok mission routes, one-way detour, disconnected target and no fabricated path, approach/departure hysteresis.
- Mounted banner: compact travel, tap expansion, 4,999 ms / 5,000 ms boundary, repeated-tap reset, map/LOOK suspension and resume, approach fluctuations, actual arrival and boarding progress. Expanded destination text also uses wrapping for full trip details.
- Real map touches: pan, pinch, zoom, recenter, city overview, landmark hit target through decorative player marker, keyboard selection, layers and persistent mission route. Nearby BTS selection remains available in its collapsible panel. A fully discovered city is checked for separated place icons; its extra still uses temporary snapshot discovery state.
- Simultaneous steering and gas, cancellation, map opening clears all inputs, keyboard commands cannot resume driving behind map; keyboard acceleration still works after focus returns to the minimap button. Native-button keyboard brake release, horn active feedback and boost activation.
- Pause/resume, map opened from pause returns to pause, settings persistence, restart confirmation cancellation, confirmed return to title, free-roam entry and shift results.
- LOOK: orbit, pinch zoom, two-finger pan, viewpoint selection/reset, frozen clocks and return. Portrait return remains paused.
- Settings/map bounds at 375×812, 430×932, 844×390, 932×430 and 1280×800. Driving bounds in all three landscape sizes. Portrait inspection controls and scrollable viewpoint strip. Additional 59 px landscape side insets and 21 px bottom inset simulate notch/home-indicator clearance; this does not substitute for device testing.
- Original Chinatown launch/free roam, pause, recovery and shared settings.
- Existing gameplay, actual driven mission, eleven driven Bangkok fares, temple arrival/exit, 27 landmark/camera checks, BTS service and offline-road-dependency startup regressions.

## Reproduce

From `artifacts/tuk-tuk-rush` after installing the existing workspace dependencies:

```sh
node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
PORT=24232 BASE_PATH=/ node node_modules/vite/bin/vite.js build
node --import tsx scripts/check-navigation-ui.ts
node --import tsx scripts/check-bangkok-map.tsx
node --import tsx scripts/check-gameplay.ts
node --import tsx scripts/check-driven-mission.ts
node --import tsx scripts/check-bangkok-driven.ts
node --import tsx scripts/check-landmark-quality.ts
node --import tsx scripts/check-open-bangkok.ts
node scripts/check-startup.mjs
CHROMIUM_PATH=/path/to/chromium node scripts/browser-night-drive.mjs
CHROMIUM_PATH=/path/to/chromium node scripts/capture-night-drive.mjs
```

The browser scripts start and stop their own loopback Vite servers. Interaction checks and still captures run separately so virtual-clock timing checks do not affect rendering evidence. `capture-ui-baseline.mjs` is intended to run against the base commit's interface. `profile-night-drive.mjs` compares this checkout with a base worktree specified by `BASELINE_APP=/absolute/path/to/base/artifacts/tuk-tuk-rush`.

## Replit and iPhone review

1. In Replit's Git pane, select `codex/premium-night-drive-ui` and use the existing Run workflow. This PR adds no package, database migration or deployment configuration.
2. Open the development preview in iPhone Safari, landscape. Start a shift; try Fast and Detailed graphics, Standard/Large controls, visibility and Reduced/System motion.
3. Hold steering and GO together, release outside their starting areas, brake to reverse, sound the horn and trigger boost. Boost remains five seconds active with ten seconds recharge and unchanged physics multipliers/cap.
4. Drive far from the target. The banner belongs upper-right. Tap it repeatedly; the final tap should provide five seconds of active-gameplay detail. Pause or open the map during that window, then return.
5. Approach the actual target along its road. It should expand around 90 game metres and remain expanded through fluctuations until above 120 m. Stop within the existing ring to see boarding, passenger state and completion feedback.
6. Explore the map with two fingers, select a discovered place, hide optional layers, find a nearby BTS station, recenter and close. Open from pause and confirm the shift remains paused. Rotate to portrait while viewing the map.
7. Stop at Wat Pho or another supported site and use LOOK: orbit, pinch, pan, change viewpoint, reset and return. Try portrait inspection and swipe the viewpoint strip.
8. Finish/restart a shift, cancel a restart, return to title, and launch Original Chinatown. Discovery saves should remain intact. Drive several minutes through busy Chinatown and BTS streets at night; check touch latency, frame pacing, warmth and battery behavior on the real device.

## Limits

- Physical iPhone Safari, hardware touch ergonomics, thermals and device memory pressure are unverified. Browser emulation and simulated safe-area insets are explicitly identified.
- The map uses the existing compressed game geography. Route metres are game-world metres; the short lane-to-centerline connector is not a separate collision-aware off-road route planner.
- The existing large JavaScript chunk warning remains. The software-renderer timing samples are comparative diagnostics, not native-device FPS, startup guarantees or measured VRAM.
- All landmark information uses existing names/categories/districts. No new attraction descriptions, career balances, badges or unreleased gameplay are exposed.
