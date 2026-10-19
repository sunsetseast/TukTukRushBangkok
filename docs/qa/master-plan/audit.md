# Spatial audit and bounded implementation

Base: `617230c`, merged PR28, checked 18 October 2026. This reconstruction does **not** certify every requested Bangkok district as complete.

## Findings and source ownership

| System | Finding | Decision |
|---|---|---|
| `layout.json`, `world.ts` | The small original control skeleton is supplemented by civic streets and private arrivals; counting only layout corridors substantially understates the playable graph. Original east boundary stops short of Phrom Phong. | Preserve existing river/bridges; add named connected streets before graph splitting, extend east boundary and Sukhumvit discovery region. |
| `geography.ts`, `authoredSites.ts`, `realPlaces.ts` | Nominal WGS84 references and locally fitted miniature parcels coexist. A single GPS projection does not explain existing landmark locations. | Preserve the invertible overview transform; expose every retained residual rather than claiming a globally accurate projection. New EM District positions share `MASTER_PLAN` controls. |
| `civicRoads.ts`, `publicSpaces.ts`, `roadSurfaceGraph.ts` | Actual intersection sampling, public park polygons and road bakes are the usable spatial foundation. Floating polygon sweeps can fail at almost coincident junctions. | Reconstruct roads before splitting; commit a regenerated asphalt/curb/sidewalk bake. Offline integer millimetre booleans preserve holes and turning caps. |
| `destinationAccess.ts`, `destinationArt.ts` | A Wat Pho arrival wall intrudes into a public lane. Art caps, crowns and posts have larger extents than the trunk/wall collider alone. | Fit complete local forecourt assemblies and their colliders together, with bounded documented offsets; do not remove collisions. |
| `transit/network.ts`, `service.ts`, `art.ts` | Independent northern station controls drift from Phahonyothin; E5 is absent; Siam's inherited north approach clips the retail parcel and the changed branch needs a longer grade separation. | Shared road anchors, corrected west-of-retail Phaya Thai approach, E5 extension, coordinated station envelopes and tested train schedules. |
| `publicSpaceArt.ts`, `landscape.ts`, `environmentArt.ts`, `authoredGrounds.ts` | Generic tree masses and broad crowns are emitted separately from placement clearance. | One tropical planting plan, separate visible envelopes and physical stems, near/far LODs, opaque original leaves and shared instanced geometry. |
| `urbanBlocks.ts`, `streetFabric.ts`, `streetEdges.ts`, `urbanCompleteness.ts` | Road-facing parcel generation is reusable, but post-transit infill can approach the train envelope too closely. Broad inter-block vacancies remain. | Regenerate frontage around the changed graph and increase the swept rail reservation. Keep the existing district grammars and culling. |
| `traffic.ts`, `missions.ts`, `navigation.ts`, `discovery.ts`, `WorldMap.tsx`, renderer/quality | These systems consume the live graph and stable landmark identities; a second map/route network would drift. | Retain controls/boost/mission logic, add destinations through existing access contracts, expose new public spaces/transit/MRT entrances on the map. No economy retune. |

The machine-readable before/after master plans include every actual graph node/road, landmark solid, authored site reservation, public-space polygon, bridge, canal and station. Their classification is deliberately conservative: an existing asset with safe placement is still "approximately correct but needing refinement" until its full real-world setting has been reviewed.

## Inventory disposition

