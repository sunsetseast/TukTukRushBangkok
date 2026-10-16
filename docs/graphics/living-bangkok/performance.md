# Performance evidence and limits

Static geometry-array storage is **25.5% smaller** and map DOM mounting is substantially cheaper. This is **not** a verified overall frame-rate improvement: Fast night frame intervals are modestly higher in this software renderer, several Detailed/evening fixtures are significantly slower, and the next-rAF map measurement remains noisy. No physical iPhone was available. Neither software-rendered branch achieves the requested hardware 30/60 FPS targets here, and those targets are not certified.

## Method

Baseline: main `b83e2f62cc6d06a11c83fa274b3ffc1302dbbc50` (PR18). Final graphics source: `45a4552c442612d7396f3bdc068082f21533ba57`. Local runtime: Node 24.19.0, Chromium 138.0.7204.0, SwiftShader software WebGL, 844×390, fresh browser per run, Vite development server with warm transform cache. CI separately runs Node 22. There was one local browser at a time for timing runs; concurrent screenshot runs are excluded. The environment is shared cloud compute, not controlled mobile hardware.

The primary fixture is stationary Free Roam at the original spawn, elapsed 300 seconds, Fast quality, with normal engine/traffic updates. Both branches use the same pose, heading and camera. World-ready time waits for three rendered frames; interactive time additionally opens Free Roam. These are development-server proxies, not production cold-network or first-input metrics. Each frame window is approximately 30 seconds, followed by seven map open/close cycles. Baseline runs precede the final PR reruns; small sample sizes and host variation limit causal conclusions.

The seven district fixtures freeze driving physics to hold the exact chase camera, time and quality. Street-life presentation still renders. They measure rendering fixtures rather than a complete moving, busy-traffic gameplay workload. [Raw reports and summary](performance/) and [final run hashes](performance/final-manifest.json) are committed. `analyze.py` uses nearest-rank percentiles; P99 in these small samples often equals the maximum.

## Startup, storage and resource budgets

| Metric | Main | PR | Interpretation |
| --- | ---: | ---: | --- |
| World-ready proxy, two runs | 13,813 / 13,315 ms | 14,727 / 13,677 ms | No startup win; synchronous construction remains. |
| Free Roam interactive proxy | 14,106 / 13,554 ms | 14,991 / 13,948 ms | Same warm-cache procedure. |
| Deduplicated scene geometry/instance arrays | 145.48 MB | 108.37 MB | -25.5%; exact Float32 positions and topology retained. |
| Source geometry objects | 4,734 | 5,535 | More small spatial shadow batches; object count is not bytes. |
| Unique material objects | 240 | 249 | Shared materials, not one per added ornament. |
| Mean draw calls in primary fixture | 246 | 244 | No extra full-screen rendering pass. |
| Mean triangles in primary fixture | 403,710 | 409,133 | Detail and shadow/sun geometry have a measurable cost. |
| Warm GPU geometry handles | 221 | 254 | First-use upload cache; not an allocation-size measurement. |
| Warm GPU texture handles | 11 | 10 | Fast detaches normal/PBR maps. |
| Shader programs, initial → warm | 16 → 17 | 19 → 20 | Compilation stalls are not isolated from construction/scheduling. |
| Fast material-referenced RGBA + mip estimate | 27.53 MB | 27.11 MB | Analytical texel estimate, not GPU memory; excludes detached owned maps. |
| Production JS, gzip | 577.73 kB | 583.17 kB | +5.44 kB / +0.94%; no new runtime dependency. |
| Production CSS, gzip | 21.87 kB | 21.87 kB | PR18 interface styles retained. |

The three authored finish arrays each contain 128×128×8 RGBA texels (512 KiB before mipmaps). Detailed restores the normal/PBR arrays; their ownership survives Fast detachment. GPU allocation sizes/driver overhead are unavailable. `performance.memory` is coarsened JS heap, not peak heap or GPU memory: end snapshots were 254–269 MB on main and 212–239 MB on the PR. These values are supporting diagnostics, not a leak or peak-memory certificate.

## Frame intervals and stalls

| Run | Samples | Mean ms | P50 ms | P95 ms | P99 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| main-1 | 82 | 367.2 | 381.3 | 805.4 | 5480.3 |
| main-2 | 81 | 371.5 | 395.7 | 822.9 | 6390.8 |
| pr-1 | 79 | 384.3 | 394.3 | 1219.1 | 1499.8 |
| pr-2 | 79 | 385.3 | 394.0 | 1176.2 | 2111.3 |

The primary mean interval rose about 4%. P95 worsened; the very large baseline outliers made its P99 worse. This is not evidence of smoother hardware frame pacing. The PerformanceObserver long-task records include startup, shader/driver waits and map operations; they do not isolate compilation or explain every GPU scheduling gap.

| Run | Long tasks >50 ms | Maximum ms |
| --- | ---: | ---: |
| main-1 | 11 | 8240 |
| main-2 | 11 | 8027 |
| pr-1 | 6 | 9120 |
| pr-2 | 6 | 8285 |

## District rendering fixtures

All values below are software-rendered frame intervals. These short windows are descriptive; they are not device FPS estimates. Large regressions in the evening/waterfront fixtures remain visible in the report. The existing sustained-low-FPS automatic fallback to Fast is preserved; the fixed-quality fixture deliberately prevents it from hiding the Detailed cost.

