# Measured performance comparison

Baseline: main PR33 `c5f2e210`. Same Node scene-inventory procedure; browser comparisons use Chromium 138 SwiftShader, 768×432, medium, fixed camera/player/lighting and no traffic. **No physical iPhone/Safari measurements are available.**

## Retained scene resources

| Metric | Before | After | Change |
|---|---:|---:|---:|
| Geometry + instance buffer bytes | 113,852,800 | 114,858,464 | +1,005,664 (+0.88%) |
| Retained geometries | 9,702 | 9,757 | +55 (+0.57%) |
| Materials | 390 | 390 | +0 (+0.00%) |
| Textures | 8 | 8 | +0 (+0.00%) |
| Triangles across all retained LODs | 14,550,852 | 14,693,526 | +142,674 (+0.98%) |
| Instances across all retained LODs | 973,502 | 983,536 | +10,034 (+1.03%) |
| Node construction wall ms | 43,759 | 49,271 | +5,512 (+12.60%) |
| Node construction CPU ms | 43,834 | 46,479 | +2,645 (+6.03%) |

These are retained CPU-side geometry buffers and resource counts from all chunks/LOD levels, not simultaneously visible triangles, GPU allocation or hardware FPS. Canvas labels are absent from this Node inventory. The measured +1,005,664 geometry bytes comes from longer bounded facade coverage and three MRT surface representations. Materials/textures are unchanged. Construction cost increased: this is reported, not described as an optimization. One run per revision under a shared host is insufficient for a statistical startup-speed claim. CPU growth is consistent with additional emitted facade pieces; physical-device startup remains a gate.

Disposal emits exactly one dispose event for every distinct retained geometry/material/texture in each revision: 9,702/390/8 before and 9,757/390/8 after. Browser restart checks separately retain 828 rendered geometries and 15 textures across three ICONSIAM restarts; this does not prove long-session Safari memory behavior.

## Matched visible render work

Taken from the matched screenshot frame counters, not a synthetic Node estimate. All eight camera pairs were checked for identical pose, quality and elapsed shift time.

| View | Light | Calls before → after | Visible triangles before → after |
|---|---|---:|---:|
| gate-drive | sunset | 410 → 417 | 663,519 → 705,917 |
| gate-drive | night | 410 → 417 | 663,519 → 705,917 |
| tha-tien-drive | sunset | 333 → 342 | 457,075 → 487,731 |
| tha-tien-drive | night | 331 → 340 | 456,949 → 487,605 |
| tha-tien-elevated | sunset | 329 → 336 | 513,357 → 545,137 |
| tha-tien-elevated | night | 328 → 335 | 513,257 → 545,037 |
| tha-tien-river | sunset | 428 → 440 | 738,839 → 776,467 |
| tha-tien-river | night | 428 → 440 | 738,839 → 776,467 |
| yaowarat-curve | sunset | 425 → 444 | 750,708 → 777,060 |
| yaowarat-curve | night | 422 → 441 | 750,370 → 776,722 |
| yaowarat-elevated | sunset | 418 → 437 | 715,880 → 718,260 |
| yaowarat-elevated | night | 417 → 436 | 715,848 → 718,228 |
| yaowarat-entry | sunset | 454 → 478 | 766,258 → 785,412 |
| yaowarat-entry | night | 453 → 477 | 766,226 → 785,380 |
| yaowarat-gold-row | sunset | 467 → 491 | 875,387 → 918,785 |
| yaowarat-gold-row | night | 468 → 492 | 875,661 → 919,059 |

At the Yaowarat entry, +24 calls and +19,154 triangles accompany doubled corridor facade coverage. At the curve, +19 calls and +26,352 triangles replace shallow generic massing. Tha Tien adds +9 calls and +30,656 triangles. The additional near-detail material batches are bounded to selected cells, with shared materials/instancing and existing distance detail. This is a measured cost for richer architecture, not a claim of reduced draw calls. Existing mobile draw-call levels remain a concern for physical-device review.

## Software timing samples

The sequential before/after profiler warms eight RAFs, then records twenty samples per matched Yaowarat-entry lighting state. No concurrent browser QA or scene construction is intentionally scheduled during these paired runs. Raw files are retained. The shared software host has extreme scheduling stalls: RAF interval is neither isolated GPU time nor trustworthy mobile FPS. Percentiles below expose that variability and must not be used to certify frame rate.

| State | Revision | Samples | RAF median ms | RAF p95 ms | Range ms |
|---|---|---:|---:|---:|---:|
| sunset | profile-before | 20 | 1490.6 | 15737.3 | 38.0–17204.9 |
| night | profile-before | 20 | 1958.0 | 4704.7 | 34.0–7052.7 |
| sunset | profile-after | 20 | 1662.8 | 2902.1 | 28.5–4230.6 |
| night | profile-after | 20 | 2043.8 | 3644.8 | 54.8–4082.3 |

Any completed unpaired profile scene is retained as raw evidence but is excluded from this timing comparison. Capture-frame `frameMs` values include setup/warmup and are not used as performance samples. No optimization conclusion is drawn from timing differences.

## Production bundle

| Asset | Before raw / gzip bytes | After raw / gzip bytes | Change raw / gzip |
|---|---:|---:|---:|
| JavaScript | 2,147,059 / 692,879 | 2,173,049 / 698,585 | +25,990 / +5,706 |
| CSS | 135,806 / 24,508 | 135,806 / 24,508 | +0 / +0 |

Vite production build passes. The inherited large-chunk warning remains. Developer inspector and full iconic inventory are excluded from the production bundle. No photographic textures, new global lighting/postprocessing, or texture downloads are added. Physical iPhone GPU memory, thermal throttling, touch controls, long drives and context loss remain phase-8 acceptance work.

## Reproduction

Use `scripts/profile-city-inventory.ts` for retained scene inventory and `scripts/capture-world-benchmarks.mjs` for browser measurements. Run the same capture script from the **baseline app directory** and then the changed app directory, with `CITY_PERF=1 CITY_SCENES=yaowarat-entry`, distinct ports/labels and identical `CHROMIUM_PATH`. The working directory selects the Vite world. Keep the two browsers sequential; close other QA browsers. Run this summary script from the repository after measurements. See raw JSON method fields for limits.
