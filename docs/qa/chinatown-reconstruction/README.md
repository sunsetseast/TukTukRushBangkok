# Chinatown reconstruction — PR38

Implemented against current main `4735f336cf53102e8079e3943a782239ed81e68c`, the verified merge of [PR37](https://github.com/sunsetseast/TukTukRushBangkok/pull/37). This is one reviewable draft; nothing is merged or deployed.

The playable district now has 24 street-defined blocks and 798 frontage parcels. Curved Yaowarat, Charoen Krung, Ratchawong, Mangkon, Plaeng Nam, Song Wat and selected Talat Noi connections use one shared physical, routing and map graph. Chinese-Thai commercial rows, warehouse frontages and lower workshop streets have separate architectural rules. Wat Mangkon and Holy Rosary have protected compounds and original models. The persistent bilingual current-street badge uses indexed geometry and switch hysteresis.

The river and existing landmark model origins remain authoritative. The migration test reports **0 exterior footprint changes**. The world has 2210 road segments, 2148 nodes and 7163 buildings, compared with 2087, 2034 and 7204 in PR37. This is organized density: replacing 942 old bodies with 901 locally fitted bodies reduces total count by 41.

Read the evidence in this order:

1. [Current-world audit](current-world-audit.md) and [source inventory](geographic-sources.md).
2. [Four comparison maps and transformations](maps.md).
3. [Road migration contract](road-migration.md), [one-way/intersection review](intersections-and-directions.md) and [block/parcel authority](urban-blocks.md).
4. [Landmark placement](landmarks.md), [architecture/signage](architecture-and-signage.md) and [actual WebGL gallery](gallery.md).
5. [Controller routes and collision categories](driving-and-collisions.md), [automated validation](testing.md), [performance and mobile layouts](performance.md).
6. [Recognizability scorecard](recognizability.md), [remaining issues and roadmap](remaining-issues.md), [PR37 documentation reconciliation](pr37-reconciliation.md).

This is a geographically informed arcade compression, not surveyed cadastral data. Physical iPhone Safari, thermal behavior and sustained device FPS remain unverified. Automated success is not an A-grade art certification.
