# PR47 — production gameplay on real-scale Bangkok

Base: `2d294b32f73a53afffcdb9160ee2e2a4b801c1c5` (merged PR46). Draft only; no merge or deployment.

## Implemented

The geographic preview now runs `GameEngine`, `FareDispatcher`, `CareerStore`, `VehicleController`, `TurboBoost`, production touch controls, chase camera and landmark inspection. Its former independent gameplay/input/update loop is removed. The default compressed game remains available with its original save keys and behavior; no compressed position is interpreted as GPS.

The main menu has **Real-scale Bangkok · gameplay preview**. Enter it to start a 24-minute shift or free roam, board at the gold ring, drive a real fare, deliver and earn persistent career rewards. Destination selection, connected-road distances, English/Thai current-street names, an optional route map, pause/resume and recovery work. Optional destination guidance leaves the active passenger fare intact.

The immutable EPSG:32647 meter frame and pinned source import remain authoritative. A reproducible packed derivative supplies one global road topology, adjacency index and spatial surface/street index. Gameplay does **not** fetch `runtime.v1.json.gz` or construct the old full-city `District`/fare/traffic copies. Full source references, narrow on-foot passages, underground geography and every mapped street remain in the original source/runtime artifacts. Only implemented vehicle surfaces enter the player graph; the unchanged collision diameter is 3 m. Visual chunks retain their existing bounded loading, eviction and disposal.

Player routing excludes unavailable tunnel, stair and area surfaces. Source IDs and physical-height identities separate crossings. Two-node bridges now have intermediate, source-aligned deck profiles, with ground-connected ramps; these introduce no lateral connections. Heights (including the 7 m bridge datum and up-to-6% ramp estimate) are **visual/physical approximations, not surveyed engineering dimensions**.

Station enrichment reads direct route membership before processing stop areas, preventing shared entrances from recursively spreading lines. Station codes constrain station identity. BTS Sala Daeng is Silom; MRT Si Lom is Blue and underground. Original station coordinates, rail alignments, ordered route members and operating status remain intact. Separate stations receive pedestrian transfer links only where source stop areas share a member. This is not a claim about paid fare integration or a surveyed walking route.

## Representative asset migration

Existing authored gateway, temple and mall models activate with their geographic chunk. Models use local transforms at explicit WGS84 anchors, conservative road-free fitting, ground alignment and matching collision boxes. Approaches are real source-road vertices in the same connected component, rather than disconnected nearby compound roads.

| Place | Geographic anchor (latitude, longitude) | Access source way |
| --- | --- | --- |
| Chinatown Gate | 13.7371754, 100.5129798 | 24680968 / Yaowarat Road |
| Wat Traimit | 13.737680, 100.513570 | 342810684 |
| River City Bangkok | 13.730349, 100.513262 | 1153316932 |
| ICONSIAM | 13.726826, 100.510325 | 1372243779 |

The gate anchor corrects the old approximate point beside Soi Yaowarat 1 using the pinned OSM ceremonial-gate outline, way 342812020 v9 (`gate-anchor.osm.json`). Other anchors and source links come from the existing `cityData.v1.json` geographic register and remain approximate site centers. Models deliberately fit available clear envelopes; they are not new full-size surveyed building reconstructions. `gameplay-tests.json` records exact anchors, access node IDs, source links and envelope sizes.

## Validation

