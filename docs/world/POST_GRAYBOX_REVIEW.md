# Review after the compact Bangkok graybox

Reviewed main `c11a80309e6673af62edaab21995127bbcc22241`, the merge of PR #9. This repair starts from that commit and does not depend on the older map branches.

## Open PR recommendations

| Draft | What it contains | Recommendation |
| --- | --- | --- |
| [#7](https://github.com/sunsetseast/TukTukRushBangkok/pull/7) | Separate Leaflet map, WGS84 landmark reference data and an OSM exporter. It does not upgrade the compact 3D world. | Keep unmerged as a geography reference. Extract useful sourced coordinates into future work only when needed; merging it is not required for the current game. |
| [#8](https://github.com/sunsetseast/TukTukRushBangkok/pull/8) | A real-scale city mode based on #7, with its own Three.js renderer, controller, missions, traffic and passport map. | Superseded as the integration path by the compact game in #9. Recommend closing without merging; retain the branch for reference. It is not an art upgrade to the compact world. |

Neither draft has been merged, closed or changed during this review. #8 adds a second gameplay architecture and three production HTML entry points; its map, routing and silhouette art do not automatically become part of the compact map. Its documentation also records approximate river width, unvalidated dropoffs and penalized reverse use of mapped one-way edges. Those limitations are additional reasons not to treat it as a ready upgrade.

## Confirmed defect and repair

Compact-world sector visibility used the center of the 80 m batching cell. River geometry can extend several hundred meters beyond that center, so nearby water could disappear before reaching the rendering distance limit.

For example, near Memorial Bridge at world `(-1036.36, 127.27)`, a river batch whose cell center is `(-680, 520)` is about 530 m away, while its geometry begins about 74 m away. The old Fast cutoff was 420 m, so that near geometry was hidden. The same problem occurs on other bridge views and in Pretty mode.

The repair precomputes each static sector's complete geometry bounds once and measures horizontal distance to those bounds. The Fast/Pretty radii and 16 m update threshold remain in use. Far sectors still disappear; the fix does not render the entire city or change physics, roads, fare routes, discovery or artwork.

The added regression fails against the reviewed main with `Near scenery vanished on pinklao (low)`. It passes on the repair across 146 bridge viewpoints in both quality modes. The existing browser capture now checks near and distant sector visibility in the actual scene and captures the Memorial Bridge view in Fast and Pretty.

## Gameplay assessment

The compact map is a sound layout foundation. The tested fare loop works across the larger road graph: ten deliveries, 18,321 m through the real vehicle controller, no position teleports and no collision frames. Traffic is disabled for that deterministic drive, with traffic directions and movement tested separately. Three crossings, protected parcels, discovery persistence, map transforms and sunset-to-night parameters pass their checks.

It is still a graybox. The normal driving view shows simple colored building masses. The compact renderer deliberately omits the detailed Chinatown facade kit and animated sidewalk population; that artwork remains in the separate Chinatown comparison mode. Several landmarks share generic silhouettes. Long connectors need stronger streetscape identity, greenery, signs and nighttime lighting. Passing the layout tests does not establish the requested finished Bangkok appearance.

The next substantial milestone should be district artwork on this shared compact foundation, beginning with a recognizable, dense Chinatown driving corridor and its connections to Old Town and the river. Preserve the shared coordinates, roadside stops and clearance checks. Make artwork convincing from the ordinary chase camera before expanding it citywide. The older full-scale driving draft does not solve this art gap.

## Validation

- Game TypeScript and production Vite build pass; the existing large-bundle warning remains.
- Bangkok graph, river/obstacle clearance, ten driven fares, discovery and map markup checks pass.
- All existing Chinatown gameplay, driven delivery, street life, roadside, signature facade, sign-layer and asset checks pass.
- Local Chromium 153 with SwiftShader runs the actual WebGL scene. Touch throttle release, map pause, pan/pinch, zoom, portrait/landscape access and closing the portrait map while paused are checked. JavaScript errors and failed asset requests are checked.
- Inspection-camera captures demonstrate rendering, not player-driven journeys. Software-rendered Chromium is not evidence of physical-iPhone Safari frame rate, thermal behavior or sustained touch performance. A device drive-through remains necessary.

Browser outputs are reproducible with `scripts/capture-bangkok.mjs` and are uploaded by the existing `Yaowarat art inspection` workflow. Generated screenshots and measurements remain outside the committed source.
