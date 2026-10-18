# Matched rendering cost

Same six public-road poses, 844 × 390, elapsed 240 s, Fast and Detailed. Four warm-up frames and five sampled frames per pose. Chromium 133 / SwiftShader software WebGL on a shared Linux host. These frame times are recorded for reproducibility, **not evidence of physical iPhone FPS**.

| Pose | Mode | Calls before → after | Triangles before → after |
|---|---|---:|---:|
| siam | Fast | 194 → 199 | 256,716 → 255,940 |
| chong-nonsi | Fast | 179 → 169 | 264,057 → 290,481 |
| asok | Fast | 129 → 118 | 167,085 → 164,249 |
| taksin | Fast | 126 → 140 | 228,662 → 249,918 |
| icon | Fast | 184 → 184 | 244,353 → 256,101 |
| pho | Fast | 209 → 173 | 316,465 → 318,896 |
| siam | Detailed | 342 → 346 | 388,625 → 391,983 |
| chong-nonsi | Detailed | 196 → 186 | 292,089 → 322,757 |
| asok | Detailed | 164 → 153 | 211,697 → 208,969 |
| taksin | Detailed | 203 → 221 | 295,134 → 321,904 |
| icon | Detailed | 247 → 247 | 307,331 → 316,813 |
| pho | Detailed | 341 → 305 | 536,012 → 537,960 |

| Resident scene resource | Before | After |
|---|---:|---:|
| Geometry / instance arrays | 123.67 MiB | 132.84 MiB |
| Geometry objects | 6,053 | 6,098 |
| Materials | 372 | 409 |
| Textures | 15 | 15 |
| Approx. uncompressed RGBA texture pixels | 23.09 MiB | 23.09 MiB |

Production JavaScript: 1,938,108 → 1,972,777 bytes (+1.8%). Current gzip: 638,385 bytes; baseline build log rounded gzip to 624.55 kB. No dependency, downloaded model, photographic texture or extra runtime texture was added.

Taksin is the principal draw-call regression: Fast calls 126 → 140 (+11.1%); Detailed calls 203 → 221 (+8.9%), triangles 295,134 → 321,904 (+9.1%). Scene arrays grow 7.4%. This is controlled but nonzero cost, and physical iPhone Safari testing is still required.

Each individual landmark uses a local material batch rather than several 80 m city-cell batches; whole-landmark culling already exists. Generic city batches retain their spatial cells. Near/far geometry, quality settings, opaque PBR glass and selective batched emissive detail are retained.

[Raw before](performance/before.json) · [Raw after](performance/after.json) · [Per-asset budgets](asset-budgets.json)
