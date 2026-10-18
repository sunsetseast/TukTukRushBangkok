# Victory Monument: geography, sources and reconstruction

Audit date: 2026-10-18. The pre-PR27 world had one straight Phaya Thai / Phahonyothin polyline through design coordinate `[675,230]`. Generic collision avoidance shifted the monument onto an adjacent rectangular parcel. There were no Ratchawithi / Din Daeng arms, traffic island, pedestrian skywalk or dedicated junction geometry. The BTS guideway passed almost through the memorial and N3 was too close to the monument.

## Sources examined

| Source | Evidence used | Perspective / limitation |
| --- | --- | --- |
| [Bangkok Metropolitan Administration, Ratchathewi district: Victory Monument](https://webportal.bangkok.go.th/ratchathewi/page/sub/27562) | Four named roads: Phaya Thai, Phahonyothin, Ratchawithi and Din Daeng. Light stone, 50m height, five clasped bayonets, stepped memorial platform, five bronze service figures at about twice human scale. | Official architectural description and monument photographs. |
| [Tourism Authority of Thailand: อนุสาวรีย์ชัยสมรภูมิ](https://thai.tourismthailand.org/Attraction/อนุสาวรีย์ชัยสมรภูมิ) | Roundabout setting, five outward blade edges, bronze figures, surrounding transport/shopping context. | Official monument description; map availability varies by locale. |
| [BTS official area map](https://www.bts.co.th/areamap/) and [BTS network guide PDF](https://www.bts.co.th/travelguideandmap.pdf) | N3 follows Sanam Pao and precedes Phaya Thai; the station is south of the roundabout. Skywalk and rail geography checked against the available area map. | Transit context, not a dimensioned road survey. |
| [BMA urban planning office: 2026 memorial maintenance photographs](https://webportal.bangkok.go.th/cpud/page/sub/18974/1/5/info/514050/) | Monument base material and surrounding railings. | Street-level base details; broad district not visible. |
| [OpenStreetMap location](https://www.openstreetmap.org/?mlat=13.76495&mlon=100.53830#map=18/13.76495/100.53830) | Geographic anchor approx. 13.76495°N, 100.53830°E; north/south corridor and east/west junction relationships. | Anchor rounded from public map, not survey-grade. No map tiles or photographs copied into runtime. |

Additional perspective references inspected through image retrieval: [elevated three-quarter photograph](https://www.bangkokinsiders.com/wp-content/uploads/2023/11/victory-monument-bangkok.jpg), [street-level original photographer](https://adventures.burnsland.com/posts/victory-monument-in-bangkok/), [night aerial context](https://www.agoda.com/wp-content/uploads/2024/07/Victory-Monument-bangkok-featured.jpg). These are analysis links, not runtime assets; they do not imply a license to redistribute their photographs.

## Authored plan

- Keep stable landmark ID `victory`; set memorial and junction center to map `[675,230]`, world `(700,-1480)`.
- Replace road endpoints through the center with a connected 40-sided, clockwise one-way circle. Centerline radius64m, road width20m; two circulation lanes marked. +Z is south in this game, so positive signed angular progression is clockwise in the north-up map.
- Wide circles carry two stable ambient-traffic lane offsets (inner/outer); existing narrower Odeon keeps its single trace. Entry/exit Bézier turns preserve each vehicle's selected lane.
- Memorial island radius42m, with a multi-part physical collision footprint; inner asphalt edge54m. The island is not a drivable plaza and does not cover the circulating roads.
- Keep Phaya Thai south and Phahonyothin north. Add Ratchawithi west and Din Daeng east, reconnected through Rama VI and Ratchaprarop to the existing compressed Phetchaburi network.
- Move N3 south to map `[675,278]`; bend the northern BTS alignment around the west side instead of through the memorial.
- Create an elevated pedestrian horseshoe outside traffic radius85m. Support columns skip road approaches and have shared rendered/collision coordinates.
- Place the passenger/discovery approach on an outer public road, never inside the inaccessible memorial island.

## Intentional compression and remaining limits

The ring radius and street lengths are arcade dimensions, not surveyed reproductions. Retaining the northern design anchor leaves a small east/west shear: real Victory is slightly east of Siam, but the inherited compressed design pin is slightly west. This PR preserves the principal north/south and corridor relationships; it does not certify a survey-accurate global map. The four road relationships and clockwise direction are preserved. Real surrounding bus terminals are represented through streetscape treatment rather than a simulation of every bus bay. The pedestrian horseshoe is a simplified form; real stairs and access ramps vary by quadrant. Bronze figure poses are original low-poly service silhouettes; the historical sculptures are not reproduced in anatomical detail. No external monument photograph or map tile is an in-game asset.