| Group | Classification | Implemented or remaining action |
|---|---|---|
| Palace, Wat Pho, Wat Arun, Sanam Luang, Giant Swing/Suthat, Golden Mount | Approximately correct / incomplete | Preserve east/west bank and north/south ordering, fix arrival intrusion, add local Old Town connections and tropical planting. Full cadastral parcels, gateways and realistic block orientations remain incomplete. |
| Yaowarat, Charoen Krung, Song Wat, Talat Noi, Odeon | Approximately correct / incomplete | Preserve curved one-way corridors and circle; add Mangkon/Plaeng Nam connectivity. Exact historic lanes, Holy Rosary Church and individual metalworking/warehouse compounds remain future work. |
| MBK, Discovery, Center, Paragon, CentralWorld, Jim Thompson | Approximately correct / transit conflict corrected | Preserve retail ordering and east-facing CentralWorld. Move Phaya Thai's approach west of retail and remove the northern rail cut through Center's parcel. Full Siam master plan and street visibility still need refinement. |
| Terminal 21, Asok, Phrom Phong | Approximately correct / newly expanded | Preserve northwest Terminal plot; connect the eastern road/transit extension. Add three distinct EM models and Benchasiri's pond, pedestrian circuit, coin and sculpture garden. Full scale, atriums and measured soi networks remain simplified. |
| Lumphini / Benjakitti | Approximately correct / incomplete | Preserve existing park boundaries/lakes, vehicle parking contract and wetlands; replace their tree silhouettes. Complete QSNCC, Green Mile and recreation detail remain deferred. |
| Chatuchak Market / park | Approximately correct / incomplete | Add the separate shaded lake park east of Mo Chit; market is retained. Market section-level reconstruction, Queen Sirikit/Rot Fai parks, Or Tor Kor and Bang Sue terminal remain missing. |
| Riverside hotels, River City, ICONSIAM, Asiatique | Approximately correct / incomplete | Preserve bank/river-facing orientation and working arrivals/piers; add coconut/ornamental palms and flowering/understory gardens. Exact waterfront parcel edges and full pier system remain incomplete. |
| Silom/Sathorn / BTS river crossing | Approximately correct / retained | Realign station anchors to represented roads; preserve three major bridge crossings and functioning west-bank service. Precise real-world street geometry and the entire skywalk network remain incomplete. |
| Dusit Palace, Marble Temple, Ananta Samakhom, Loha Prasat, Phra Sumen, Wat Bowonniwet | Missing entirely or unrepresented distinct compound | Defer coherent Dusit/Banglamphu expansion rather than adding isolated placeholder models. |
| Wat Kalayanamit, Santa Cruz / Kudi Chin, traditional canal villages | Missing entirely as distinct landmarks | Defer with surrounding west-bank road/canal reconstruction. Wongwian Yai rail station is retained; it does not stand in for the separate historic memorial circle. |

## Spatial model and compression

North is negative Z. `world = (design - [500,600]) × 4` remains the single game/map conversion. Longitude/southing knots in `geography.ts` remain an invertible **overview**, not GPS-accurate routing. Operator/BMA-linked site pins are nominal point facts; park outlines and new retail masses are original interpretations, not copied satellite imagery.

The east limit moves from design X995 to X1120. Phrom Phong is at `[1030,610]`, with EmQuartier north of the road, Emporium south, and EmSphere west of Benchasiri. Local mall/park residuals deliberately preserve these relationships; literal metre distances and the exact bearing of each soi are not claimed. Named soi/service loops are compressed gameplay connections. The north/south station order is retained, including the intentional gap at N6.

Phaya Thai now meets Rama I west of the Siam retail parcels. Siam's opposing-direction upper tracks use a longer continuous ramp through the compressed junction; no track is teleported or omitted to satisfy clearance. Public roads continue beneath appropriate elevated spans. Underground MRT is represented by four surface entrance structures/signs and map markers, with no fictional elevated Blue Line.

Forecourt decorations may move up to 32 game metres as intact assemblies. This applies to small walls/galleries/planters, not landmark shrinking. The path/road geometry, collision bodies and art positions remain coordinated. Tall planting that cannot clear the railway/roads is replanted as genuinely shorter understory, with matching collider height.

The automated validator checks rotated boxes, pitched decorative projections, road ribbons plus rounded turning envelopes, full near/far crowns, train corridors and station roofs. It is a conservative bounding-volume certification, not proof of every triangle in every retained bespoke sculpture. The actual gallery and remaining visual limitations must be read alongside it.

## Priority expansions

1. Reconcile Old Town's remaining nominal parcels, canal edges and civic roads against measured local reference plans, then improve their normal-camera sightlines.
2. Complete a coherent Dusit/Banglamphu district with the missing temple/civic compounds and access streets.
3. Reconstruct Chatuchak's actual market sections and the whole northern park/rail-terminal cluster together.
4. Refine Phrom Phong soi bearing/one-way details, QSNCC and the Green Mile; add interiors only where the driving game needs them.
5. Develop Kudi Chin/Wat Kalayanamit/Santa Cruz with canal-side blocks and correct bridge approaches.
6. Complete waterfront entrances/piers and progressively replace generic supporting architecture. Consider lazy district loading after physical-device measurements, rather than coupling an engine rewrite to this PR.
