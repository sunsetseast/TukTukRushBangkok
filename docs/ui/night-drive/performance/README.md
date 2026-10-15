# Matched UI comparison

Base main `9bd832e` vs this branch, Chromium 138.0.7204.0, SwiftShader software WebGL, 844×390, Fast quality, same spawn and night-time scene. Each run uses a fresh browser context. [Raw measurements](comparison.json).

| Measurement | Main | Branch |
| --- | ---: | ---: |
| Geometry + instance typed-array buffers | 138.74 MiB | 138.74 MiB |
| Material objects | 240 | 240 |
| Source geometry objects | 4,734 | 4,734 |
| Sampled draw calls (median) | 247 | 246 |
| Sampled visible triangles (median) | 403,746 | 403,710 |
| Driving document DOM nodes | 236 | 215 |
| Map document DOM nodes | 1783 | 1783 |
| Driving action button rectangles, summed area | 34,660 px² | 18,512 px² |
| Map canvas width | 669 px | 812 px |
| Page → development renderer ready, single run | 47.62 s | 22.55 s |
| Map click → next RAF, single run | 129.9 ms | 271.9 ms |
| Gzipped JavaScript (production build) | 569.70 kB | 577.73 kB |
| Gzipped CSS | 19.32 kB | 21.87 kB |

The action-control rectangle area is **46.6% smaller**, and the map canvas is **21.4% wider**. This measures bounding rectangles, not opaque-pixel coverage. Recovery moved into pause. New translucency further changes actual obstruction, but no pixel-coverage percentage is claimed.

Geometry/instance buffer bytes and material counts are unchanged. These are source typed arrays and object counts, **not measured VRAM**. Small draw/triangle differences can follow traffic visibility. No new scene, texture, 3D asset, postprocessing pass, animated blur or SVG filter is added for the interface. The building footprint layer is one batched SVG path.

JavaScript grows 8.03 kB gzipped (1.4%); combined HTML/JS/CSS grows about 10.6 kB (1.8%). Existing fonts are reused. Documentation images and QA scripts are outside the production bundle. The existing chunk-size warning remains.

## Timing limits and review gate

The single map-opening sample is slower on this branch (129.9 → 271.9 ms). Keep this visible as a target-device review item. A bounded repeat attempt produced no completed comparison in this environment; no repeated timing result is claimed. The script retains the reproducible single-run comparison.

The 12 recorded RAF interval samples have medians of 16.60 / 16.75 ms but include cold stalls of 9.46 / 10.84 seconds. They do not establish sustained GPU frame rate. Startup also varied substantially; the faster branch result is **not** evidence that this UI change doubles startup speed. Software WebGL, caches and shader compilation limit interpretation.

Physical iPhone Safari touch latency, sustained GPU frame pacing, thermals, memory pressure and cold network startup remain unverified. Check map opening and driving on the target device before merging. This remains a draft, with no deployment.