- **345 m real driven fare**, 50.7 simulated seconds, production boarding/delivery/reward transitions, no teleports and zero collision frames. Existing career discovery and wallet values survive loading; rewards round-trip through the existing career store.
- **421 m driven river bridge**, reaching an estimated 7 m deck and the far bank without collisions. Three production-engine road/chunk seam crossings retain the player object, active mission and wallet while keeping speed.
- Every migrated model clears the source player-road envelopes. All **1,382** rail supports clear ground-road vehicle envelopes. Narrow tagged-passage fit, independent crossing layers, real water rejection and a distant 404-node connected route pass.
- **21** pinned station checks, including **20** explicit line-identity assertions and the source-backed Sala Daeng/Si Lom pedestrian transfer. Source geometry, water, chunk seams and coverage checks pass.
- Genuine browser WebGL checks pass: keyboard driving, production LOOK and return, mobile boost/controls, landscape map, repeated north/south eviction, preserved passenger/wallet and default legacy startup with zero geographic asset requests. No page errors.
- Protected production source uses an explicit adapter successor ledger: reversing the reviewed additions reconstructs every legacy source byte and matches the original predecessor SHA. Mutation rejection is verified; geometry/collision assertions and thresholds remain active.
- TypeScript and production build pass. The existing large shared engine-bundle advisory remains.
- `regressions.json` records the relevant legacy, Chinatown geography/driving/traffic, Bang Rak, waterfront, Bangkok and historic checks. All 24 recorded regressions passed, including the previously cancelled Chinatown checks and the complete 5,937-sweep waterfront rerun. Its historical source-hash guard now verifies the exact adapter successor and reconstructed predecessor bytes; geometry/collision assertions remain intact. GitHub Actions supplies the independent PR status.

## Performance sample

Node 24.22.1, Linux container; one before/after sample, forced GC. Baseline uses the exact PR46 runtime. Process-memory figures are estimates (heap plus ArrayBuffers), with allocator retention included; they are not browser or iPhone memory certification.

| Measurement | PR46 architecture | Packed gameplay runtime |
| --- | ---: | ---: |
| Decode/index initialization | 2,417 ms | 379 ms |
| Retained process-memory estimate | 335.0 MiB | 65.8 MiB |
| 10,000 physical-surface queries | 42.4 ms | 28.7 ms |

The packed road buffer is 11.18 MiB; graph/index/scratch typed arrays total 26.09 MiB. Two persistent gameplay gzip assets total 5.95 MiB. Detailed road ribbons, decks, rail structures and landmark meshes remain chunk residents. Source streets were not deleted for these savings. The route-map background is drawn once per open/selection, not rebuilt on every vehicle update.

Headless Chromium 141 / ANGLE SwiftShader: first nine resident chunks in **2.41 s**, asset/session initialization **396 ms**, **54 draw calls / 70,302 triangles** in the initial migrated area. A 60-frame driving sample had median **66.7 ms**, p95 **150.0 ms**. Repeated geographic relocations retained bounded chunks and GPU geometry. See `browser-report.json` and `performance.json` for raw measurements and limits. No physical iPhone or Safari testing was available.

## Remaining work

This is a gameplay vertical slice, not the completed map migration. Most neighborhoods remain bare geography; four destinations have fitted landmark artwork. Geographic AI road traffic, the complete discovery/UI experience, full neighborhood art and full legacy feature parity remain to migrate. Underground driving, surveyed elevations/clearances and physical-device performance remain uncertified. Existing career saves do not contain an active vehicle pose or resumable mid-trip session; this PR preserves that save behavior.

## Reproduction and evidence

From repository root:

```sh
python scripts/geography/import_bangkok.py
pnpm --filter @workspace/tuk-tuk-rush geography:pack
python scripts/geography/check_data.py
python scripts/geography/check_stations.py
pnpm --filter @workspace/tuk-tuk-rush typecheck
pnpm --filter @workspace/tuk-tuk-rush test:geographic-gameplay
pnpm --filter @workspace/tuk-tuk-rush test:geographic-streaming
PORT=24813 BASE_PATH=/ pnpm --filter @workspace/tuk-tuk-rush build
pnpm --filter @workspace/tuk-tuk-rush qa:geographic-gameplay
```

The existing geography workflow repeats the complete offline rebuild and byte comparison, targeted tests and browser QA. `CHROMIUM_PATH` may select an installed Chromium executable. `scripts/run-geographic-regressions.mjs` reproduces the recorded legacy regression set. For memory comparison, run `node --expose-gc --import tsx scripts/benchmark-geographic-runtime.ts baseline` and `... packed` from the app directory; `GEOGRAPHIC_BASELINE` can point at an exported PR46 gzip.

Exactly three new browser captures:

1. [Migrated gateway and temple](migrated-landmarks.png)
2. [Active production driving and geographic navigation](active-navigation.png)
3. [Elevated rail and clear source roadway](elevated-clearance.png)
