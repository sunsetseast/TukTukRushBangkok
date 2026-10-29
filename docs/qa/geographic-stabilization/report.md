# Geographic engine stabilization — review, not release certification

Base main: `266807cf4902dc4fa9a10da8555071db0b40b6f1`. PR48 was verified merged before work. One draft PR; no merge, deployment or native iOS build.

## A. Startup
The unchanged startup guard initially rejected polygon-clipping in the browser graph. Building authoring is now in an offline script, with a browser-only typed-buffer decoder. No alias, dependency rename, test-budget reduction or extra runtime dependency was used. The unchanged startup check passes, including building with polygon-clipping and its dependencies unavailable. See regressions/05.log.

## B. Static generation and source fidelity
`pnpm --filter @workspace/tuk-tuk-rush geography:compile` derives cached static meshes from committed source chunks. Dependency preparation prewarms it before a fresh workflow needs to open its port; both dev and production build also verify the cache. No PBF download or source re-import was needed locally.

All 222,123 building records, 471 original chunk identities, EPSG:32647 frame, original IDs/versions/tags, 11 families, parts, courtyards, heights, roof types, seeds, street-facing edge metadata, landmark masks, bridge/station metadata remain. Original polygons/sourceFootprint archives are unchanged and addressable through sourceChunk + source ID. Runtime JSON omits duplicate rings, not the source archive.

Geometry uses indexed millimetre positions, signed-16 normals and RGB8 linear colors; delta/planar encoding and byte-plane gzip are offline. Position error measured at most 0.0005035400390625m across 192 distributed/corrected chunks; unchanged source edges drive collision. Normal tolerance is 0.00004/component; color tolerance 1/510. All triangle corners, batch names and LOD cells are compared against the original authoring function. Source generation was also byte-compared across five distributed chunks before relocation.

## C. Performance: gains and costs
Before profiling: a 3,507-building chunk took 558.09ms in Node, of which clipping took 252.38ms, triangulation 14.07ms and normal construction 18.66ms. This is CPU instrumentation, not Safari. See construction-profile-before.json.

| Metric | Before | After |
|---|---:|---:|
| First resident set, single matched development capture | 9045.41ms | 6122.35ms |
| Initial scene activation CPU median, not GPU upload | 99.60ms | 36.40ms |
| Initial scene activation maximum | 583.20ms | 483.60ms |
| Initial building construction median | 78.90ms | 0.60ms |
| Initial building GPU buffers | 45.32MB | 19.53MB |
| Initial compressed chunk transfer | 2.26MB | 5.40MB |
| All-city source/compiled compressed chunks, NOT preloaded | 36.74MB | 89.53MB |
| All-city theoretical building buffers, NOT resident | 664.63MB | 282.66MB |

The matched capture is one run; an earlier baseline was 6.33s rather than 9.05s, demonstrating startup variance. Do not claim a robust percentage startup gain from this alone. The final cold compiler reported about 163.5s. Warm cache loops observed 39–323ms, excluding process/import and package-manager overhead; dependency preparation was verified during a cached 13.5s frozen install.

The larger transfer is a real drawback: 2.44x compressed source size. JSON parse and binary reconstruction remain on the main thread; fetch/decompression, JSON and reconstruction are separately recorded per chunk in comparison.json. GPU uploads are NOT included in activation CPU measurements. Steady-state software-rendered FPS did not materially improve. Remaining activation spikes approach 483.60ms. Neither 30 FPS nor smooth iPhone chunk entry is certified.

| Matched view | Before frame p50 / p95 ms | After p50 / p95 ms | Draw calls before / after |
|---|---:|---:|---:|
| yaowarat-drive | 233.30 / 250.10 | 250.00 / 350.00 | 73 / 73 |
| yaowarat-overview | 116.60 / 200.00 | 100.00 / 183.30 | 61 / 61 |
| chinatown-soi | 166.70 / 466.60 | 200.00 / 283.20 | 63 / 63 |
| song-wat-talat-noi | 150.00 / 316.60 | 166.60 / 268.30 | 53 / 53 |
| charoen-krung-drive | 183.30 / 216.70 | 199.90 / 216.60 | 81 / 81 |
| bang-rak-overview | 166.60 / 216.70 | 166.70 / 266.70 | 80 / 80 |
| si-phraya-frontage | 133.40 / 250.00 | 133.30 / 166.70 | 46 / 46 |
| silom-skyline | 150.10 / 183.30 | 150.00 / 183.40 | 56 / 56 |
| riverfront-block | 183.30 / 383.40 | 183.40 / 216.70 | 75 / 75 |
| heritage-modern-transition | 183.30 / 333.40 | 183.20 / 200.00 | 84 / 84 |
| fixed-conflict | 150.00 / 166.70 | 150.00 / 166.60 | 69 / 69 |
| cross-chunk-seam | 116.80 / 133.40 | 133.30 / 266.60 | 68 / 68 |

## D. Streaming, collision queries and memory
No whole-city mesh preload. Existing 3x3 demand, bounded 5x5 retention, two fetches and one activation/frame remain. Finished decodes and queued requests now prioritize vehicle distance and camera-forward direction. Immutable per-chunk 32m collider grids are cached; replacing one tile no longer rebuilds the entire resident 80m grid. Prefix offsets preserve contact order; replacing residency discards the old composite query cache.

Observed maximum resident count: 14, cap 25. Both runs passed repeated-location backing-storage/disposal checks; geometry and mesh counts are bounded. Final representative travel-set backing storage: 120.15MB before versus 79.31MB after. Different locations have different resident counts; first-to-last growth alone is not a leak test.

