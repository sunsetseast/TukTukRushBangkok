# Performance measurements

Node scene inventory includes all retained LODs and spatial batches; browser counters describe the sampled visible frames. Software rendering ran on a shared host while other QA work was active. Physical iPhone Safari, thermal behaviour and hardware FPS were not tested.

| Retained scene measure | PR29 | This PR |
|---|---:|---:|
| buildings | 6,951 | 6,965 |
| geometryBuffersBytes | 109,236,380 | 109,397,928 |
| geometries | 9,523 | 9,574 |
| materials | 386 | 388 |
| textures | 8 | 8 |
| trianglesAllLevels | 14,276,407 | 14,248,179 |
| instances | 964,737 | 962,072 |
| constructionMs | 30,158 | 37,741 |

Retained geometry buffers change by **+0.148%**. Texture count excludes browser-generated canvas labels. The repeated new details share existing geometry/material batches; no photographic runtime textures or new per-building lights are added. Disposal counts in both inventories equal the retained geometry/material/texture counts. Construction milliseconds are uncontrolled host observations, not a controlled startup benchmark.

| Visible frame measure | PR29 median / maximum | This PR median / maximum |
|---|---:|---:|
| calls | 348.5 / 438.0 | 340.5 / 436.0 |
| triangles | 434,309.0 / 739,123.0 | 443,661.0 / 731,813.0 |
| frameMs | 1,001.3 / 4,208.6 | 1,211.6 / 4,358.4 |

Browser texture counters include canvas labels; exact GPU/driver texture-byte allocation was not measured. The capture runner records its initial scene-ready time separately from capture duration. Resumed capture sessions are not a network-to-interactive startup benchmark.

Production assets and build warnings are retained in [baseline build log](build-before.log) and [current build log](build.log). The existing large-chunk warning remains. No deployment was performed.

Raw inputs: [retained baseline](performance-before.json), [retained current scene](performance-after.json), [paired visible counters](render-performance.json), [capture poses before](before/capture.json), [capture poses after](after/capture.json).
