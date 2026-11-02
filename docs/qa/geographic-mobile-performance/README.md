# PR #53 — Geographic Bangkok mobile performance & streaming foundation

## Scope / unchanged behavior
This is **not** a benchmark proving iPhone performance. The default compressed Bangkok game, existing production driving controller, save/load, road rules, buildings and collisions are unchanged. The geographic preview remains opt-in at `?world=geographic`. This PR optimizes **metadata selection** in the existing streamer and makes poor frame pacing and chunk stalls observable on a real device.

- The chunk streamer indexes the 471 source chunks by grid position and ID once, then checks only adjacent 3×3 request cells and 5×5 retention cells when the player/camera enters a new chunk. Previous code scanned all 471 records and used repeated linear searches to resolve ready chunks. The existing 2-request/1-install-per-update limits, eviction, abort cancellation, camera priority and collision lifecycle are retained.
- A **local, opt-in** overlay measures real requestAnimationFrame wall-time deltas in a bounded 180-frame rolling window (p50 / p95 / worst / frames over 50 ms), plus draw calls, triangles, GPU geometry counts, resident building count, chunk queue/ready/pending/active counts, largest last-25-chunk activation and stream errors. This identifies the bottleneck without inventing a device memory, thermal or GPU utilization metric.
- The legacy geographic QA scene snapshot and its expensive collection traversal no longer happen every single frame; in development mode this data is sampled at most 4 times per second. A production player does **not** generate the QA global. The opt-in overlay works in both development and production.
- No detailed geometry or new simulation is added. Mobile draw-call, battery and load tests remain a **hard gate before** citywide facade or AI traffic expansion.

## Open the monitor on an iPhone
1. Open the **geographic preview**, not the default game: append `?world=geographic&geoPerf=1` to the preview URL.
2. The overlay opens automatically; it can also be toggled from the **Performance OFF/ON** button at the top of the geographic preview.
3. Select **Free roam** and drive for at least five minutes. Test Yaowarat → Song Wat/Talat Noi → Charoen Krung/Bang Rak and a river-crossing route when reachable. Repeat once after a fresh reload and again after the device is warm.
4. Observe the **p95 frame time** (33.3 ms is the 30 FPS target), worst frame, draw calls, number of loaded chunks, and chunk activation maxima. Walk-in-place/title-screen results are not sufficient.
5. During normal driving, turn the overlay off to compare overhead. Take screenshots and note iPhone model/iOS, browser, battery state, thermal warnings, graphics quality, startup time, and whether new chunks appear late or pop in.
6. Report sustained frame-time percentiles plus visible freeze events. These are performance goals, **not measured pass claims**. iOS Safari does not expose trustworthy GPU VRAM, device-wide RAM, or thermals through this overlay.

## Baseline already in main (not this PR's result)
The prior desktop *Linux Chromium / software WebGL* matched stabilization study recorded nine nearby chunks resident in **9.05 s before → 6.12 s after**, an initial building buffer estimate of **45.3 MB → 19.5 MB**, and chunk installation spikes still as high as **483.6 ms**. These samples are **not physical iPhone frame rates** and cannot be used to claim a sustained 30 FPS. Refer to [the original metrics](../geographic-stabilization/comparison.json).

## Automated checks
From repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/tuk-tuk-rush typecheck
pnpm --filter @workspace/tuk-tuk-rush test:geographic-performance
pnpm --filter @workspace/tuk-tuk-rush test:geographic-streaming
pnpm --filter @workspace/tuk-tuk-rush test:geographic-gameplay
pnpm --filter @workspace/tuk-tuk-rush build
# When a supported Chromium is installed; software WebGL is not a phone benchmark:
pnpm --filter @workspace/tuk-tuk-rush qa:geographic-gameplay
```

The browser QA verifies a real instrumented DOM overlay can be opened and closed by touch-style interaction. Existing streaming QA checks also verify bounded residence, evictions and late completion cancellation. Default Bangkok must remain unaffected.

## Not yet solved
Real 300–500 ms geometry/collider activation spikes may remain; this PR does **not** claim to move all heavy geometry work to a background thread or to certify a physical phone. If device profiling identifies activation as the dominant bottleneck, the next focused change should split precomputed surface/rail/building activation into frame-budgeted stages **without exposing uncollidable or floating world geometry**, with matched before/after iPhone evidence. Only then increase storefront detail and traffic density.