Dense/sparse collision profiling retains identical true-contact counts. See physics-profile.json; the 32m grid reduces candidates, but query overhead means not every latency percentile improves. Source contact resolution and legacy 80m behavior are unchanged.

## E. Road/building conflicts
76,625 candidates were classified, not declared mapping errors:

- source-centreline-overlap-review: 2,458
- vertical-part-or-grade-review: 1,024
- estimated-width-narrow-clearance-review: 69,690
- estimated-width-safe-display-trim: 1,663
- covered-passage-portal-review: 988
- explicit-width-review: 660
- water-overlap-review: 142

1663 conservative candidates permit derived asphalt trimming with a protected 4.6m centreline envelope. An all-road spatial query also catches roads wholly inside footprints. 4525 previously withheld ground wall segments are restored. 186 derived road chunks are corrected, including adjacent owner-crossing footprints. Source roads/footprints were not moved.

GEOS fixed-grid difference is offline: a polygon-clipping sweep-line difference failed on adjoining road unions and was not silently ignored. The unchanged source archives plus versioned policy/correction input make the result reproducible. Water, explicit-width, narrow-clearance, covered-passage, vertical/part/grade and genuine centreline-overlap cases remain explicit review exceptions. There is no unsupported blanket wall hiding or invented portal clearance.

The fixed screenshot uses osm:way/1021446895; cross-chunk view uses source way osm:way/85944710. Named district examples, exact source road IDs and diagnosis are in conflict-classification.json. Unmatched street labels are not fabricated.

## F. Gameplay and regression scope
The production geographic controller test now uses compiled collision metadata. It exercises driving to board and deliver a real fare, wallet persistence, a real river bridge, source seam crossings, support and water blocking, and landmark disposal. Named straight source-segment drives record every sampled point from the controller, never camera teleports; unavailable eligible labels are explicitly skipped. See driven-segments.json and the gameplay certification.

These are short segment checks, not complete end-to-end corridor traversals. Exact main-road labels are preferred over similarly named sois. Captain Bush uses the source label Soi Charoen Krung 30 rather than inventing a source tag.

| Requested corridor | Actual source label | Source way | Driven meters | Contacts | Result |
|---|---|---|---:|---:|---|
| Yaowarat | Yaowarat Road | osm:way/462532630 | 43.43 | 0 | passed |
| Phadung Dao | Phadung Dao Road | osm:way/30134885 | 65.74 | 0 | passed |
| Song Wat | Song Wat Road | osm:way/25745335 | 28.59 | 0 | passed |
| Charoen Krung | Charoen Krung Road | osm:way/175257878 | 54.43 | 0 | passed |
| Captain Bush | Soi Charoen Krung 30 | osm:way/55932811 | 30.81 | 0 | passed |
| Si Phraya | Si Phraya Road | osm:way/1059339512 | 49.79 | 0 | passed |
| Surawong | Surawong Road | osm:way/1055365749 | 59.08 | 0 | passed |
| Silom | Si Lom Road | osm:way/39943967 | 34.85 | 0 | passed |

Browser checks passed geographic UI navigation, destination selection, migrated landmark inspection, favorites/map, switching to the legacy game and returning, bounded residency and disposal. Camera/teleport movements in the gallery are ONLY loading/visual tests, not driving evidence.

Extracted workflow-command receipts: 37/39 passed in regressions/results.json. This is NOT an all-green hosted CI claim. Two commands did not pass: Playwright's --with-deps installer fails because apt is unavailable on Nix, and the original browser-geographic-streaming command exceeded the 300s command deadline without returning a passing result. It is explicitly recorded as a timeout, not silently replaced by the successful gallery. Genuine matched-gallery and gameplay browser checks use the provided Chromium. Initial manual build invocation lacked PORT, unlike CI; its corrected explicit PORT/BASE_PATH rerun is separately recorded. The targeted controller check was rerun after preferring exact main-road names.

Original source-import/repack steps were intentionally not repeated locally: no source geometry was edited and no large PBF was downloaded. Committed-source geometry checks, all-chunk hash/record validation and the new derived policy/correction reproducibility checks were run. The hosted workflow still performs its original source reproduction and unchanged git-diff guard. Hosted Actions status must be checked on the draft PR rather than inferred from local checks.

The workflow file itself is unchanged. Its existing geography:pack entry point now also classifies corrections and compiles static assets; its existing test:geographic-buildings entry point also runs the compiled-geometry check. This preserves the original checks while avoiding a workflow-file write rejected by the authorized GitHub connection.

## G. Actual WebGL gallery
The downloadable self-contained review.html contains 12 matched before/after views, including fixed-conflict and cross-chunk-seam. Baseline source modules are loaded read-only from the pinned main commit by a QA-only Vite plugin; the after run uses working source. Camera inputs, viewport and sequence match. No mockups, source renders presented as screenshots, or generated illustrations.

## H. Limits and verification environment
Physical iPhone/Safari, thermal behavior, memory-pressure eviction, real mobile bandwidth, touch reliability on device and sustained 30 FPS were NOT tested. Screens and frame timings use Linux Chromium/ANGLE SwiftShader. The generic Replit screenshot browser separately could not create a WebGL context; the WebGL-enabled browser completed the actual scene captures and gameplay checks. No code workaround conceals that environment distinction.

Remaining blockers: transfer inflation, remaining activation spikes, unresolved source/portal/width conflicts and physical-device validation. No native app, TestFlight, multiplayer, online map, account or payment system was created.

## I. Facade-engine readiness
**NO production/mobile-stability sign-off yet.** Stable source/facade metadata and static-geometry infrastructure are in place, but this draft does not justify starting a heavier facade/shader system before bandwidth, activation and physical-device budgets are established. Existing generic street courses are preserved; no advanced facade renderer was added.
