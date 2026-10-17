# Rendering and asset cost

Matched 844 × 390 viewport, six fixed public-road poses, elapsed 240 seconds, six warm-up frames and twelve samples per pose. `low` = Fast; `medium` = Detailed. Chromium with SwiftShader software WebGL, **not iPhone Safari**.

Calls/triangles/resources are useful deterministic rendering-cost measurements. Wall-frame times in the raw captures include software rasterization and shared-host contention, so they are **not** treated as a comparable hardware-FPS benchmark. No physical-device FPS claim is made.

| Pose | Mode | Draw calls before → after | Triangles before → after |
|---|---|---:|---:|
| siam | Fast | 186 → 194 | 250,952 → 256,716 |
| chong-nonsi | Fast | 179 → 179 | 267,157 → 264,057 |
| asok | Fast | 131 → 129 | 168,525 → 167,085 |
| taksin | Fast | 115 → 126 | 193,278 → 228,662 |
| icon | Fast | 173 → 184 | 224,975 → 244,353 |
| pho | Fast | 207 → 209 | 316,918 → 316,465 |
| siam | Detailed | 322 → 342 | 387,101 → 388,625 |
| chong-nonsi | Detailed | 197 → 196 | 293,037 → 292,089 |
| asok | Detailed | 166 → 164 | 217,703 → 211,697 |
| taksin | Detailed | 182 → 203 | 247,990 → 295,134 |
| icon | Detailed | 237 → 247 | 283,241 → 307,331 |
| pho | Detailed | 335 → 340 | 534,580 → 535,922 |

| Resident scene resource | Before | After |
|---|---:|---:|
| Geometry/instance buffers | 114.52 MiB | 123.67 MiB |
| Geometry objects | 5837 | 6053 |
| Materials | 271 | 372 |
| Texture objects | 12 | 13 |
| Texture pixels | 4,972,544 | 6,021,120 |

Buffer inventory counts actual typed arrays; it is not total GPU/process memory. The new shared 1024² non-mipmapped text atlas adds approximately 4 MiB of uncompressed RGBA pixel storage. Material count rises because authored hotel batches own their near/far PBR/light materials; disposal is checked.

The production JavaScript bundle changes from 1,894,418 to 1,938,108 bytes (+43,690); gzip changes from 604,912 to 622,979 bytes (+18,067). No new dependency, photographic texture or downloaded GLB is added. Geometry is generated locally once, then batched, culled and distance-switched.

The largest sampled increase is the Taksin riverfront: Detailed triangles rise by about 19%, calls by about 12%. This is a real cost of the new riverfront collection and must be checked on a physical iPhone. The draft does not claim that mobile performance is certified.

[Raw before](before/profile.json) · [Raw after](after/profile.json) · [Comparison data](comparison.json) · [Per-asset triangle/mesh bounds](../asset-budgets.json)
