# Graphics architecture

## Materials and resource ownership

`facadeFinish.ts` generates one shared eight-finish atlas set: plaster, concrete, brick, tile, wood, metal, cloth and panel/glazing. The materials use distinct roughness, restrained metallic response and low-amplitude normals rather than making every wall glossy. Padded fragment-stage tiling repeats at a four-metre scale on instanced boxes. A face-edge indirect-light term adds corner depth without a screen-space AO pass.

The same textures serve the batched streets and commercial landmarks. Fast quality retains the color atlas and uses a rough, low-metal response without normal/PBR sampling; Detailed restores the normal and packed PBR maps. The data textures remain explicitly owned while detached, so final scene cleanup disposes it alongside the shared albedo and PBR textures. `disposeObject` deduplicates material/texture disposal. Superseded atlas generators were removed rather than layered on top.

`compactGeometry.ts` leaves Float32 positions and index topology exact. Static normals become normalized Int8, linear vertex colors normalized Uint8, and bounded UVs normalized Uint16. Repeating UVs outside [0,1] and interleaved attributes retain their original storage. Instanced facade colors/surface IDs also use compact attributes. This reduces resident arrays and GPU uploads without changing collisions, routes or coordinates.

## Architecture and district identity

| Area | Implemented treatment |
| --- | --- |
| Yaowarat | Recess shading, shutter angles, occupied shop-light strips and gold-display details complement the existing authored signs and neon. |
| Old Town | Warm plaster cornices, overhangs and more legible material transitions; existing temples and Buddha sculptures retained. |
| Khao San | Guesthouse frontage lights, timber divisions and the existing clothing/food businesses, rather than more Chinatown signboards. |
| Talat Noi / riverfront | Brick workshop plinths, metal eaves, warehouse bays and more coherent waterside materials. |
| Siam | Retail soffits, fins, glass response and structural slab edges; the established mall massing is retained. |
| Silom / Sathorn | Office ribs, differentiated glazing and upper-floor bands, with the BTS corridor intact. |
| Sukhumvit / Asok | Apartment service/AC details and articulated Terminal 21 side elevations with ground-level glazed entrances. |
| Asiatique | Warehouses now have rear/end structural bays, glazing, sill depth and shallow canopies facing the compressed road approach. |

Rear/background building masses receive floor bands, piers and window divisions rather than a new layer of randomly placed props. Original plot envelopes, street colliders and entrance nodes remain unchanged. Food counters gain bowls/skewers and finish-specific cloth/metal/wood surfaces within their existing footprints. Outdoor modules remain separate from gameplay/possible future interior data.

## Lighting and atmosphere

`lighting.ts` interpolates four stages (0, 55, 145 and 240 seconds) through reusable Color objects. The original full-night deadline remains 240 seconds. Warm directional light, cooler fill, ground bounce and exposure evolve continuously; night remains readable. The analytic sky adds a directional halo and restrained cloud ribbons. Water uses the existing surface shader with small ripples and selective glints. Roads stay dry and rough; world-scale resurfacing variation and fine aggregate replace flat asphalt. Derivative-antialiased paving joints avoid a mesh grid. Broad asphalt tone is computed per vertex, paving variation uses a sine-free hash, and the fully nocturnal sky skips unused sun/cloud calculations.

Ground shadows are spatially batched footprint contacts plus short feathered directional projections, fading at night. They are an approximation: no full building self-shadowing, shadow-map atlas, SSAO, full-screen bloom or reflection pass was added. Shop light pools reuse the existing bounded instanced spill stream (32/64 capacity). Window brightness is deterministic and varied, not synchronized blinking.

## Living city and LOD

Pedestrians gain tapered bodies, outfit/height/accessory variation and foot motion while retaining the existing validated paths and obstacle exclusions. Nearby city people are capped at 32 (20 Fast); distant poses update at 12 Hz. Instance colors upload only when a slot's actor identity changes. City steam originates at actual cooking sites, avoiding duplicate vendor steam from the legacy street-life layer. The one additional shared accessory stream is documented in the exact-count test (14 rather than 13).

Traffic uses shared near/far templates with an 85 m switch and 15% hysteresis, hides beyond 360 m and retains frustum culling. Distant wheels/bodywork are cheaper. Head/tail emissive details and occasional delivery-van silhouettes do not alter traffic AI, lane behavior or collision dimensions. Landmark LOOK locks the selected LOD to its high-detail level, then restores automatic LOD on return.

Pedestrian placement now uses the existing spatial broadphase instead of scanning every building for every candidate; rejection margins are unchanged. Spatial sector culling and the original quality/DPR limits remain. A tested antialias experiment was rejected because of software-renderer stalls; no new multisample/postprocessing pipeline is shipped.

## Map and input

`cartography.ts` caches immutable footprint, river/canal, region, road-style and transit geometry by District identity. Roads with identical style/width/discovery region are combined into SVG paths; rounded caps and route/discovery hierarchy remain. SVG sizing comes from ResizeObserver rather than layout reads during render. The Canvas switches to demand rendering while the map is open, retaining resources and resuming continuous rendering on return/LOOK.

Marker pointer-down events reach the canvas gesture owner. A six-pixel slop distinguishes a tap from a drag, and post-drag clicks are suppressed. Keyboard marker selection remains available. The art capture script hit-tests an unobscured canvas point, performs a stepped native drag, and verifies both changed viewBox and expected direction. It then waits for the actual whole-city extent before capturing. Pan, pinch, paused simulation and portrait assertions remain in place.

No driving physics, boost timing, mission economy, traffic rules, world geography, discovery save key, destination entrance or PR18 visual UI system was replaced. No future walking, shops, housing or career controls are exposed.
