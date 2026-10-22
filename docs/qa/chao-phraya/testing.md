# Validation and reproduction

## Evidence

- [Final package summary](validation/certified-suite/summary.json): **37/38 pass** across all existing package groups plus the two river groups, run against the frozen runtime. One broad seeded fare contact assertion remains open; no failure is silently marked passing.
- [River geometry](validation/geometry.json): closed/simple source-approved banks, finite upward nondegenerate triangles, ordinary road **ribbon** clearance, bridge exemptions, every physical building and authored structural wing dry, preserved hero origins/wings, robust turning-bank classification, independent stale-water rejection, map/inspector agreement, connected piers, sampled boats and source structure clearance.
- [15 static controller journeys](after-static-routes.json): 16,616 world units traveled, all journeys complete, zero static contact frames. `VehicleController` receives gas/brake/steer input through actual engine updates; pose setup happens only before each journey. No mid-route teleport or replacement physics is used.
- [15 traffic-enabled journeys](after-traffic-routes.json), [PR35 static baseline](before-static-routes.json) and [PR35 traffic baseline](before-traffic-routes.json): same deterministic seed and route package, with per-route contact counts retained. This PR does not claim to solve inherited traffic contacts.
- [Fresh PR35 eleven-fare baseline](validation/baseline-driven-fares.log), [current broad package failure](validation/certified-suite/test-bangkok.log), [contact diagnostic](validation/fare-contacts.json): distinguish a newly exposed itinerary regression from an inherited test failure. The unchanged fixtures are recorded by ID/geometry and the run still completes its fares.
- The map-render and Bangkok-architecture commands that follow the fare assertion in its package group are run separately; see [map render](validation/map-render.log) and [architecture](validation/bangkok-architecture.log).
- [Browser checks](browser/after-qa.json): 375×812, 430×932, 844×390 and 1280×800; canonical polygon and whole playable bounds visible, no horizontal overflow; three ICONSIAM inspection/restart sequences; stable restarted geometry/texture counts; submerged-position recovery preserves mission, deliveries and career data.
- [Before](browser/before-qa.json)/[after](browser/after-qa.json) actual WebGL frame/resource samples and [Node inventories](performance.md). These are browser/software-renderer checks, not physical-iPhone tests.
- [Visual manifest](visual-manifest.json): 27 matched before/after pairs with exact camera/FOV/quality/elapsed checks, GL error zero, image SHA-256 and source commit metadata. [Gallery](gallery.md).
- [Architecture preservation](architecture-preservation.json): all six PR35 near/far model records match the original geometry/call/material/bounds inventory. [Runtime source equivalence](source-equivalence.json) verifies the screenshot runtime against delivered source blobs.

## Geometry contract details

The river's outer ring has 1,099 vertices and its source-derived flow spine has 60. Five mapped support/boathouse exclusions remain boat-clearance metadata, not terrain islands. Tests perform 2,044 water/terrain mesh probes and 3,584 boat-pose samples, including hull margins and heading continuity. Water and land triangulation is checked for finite values, upward winding and nonzero triangle area. A copied river vertex changing while every road stays fixed must invalidate `waterTerrainKey` and cause stale baked geometry to be rejected.

All ordinary road centerlines and left/right ribbon edges are sampled. Source water on the real bridge centerlines must remain driveable. The dedicated crossing journeys include Pinklao, Memorial and Taksin. The broader package connects Chinatown, River City, Hilton, ICONSIAM, Peninsula, Oriental, Shangri-La, Capella, Four Seasons, Asiatique and Anantara, including opposite-bank routing.

## Commands

Use the repository's locked dependencies. From `artifacts/tuk-tuk-rush`:

```bash
node --import tsx scripts/check-chao-phraya.ts
node --import tsx scripts/check-chao-drives.ts
RIVER_TRAFFIC=1 node --import tsx scripts/check-chao-drives.ts
node --import tsx scripts/check-corrections.ts
node --import tsx scripts/check-premium-landmarks.ts
node --import tsx scripts/check-city-blueprint.ts
node --import tsx scripts/check-historic-fidelity.ts
```

`test:river-geography` and `test:river-drives` are also package scripts and are added to the canonical-approval CI workflow. `run-city-completion-suite.mjs` runs package groups with separate logs; set `CITY_SUITE_OUTPUT` to a dedicated output directory.

For a reviewed geometry edit:

```bash
# Repository root: frozen source → comparison maps and proposed river
python scripts/reconstruct-chao-reference.py
# Only after reviewing the geographic comparison:
python scripts/reconstruct-chao-reference.py --approve
# App directory: explicitly approved local graph delta, then baked surfaces
node --import tsx scripts/approve-river-geography.ts
node --import tsx scripts/generate-road-surfaces.ts
```

The approval command permits only this PR's Asiatique arrival delta; it refuses unrelated road edits. A subsequent street reconstruction must introduce a new reviewed approval scope.

`capture-chao-phraya.mjs` captures `scenes.json` from a real WebGL browser. For the before side, run the same harness in a detached PR35 worktree and point `RIVER_OUTPUT` to this QA directory. Use `RIVER_LABEL`, `RIVER_PORT` and `CHROMIUM_PATH`; preserve the shared scene definitions. `browser-chao-phraya.mjs` reproduces viewport/camera/recovery checks and the separate fixed-camera performance scenes. `finalize-chao-qa.py` builds the final runtime overlay, gallery hashes, reflow summary and performance tables.

High geographic inspections explicitly extend production clip/fog, and the full overview submits distant coarse batches. No city geometry is removed to improve a facade shot. Driving-height and river-facing captures retain production clipping/fog. Actual controller traces and fixed-camera image inspections are separate evidence; the screenshots do not claim to be a human driving recording.

Physical Safari, sustained hardware FPS, phone memory/thermals and prolonged touch driving remain unverified.
