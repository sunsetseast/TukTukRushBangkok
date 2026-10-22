# Measured performance

The same Node inventory and production build are compared with untouched merged PR34 main. Raw [before](before-inventory.json), [after](after-inventory.json), [bundle sizes](bundle-comparison.json) and [38 matched WebGL frames](frame-comparison.json) are included. These are software measurements, not physical iPhone results.

## Retained scene inventory

All LODs/chunks and instance arrays are retained; browser canvas labels are excluded. Geometry bytes count unique typed-array storage, not driver/process memory. Construction is one sample per ref on a busy shared QA host; timing variation is **not a demonstrated speedup**.

| Metric | Main | PR35 | Change |
|---|---:|---:|---:|
| geometryBuffersBytes | 114,858,464 | 114,152,212 | -706,252 (-0.61%) |
| geometries | 9,757 | 9,746 | -11 (-0.11%) |
| materials | 390 | 394 | +4 (+1.03%) |
| textures | 8 | 8 | +0 (+0.00%) |
| trianglesAllLevels | 14,693,526 | 14,709,832 | +16,306 (+0.11%) |
| instances | 983,536 | 986,487 | +2,951 (+0.30%) |
| constructionMs | 192,022 | 38,030 | -153,992 (-80.19%) |
| constructionCpuMs | 161,897 | 42,010 | -119,887 (-74.05%) |

Both inventories dispose every retained geometry/material/texture exactly once. The shared text atlas grows from 1024×1024 to 2048×1024: **+4 MiB raw RGBA**, no mip chain and no additional texture object. This canvas allocation is outside the Node table; reduced geometry bytes do not establish lower total GPU memory. Four additional retained materials arise from the bounded differentiated tower treatments.

## Initial production bundle

Exact file bytes and Node zlib default gzip; same Vite configuration.

| Asset | Main bytes | PR35 bytes | Delta |
|---|---:|---:|---:|
| js bytes | 2,173,049 | 2,182,994 | +9,945 |
| js gzipBytes | 702,205 | 705,506 | +3,301 |
| css bytes | 135,806 | 135,806 | +0 |
| css gzipBytes | 24,705 | 24,705 | +0 |

Existing Vite large-chunk warnings remain. No downloaded meshes/photo textures, transparent glass overdraw, added dynamic-light passes or global postprocessing are introduced. Repeated geometry uses existing merged/instanced batches and near/far detail. MahaNakhon emits exposed faces only; its current near mesh is 11,128 triangles, far 2,716. Peninsula is the largest selected near mesh at 16,284; each hero uses at most five material batches.

## Matched visible frames

Chromium 138 / SwiftShader, medium, 768×432. Camera, heading, FOV, elapsed state and scene configuration match exactly across all 38 pairs; every capture reports GL error 0. Counts include the complete rendered city. Resident geometry counts depend on visit history; the final tower recapture replayed all 38 poses in the original order. The visibility report confirms the changed tower is not visible under the frustum/root-visibility check in the 32 retained earlier frames. Those frames retain their earlier measured resource counts; six tower frames carry final runtime counts. Per-record source commits are explicit. The final all-city inventory above is authoritative for final retained totals.

