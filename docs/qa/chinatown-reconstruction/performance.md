# Performance and mobile interface results

The sequential final inventories construct clean PR37 and final Chinatown source with the same Node/Three protocol, all retained LODs/chunks and no browser-canvas labels. These are real resource counts. Geometry-buffer bytes sum unique typed arrays and instance buffers; they exclude GPU-driver padding/copies and texture allocations, so they are an estimate rather than measured VRAM. Construction times are one observation per version, not a statistical mobile startup benchmark.

| Complete scene inventory | PR37 | Chinatown | Delta |
|---|---:|---:|---:|
| buildings | 7,204 | 7,163 | -41 (-0.57%) |
| roads | 2,087 | 2,210 | +123 (+5.89%) |
| geometryBuffersBytes | 115,238,004 | 109,893,616 | -5,344,388 (-4.64%) |
| geometries | 9,900 | 9,839 | -61 (-0.62%) |
| materials | 394 | 410 | +16 (+4.06%) |
| textures | 8 | 8 | +0 (+0.00%) |
| trianglesAllLevels | 14,889,249 | 14,112,904 | -776,345 (-5.21%) |
| instances | 996,553 | 934,849 | -61,704 (-6.19%) |
| constructionMs | 31,514 | 34,126 | +2,612 (+8.29%) |
| constructionCpuMs | 36,966 | 38,931 | +1,965 (+5.32%) |

All counted geometry/material/texture resources dispatch disposal on both sides: PR37 {'geometries': 9900, 'materials': 394, 'textures': 8}; final {'geometries': 9839, 'materials': 410, 'textures': 8}. Final geometry buffers are lower by 5,344,388 bytes, while materials increase by 16. New models share geometry/material infrastructure; no per-building light allocation or per-frame geometry rebuilding is introduced.

| Production asset | PR37 bytes | Final bytes | Growth |
|---|---:|---:|---:|
| js raw | 2,260,244 | 2,402,158 | +141,914 (+6.28%) |
| js gzip | 735,153 | 780,834 | +45,681 (+6.21%) |
| css raw | 135,806 | 136,615 | +809 (+0.60%) |
| css gzip | 24,508 | 24,704 | +196 (+0.80%) |

The existing large-chunk build warning remains. The extra street/block data and architecture increase JS payload even though retained scene buffers fall. Final CSS includes the explicit street-badge stacking fix; that reversible style-only change is checked in the actual production preview.

## Actual rendered views

Medium quality,844×474,DPR1, elapsed40s sunset/650s night, traffic disabled. Counts below come from the actual WebGL renderer. Eight recorded frames follow four warmup frames in the gallery protocol. They include software rendering, shader compilation/streaming and shared-host contention; p95 from eight observations is coarse. They are not sustained iPhone FPS and are not presented as a proven speedup. Camera adjustments for migrated street-level views are recorded in scenes.json.

| View | Calls before → after | Triangles before → after | Software frame median ms before → after | Software p95 ms before → after |
|---|---:|---:|---:|---:|
| yaowarat-overview | 518 → 478 | 885,917 → 697,234 | 545.1 → 17.6 | 797.6 → 735.3 |
| yaowarat-sunset | 496 → 477 | 888,211 → 723,982 | 657.6 → 599.3 | 751.6 → 715.8 |
| yaowarat-night | 495 → 476 | 888,179 → 723,950 | 810.5 → 610.4 | 956.9 → 688.3 |
| odeon-circle | 423 → 396 | 729,383 → 632,318 | 25.8 → 245.7 | 1145.9 → 727.5 |
| wat-traimit | 408 → 414 | 716,119 → 574,057 | 637.2 → 484.3 | 786.9 → 1088.9 |
| hua-lamphong | 392 → 360 | 528,566 → 386,187 | 421.0 → 420.1 | 488.6 → 469.4 |
| ratchawong | 446 → 395 | 835,191 → 532,548 | 265.8 → 327.0 | 918.5 → 407.0 |
| mangkon | 425 → 394 | 756,847 → 577,172 | 785.3 → 550.1 | 981.7 → 652.1 |
| plaeng-nam | 385 → 380 | 605,465 → 489,651 | 613.4 → 588.5 | 771.7 → 1057.8 |
| song-wat | 388 → 397 | 553,083 → 582,687 | 451.1 → 468.6 | 533.7 → 559.1 |
| song-wat-river | 251 → 254 | 324,135 → 344,932 | 328.4 → 684.6 | 890.3 → 867.7 |
| talat-noi | 360 → 402 | 496,481 → 597,034 | 290.8 → 720.2 | 836.2 → 1092.1 |
| talat-noi-river-city | 292 → 263 | 334,099 → 249,976 | 181.4 → 236.4 | 326.8 → 319.2 |
| district-blocks | 356 → 353 | 503,019 → 551,340 | 273.0 → 276.3 | 376.7 → 895.6 |
| river-relationship | 183 → 187 | 208,759 → 199,140 | 268.2 → 324.1 | 300.3 → 1121.1 |
| wat-mangkon | 383 → 374 | 561,728 → 509,968 | 244.2 → 252.2 | 523.3 → 348.7 |
| holy-rosary | 345 → 367 | 433,771 → 430,928 | 543.4 → 325.8 | 1072.2 → 773.3 |

## Interface, restart and limitations

| Viewport | Verified result |
|---|---|
|375×812|Portrait rotate-to-landscape guard retained; no document overflow|
|430×932|Portrait rotate-to-landscape guard retained; no document overflow|
|844×390|Street badge/long bilingual name, destination, map, pause and driving controls fit; rectangle nonoverlap assertions and actual screenshots|
|1280×800|Desktop landscape driving layout, street badge and navigation fit|

The completed browser report records 30 restarts, no WebGL errors, no stale art-camera override and stable geometry/texture counts after warmup. Last restart resource counts: 1346 geometries / 17 textures. The route matrices additionally exercise long simulated driving sessions. This is bounded restart stability, not a multi-hour physical-device soak.

Current-road lookup uses64-unit spatial cells, at most5 queries per second, and two-sample switch hysteresis; it does not scan the whole graph per render frame. Reverse route fields remain cached per destination. The minimap now joins adjacent styled edges into SVG subpaths while retaining every vertex; the unchanged culling/mounting budget passes.

**Physical iPhone17ProMax Safari remains unverified.** No thermal, battery, physical safe-area, sustained GPU FPS or hardware memory claim is made. Software frame results are visibly slow/variable; the larger bundle and hundreds of submitted draw calls still warrant real-device profiling.

Final production UI replay: PASS at all four requested viewports using visible game controls, with the street badge visibly painted and no page errors. See [production-ui.json](validation/production-ui.json). Production screenshots use low quality in Chromium138; the matched art gallery remains medium quality in its recorded renderer. Production intentionally omits development debug hooks. This replay appends the final source stacking declaration verbatim to the already built stylesheet and does not substitute synthetic scenery.
