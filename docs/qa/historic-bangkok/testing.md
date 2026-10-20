# Validation and reproducibility

Run commands from `artifacts/tuk-tuk-rush` after `pnpm install --frozen-lockfile` at the repository root. Local QA serves Vite only; it does not deploy a site.

```sh
pnpm run typecheck
PORT=24300 BASE_PATH=/ pnpm run build
node scripts/qa-historic-regressions.mjs
pnpm run test:historic-core
```

The existing 32-group matrix passed after six affected reruns; original failures are retained in `regression/`, with clean reruns in `regression-final/` and the rollup in `regression-summary.json`. `regression-initial-summary.json` preserves the original failed run. The final Sanam perimeter correction then re-ran public spaces, master-plan/spatial/transit checks, historic routes, the full Bangkok suite and TypeScript. It changes park protection and rendering, not unrelated gameplay logic. Changes to existing tests update obsolete geometry assumptions: the third civic circle, asymmetric station yard, current Sanam Chai edge and explicitly authorized historic road changes. No collision or clearance thresholds were relaxed.

The production build passes with the existing >500kB chunk warning. TypeScript passes. [Final build](build.log), [core checks](core-tests.log), [shared spatial/transit checks](shared-spatial-and-transit.log), [full fares/map/architecture](continuous-fares.log), [public spaces](public-space-final.log).

## Gameplay and roads

`test:historic-core` verifies the committed asphalt key equals the live road graph, east-bank placements, relative landmark directions, every destination's directed reachability, all circle arm pairs, clockwise traffic direction, corridor endpoint degrees, Sanam's original lawn/no-house boundary, unchanged Hua facade center, separate underground MRT and zero building/protected-parcel conflicts. It drives the production `GameEngine` with steering, gas, brake and timed updates. Only each independent route's initial setup sets player position; no vehicle position is reassigned during a journey. Traffic is disabled for reproducibility; these are static-network/collision tests, not a complete stochastic traffic simulation.

| Requested journey | Game metres | Collision frames |
|---|---:|---:|
| Grand Palace → Giant Swing | 487 | 0 |
| Giant Swing → Golden Mount | 525 | 0 |
| Democracy → Sanam Luang | 919 | 0 |
| Wat Pho → Hua Lamphong | 1,605 | 0 |
| Hua Lamphong → Wat Traimit | 237 | 0 |
| Wat Traimit → Gate | 373 | 0 |
| Gate → one-way Yaowarat | 307 | 0 |

[Controller records](driven-routes.json) total 4,452m. An additional `HISTORIC_INTERSECTIONS=1` run drives all 12 ordered pairs between the four Democracy arms: 1,957m, zero collision frames ([records](intersection-drives.json)). Existing continuous passenger QA completes 11 fares/10,403m with no intermediate teleport and zero collisions. Existing suites cover turbo, movement, missions, arrival, discovery persistence, save/load, map, camera reset, animated transit, materials/disposal and day/night states. Master-plan QA records zero severe lane, rail/building or vegetation conflicts and all 2,036 directed nodes connected. Traffic-transition QA checks 499 transitions separately with traffic enabled.

## Actual rendered evidence

Install a supported Playwright Chromium or set `CHROMIUM_PATH` to an executable. The captured run used Google Chrome headless shell and SwiftShader because a hardware browser was unavailable. These are actual WebGL scene meshes, not a canvas mockup or generated illustration.

```sh
CHROMIUM_PATH=/path/to/chrome-headless-shell CITY_OUTPUT=../../docs/qa/historic-bangkok CITY_LABEL=final CITY_WIDTH=768 CITY_HEIGHT=432 node scripts/capture-historic-bangkok.mjs
CHROMIUM_PATH=/path/to/chrome-headless-shell node scripts/browser-historic-visibility.mjs
CHROMIUM_PATH=/path/to/chrome-headless-shell QA_OUT=../../docs/qa/historic-bangkok/mobile-final node scripts/browser-landmark-accuracy.mjs
python3 scripts/render-historic-maps.py
python3 scripts/document-historic-review.py
```

For baseline captures use an isolated worktree at the recorded base SHA with the same QA capture script, not a runtime modified to imitate old behavior. `before/capture.json` and `final/capture.json` record exact camera/player positions, public roads, view types and renderer counters. Final capture has 35 frames and no page errors; it was resumed after source HMR during an earlier batch, and Sanam was explicitly recaptured after the park correction. Failed mixed-source batches are not included. Medium quality and 16:9 match; resolution is 960×540 before and 768×432 after, so screenshot frame times cannot establish a speed comparison. The dedicated performance run uses matched settings instead.

The 24 volume rays use three distinct legal public-road positions for each of eight major sites. 18 are clear. Twelve representative actual-mesh rays have ten first-hit hero meshes, one Gate sign surface within 0.11m of the selected feature, and one Pho west obstruction. The Gate text plane is outside the named landmark parent; this is recorded as a surface hit, not falsely labeled a hero-parent hit. Traimit first hits its own roof 7.33m before the target, so that establishes building visibility, not exact visibility of the needle point. Independent Hua facade QA hits all four features.

[Mesh ray results](rendered-visibility.json), [volume rays](visibility.json), [browser checks](mobile-final/checks.json). All four requested viewport sizes pass camera/reset checks with no art override in ordinary gameplay; repeated restart counters are stable. That run is Chromium with touch emulation, not Safari or a physical iPhone. Low river views are retained as negative evidence in `final/palace-river.jpg` and `final/pho-river.jpg`. Elevated views are explicitly inspection views; stationary ordinary driving captures do not claim controller-route completion.