| Pose / state | Calls main → PR35 | Triangles main → PR35 | Triangle change | Resident geometries main → PR35 | Textures main → PR35 |
|---|---:|---:|---:|---:|---:|
| terminal-arrival / sunset | 369 → 372 | 517,994 → 518,290 | +0.06% | 688 → 691 | 15 → 15 |
| terminal-arrival / night | 361 → 364 | 514,402 → 514,698 | +0.06% | 688 → 691 | 15 → 15 |
| terminal-street / sunset | 367 → 370 | 482,913 → 482,133 | -0.16% | 920 → 920 | 15 → 15 |
| terminal-street / night | 367 → 368 | 482,913 → 481,661 | -0.26% | 923 → 922 | 15 → 15 |
| terminal-asok / sunset | 362 → 366 | 465,732 → 455,708 | -2.15% | 1060 → 1059 | 15 → 15 |
| terminal-asok / night | 369 → 373 | 469,292 → 459,268 | -2.14% | 1060 → 1059 | 15 → 15 |
| terminal-overview / sunset | 421 → 426 | 525,601 → 526,997 | +0.27% | 1070 → 1069 | 15 → 15 |
| terminal-overview / night | 428 → 433 | 529,161 → 530,557 | +0.26% | 1070 → 1069 | 15 → 15 |
| icon-arrival / sunset | 279 → 274 | 253,862 → 271,868 | +7.09% | 1295 → 1289 | 16 → 16 |
| icon-arrival / night | 279 → 274 | 253,862 → 271,868 | +7.09% | 1295 → 1289 | 16 → 16 |
| icon-street / sunset | 278 → 271 | 244,852 → 292,370 | +19.41% | 1366 → 1357 | 16 → 16 |
| icon-street / night | 279 → 272 | 244,952 → 292,470 | +19.40% | 1367 → 1358 | 16 → 16 |
| icon-goldline / sunset | 290 → 283 | 265,548 → 299,550 | +12.80% | 1369 → 1359 | 16 → 16 |
| icon-goldline / night | 290 → 283 | 265,548 → 299,550 | +12.80% | 1369 → 1359 | 16 → 16 |
| icon-river / sunset | 349 → 345 | 328,448 → 351,226 | +6.94% | 1598 → 1587 | 16 → 16 |
| icon-river / night | 346 → 342 | 326,918 → 349,696 | +6.97% | 1599 → 1588 | 16 → 16 |
| mahanakhon-arrival / sunset | 267 → 267 | 430,743 → 416,155 | -3.39% | 1825 → 1814 | 16 → 16 |
| mahanakhon-arrival / night | 267 → 267 | 430,743 → 416,155 | -3.39% | 1826 → 1817 | 16 → 16 |
| mahanakhon-street / sunset | 330 → 332 | 411,481 → 408,379 | -0.75% | 2016 → 2008 | 16 → 16 |
| mahanakhon-street / night | 330 → 332 | 411,481 → 408,379 | -0.75% | 2016 → 2008 | 16 → 16 |
| mahanakhon-silhouette / sunset | 304 → 306 | 446,763 → 432,021 | -3.30% | 2039 → 2031 | 16 → 16 |
| mahanakhon-silhouette / night | 304 → 306 | 446,763 → 432,021 | -3.30% | 2039 → 2031 | 16 → 16 |
| hilton-arrival / sunset | 242 → 236 | 217,258 → 237,202 | +9.18% | 2065 → 2056 | 16 → 16 |
| hilton-arrival / night | 242 → 236 | 217,258 → 237,202 | +9.18% | 2065 → 2056 | 16 → 16 |
| hilton-river / sunset | 341 → 339 | 316,287 → 330,383 | +4.46% | 2135 → 2126 | 16 → 16 |
| hilton-river / night | 340 → 338 | 316,255 → 330,351 | +4.46% | 2135 → 2126 | 16 → 16 |
| hilton-river-full / sunset | 332 → 332 | 314,255 → 329,815 | +4.95% | 2135 → 2126 | 16 → 16 |
| hilton-river-full / night | 331 → 331 | 314,223 → 329,783 | +4.95% | 2135 → 2126 | 16 → 16 |
| peninsula-arrival / sunset | 332 → 326 | 342,640 → 358,410 | +4.60% | 2255 → 2242 | 16 → 16 |
| peninsula-arrival / night | 332 → 326 | 342,640 → 358,410 | +4.60% | 2255 → 2242 | 16 → 16 |
| peninsula-river / sunset | 381 → 375 | 420,700 → 438,928 | +4.33% | 2388 → 2377 | 16 → 16 |
| peninsula-river / night | 372 → 366 | 417,076 → 435,304 | +4.37% | 2388 → 2377 | 16 → 16 |
| peninsula-river-full / sunset | 368 → 363 | 411,886 → 437,098 | +6.12% | 2388 → 2377 | 16 → 16 |
| peninsula-river-full / night | 359 → 354 | 408,262 → 433,474 | +6.18% | 2388 → 2377 | 16 → 16 |
| oriental-arrival / sunset | 305 → 302 | 257,883 → 309,744 | +20.11% | 2446 → 2431 | 16 → 16 |
| oriental-arrival / night | 300 → 297 | 256,227 → 308,088 | +20.24% | 2446 → 2431 | 16 → 16 |
| oriental-river / sunset | 394 → 388 | 511,136 → 518,208 | +1.38% | 2686 → 2669 | 16 → 16 |
| oriental-river / night | 394 → 388 | 511,136 → 518,208 | +1.38% | 2686 → 2669 | 16 → 16 |

The largest local triangle increase is **oriental-arrival (night): +51,861, +20.24%**. This is a meaningful local regression even though retained geometry memory falls. Preserve the distinguishing facade/wing shapes, and budget nearby secondary detail before expanding the hotel estate. Acceptance on mobile remains conditional on hardware profiling.

The raw `frameMs` capture values are included for transparency but are single software-rasterizer render-loop samples, not a controlled sustained timing distribution. They are not converted to device FPS. A reliable warmed p50/p95 GPU/CPU frame-time study remains outstanding.

## Restart and hardware limits

[Browser checks](browser-final/checks.json) pass four viewport reset/return sequences and three ICONSIAM restarts. Every restart retains 826 geometries / 15 textures; stale inspection overrides clear and chase height returns to 3.3m. Responsive sizes are 375×812, 430×932, 844×390 and 1280×800.

Physical iPhone 17 Pro Max Safari certification remains required: sustained sunset/night driving, touch controls/camera, repeated loads, thermals, peak memory and local GPU timing. Software WebGL and Node disposal checks do not certify Safari, touch driving or total device memory.
