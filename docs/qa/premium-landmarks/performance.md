# Measured performance

[Raw inventories](before-inventory.json) / [after](after-inventory.json) retain all LODs/chunks and instance arrays in Node without canvas labels. These are not visible draw counts or device FPS. Geometry bytes count unique typed-array storage, not total driver/process memory. Construction is a single sequential sample per ref on a busy QA host; timing variation is not a demonstrated speedup.

| Metric | Main | PR35 | Change |
|---|---:|---:|---:|
| geometryBuffersBytes | 114,858,464 | 113,845,892 | -1,012,572 (-0.88%) |
| geometries | 9,757 | 9,743 | -14 (-0.14%) |
| materials | 390 | 392 | +2 (+0.51%) |
| textures | 8 | 8 | +0 (+0.00%) |
| trianglesAllLevels | 14,693,526 | 14,701,844 | +8,318 (+0.06%) |
| instances | 983,536 | 986,461 | +2,925 (+0.30%) |
| constructionMs | 192,022 | 133,775 | -58,247 (-30.33%) |
| constructionCpuMs | 161,897 | 121,667 | -40,230 (-24.85%) |

Both inventories dispose every retained geometry/material/texture exactly once. The shared text atlas increases from 1024×1024 to 2048×1024: **+4 MiB raw RGBA**, no mip chain and no additional texture object. That canvas allocation is outside the Node buffer table, so lower geometry bytes do not imply lower total GPU memory.

## Initial bundle

| Asset | Main bytes | PR35 bytes | Delta |
|---|---:|---:|---:|
| js bytes | 2,173,049 | 2,181,133 | +8,084 |
| js gzipBytes | 702,205 | 704,795 | +2,590 |
| css bytes | 135,806 | 135,806 | +0 |
| css gzipBytes | 24,705 | 24,705 | +0 |

Existing Vite large-chunk warnings remain. Repeated floors/rooms use existing merged/instanced batches and bounded near/far detail. No downloaded meshes/photo textures, transparent glass overdraw, extra dynamic-light passes or global postprocessing were added. MahaNakhon removes hidden internal voxel faces while retaining the same carved occupancy at far LOD.

## Visible-frame and hardware review

Matched per-view calls, triangles and resident counts are recorded in the capture manifests and will be tabulated after both runs finish. Selected arrivals may cost materially more despite stable citywide memory; inspect local regressions before accepting the change. Raw `frameMs` values from single software-rasterizer captures are not warmed sustained timing samples and are not converted into device FPS.

Physical iPhone 17 Pro Max Safari remains required for sustained sunset/night driving, touch camera/control response, repeated loads, thermals, peak memory and local GPU cost. Four responsive viewport checks verify layout/recovery, not mobile hardware throughput.
