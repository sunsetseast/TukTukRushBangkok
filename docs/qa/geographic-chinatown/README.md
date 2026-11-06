# Geographic Chinatown — PR60

This is a bounded source-anchored visual layer, on main `e2afddf273ad4bfd752180bffa0b8422ca242be7` (including PR59). Physical iPhone performance is **unverified**. The developer's prior PR59 feedback was “mostly smooth with occasional stutters”; it is not a benchmark of these graphics.

## Implementation

101 admitted footprint edges receive original procedural frontage, including 25 on Song Wat. Selection is confined to local projected x2780–3700 / z80–1080; Song Wat is further confined to x2920–3280 / z520–1030. `chinatownArea.generated.json` records the pinned runtime hash and source road IDs. `scripts/select-geographic-chinatown.py` regenerates this small **selection inventory**, without importing or modifying the map.

The adapter uses the original building ID, outer-ring winding, collision-enabled edge, matched source street (with a geometric source-road fallback for side-alley hints on the selected Song Wat block), height/floors, district and available trade tags. Outward normals must face the source street. Unsafe frontages and edges obscured by a separate source footprint are rejected using a temporary chunk-local spatial index. Source masses remain unchanged. Decorative skins retain the original massing and collision geometry. Ground-level objects pass an exact oriented-rectangle-to-source-road-envelope clearance check through a fixed local road index; solid display counters add bounded, source-tagged obstacles. The player, bridge surfaces, road graph, one-way/turn rules, traffic density, source signals and blue bilingual plaques remain authoritative.

Two existing preparation workers create ArchitecturalBatch buffers. Positions, quantized/interleaved normals and colors, instance matrices, and atlas UVs transfer with their original layout. Wide untagged source buildings receive deterministic tenant variation per bay; mapped business tags take precedence. Static core surfaces merge per cell to reduce draw calls; repeated props retain instancing. The main thread only attaches buffers. Eviction disposes geometries and instance resources; the scene owns four shared materials and two commercial-sign textures (2048×384 and 1024×1024, about 9.8 MB uncompressed with mipmaps; an estimate, not measured device VRAM). Existing compressed-world artwork and its renderer are unchanged.

Twelve fictional/generic trade treatments include gold, noodles, restaurants, tea, coffee, pharmacy, merchant shops, guesthouse, produce, mini-market, bakery and warehouses. They are not claims of verified real businesses at imported addresses. Upper floors vary shutters, glazing, balconies, AC equipment and masonry. Song Wat uses restrained cream/green masonry, fanlights, shutters and warehouse gates. Original photographic references and the reasons for avoiding falsely located real brands are in [references.md](references.md).

Day/dusk/night is deterministic, selectable in Settings or `geoTime`. Warm shop wash, emissive display/window surfaces and sign atlases provide night atmosphere. No point-light fleet, shadows, bloom or post-processing is added. The first software-GPU inspection rejected the expensive four-map facade shader; the final layer uses a shared inexpensive palette material with directional lighting evaluated per vertex. The original finish library remains available to the original world.

## Budgets and LOD

Only two source-owned chunks currently contain admitted decoration. There is no global growing per-building cache. Tests bound each decorated chunk to 20,000 pieces, 12 MB serialized buffers and 256 solid props; actual counts are recorded in [facade-tests.json](facade-tests.json). Shared immutable geometry is transferred once per unique ArrayBuffer. The serialized byte count is an estimate, not device VRAM.

| Layer | Fast | Pretty |
| --- | --- | --- |
| Primary architecture/signs | 110 m | 150 m |
| Storefront depth, awnings, railings | 55 m | 65 m |
| Occupied windows / lamps | 80 m | 110 m |
| Small details, people, leaves | Off | 30 m |

The geographic batch cells are 60 m wide; the original world retains its existing 120 m cells. Distances use cell centers, so detail selection is deliberately coarse. Near solid props are also retained within 55 m of the player, preventing invisible collision bodies when the chase camera looks away. The performance overlay reports decoration facade count and buffer MiB alongside existing frame/stream metrics.

## iPhone-only inspection

Use your existing preview for this branch; this PR does not deploy a preview. Open in Safari, rotate to landscape, choose **Free roam**. The initial location remains the approved Chinatown Gate approach. Follow real Yaowarat Road northwest from the Gate toward the main shopfront corridor; use the current street label to stay on Yaowarat. The connected Song Sawat / Yaowa Phanit streets lead toward the quieter Song Wat block. The source-fixed screenshot poses also record exact longitude/latitude for reviewer reference.

- `?world=geographic` — normal dusk presentation.
- `?world=geographic&geoTime=day&geoPerf=1` — daylight and performance monitor.
- `?world=geographic&geoTime=night&geoPerf=1` — nighttime signs/interiors.
- `?world=geographic&geoTime=night&geoPerf=1&geoTraffic=0` — same nighttime route with AI vehicles off; regulatory signs and street plaques remain.

Settings → Graphics quality selects Fast/Pretty; Settings → Time of day selects Daylight, Golden dusk or Chinatown night. Close settings, then Resume drive. Compare the same route in both quality modes. Small balcony rails, people and props should disappear in Fast while primary signs, colors and architecture remain.

Drive the corridor, leave for another district, return twice, then repeat after five minutes with a warm phone. Watch p50, p95, worst frame, frames over 50 ms, activation maximum, active chunks, stream errors and decoration MiB. The intended physical-device target is p95 ≤33.3 ms / 30 FPS; a passing desktop test cannot certify it. Record iOS/Safari version, quality, traffic, time of day and visible freezes. Test pause/resume, boost, LOOK, route map, rotation and return to menu. Do not clear career storage.

## Evidence and remaining review

The workflow `geographic-chinatown.yml` runs fixed source-camera captures against pinned PR59 and current code, plus identical short driven segments with AI on/off and Fast/Pretty. Browser evidence uses Linux Chromium/SwiftShader with an 844×390 touch viewport. Software rendering is slow and is not an estimate of iPhone GPU speed. Fixed relocations separately exercise evictions and revisits; they are not described as naturally driven journeys.

Final metrics, screenshots and regression status will be recorded after visual inspection. No physical iPhone certification is claimed. Building interiors are shallow storefront compositions, pedestrians are simple static silhouettes, and real named businesses need verified footprint/address attribution before reconstruction. This PR does not complete all of Chinatown.
