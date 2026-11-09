# Visual gap and chosen reconstruction

Inspected archived actual renders: PR61 `after-02-yaowarat-night.png`, `after-16-wok-house.png`; original `storefront-quality/after-certified/storefront-detail.jpg` and `chinatown-visual/after-release/yaowarat-night.jpg`. Fresh pinned baseline capture is being repeated after replacing retired condensed road-node IDs with the current authoritative corridor lookup. Failed first capture run is not a passing visual certification.

| Aspect | Condensed reference | Geographic PR61 | Reconstruction |
|---|---|---|---|
| Materials | Visible weathering, darker reveals | Solid flat colours; finish UVs ignored | One packed finish texture with fragment shading |
| Depth | Layered entrances and windows | Thin panels on a continuous source shell | Outward constructed shop rooms, returns, deep frames |
| Proportions | Deliberate narrow shophouse rhythm | Large source boxes with near-identical bay grids | Width/floor-aware silhouettes, cornices and bay variations |
| Shops | Open kitchen, readable deep counters | Uniform counters dominate shallow displays | Differentiated gold gallery and restaurant layers |
| Signs | Strong projecting skyline, physical cases | Thin blades and repeated painted fascias | Physical cabinets, restrained neon, support clearance |
| Light/contrast | Warm pools, cool dark masonry | Flat warm lower floors, unlit blue road | Source-backed world-space light field and directional surface relief |
| Street detail | Pavement, gutters, vendor composition | Very plain ground, generic utility lines | Source-clear thresholds and compact utility compositions |
| Neighbors | Continuous deliberate palette | Attractive fronts beside blank source sides | Corner returns and coordinated side elevations |
| Distance | Layered sign silhouettes | Abrupt detail limits, generic background boxes | Core structural pieces retained in Fast/medium distance |
| Impression | Cohesive arcade Bangkok | Diagram-like panels on extruded footprints | Restore tactile materials, shop depth and light hierarchy first |

The maps are differently scaled. Archived examples are qualitative references, not pixel-matched geographical comparisons. Fresh PR61/final poses are identical. Original production golden/night scenes use the actual current Yaowarat corridor at the same 844×390 viewport and street camera height. Original has no midday preset; its absence remains documented.

## Material candidates

| Candidate | Finish storage (uncompressed, before mips) | Fragment finish fetches | Decision |
|---|---:|---:|---|
| PR61 untextured vertex palette | 0 | 0 | Baseline; too flat |
| Full original color + normal + PBR arrays | 1,572,864 bytes | 3+ | Retain only in original world |
| Packed albedo + relief + roughness array | 524,288 bytes | 1 | Trial geographic implementation |

The trial adds a single shared 393,216-byte commercial field, sampled in world coordinates from 357 admitted source frontages. It cannot develop chunk-edge seams or change when a worker cancels. Fields/finishes live until scene disposal; chunk disposal releases geometries only. Actual GPU/frame-time comparison remains pending browser evidence. CPU generation samples vary with JIT warmth and are not GPU benchmarks.
