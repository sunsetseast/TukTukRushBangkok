# Performance comparison

No physical iPhone 17 Pro Max or Safari device was available. These are measured Node inventories and actual Chromium SwiftShader samples, not mobile hardware certification. Rendering in software is substantially slower than a mobile GPU and host scheduling/GC affects frame intervals.

## Retained scene and disposal

Sequential before/after inventory uses the same Node profiler and dependencies against isolated PR31 and current checkouts. Browser-only canvas labels are absent from this inventory; browser texture counts are therefore different. All chunks and LOD levels remain included, so total triangles below are not visible frame triangles.

| Indicator | PR31 | Reconstructed | Change |
|---|---:|---:|---:|
| Buildings | 6,965 | 7,091 | +1.81% |
| Road edges | 1,991 | 2,089 | +4.92% |
| Geometry / instance buffer bytes | 109,397,928 | 111,453,180 | +1.88% |
| Retained geometries | 9,574 | 9,706 | +1.38% |
| Node materials | 388 | 388 | +0.00% |
| Node textures | 8 | 8 | +0.00% |
| Triangles across ALL retained LODs | 14,248,179 | 14,425,878 | +1.25% |
| Retained instances | 962,072 | 972,371 | +1.07% |
| Node construction wall ms | 30,683 | 29,624 | -3.45% |
| Node construction CPU ms | 35,790 | 34,906 | -2.47% |

Every retained geometry, material and texture fires exactly one disposal event in both runs: before 9,574 / 388 / 8 and after 9,706 / 388 / 8. The 1.88% buffer growth is consistent with additional street chunks, temple detail and a net 126 buildings. Shared material/texture counts do not grow. Construction CPU time does not show an increase in this pair. Wall times are environment-dependent, not an optimization claim.

Production JS grows 2,117.21 → 2,141.62 kB (+24.41 kB, 1.15%); gzip 686.56 → 695.32 kB (+8.76 kB, 1.28%). CSS remains 135.81 kB. Both builds pass with the existing large-chunk warning; no new library dependency or runtime photo texture is added. [Before build](build-before.log), [after build](build.log), [inventory pair](inventory-pair.log), [raw before](inventory-before.json), [raw after](inventory-after.json).

## Matched browser samples

`profile-historic-browser.mjs` ran sequentially at 640×360, medium quality, with the ordinary follow camera, identical design approach anchors, static sunset time, traffic off, 40 warm-up frames then 40 samples per place. Each anchor is projected to the live public road, so exact camera poses can differ when roads move. These are representative changed scenes, not an identical-pixel microbenchmark. Architecture capture frame times are excluded because those image batches use different resolutions.

| Public approach | Calls before / after | Visible triangles before / after | Median frame interval ms before / after | p95 ms before / after |
|---|---:|---:|---:|---:|
| palace | 197 / 202 | 410,830 / 363,076 | 238.5 / 257.4 | 441.9 / 395.2 |
| hua | 204 / 204 | 346,222 / 327,657 | 247.6 / 236.3 | 464.1 / 333.4 |
| gate | 262 / 247 | 452,176 / 404,368 | 370.9 / 352.1 | 749.3 / 633.1 |

Browser startup to rendered QA scene: 39,913 → 39,941 ms, including Vite loading and software shader compilation. No page errors in either run. Draw calls remain close to baseline; changed culling/occlusion reduces visible triangles in these views even though the retained scene grows. Frame intervals vary markedly and must not be interpreted as a physical-device improvement. Raw warmed samples and exact projected poses are retained in [before](browser-performance-before.json) and [after](browser-performance-after.json).

Browser viewport/reset QA separately repeats three inspection/restart cycles with stable counters (350 calls, 530,312 triangles, 831 geometries, 15 textures). Frame intervals fluctuate 30–424ms in that software run; stable resources establish lifecycle behavior, not steady hardware FPS.

## Reproduce

From `artifacts/tuk-tuk-rush`, set `CITY_BASELINE_CHECKOUT` to an isolated worktree of the recorded base SHA, with dependencies installed, then run `node scripts/profile-historic-pair.mjs`. It copies only identical QA instrumentation into that checkout, not new runtime source. For browser samples run `profile-historic-browser.mjs` separately in each checkout with `CHROMIUM_PATH` set and absolute `CITY_PROFILE_OUTPUT` paths. Use the same executable/settings, avoid other CPU-intensive work, and compare raw samples. A physical Safari pass through all seven routes remains required before claiming iPhone smoothness.
