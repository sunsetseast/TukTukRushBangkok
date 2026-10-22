# Measured performance

Node inventory retains every LOD/chunk and counts shared buffers once. Browser measurements use Chromium/SwiftShader on a shared host. Neither is a physical iPhone result.

| Resource | PR35 | River v2 | Change |
|---|---:|---:|---:|
| geometryBuffersBytes | 114,152,212 | 115,253,648 | +0.96% |
| geometries | 9,746 | 9,890 | +1.48% |
| materials | 394 | 394 | +0.00% |
| textures | 8 | 8 | +0.00% |
| trianglesAllLevels | 14,709,832 | 14,893,663 | +1.25% |
| instances | 986,487 | 996,818 | +1.05% |
| constructionMs | 33,084 | 35,128 | +6.18% |
| constructionCpuMs | 38,311 | 40,978 | +6.96% |

Every inventoried geometry, material and texture disposes exactly once in both reports. The buffer total includes instance matrices/colors; it is not process RSS or total browser memory. Construction values are single shared-host samples, not a speedup claim.

[Before inventory](validation/before-inventory.json) · [After inventory](validation/after-inventory.json).

## Matched production-distance views

640×360, medium, elapsed sunset=40, traffic disabled. Eight warm-up frames and 24 measured frames per view. These views use production fog/clipping; the raised overview captures are excluded.

| View | Calls before → after | Triangles before → after | Software frame median before → after, ms |
|---|---:|---:|---:|
| icon-street | 273 → 349 | 293802 → 345563 | 563.3 → 455.1 |
| taksin-driving | 279 → 334 | 326798 → 387893 | 470.9 → 576.3 |
| oriental-river | 392 → 396 | 519770 → 529893 | 560.6 → 871.5 |

Visible waterfront cost increases more than the retained-buffer total. Corrected banks expose more developed frontage and bank detail. This cost is reported rather than presented as a mobile performance win. Software frame medians reflect host scheduling/contention and cannot establish hardware FPS, thermal stability or Safari performance.

[Raw before samples](browser/before-qa.json) · [Raw after samples, GC heap snapshots and restart resources](browser/after-qa.json). The three identical ICONSIAM restart cycles retain stable geometry/texture counts. GC heap snapshots show retained JS heap only, not total GPU/process memory.

Physical iPhone 17 Pro Max Safari, long touch sessions, power/thermals and sustained device frame times remain open acceptance gates.

## Built JavaScript download size

Both local production builds use the locked toolchain. No deployment occurs.

| Measure | PR35 | River v2 |
|---|---:|---:|
| Largest initial JS chunk, gzip bytes | 702,678 | 733,940 |
| All JS chunks, summed gzip bytes | 702,678 | 733,940 |

[Bundle-size inventory](validation/bundle-size.json). Gzip uses level 9; the complete inventory distinguishes initial and lazy downloads.
