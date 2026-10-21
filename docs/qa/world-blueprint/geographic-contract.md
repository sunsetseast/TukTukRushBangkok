# Canonical geographic approval v1

`cityData.v1.json` separates WGS84 facts, deliberate compression and approved model placements. `cityModel.ts` adapts those records. Existing world/site/parcel/registry APIs remain; no second road graph, landmark registry or protection system is added.

| Contract | Authority |
|---|---|
| Geographic fact | Coordinate, approximate-center accuracy, source, district and neighbor context. Null means unverified. Independent OSM research geometry remains separate from playable geometry. |
| Compression approval | Exact model/design origin, yaw, size, local feature offset and reason. Local approvals override the unchanged piecewise projection. |
| Road/intersection/district/water | Canonical base layout/master-plan controls plus retained historic/public-space adapters, producing one existing split graph. Fingerprints include positions, widths, names, directions and bridge/traffic flags. |
| Site/entrance/parcel | Existing builders derive compatible footprints and arrivals from approved origins. Registry is a read model of those same objects. |
| Transit/pier | Existing BTS/train/bridge systems preserved; canonical MRT/pier specifications supply metadata and compressed controls. MRT has surface entrances only. |
| Playable geometry | `cityGeometry(d)` exports actual streets, intersections, districts, bridge links, parcels, site origins, collision footprints, entrances, stations, piers, parks and waterways with coordinate/provenance/approval fields. |

Runtime modules use `cityLayout`; `layout.json` remains a frozen legacy fixture. Authored anchors, historic landmark controls, master-plan controls and real-place placements now adapt canonical approvals. Approved heroes no longer use radial fallback relocation. Remaining literal historic road controls are retained staged adapters, not claimed surveyed data.

World construction rejects an unapproved origin/yaw/size or road change. Graph hashing uses the existing 0.1mm quantization because native trigonometry varies in its last bit across JS engines. QA also compares complete Node-generated roads, nodes, landmarks, river and BTS arrays against PR33 main. Future geographic changes must update the approval version, explain deviations and validate dependencies, including baked asphalt.

The Swing feature is explicitly 58m north of its shared compound origin and 263 game metres north of its legacy projected geographic reference. The global projection remains unchanged. Suthat now offsets from the model origin, correcting a 58m registry error. Player markers derive from physical model features; arrivals/discovery/save IDs remain unchanged. No road IDs changed and no saved-route migration is necessary.

The approved baseline is an internally consistent arcade network, not surveyed Bangkok. Widths, spacing, stations and sites are compressed. Hotel bearings, exact real entrances and absent sites remain warnings. Source geometry is never silently imported as a replacement network.

Run `node --import tsx scripts/export-city-blueprint.ts` for north-up maps, geometry and deviation report. Dev app `?inspect=1` / “Inspect city” reads the live District: select places, inspect WGS84/game positions, residuals, sources and entrances; toggle roads, names, districts, water, transit, parks, parcels and buildings. Missing sites are warnings, not fabricated pins. The lazy dev interface is excluded from production and does not replace the player map.
