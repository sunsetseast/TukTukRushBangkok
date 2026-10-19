# Bangkok World Accuracy Blueprint — current map

This is a **source-derived cartographic export**, not a concept illustration or GPS map. It is generated from `docs/qa/master-plan/master-plan-after.json`, committed as part of PR #29 and merged into `main` at `ce74d6b09854675a1b75a5d9675ed6c91225eccf`.

Open [**current-world-map.svg**](./current-world-map.svg) to zoom into the present playable map. The SVG maps all **1,991** road segments connected by **1,946** nodes, **49** landmark/destination entries, 26 BTS stop entries over 3 lines, 12 gameplay regions, 5 public spaces, 31 authored site parcels, rivers and canals.

## Map interpretation

- **Orientation:** north at the top. Design-space X increases east, Y increases south. Source world position maps to `designX = worldX/4+500, designY = worldZ/4+600`.
- **Landmark pins** (numbered 1–49) are actual post-construction landmark coordinates saved in the QA snapshot; the legend shows names and categories. Footprint overlays and authored site parcels are translucent. Pins may overlap in compact districts.
- **Roads:** every road-graph edge appears; bridge edges are brighter. Each SVG edge contains a name, corridor and width tooltip for SVG-capable viewers. Road widths are scaled from the game graph.
- **Transit:** rail alignments use the snapshot centerlines, not straight guessed lines; individual stations appear as small dots with tooltips. The snapshot contains 26 line-stop entries (including Siam twice).
- **Not shown:** all 6,951 procedural building meshes, their roof geometries, nighttime lighting, decorative trees, movable traffic, and dynamic mission state. The snapshot records building counts but not individual procedural building coordinates. A visual obstruction audit, especially around Hua Lamphong, still needs the live game/building geometry or screenshots.
- **No geographic warranty:** coordinates are the compressed miniature layout, not surveyed street positions. Differences from Bangkok are exactly what the subsequent accuracy blueprint should audit.

This branch only adds documentation and does not modify the playable world, merge or deploy anything.
