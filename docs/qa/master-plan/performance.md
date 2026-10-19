# Performance measurements

Local measurements compare untouched PR28 (`617230c`) with this draft. **No physical iPhone, Safari, thermal or mobile frame-pacing certification was performed.** The build and existing rendering-budget/disposal regressions pass; this does not establish hardware FPS.

## Retained scene resources

`profile-city-inventory.ts` constructs the whole scene in Node, counts unique retained typed-array storage across all LODs/chunks, and checks disposal. Canvas label textures are absent in this method. These bytes describe retained CPU geometry buffers, not total GPU/driver memory or peak allocation.

| Measure | PR28 | Draft |
|---|---:|---:|
| Unique geometry buffer bytes | 151,894,176 | 109,236,380 |
| Geometry wrappers | 6,190 | 9,523 |
| Materials | 363 | 386 |
| Textures without browser labels | 8 | 8 |
| All retained LOD triangle inventory | 11,517,233 | 14,276,407 |
| Instances | 768,974 | 964,737 |
| Scene-construction elapsed ms (uncontrolled shared host) | 29,624 | 37,948 |

Retained geometry buffers decrease **28.1%**, from 144.9 to 104.2 MiB. Repeated fronds, leaves, cylinders and low-poly crowns share unit buffers across spatial cells. Matrix/color/surface instance data remains per cell. Every final retained geometry/material/texture is disposed exactly once.

Geometry-wrapper count and total retained triangles increase with the new eastern blocks, parks and tropical planting. These are real costs. Construction timing includes JavaScript world planning and retained scene assembly under competing CPU/software-renderer work; it is a startup proxy, not network-to-interactive timing or a controlled speed comparison. Mobile startup remains unverified.

## Actual browser render observations

Sixty paired game views per revision use 844×480 medium graphics. The renderer reports calls/triangles for the sampled visible frame. Later local façade recaptures replace their corresponding entries. Software rendering ran on a shared host, so frame-time samples are workload observations only.

| Visible-frame measure | PR28 median / max | Draft median / max |
|---|---:|---:|
| Draw calls | 254.0 / 383.0 | 355.5 / 473.0 |
| Rendered triangles | 413,374.5 / 686,357.0 | 471,156.0 / 808,837.0 |
| Observed software frame ms | 717.4 / 2,987.7 | 512.0 / 2,199.8 |

The increased draw calls are the main outstanding rendering risk: shared instanced foliage uses several shape buckets per visible spatial cell. Memory savings do not imply faster rendering. Existing distance/quality culling, near/coarse plant models, shared materials and opaque geometry remain in use. Further batching should be guided by physical Safari measurements; district streaming is deferred rather than introducing a rendering-engine rewrite here.

Browser counters retain approximately 15–22 textures including live label/atlas textures. Texture byte allocation is not exposed by these measurements and is **not claimed**. Renderer geometry counters are progressive cache observations across inspection locations, so they are not used as total-memory estimates.

## Production build

| Asset | PR28 | Draft |
|---|---:|---:|
| Main JavaScript | 2,133.37 kB | 2,106.04 kB |
| Main JavaScript gzip | 696.44 kB | 680.72 kB |
| CSS | 135.81 kB | 135.81 kB |
| CSS gzip | 24.71 kB | 24.71 kB |

Both builds retain Vite’s large-chunk warning. Offline Clipper geometry generation does not enter the runtime bundle. The production-startup regression also builds with runtime polygon-clipping dependencies unavailable, confirming the committed road bake is consumed.

Raw data: [before scene inventory](performance-before.json), [after scene inventory](performance-after.json), [before render survey](before/survey.json), [after render survey](after/survey.json), [before build](build-before.log), [after build](build.log), [regressions](regression/summary.json).
