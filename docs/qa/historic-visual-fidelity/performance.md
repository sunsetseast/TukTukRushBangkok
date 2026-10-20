# Measured performance comparison

Same host, identical inventory script and dependencies. PR32 and PR33 Node inventories run sequentially; browser QA overlaps these wall-time measurements. Counts include retained near/far models and spatial batches; they are not on-screen draw calls. No physical iPhone or Safari measurement is claimed.

| Metric | PR32 main | PR33 final | Change |
|---|---:|---:|---:|
| Retained geometry + instance buffers (bytes) | 111,453,180 | 113,852,800 | +2.15% |
| Retained geometries | 9,706 | 9,702 | -0.04% |
| Materials | 388 | 390 | +0.52% |
| Textures (Node, no canvas labels) | 8 | 8 | +0.00% |
| All retained LOD triangles | 14,425,878 | 14,550,852 | +0.87% |
| Construction wall time (ms) | 44,070 | 52,741 | +19.68% |
| Construction CPU time (ms) | 49,990 | 58,462 | +16.95% |
| Production JS bytes | 2,141,622 | 2,147,059 | +0.25% |
| Production JS gzip bytes | 690,589 | 692,879 | +0.33% |

## Actual renderer samples

Same 768×432 medium-quality poses and software WebGL. These are submitted call/triangle counts from actual final frames; camera-history-dependent allocated WebGL geometry counts are not substituted for retained scene inventory.

| Matched view | Calls before → after | Triangles before → after |
|---|---:|---:|
| palace / driving | 423 → 420 | 668,884 → 688,350 |
| palace / river | 351 → 357 | 540,864 → 576,466 |
| pho / driving | 315 → 315 | 396,966 → 393,982 |
| golden / ground | 467 → 467 | 783,380 → 820,836 |
| sanam / driving | 428 → 425 | 675,896 → 695,372 |
| traimit / ground | 405 → 371 | 697,638 → 650,548 |

SwiftShader frame intervals fluctuate with software rendering, shader compilation, screenshots and host scheduling. They are retained in raw captures for transparency and are **not** presented as device FPS or reliable GPU timing. Single-run construction timing is also host-sensitive; raw wall and CPU values are shown without claiming statistical significance.

## Resource ownership and repeated restarts

Both inventory disposal reports account for every retained geometry, material and texture. The browser check performs three inspection/restart cycles and asserts that allocated geometry and texture counts do not grow between the first and third cycle. See `browser/checks.json`. No texture downloads or photorealistic runtime assets were added. Landmark geometry stays batched by shared finish; tamarind crowns reuse one instanced canopy template with a reduced distant LOD.

Physical iPhone 17 Pro Max/Safari, thermal stability, mobile memory pressure and hardware frame pacing remain unverified.
