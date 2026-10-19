# Research references

Checked 18 October 2026. These sources guide original geometry, geographic relationships and infrastructure; they do not certify the game's fidelity.

| Source | Applied observation |
|---|---|
| [BTS structure and routes](https://www.bts.co.th/eng/library/system-structuer.html), [official route map](https://www.bts.co.th/eng/routemap.html?lang=en) | Sukhumvit follows Sukhumvit/Phloen Chit/Rama I/Phaya Thai/Phahonyothin; Silom follows Rama I/Ratchadamri/Silom/Sathorn and crosses the river at Taksin. Siam interchange and station order. Official dimensions are references; game scale is compressed. |
| [BTS company history](https://btsapp1.bts.co.th/website/eng/info/info-history.html) | Saint Louis is a real station between Chong Nonsi and Surasak, not an omitted stop. |
| [BEM Blue Line map](https://metro.bemplc.co.th/Line-Maps?Line=1&lang=en), [Sukhumvit station](https://metro.bemplc.co.th/Line-Maps?Line=1&Station=22&lang=en) | BL13 Chatuchak Park, BL22 Sukhumvit, BL26 Si Lom and BL28 Hua Lamphong remain underground; surface entrances and interchange signage only. |
| [EM District contact/map](https://emdistrict.com/contact-us/), [district description](https://emdistrict.com/whats-em-district/), [EmSphere operator](https://emsphere.co.th/en/about-us/) | Three separate malls around Phrom Phong and Benchasiri; operator addresses and linked nominal map pins. EmSphere's bronze arena/retail form and EmQuartier's separated terraced volumes are original miniature interpretations. |
| [BMA Benchasiri](https://greener.bangkok.go.th/park/utthayan-benjasiri/), [TAT Benchasiri](https://www.tourismthailand.org/Attraction/benchasiri-park) | Park between Sois 22/24; sculpture garden and commemorative coin, pond and pedestrian paths. Complete sculpture collection and playing fields are omitted. |
| [BMA Chatuchak](https://greener.bangkok.go.th/park/suan-chatuchak/) | Large shaded park and lake setting near Mo Chit; do not confuse the park with the Weekend Market or the entire northern park cluster. |
| [BMA public parks](https://greener.bangkok.go.th/en/park/), [Thai government park guide](https://thailand.go.th/public/issue-focus-detail/002_007) | Mature shady public gardens and ornamental planting; flowering trees and palms vary by context rather than blanket palm coverage. |
| [Benjakitti designers](https://www.turenscape.com/en/project/detail/4751.html), [BMA Benjakitti](https://greener.bangkok.go.th/en/park/benjakitti-park/) | Existing trees, forest/wetlands, eastern lake and reused factory structures. Retain prior water/island topology and naturalistic landscape rather than converting it to a formal palm boulevard. |
| [Terminal 21 operator](https://www.terminal21.co.th/asok/contactus/th) | Retain northwest-of-Asok parcel and road-facing exterior arrival. |
| [OpenStreetMap licensing](https://www.openstreetmap.org/copyright) | Retained OSM-derived park reference data is credited in the map and source files, with ODbL link. No new bulk OSM database, tiles, satellite photographs or street-view imagery are shipped. |
| [Clipper upstream documentation](https://github.com/junmer/clipper-lib/blob/master/Documentation.md) | Offline integer scaling and PolyTree hole hierarchy avoid degenerate floating-point road unions. `clipper-lib` is a development dependency only and is not imported into the game bundle. |

New nominal coordinates in `geography.ts` are taken from the operators' or BMA's explicitly linked map pins. The linked map pages themselves could not be loaded by the research reader, but their redirects exposed the place coordinates. They are approximate map/site centers, never surveyed entrances or imported map geometry. This limitation is retained rather than calling the coordinates cadastral data.

PR26–28 reference documents remain applicable to unchanged temple, hotel and commercial assets. Original leaf meshes and stylized tree models are not botanical surveys. Golden shower bloom is an illustrative seasonal variation, not a live seasonal simulation.
