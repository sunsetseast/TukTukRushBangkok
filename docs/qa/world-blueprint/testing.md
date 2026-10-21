# Validation results

Base is current-main PR33 `c5f2e210efb3146b782f00ea58f144f7005bc110`. Runtime source is frozen for the evidence run. [Regression summary](regression-summary.json): **34 / 34 groups pass**, including existing gameplay, mission, navigation, save/career, map, BTS/clearance, authored sites, river/public spaces, historical fidelity and the new canonical-city gate. [Per-group stdout/stderr](regression/) is retained. TypeScript and production Vite build pass; the inherited large-chunk warning remains.

[Canonical certification](certification.json) verifies 2,089 roads, 2,036 nodes, 49 approved scene origins, 96 registered places and 208 protected parcels. Roads/nodes/landmarks/transit/river arrays match the PR33 fixture exactly. The approved graph key includes connectivity, widths, one-way and traffic restrictions with deterministic coordinate quantization. A synthetic one-way change is rejected. Model origins/yaw/sizes, map features and child-site offsets agree. No runtime module imports the frozen legacy layout fixture. Protected parcel conflicts and emitted benchmark lane conflicts are zero.

Procedural count is 7,087 (baseline 7,084): seven removed and ten added footprints are confined to the three new MRT entrances' neighborhoods. The 38 Yaowarat parcels emit 19,433 facade pieces through shared batching; 42 waterfront parcels receive heritage treatment. Piece counts are not visual grades.

| Controller-driven set | Journeys / turns | Distance | Static collision frames |
|---|---:|---:|---:|
| [Seven historic journeys](historic-routes.json) | 7 | 4,452m | 0 |
| [Democracy intersection movements](intersections.json) | 12 | 1,957m | 0 |
| [Waterfront approaches](waterfront-drives.json) | 3 | 1,107m | 0 |
| [Full curved Yaowarat and Tha Tien benchmarks](benchmark-drives.json) | 2 | 1,025m | 0 |

These 24 deterministic journeys/turns use the real GameEngine controller, navigation and collision integration. Each is set up only at its start; no mid-journey teleporting. They are simulation-driven controller tests, not claims of human gamepad testing. Left-side routing and Yaowarat one-way remain unchanged.

[Separate traffic-enabled run](traffic-drives.json): all seven routes arrive with 38 vehicles. Six have zero contacts; Wat Pho → Hua Lamphong records **31 collision frames**, matching the inherited PR33 issue. Its `pass:true` means arrival/completion under the existing traffic tolerance, **not collision-free traffic**. Static clearance passes. No traffic behavior was altered here; the unresolved interaction is retained in the backlog.

[Browser checks](browser/checks.json): four requested viewports (375×812, 430×932, 844×390, 1280×800) pass inspection-control containment, return/reset and camera-state checks. Three ICONSIAM restarts clear inspection overrides and retain stable rendered geometry/texture counts. Four actual-mesh Hua Lamphong feature rays hit the clock, entrance and two arches. The developer inspector selects the real Swing feature and shows its 263m local compression residual. No browser errors recorded. These rays are targeted regressions, not an all-city visibility certificate.

The city-blueprint group is rerun after the final source-identity audit; it also rejects temple/bridge names geocoded to ferry stops and museum names geocoded to hotels. The [matched gallery](gallery.md) uses real WebGL, identical states, and no hidden city objects. Screenshot poses are separate from controller journeys. [Performance](performance.md) distinguishes retained scene resources from rendered frame statistics.

## Reproduction

From `artifacts/tuk-tuk-rush` after `pnpm install --frozen-lockfile`:

```sh
pnpm run typecheck
pnpm run test:city-blueprint
QA_PHASE=regression QA_OUTPUT=../../../docs/qa/world-blueprint/regression node scripts/qa-historic-regressions.mjs
HISTORIC_OUTPUT=../../../docs/qa/world-blueprint/historic-routes.json node --import tsx scripts/check-historic-drives.ts
CITY_BENCHMARK=1 HISTORIC_OUTPUT=../../../docs/qa/world-blueprint/benchmark-drives.json node --import tsx scripts/check-historic-drives.ts
CHROMIUM_PATH=/path/to/chrome CITY_LABEL=after node scripts/capture-world-benchmarks.mjs
CHROMIUM_PATH=/path/to/chrome CITY_LABEL=citywide CITY_WIDE=1 node scripts/capture-world-benchmarks.mjs
```

Chromium 138 SwiftShader is software comparative evidence. **Physical iPhone/Safari, thermal behavior, mobile GPU memory and touch-driven long-session performance remain untested.**
