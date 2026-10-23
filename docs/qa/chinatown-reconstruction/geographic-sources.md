# Geographic and architectural sources

The retained data is a dated snapshot. OSM is community mapping, not surveying or a current traffic-law authority. The selected API response covered longitude100.499–100.519, latitude13.726–13.748. Derived road records retain ordered coordinates and relevant tags/way IDs; building/water GeoJSON omits contributor usernames. Source photographs were inspected as visual references and are not copied into the repository.

| Source | Use | Reuse treatment |
|---|---|---|
| [OSM roads/buildings](https://www.openstreetmap.org/api/0.6/map?bbox=100.499,13.726,100.519,13.748) | Selected road topology, ordered ways, names and one-way/access tags; building/water context. Source way IDs retained on every curated street. | ODbL1.0 / © OpenStreetMap contributors |
| [OSM riverbanks](https://www.openstreetmap.org/relation/14038959) | Retained PR36 reference-bank polygons; game river geometry unchanged. | ODbL1.0 / © OpenStreetMap contributors |
| [TAT Talat Noi](https://www.tourismthailand.org/Attraction/talat-noi) | Neighborhood heritage and riverfront character. | Copyright reference only; no images redistributed |
| [TAT Talat Noi walk](https://www.tourismthailand.org/Articles/1-day-in-talat-noi) | Workshop/adaptive-use context and Song Wat/Talat Noi relationship. | Copyright reference only |
| [Thai government walk](https://www.am2026thailand.go.th/explore-bangkok/talat-noi-song-wat-street-art) | Connected historic riverfront walking context. | Copyright reference only |
| [TAT Wat Mangkon](https://www.thailandtravel.or.jp/wat-mangkon-kamalawat/) | Chinese temple roof/courtyard visual reference and tall Sino-Thai entrance block. | Copyright reference only; original mesh interpretation |
| [TAT MRT context](https://www.tatnews.org/2024/06/exploring-bangkoks-old-city-and-yaowarat-is-super-easy-with-mrt-blue-line/) | Wat Mangkon/Charoen Krung identity and approach context. | Copyright reference only |
| [Museum Thailand Tang To Kang](https://www.museumthailand.com/th/museum/Tang-Toh-Kang-Gold-Shop-Museum) | Seven-story historic gold-shop building and Wanit1 address. | Copyright reference only; no photos/text copied |
| [Hua Seng Heng operator](https://www.huasengheng.com/contact/) | Verified business identity and Yaowarat/Plaeng Nam branch relevance. | Copyright reference only; no logo image extracted |
| [Scala Chinatown OSM](https://www.openstreetmap.org/node/3096836172) | Chinatown restaurant identity, distinct from Siam cinema. | ODbL1.0 |
| [Scala JTB listing](https://www.jtb.co.jp/kaigai_guide/asia/kingdom_of_thailand/BKK/124787/) | Search-indexed listing places restaurant at483–485Yaowarat/Chaloem Buri. Full page returns403; corroborates OSM identity, not a surveyed plot. | Copyright reference only; access limitation disclosed |
| [Holy Rosary parish](https://www.catholic.or.th/eng/chinese.html) | Parish identity and church reference. | Copyright reference only |
| [Bangkok Design Week heritage](https://www.bangkokdesignweek.com/en/bkkdw2023/program?venue=57320) | Official venue/heritage context for Holy Rosary precinct. | Copyright reference only |
| [River City operator](https://rivercitybangkok.com/plan-your-visit/) | Operator address23CharoenKrung24 and arrival context. | Copyright reference only |
| [Grand Postal architectural record](https://www.docomomothailand.org/pages/no6.html) | Reinforced concrete/masonry, T-shaped symmetrical mass and river/Charoen Krung trade setting; reviewed for scope, not modeled. | Copyright reference only |
| [TCDC operator](https://library.tcdc.or.th/visit/bkk_location) | Grand Postal address1160CharoenKrung, BangRak; confirms adjacent southern scope. | Copyright reference only |

Retained geometry is attributed to © OpenStreetMap contributors under [ODbL1.0](https://www.openstreetmap.org/copyright). Derived selections retain this attribution; no claim of exclusive ownership is made over the map database. Original game meshes and hand-authored compressed controls are distinguishable from source geometry. No restricted Google Maps/Street View imagery is bundled.

Reliable facts are source street identities, relative topology, dated directional/access tags, named sites and broad architectural motifs. Hand-fitted control points, road widths, parcel boundaries, roof heights, southern shear and simplified traffic operations are deliberate arcade approximations. No official Bangkok cadastral parcel dataset was available in the retained sources, so the blocks are street-defined game polygons rather than asserted legal plots.

The current/proposed comparison uses actual OSM reference riverbank polygons alongside unchanged PR36 game water. Raw source/proposal hashes are retained in [checksums.json](references/checksums.json); [source-inventory.json](references/source-inventory.json) records the use and reuse status of each source.
