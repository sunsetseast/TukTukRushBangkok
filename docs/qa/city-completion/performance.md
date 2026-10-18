# Matched measurements and performance limits

Baseline is merged PR27 `da73397`. Both source trees were measured using the same Node 24 scene-inventory script and Vite production build. These are **not browser GPU profiles**. The Node scene omits canvas-generated text/logo labels, but retains all generated LOD/chunk geometry and instance arrays. It cannot be directly compared with PR27's 154.7 MB browser inventory, which includes those labels.

| Measurement | Before | After |
|---|---:|---:|
| Physical ordinary buildings | 5,639 | 6,312 |
| Summed building footprint (m²) | 2,393,467 | 2,781,789 |
| Unfinished roadside samples | 71 / 9546 | 67 / 9532 |
| Vacant area sample cells | 1,306 | 826 |
| Developed sample cells | 4,297 | 4,711 |
| Total area samples | 6,580 | 6,575 |
| Road edges | 1,730 | 1,727 |
| Road nodes | 1,694 | 1,691 |
| Retained geometry buffer bytes | 150,733,852 | 151,894,176 |
| Geometry objects | 5,486 | 6,190 |
| Material objects (no canvas labels) | 360 | 363 |
| Texture objects (no canvas labels) | 8 | 8 |
| Production application JS bytes | 2,122,403 | 2,133,326 |
| Same-method gzip JS bytes | 692,975 | 696,443 |

Vacant samples fall 36.8%. The fixed 36 m grid samples land within 230 m of public roads in named regions. These are sample cells, not exact empty parcels or a whole-map completion percentage. Water, public spaces, roads and authored/circulation reservations are separately classified. Both raw cell sets are committed. Changed private approaches slightly change sampling denominators.

Geometry buffers increase 0.77%, application JS 0.51%, and gzip JS 0.50%. Sharing immutable box buffers removes about 2.07 MB of duplication from the initial reconstruction inventory. New instance matrices/surface tiles remain cell-local.

Both inventories emit exactly one disposal event per retained geometry, material and texture object. Detailed/Fast behavior, local facade layers, whole-landmark LOD and opaque shared materials remain in the regression suite. No new runtime dependency, model download or per-building light is added. The 759 fitted block masses include 152 multi-wing groups; this is more than a roadside row, but it does not imply every block is finished.

## Unmeasured and deferred

- **Rendered draw calls: not measured for this branch.** PR27's reported peak 375 is historical only; no new peak or speedup is asserted.
- **Rendered triangle count/frame timing: not measured.** The retained-scene triangle count includes invisible and alternate LODs and is not a frame statistic.
- **Physical iPhone Safari FPS, GPU memory, thermal/battery behavior and touch QA: not tested.** No SwiftShader or Node timing is converted into iPhone FPS.
- Shader compilation, overdraw, loading peaks, garbage collection and real district traversal need hardware/browser profiling.
- All districts are still generated at startup. Lazy district generation/loading and bundle splitting were investigated as follow-on architecture, not implemented. The existing large-chunk build warning remains.

## Reproduction

From the game package: `node --import tsx scripts/profile-city-inventory.ts` with `CITY_INVENTORY_OUTPUT=/absolute/report.json`. For the old tree pass `CITY_CHECKOUT=/absolute/checkout-at-da73397` to the same script. `node --import tsx scripts/survey-city-completion.ts` writes the new area survey; `CITY_BASELINE=/absolute/old-checkout` writes its matched baseline. Production build uses `PORT=4173 BASE_PATH=/ NODE_ENV=production node node_modules/vite/bin/vite.js build`.

See [raw before resources](resources-before.json), [raw after resources](resources-after.json), [bundle bytes](bundle.json), [before land survey](survey-before.json), [after land survey](survey-after.json), and [visual status](gallery-status.md).