| Scene | Main mean / P95 ms | PR mean / P95 ms | Samples main / PR | Calls main → PR | Triangles main → PR |
| --- | ---: | ---: | ---: | ---: | ---: |
| arun-90-medium | 128 / 439 | 357 / 938 | 40 / 16 | 180 → 188 | 257,554 → 272,596 |
| paragon-90-medium | 133 / 538 | 175 / 348 | 38 / 30 | 206 → 241 | 228,042 → 292,958 |
| yaowarat-0-medium | 170 / 938 | 315 / 390 | 32 / 16 | 330 → 341 | 539,964 → 560,258 |
| yaowarat-150-medium | 453 / 1122 | 534 / 563 | 12 / 10 | 331 → 342 | 540,006 → 560,386 |
| yaowarat-300-medium | 493 / 1006 | 509 / 1031 | 11 / 10 | 331 → 342 | 540,006 → 560,386 |
| yaowarat-300-low | 448 / 570 | 530 / 894 | 12 / 10 | 246 → 245 | 403,080 → 406,776 |
| bridge-150-medium | 210 / 713 | 415 / 779 | 24 / 13 | 179 → 204 | 214,661 → 242,383 |

Sky math was moved to vertices, array-texture hardware wrapping replaces fragment atlas arithmetic, Fast omits normal/PBR sampling, and packed vectors use aligned strides. These reduce avoidable work while retaining the art. They do **not** erase the measured Detailed-mode cost. Physical iPhone Safari validation is required before making a release-performance claim; further reductions may be necessary on actual hardware.

## Map-opening investigation

PR18's isolated 129.9 → 271.9 ms software sample did not establish a repeatable device regression. The redesigned map did expose real synchronous work: regenerated immutable cartography, many SVG footprints/road nodes, render-time layout reads and a still-rendering WebGL background. This PR caches District cartography, batches equal-style roads/footprints, uses ResizeObserver sizing, and suspends retained 3D rendering behind the map.

Two runs per branch provide 14 openings each:

| Metric | Main | PR |
| --- | ---: | ---: |
| Click → SVG DOM mount median / P95 | 90.9 / 138.2 ms | 22.9 / 54.1 ms |
| Click → next rAF median / P95 | 220.8 / 10084.4 ms | 388.9 / 3000.3 ms |
| SVG descendants in this fixture | 1,512–1,516 | 154–157 |
| 3D frames during idle open map | Rendering continues on main | 0 in browser QA |

DOM-mount median is about 75% lower. **The next-rAF median did not improve**; software WebGL scheduling/outstanding work still produces large delays. Next rAF is not a paint timestamp, and DOM mount excludes layout/paint. A universal click-to-visible speedup is **not established**. The report separates those costs rather than relabeling the faster DOM number as total map-opening latency. No timeouts were discarded from the committed measurements.

## Bounded stability and GPU diagnostic

The final browser run rendered 444 frames over 180.2 seconds of wall time, then opened/closed the map seven times. During the last minute, GPU geometry handles remained 258–258 and textures 10–10. Programs stayed 20 before/after the map cycles. The first-use traffic upload cache grew from 258 to 290 geometry handles after those cycles; this growth is reported, not described as zero. There were no console errors or failed map interactions. This is a three-minute bounded browser check, not a sustained thermal/memory-pressure test on a phone. The driven-fare suite separately covers 2,276 simulated seconds with traffic disabled for determinism.

An explicit disjoint-checked WebGL2 timer-query diagnostic at Wat Arun recorded 187 instrumented draws, totaling 134.7 ms of reported software GPU command time; finish-material draws account for 87.3 ms. This identifies material/architectural rendering as the dominant sampled pass. Query instrumentation and its fence perturb rendering; these frames are excluded from the frame comparisons. This is SwiftShader timing, **not physical GPU time on an iPhone**. GPU memory and isolated shader-compilation stalls remain unmeasured.

## Reproduce

Run from `artifacts/tuk-tuk-rush`. Use a normal installed Playwright Chromium or set `CHROMIUM_PATH` to a local executable. `APP_ROOT` can point at an installed baseline worktree; output paths are resolved before changing directories. Do not run other browsers/builds concurrently with timing measurements.

```sh
PROFILE_ONLY=1 OUT_DIR=/tmp/tuktuk-pr-profile node scripts/survey-graphics.mjs
APP_ROOT=/path/to/main/artifacts/tuk-tuk-rush PROFILE_ONLY=1 OUT_DIR=/tmp/tuktuk-main-profile node scripts/survey-graphics.mjs
SCENE_PROFILE=1 CASE_FILTER=yaowarat,paragon,arun,bridge OUT_DIR=/tmp/tuktuk-scenes node scripts/survey-graphics.mjs
PROFILE_ONLY=1 PROFILE_SECONDS=180 OUT_DIR=/tmp/tuktuk-stability node scripts/survey-graphics.mjs
SCENE_PROFILE=1 GPU_PROFILE=1 CASE_FILTER=arun OUT_DIR=/tmp/tuktuk-gpu node scripts/survey-graphics.mjs
```

Ordinary frame/map runs do not call `gl.finish()`. Only screenshot readback and explicit GPU-query diagnostics use a fence. The reproducible implementation, raw samples, script logs and experimental reports are committed; experiments are excluded from the final summary. No recordings were created.
