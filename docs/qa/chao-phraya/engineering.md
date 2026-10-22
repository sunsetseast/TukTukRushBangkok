# Audit and implementation

## Verified PR35 conditions

Current main retained the previously identified assumptions: eleven design-space centerline points; nominal width 72 design units = 288 world units; centerline-distance water collision; X-side bank selection in world/authored-site placement; fixed-width map strokes; boat ellipses fitted to straight spine segments; and water/land baked alongside roads with freshness guarded only by the road graph. The base was checked before implementation, not inferred from the previous prompt.

The audit covered `cityData.v1.json`, its `cityLayout.ts` adapter, `cityModel.ts`, global `geography.ts`, `world.ts`, `riverfront.ts`, `roadSurfaceGraph.ts`, generated surfaces and both authoring scripts; parcel/environment/landscape/urban-completeness placement; landmark/destination registries; bridges and rail supports; `WorldMap`, cartography, `CityInspector`, `cityGeometry`; controller recovery, career/discovery storage and camera lifecycle.

## Authority and dependent systems

| Consumer | New contract |
|---|---|
| Canonical blueprint | `waterApproval` contains closed X/Z rings, source relations, version and explicit local compression. The compatible layout spine is derived from these controls. |
| Water renderer | Committed polygon union of the approved river and existing canals, triangulated through the existing shared surface builder and water shader. |
| Terrain | Exact boolean difference of the same water union from the existing terrain extent; no separate continuous plane beneath the river. |
| Road/curb/sidewalk surfaces | Ordinary pavement is clipped to water. Actual flagged bridge decks retain their road surface across the channel. |
| Freshness | `waterTerrainKey` is independent of `roadGraphKey`. Vertex, canal, version or terrain-authoring changes invalidate baked water/land even with an unchanged road graph. Both channel construction and road construction reject stale data. |
| Physics | Polygon parity (including future natural islands) and nearest boundary clearance replace the old nominal-width rule. Only valid bridge lane envelopes bypass water blocking. |
| Bank identity | Oriented downstream cross product; east/Phra Nakhon remains downstream-left when the river turns east. Source-backed owner bank labels remain explicit metadata. |
| Building/furniture placement | Actual signed shore clearance replaces the old width subtraction. The old rear-row array-index dependency is replaced by preserved PR35 candidate identities to prevent widespread unrelated reshuffling. |
| Waterfront walls and planting | Sample actual bank edges/normals. Historic/commercial/hotel stretches use different finishes and lighting density; bridge openings and private grounds remain distinct. |
| Piers | Select a sufficiently long bank segment with land-side and water-side clearance, reject roads, provide a physical gangway. Tha Tien/Tha Chang also require their entire public walkway to clear buildings. |
| Boats | Seven closed loops follow the source spine, with parallel lanes and rounded ends. Cached route lengths avoid repeated frame-time path construction. Sampled poses keep hull clearance and avoid crossings. |
| Map and minimap | Exact even-odd polygon path from the live District. Whole-city framing uses the actual world bounds, including the new south edge. |
| Inspector/export | Same bank rings plus flow spine, tagged with approval/source provenance. The comparison PNG/SVG overlays retain old and new geometry for future road work. |
| Saves/restart | Career, discovery, region and place IDs retain their existing storage contracts. Existing saves do not persist vehicle coordinates. Defensive resume recovery relocates a submerged imported/session pose to a deterministic dry road without changing mission or progress. Restart/inspection camera invalidation remains intact. |

The centerline-distance API remains available for compatibility and directional inspection metadata; it no longer defines the Bangkok water boundary. Legacy non-polygon districts can retain their previous fallback behavior.

## Resource lifecycle

The existing batching, materials, shader and triangulation infrastructure are reused. No new water texture, renderer, scene or city engine is introduced. Five mapped overwater structure exclusions remain navigation metadata rather than artificial terrain islands. Shore lookup indices, pier results and boat path metrics use weak caches scoped to immutable generated worlds. The Node inventory verifies every retained GPU resource disposes exactly once.

## Scope of preserved and reflowed geometry

The graph delta is constrained by an offline approval command to Asiatique's arrival corridor; unrelated node/road changes cause that command to fail. Older baseline suites now retain their unrelated geometry guards while admitting explicit river migration changes. Protected grounds can change length and their old globally numbered parcel records can renumber; authored structural wings are checked separately from adaptable terrace reservations.

[Parcel ledger](parcel-migration-ledger.json) records actual additions/removals rather than hiding them behind a total. Small secondary infill changes outside the immediate shore remain a consequence of the existing capped placement solver; these are documented and are not represented as surveyed waterfront adjustments.
