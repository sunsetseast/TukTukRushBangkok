# Matched browser performance

Runtime `a52700300da6cd44bcc2ae00657dff1be6090bdf` compared with PR61 `b1ebccdf536a6b72a0cf8afb45bcdcd409a6d735`. Linux Chromium and SwiftShader at 844×390, with the same 140 m source-road camera route and 120 frame intervals per case. The test drives the vehicle with the same input and uses the pinned route for the comparison camera. These timings describe the software renderer. Physical iPhone 17 Pro Max frame pacing remains open.

| Case | p50 ms | p95 ms | p95 change | Worst ms | Mean draw calls | Mean triangles |
|---|---:|---:|---:|---:|---:|---:|
| Day / Fast / AI off | 183.3 → 150.0 | 200.1 → 199.9 | -0.1% | 383.3 → 383.4 | 113 → 120 | 157,606 → 190,413 |
| Day / Fast / AI on | 166.5 → 150.0 | 200.0 → 183.3 | -8.3% | 299.9 → 233.3 | 131 → 136 | 159,334 → 190,979 |
| Day / Pretty / AI off | 166.7 → 166.6 | 200.1 → 200.0 | ≈0% | 233.3 → 233.3 | 139 → 148 | 182,067 → 221,686 |
| Day / Pretty / AI on | 166.7 → 166.7 | 200.1 → 200.0 | ≈0% | 250.0 → 233.3 | 154 → 163 | 184,451 → 221,600 |
| Night / Fast / AI off | 150.1 → 150.0 | 199.9 → 183.3 | -8.3% | 233.3 → 233.4 | 112 → 119 | 157,574 → 189,274 |
| Night / Fast / AI on | 150.1 → 150.0 | 183.4 → 183.3 | -0.1% | 233.3 → 216.7 | 133 → 137 | 159,218 → 191,968 |
| Night / Pretty / AI off | 166.7 → 166.7 | 216.6 → 200.1 | -7.6% | 250.1 → 250.0 | 139 → 147 | 182,463 → 219,800 |
| Night / Pretty / AI on | 166.7 → 166.7 | 200.1 → 200.0 | ≈0% | 233.3 → 233.3 | 156 → 166 | 184,210 → 223,135 |

All eight cases meet the requested approximately 15% p95 overhead target. The largest measured p95 reduction is 8.3%. First playing marker: 6.75 → 6.37 seconds. Nine chunks settled: 6.76 → 6.37 seconds.

The maximum observed worker preparation sample was 1032.8 → 945.8 ms, with parallel preparation on the existing two workers. Maximum recorded main thread attachment was 58.1 → 73.3 ms. The browser relocation checks also record attachment samples as the streamed regions change. The raw route samples retain per-frame intervals and stalls over 50 ms.

## Ownership across revisits

PR61 → PR62 returned to 2,219 → 2,150 owned meshes and 8,026,175 → 8,556,619 packed decorative bytes. Tracked live texture objects on return were 16 → 18. In PR62 the same 2,150 meshes, 8,556,619 decorative bytes and 19,528,344 source building bytes returned on all three cycles. All six transitions released every retired geometry and instance stream exactly once, for 8,025 geometry and 3,117 instance disposal events. Stream and WebGL error counts were zero. Shared finishes and lighting stay with the scene.

The first expanded build had a 21–44% p95 regression. Its upload-count assertion varied with camera visibility despite stable owned allocations. The final build shifts lighting to vertices, keeps one facade finish sample per pixel, and checks actual release events. [Initial profiling and failed assertion](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42529614780)

[Final passing run](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42544455241) · [PR61 raw timings](performance-baseline.json.gz) · [PR62 raw timings](performance-final.json.gz) · [Disposal audit](eviction-browser.json)
