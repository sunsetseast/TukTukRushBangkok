# Performance comparison

Identical 844×390 public-road poses, frozen simulation at 240 seconds, explicit low and medium settings. Baseline is merged main `1d85bee`; after is this branch. See [raw baseline](before/profile.json), [raw after](after/profile.json), [poses](poses.json) and [comparison JSON](comparison.json).

These are Chromium 138 **SwiftShader software WebGL** observations, with six warm-up and twelve sampled frames per scene. Only a single run per revision is reported. `frameMs` is the renderer’s frame interval, not a GPU query. Scene construction, software rendering, cache state and host scheduling can affect timings. No physical iPhone, Safari, thermals or device memory pressure was measured.

| Resident scene resource | Main | This PR |
| --- | ---: | ---: |
| Geometry and instance buffers | 125.52 MiB | 138.74 MiB |
| Unique geometry objects | 4,583 | 4,734 |
| Unique material objects | 1,330 | 240 |
| Resident material textures | 12 | 12 |
| Texture image pixels | 5,099,520 | 5,165,056 |
| First page to renderer ready | 12.05 s | 16.48 s |

Buffer bytes count unique CPU-side typed arrays in the resident scene, including both LOD levels and instance matrices/colors. Texture pixels count image dimensions, excluding implementation-specific cube targets/mipmap/driver overhead. Neither number is actual allocated VRAM. Material sharing preserves source identity, maps, emissive/transparency state and shader hooks; disposal is checked exactly once. Packed sign-atlas rows keep the final pixel increase to 1.3%.

| Scene | Quality | Draw calls main → PR | Triangles main → PR | Median interval ms main → PR |
| --- | --- | ---: | ---: | ---: |
| siam | low | 158 → 159 | 170,590 → 172,914 | 16.70 → 16.55 |
| chong-nonsi | low | 144 → 147 | 181,309 → 186,317 | 275.00 → 455.30 |
| asok | low | 112 → 110 | 122,050 → 122,866 | 268.65 → 281.05 |
| taksin | low | 87 → 88 | 94,256 → 102,340 | 226.15 → 215.95 |
| icon | low | 145 → 149 | 167,555 → 168,361 | 143.75 → 134.00 |
| pho | low | 154 → 181 | 228,558 → 258,176 | 217.90 → 210.60 |
| siam | medium | 268 → 270 | 256,997 → 260,019 | 198.95 → 195.40 |
| chong-nonsi | medium | 156 → 161 | 197,733 → 204,565 | 355.35 → 350.80 |
| asok | medium | 142 → 140 | 154,860 → 155,676 | 276.60 → 268.85 |
| taksin | medium | 133 → 136 | 119,712 → 128,380 | 254.35 → 257.65 |
| icon | medium | 207 → 211 | 215,973 → 216,779 | 141.25 → 154.55 |
| pho | medium | 262 → 291 | 416,820 → 446,566 | 247.20 → 225.85 |

The main art cost is Wat Pho: +27/+29 visible calls and about 30k triangles at low/medium. Other sampled routes change by −2 to +5 calls. Geometry buffers grow 10.5%; material objects fall 82%. Most software intervals are comparable, but Chong Nonsi low is 275 → 455 ms and startup is 12.05 → 16.48 s in this run. These regressions are reported, not interpreted as a mobile pass or hidden by a better earlier run. Physical-device profiling and optimization of any reproducible slowdown remain review gates.

The browser lifecycle test rebuilds the scene three times and confirms stable geometry/texture counts. This is allocation/disposal evidence, not a long-duration memory-leak guarantee.

Production bundles: main JavaScript 1,755,950 bytes (reported gzip 555.90 kB), PR JavaScript 1,789,300 bytes (reported gzip 569.70 kB); CSS 108.88 → 110.42 kB (gzip 18.98 → 19.32 kB). These Vite-reported decimal sizes are rounded. No new external model or bitmap downloads are needed; original ornamental textures are generated locally. Existing font downloads remain unchanged. The existing large-chunk build warning remains.
