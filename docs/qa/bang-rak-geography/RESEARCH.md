# Bang Rak / Talat Noi northern seam — reference decisions

Checked 24 October 2026. This is a bounded geographic phase, not completion of the administrative district. Real reference coordinates and game metres are kept separate in `geographic-anchors.json`; source centerlines and access tags are retained in `data/bangkok/bang-rak-reference.v1.json` (© OpenStreetMap contributors, ODbL 1.0). The final production producer is `bangRakSeam.ts`, with its exact retirement ledger and exported `district-plan.json`.

## Context and boundary

Bang Rak District includes more than the Charoen Krung creative quarter. The selected work is the northern seam between the existing Talat Noi / River City access, western Si Phraya, Captain Bush Lane and the PR42 civic/warehouse core. River City itself lists **Talat Noi, Samphanthawong**, not Bang Rak, in its [official visitor information](https://rivercitybangkok.com/plan-your-visit/). The venue's [own location map](https://rivercitybangkok.com/wp-content/uploads/2021/09/RCB-Map.pdf) was visually inspected: Si Phraya meets Charoen Krung, Soi24 approaches from the north, Soi30 bends back toward the western Si Phraya reach, and Warehouse30 is south of that reach. The map is illustrative operator evidence, not a cadastral plan.

This phase ends at the existing Charoen Krung junction on the east. It does **not** implement the full 1.6 km Si Phraya corridor toward Rama IV, Maha Set, the wider Surawong/Silom block system or the Sathon transit band. These are explicit omissions rather than streets silently invented to join existing mismatched anchors.

## Source-backed changes

| Evidence | Decision | Confidence / limit |
|---|---|---|
| OSM ways [157800038](https://www.openstreetmap.org/way/157800038), [1305800716](https://www.openstreetmap.org/way/1305800716), [156790285](https://www.openstreetmap.org/way/156790285) | Western Si Phraya runs east/northeast; recorded one-way direction is eastbound. Add a narrow eastern exit from the River City interface to Charoen Krung. | High for mapped direction/topology; no field verification of temporary traffic orders. Width and curve are compressed fits. |
| OSM ways [1235099299](https://www.openstreetmap.org/way/1235099299) and [55932811](https://www.openstreetmap.org/way/55932811) | Captain Bush runs from Charoen Krung toward its western bend, then north to Si Phraya; both are tagged one-way. Replace the previous two-way dead-end interpretation with a connected directed loop. | High for mapped topology. PR42's lateral centerline remains compressed and too flat; not claimed to be an exact trace. |
| [Thai government tourism entry](https://www.thailandtourismdirectory.go.th/en/attraction/103358) | Confirms Captain Bush / Charoen Krung Soi30 identity and cultural lane character. | Supports identity, not widths or property access. |
| OSM way [175010725](https://www.openstreetmap.org/way/175010725) and operator map | Real Soi24 has a separate northern approach. Do not relabel the retained Wanit2 access as Soi24. | Full Soi24 reconstruction deferred. Current approach is a known geographic compromise. |
| OSM way [185301801](https://www.openstreetmap.org/way/185301801) | Maha Set is a distinct street from Mahesak and runs south from Si Phraya. | Recorded for the next eastern phase; not built in this PR. |
| Venue boat directions | River City's Pier3 and Si Phraya boat stop are distinct. | Existing River City pier retained. Dedicated Si Phraya ferry/express piers remain absent; no invented ferry gameplay. |
| [BTS operator history](https://www.bts.co.th/eng/info/info-history.html) | Silom Line and Saint Louis's position between Chong Nonsi and Surasak confirmed. | All requested BTS/MRT stations are outside this small finished seam. Inherited station geometry preserved exactly, not newly certified. |

## Photographic comparison and architecture

Inspected the [Si Phraya intersection street photograph](https://www.siambangkokmap.com/en/place/141-si-phraya-intersection), [Captain Bush entrance photograph](https://www.wongnai.com/reviews/2fd05434be9345e4b304e8a58ac22208), and [Warehouse30 architectural photo essay](https://www.modernliving.jp/architecture-design/architecture/a62793142/bangkok-thailand-architecture-202411/). These informed low-rise frontage continuity, narrow lane scale, recessed businesses, shutters, shaded thresholds and restrained creative-quarter signs. Images are reference links only; none is shipped as a texture or claimed as a game capture. The new parcels use five established civic-quarter facade recipes, shared materials and spatial batches. They are original generic businesses, not claims to reproduce named real tenants or specific historic buildings.

The former Warehouse30 Captain Bush reference URL returned unrelated gambling content during this audit. It was rejected as current evidence and replaced in the production source list. The old Mandarin Oriental creative-district map URL returned HTTP410. Neither is treated as retrieved reliable evidence.

## Precision and limits

Seven conflicting building bodies and four yard fixtures are retired by exact identity and geometry. One nonconflicting rear wing transfers to the adjacent surviving frontage in the same block; its complete physical body remains exact and its ownership change is independently checked. Unchanged buildings, landmarks, river, transit, hotel compounds and preexisting node positions are compared against an immutable PR42 world snapshot. There is no broad exemption for any property inside a geographic rectangle. Rejected infill candidates are reported rather than forced through existing properties.

The curve into Si Phraya is an arcade transition between inherited anchors, not a true geographic projection. Landmarks remain compressed; Silom's inherited relationship to the Postal/Oriental area still needs correction. Source street restrictions are from a dated OSM snapshot and require local review before any claim of exact real-world regulatory accuracy.

`street-inventory.json`, `landmark-hotel-inventory.json` and `transit-inventory.json` distinguish verified source facts, inherited models, missing coordinates and deferred research. A null coordinate means unverified, not zero. They are an audit inventory, **not a claim that every listed destination is implemented or fully verified**.
