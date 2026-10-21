# Bangkok world blueprint and premium street benchmark — PR34

This change establishes **bangkok-arcade-2026.1**, an approved, reproducible geographic foundation for the existing condensed game. It reconciles data and map features while preserving PR33's working road world. It also extends the playable premium facade system along curved Yaowarat and applies a contrasting heritage treatment at Tha Tien. This is a draft review of implemented foundations and benchmarks, not a claim that all Bangkok hotels, roads or architectural assets are finished.

| Review entry | Contents |
|---|---|
| [Matched WebGL gallery](gallery.md) | Real reference photographs, 16 PR33 frames and 16 matched after frames; driving, river, elevated, sunset and night. |
| [Actual map before](map-before.svg) / [after](map-after.svg) | North-up exports from generated roads, river, BTS, parks and destinations. Before uses old player pins; after derives feature positions from approved model origins. |
| [Machine change report](change-report.json) | Unchanged road/node/hero/transit arrays; map-pin displacements, Suthat offset and MRT additions. |
| [Independent audit](initial-audit.md) / [geographic contract](geographic-contract.md) | Authority decisions, compatibility adapters, compression and migration rules. |
| [Coverage matrix](coverage.csv) / [permanent inventory](../../../data/bangkok/iconic-inventory.v1.json) | 138 iconic places, current presence, approximate coordinates, provenance, missing assets and research warnings. |
| [Citywide inspection findings](citywide-findings.md) / [art standard](art-standard.md) / [visual scorecard](scorecard.md) | Tier A/B/C production rules and candid photographic review. |
| [Testing](testing.md) / [performance](performance.md) | 34 regression groups, controller routes, viewport/restart/raycast checks and measured resource growth. |
| [Source library](sources.md) / [transit review](transit-review.md) | Primary geographic/architectural references, licences, represented station sequences and limits. |
| [Remaining production sequence](roadmap.md) | Concrete district/hotel work, dependencies and acceptance criteria. |

## Implemented changes

- Versioned canonical base layout, compression controls, 49 approved model origins/yaws/sizes, feature offsets, MRT and pier specifications. Existing builders remain the producers of roads, sites, parcels, registry and navigation. Runtime guards reject unapproved major-road or model changes. Save/discovery/arrival identities are preserved.
- Explicit Giant Swing local compression residual; corrected Suthat child-coordinate origin; player-map markers derived from actual model features. No global projection or hero geometry relocation.
- Pier-specific district/bank/street/provenance replaces inherited Chinatown metadata. Tha Chang is identified independently. Three new underground MRT surface representations: Sanam Chai, Sam Yot and Wat Mangkon; exact exit surveys remain outstanding.
- Yaowarat bespoke facade coverage expands from 19 to 38 parcels through the existing one-way curve. Deeper layered facades, supported projecting cabinets, bounded 2–5 floors, coordinated materials, curated Thai/Chinese trades and restrained sign emission use existing batching and atlas infrastructure. Arbitrary real-brand placement is removed from these generated district signs.
- Forty-two Tha Tien/waterfront parcels use deeper cream-and-green heritage facades, arched upper-window details and restrained pitched roofs, retaining PR33's piers and river access.
- Developer-only live-world inspector (`?inspect=1`): actual generated geometry, places/entrances/parcels, sources, compression residuals and missing inventory warnings. Excluded from production; the player map remains intact.

## Baseline and resulting counts

| | Main / PR33 | PR34 |
|---|---:|---:|
| Road segments | 2,089 | 2,089 |
| Connected nodes | 2,036 | 2,036 |
| Procedural buildings | 7,084 | 7,087 |
| Scene landmark origins | 49 | 49 |
| Registered places | 93 | 96 |
| Protected parcels | 208 | 208 |
| MRT surface representations | 4 | 7 |

Seven removed and ten new procedural footprints are confined to the new MRT neighborhoods. No road IDs or navigation graph geometry change. [Certification](certification.json) records bounds and lane/parcel clearance.

## Limits requiring follow-up

The geographic baseline certifies agreement within the authored arcade world; it does not certify surveyed Bangkok. The road audit identifies eight requested street families without separately named playable corridors. Twenty-seven iconic records lack site-specific models; many existing sites and hotels still need orientation, footprint and photographic review. Source coordinates are approximate centers, and null means unverified. The independent OSM research database is not silently imported as a replacement road network.

Tha Tien still has broad under-composed service areas and repeated detached blocks in elevated views. Both benchmarks need more nuanced night illumination. The inherited traffic-enabled Pho → Hua route records 31 contact frames despite reaching its destination. Physical iPhone/Safari, thermal and touch-session testing remain outstanding. These are tracked openly, not certified complete.

No merge or deployment is part of this work.
