# Matched PR60 → PR61 performance

Linux Chromium / SwiftShader, 844×390 touch simulation. **Not physical-iPhone FPS certification.**
The matched workflow completed every capture and timing case, then failed its
last return-geometry-count assertion (215 vs 732 uploaded geometries). Both away
visits returned to 63 geometries and both returns retained exactly 8,026,175
packed decorative bytes. A focused ownership/eviction check is recorded separately;
this failed aggregate job is not represented as passing.

Both builds use the same fixed 140m camera path sampled from pinned Yaowarat road
segments, 120 frames per case, source chunks, viewport, gas input, quality and
traffic settings. Real player driving continues; AI contact may change player
travel distance but cannot change the benchmark camera route. Gameplay chase
screenshots are captured separately from that fixed camera sample.

| Case | p50 ms | p95 ms | p95 change | Worst ms |
|---|---:|---:|---:|---:|
| day / Fast / AI off | 216.7 → 233.4 | 283.3 → 299.9 | +5.9% | 350.0 → 383.3 |
| day / Fast / AI on | 216.7 → 233.4 | 283.3 → 283.3 | +0.0% | 333.4 → 366.6 |
| day / Pretty / AI off | 233.4 → 250.1 | 316.7 → 316.6 | -0.0% | 383.3 → 350.1 |
| day / Pretty / AI on | 233.4 → 250.1 | 300.0 → 300.0 | +0.0% | 350.0 → 349.9 |
| night / Fast / AI off | 216.7 → 233.3 | 283.3 → 283.4 | +0.0% | 349.9 → 350.1 |
| night / Fast / AI on | 233.3 → 233.4 | 283.3 → 283.3 | +0.0% | 333.3 → 349.9 |
| night / Pretty / AI off | 249.9 → 250.0 | 300.0 → 300.0 | +0.0% | 366.7 → 333.3 |
| night / Pretty / AI on | 250.0 → 250.1 | 300.0 → 300.1 | +0.0% | 349.9 → 349.9 |

Single-run startup playable: 6810 → 9599ms; settled startup: 7600 → 9623ms. Different cache warmth/order can affect these numbers; this does not establish a startup speedup.

PR60 residency after away / return / away / return: 0 bytes / 63 geometries, 1,948,991 bytes / 392 geometries, 0 bytes / 63 geometries, 1,948,991 bytes / 334 geometries.

PR61 residency after away / return / away / return: 0 bytes / 63 geometries, 8,026,175 bytes / 215 geometries, 0 bytes / 63 geometries, 8,026,175 bytes / 732 geometries.

PR60 sampled maximum worker preparation: 427.70ms; maximum main attachment: 35.20ms.

PR61 sampled maximum worker preparation: 1114.20ms; maximum main attachment: 72.90ms.

Decorative bytes count packed static buffers, excluding shared sign textures and
small main-thread actor buffers. The new actor transforms/colors are bounded by
24 anchors per chunk and released with chunk-owned geometry. Geometry counts
include lazily uploaded scene resources; fixed static-buffer residency and zero
stream errors across revisits are the stronger measured invariants. No long-term
heap, VRAM or thermal certification is claimed.

The raw reports retain every frame, >50ms stalls, triangles, draw calls,
worker preparation and main attachment samples, source inventory, startup and
revisit state. They are saved losslessly as [baseline](baseline.json.gz) and
[final](final.json.gz); hashes and a readable metric summary accompany them.

Do not interpret software-renderer frame times as iPhone frame times. The
30 FPS-class real-device goal still requires the developer's iPhone test.

## Resource investigation and remaining cost

The [focused three-cycle test](eviction-browser.json), [passing workflow](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42394133919),
reproduced variable uploaded geometry counts while proving stable ownership:
every Chinatown return has **2,219 owned meshes, 19,528,344 building-buffer bytes,
8,026,175 decorative-buffer bytes and 357 frontages**. Away visits have 563 owned
meshes and zero Chinatown decorative bytes. All six samples have zero stream
errors. Uploaded geometries vary because visibility/LOD controls which owned
buffers are sent to the GPU; equal uploaded counts are not a valid allocation
identity test. The primary harness now checks the away release baseline; the
focused harness additionally checks identical chunk IDs and owned mesh/buffer counts.

Coverage grew 3.53× and the packed decorative footprint grew about 4.12×.
The worker keeps preparation off the driving thread, but constructing more
chunk-owned meshes still costs time on attachment. **The sampled startup and
72.9ms maximum attachment are remaining costs**, not evidence that every stall
has been eliminated. Per-cell batching, four materials, two atlases, bounded
12Hz activity and Fast-mode reductions constrain the added work. A further
batch/attachment change should follow physical-iPhone profiling; this PR does
not claim identical startup or certified sustained 30 FPS.
