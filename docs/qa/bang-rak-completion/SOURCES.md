# Sources and confidence

Research date: 2026-10-25. Game geometry is a north-up compressed interpretation. Sources establish identities, topology, direction tags and architectural character; they do not establish surveyed game dimensions.

## Reproducible geographic observations

- [Bang Rak OSM snapshot](../../../data/bangkok/bang-rak-reference.v1.json), retrieved 2026-10-24, includes its request URL, raw digest and full retained access/direction tags. © OpenStreetMap contributors, [ODbL attribution](https://www.openstreetmap.org/copyright).
- [City OSM reference](../../../data/bangkok/osm-reference.v1.geojson) provides the wider Silom/Sathon/Rama IV corridor observations. This older export does not preserve every direction tag; absence of an `oneway` field here is not evidence that a street is two-way.
- New Overpass retrieval returned HTTP406 and an OSM map request returned HTTP400 in this environment. Neither failure is described as a successful fresh survey.
- Si Phraya eastward flow: ways [156790285](https://www.openstreetmap.org/way/156790285), [1466230604](https://www.openstreetmap.org/way/1466230604), [1466230602](https://www.openstreetmap.org/way/1466230602), [1466230603](https://www.openstreetmap.org/way/1466230603).
- Surawong westward flow: [1208104030](https://www.openstreetmap.org/way/1208104030), [185301806](https://www.openstreetmap.org/way/185301806), [1055365749](https://www.openstreetmap.org/way/1055365749). The implementation fits the selected arterial into the existing Rama IV anchor.
- Maha Set opposing carriageways: [185301801](https://www.openstreetmap.org/way/185301801), [1013632953](https://www.openstreetmap.org/way/1013632953), plus short connecting way [1013632952](https://www.openstreetmap.org/way/1013632952). A single two-way game road represents this pair; no claim of a literal divided-road model.
- Mahesak: [39943969](https://www.openstreetmap.org/way/39943969) is present in the district snapshot. Pan, Decho, Naret and the selected Surasak continuation use operator/district-map topology and interpreted direction/access. Their real-world turn restrictions have **not** been independently field-certified.
- [Pullman district location map](https://d2e5ushqwiltxm.cloudfront.net/wp-content/uploads/sites/21/2023/05/15110125/PBHG-MICE-Presentation-2023-3.pdf): cached text names Pan/Decho/Mahesak/Surasak/Surawong/Si Phraya/Silom; a fresh screenshot fetch returned 404. Treat it as corroborating cached topology, not a newly inspected current street image.
- [Banyan Tree neighborhood guide](https://banyantreeresidencesriversidebangkok.com/pdf/NeighborhoodGuide.pdf): riverside destinations and commercial context. The comparison graphic uses the attributed OSM polylines rather than tracing the brochure.

## Primary identity and architecture references

| Site | Primary reference | Use / limitation |
|---|---|---|
| State Tower / lebua | [Operator fact sheet](https://lebua.com/wp-content/uploads/2019/04/lebua-Factsheet-1.pdf), [operator location](https://lebua.com/hotels/lebua-at-state-tower/) | Charoen Krung/Silom corner relationship; existing specialized model retained |
| Assumption Cathedral | [Parish](https://assumptioncathedralbkk.org/), [district office](https://webportal.bangkok.go.th/bangrak/page/sub/2941/%E0%B8%AD%E0%B8%B2%E0%B8%AA%E0%B8%99%E0%B8%A7%E0%B8%B4%E0%B8%AB%E0%B8%B2%E0%B8%A3%E0%B8%AD%E0%B8%B1%E0%B8%AA%E0%B8%AA%E0%B8%B1%E0%B8%A1%E0%B8%8A%E0%B8%B1%E0%B8%8D-Assumption-Cathedral) | Red brick, cream detailing, twin bell towers/rose window; original simplified model, school campus/interior deferred |
| Royal Orchid Sheraton | [Marriott operator](https://www.marriott.com/en-us/hotels/bkksi-royal-orchid-sheraton-riverside-hotel-bangkok/overview/), [operator shuttle address](https://www.marriott.com/marriottassets/marriott/BKKSI/PDF/Hotel_Shuttle_Boat_Service.pdf) | Captain Bush address, river frontage, segmented curved facade; compressed original model, not a full hotel parcel reconstruction |
| House No.1 | [Bangkok Design Week / CEA](https://www.bangkokdesignweek.com/en/bkkdw2024/content/94952), [2026 venue directory](https://www.bangkokdesignweek.com/en/bkkdw2026/guide/venues?nbh=280) | Creative-district identity; two-storey heritage interpretation and OSM placement context |
| Historic Customs House | [The Langham operator](https://www.langhamhotels.com/en/the-langham/bangkok/), [opening offer](https://www.langhamhotels.com/en/the-langham/bangkok/offers/room-offers/opening-offer/) | Historic shell only. Operator describes its adaptive reuse; contemporary hotel/new wing and operations are not modeled or certified here |
| Mandarin Oriental | [Hotel operator](https://www.mandarinoriental.com/en/bangkok/chao-phraya-river) | Existing grounds/model/arrival retained |
| River City | [Operator access](https://rivercitybangkok.com/plan-your-visit/) | Existing approach and Talat Noi context retained; not relabeled as a new public Si Phraya pier |
| Grand Postal / Warehouse30 | [TCDC](https://library.tcdc.or.th/visit/bkk_contact), [Warehouse30](https://www.warehouse30.com/timeline/siamese-revolution-of-1932/), PR42 packet | Existing bespoke civic/industrial models retained |

Reference photos were used for major silhouette vocabulary. No third-party photograph is presented as a game screenshot, and no photographic or cadastral fidelity certification is claimed.

## Transit

[BTS operator route/structure](https://www.bts.co.th/eng/library/system-structuer.html), [operator area maps](https://www.bts.co.th/eng/service/areamap.html?stationid=30). Retained order: Sala Daeng S2 → Chong Nonsi S3 → Saint Louis S4 → Surasak S5 → Saphan Taksin S6. Existing elevated platforms, entrances, trains and support geometry remain in use. This PR adds no invented MRT entrance, underground link or passenger service.
