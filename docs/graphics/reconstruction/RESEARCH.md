# Bangkok reconstruction: sources, accuracy and rights

Reviewed 2026-10-10. References informed the implementation before art construction.
No map service, external image, API key, account or backend is needed by the game.

## Roads: verified basis and deliberate adaptations

| Subject | Evidence | In-game result / limits |
|---|---|---|
| Yaowarat's curving alignment | [Yaowarat Road](https://en.wikipedia.org/wiki/Yaowarat_Road); OpenStreetMap geometry | Eastern Chinatown corridor follows simplified geographic control points, sampled into connected short edges; not the entire approximately 1.5km road. |
| Yaowarat northwest one-way direction | OSM ways [157319681](https://www.openstreetmap.org/way/157319681), [462532630](https://www.openstreetmap.org/way/462532630), [754824716](https://www.openstreetmap.org/way/754824716), [872380813](https://www.openstreetmap.org/way/872380813), [832948770](https://www.openstreetmap.org/way/832948770), geometry order and `oneway=yes` | AI travels northwest; the player may drive wrong-way as an arcade freedom, not a traffic-law simulator. |
| Charoen Krung opposite direction | OSM ways [157690711](https://www.openstreetmap.org/way/157690711), [911126529](https://www.openstreetmap.org/way/911126529), [463790325](https://www.openstreetmap.org/way/463790325), [157690693](https://www.openstreetmap.org/way/157690693), [832948764](https://www.openstreetmap.org/way/832948764) | AI one-way southeast. Left-of-centre lane placement, with a smoothed centre crossing through junctions. |
| Connecting streets | OSM Plaeng Nam [25707421](https://www.openstreetmap.org/way/25707421), Song Sawat [24715224](https://www.openstreetmap.org/way/24715224), Tri Mit [25745344](https://www.openstreetmap.org/way/25745344) | Connections are geographically inspired, straightened and widened, not literal surveyed traces. Mangkon is simplified too. |
| Odeon Circle / Chinatown Gate | [Odeon Circle](https://en.wikipedia.org/wiki/Odeon_Circle), [Bangkok tourism reference](https://bangkok-tourism.com/odeon-circle-chinatown-gate), adjoining OSM road endpoints | Red-column Chinese gate on a protected landscaped central island. A 20-edge clockwise loop is a deliberate arcade circulation reconstruction, not a claim about all current turn restrictions. |

OSM was retrieved through Overpass using a Chinatown bounding-box query for Thai
road names, on the review date. Geographic inputs are editable in
`artifacts/tuk-tuk-rush/src/game/mapData.ts`. The adapted graph is in `world.ts`.
Both are shipped for inspection; no hidden proprietary map image is used.

Projection: north is -Z; longitude scale 108120m/degree, latitude scale
111320m/degree, origin 13.7402N/100.5115E, uniform arcade compression **0.55**.
Control-point spans, connectors, road widths and landmarks are intentionally
compressed/expanded within an approximately 700m-square playable envelope.
The Odeon Wikipedia infobox coordinate was rejected as an outlier: it did not
agree with the adjoining road traces. The gate centre is an approximate
triangulated adaptation at 13.73712N/100.5129E, not a surveyed coordinate.

### In-game versus real location comparison

| Real context | In-game location | Explicit adaptation |
|---|---|---|
| Gate at Yaowarat's eastern end | `odeon:*`, centre about (83,189) | Larger playable loop, rectangle-rounded island and widened exits. |
| Yaowarat connecting to Charoen Krung via Chinatown streets | Named `yaowarat:*` / `charoen:*` control nodes | Road order/curvature retained; intersections widened and some intermediate geometry smoothed. |
| Wat Traimit near the eastern gate district | Temple (155,170), pickup approach (155,121) | Footprint enlarged and displaced to keep roads open. Original simplified temple art retained. |
| Hua Lamphong on the eastern district edge | Station (280,20), stop (260,-26) | Compresses distance and relocates frontage; approach bends around the station collider. Original station art retained. |
| Wanit/Sampheng market context | Fictional market pockets | **Not** represented as an accurate Soi Wanit trace. Fictional road labels are used instead. |

Dragon Alley, Lantern Cut, Spice Market, Market Loop and Station Service Road
are fictional arcade connections. Their names/layouts must not be described as
verified real roads. Local intersection signals/headway yielding are simplified.
The loop is currently a single usable traffic lane, not a realistic multi-lane roundabout.

## Storefront and sign reference inventory

| Label / reference | Verified fact | Artwork, location and clearance status |
|---|---|---|
| **ฮั่วเซ่งเฮง** / Hua Seng Heng | Official [branch page](https://www.huasengheng.com/en/branch/บริษัท-ห้างขายทองฮั่วเซ-4/) identifies the 418/420 Yaowarat branch. | One original red/gold sign composition on the closest curated gold-shop facade to the central Yaowarat reference node. Position and architecture are adapted, not an exact branch reconstruction. **Name verified; commercial clearance pending.** No copied logo. |
| **耀華力路** | Yaowarat Road's Chinese name, confirmed by the road reference. | One original location sign, not a made-up Chinese shop name. |
| **ก๋วยเตี๋ยว**, **ร้านทอง**, **ร้านขายยา**, **โรงแรม**, **เยาวราช** | Ordinary Thai labels: noodles, gold shop, pharmacy, hotel, Yaowarat. | Original generic trades, no assertion these are real named businesses. Correct trade labels match facade types. |
| Tang To Kang / **ห้างทองตั้งโต๊ะกัง**, Chinese **陳焯剛** | [Thai reference](https://th.wikipedia.org/wiki/ห้างทองตั้งโต๊ะกัง): historic seven-storey Sino-Portuguese building at 345 Soi Wanit 1/Mangkon, coordinate about 13.740599N/100.507230E. | **Researched but not modeled in this slice.** It is not falsely placed on the main Yaowarat boulevard or used as a repeated sign. |
| So Seng Heng photographic sign reference | [Photo/source](https://www.bigboytravel.com/wp-content/uploads/2018/02/bangkok-chinatown-walking-tour-map-Yaowarat-Road-So-Seng-Heng-Gold-Sho-sign.jpg): tall red/gold blade, framed Chinese cells, decorative crown. | Reference-only study of scale/frame construction. This is **not** Hua Seng Heng; its lettering/logo was not reassigned. Photo rights not cleared; not shipped. |
| Yaowarat evening street composition | [Street photograph](https://i0.wp.com/rubbisheatrubbishgrow.com/wp-content/uploads/2026/04/1-What-to-Do-in-Yaowarat-Chinatown-Bangkok.webp?resize=1024,681&ssl=1) | Reference-only sign density/street context. No photo pixels used in game textures; rights not cleared. |

Thai words stay intact on horizontal signs or whole-word rotated blades. They are
not split into invented stacked syllables. Chinese vertical cells only use the
verified four-character road name. Shapes, trims, bowls, crosses, awnings and
merchandise are procedurally authored; no royal crests or third-party logos.

## Asset rights

- Original model/PNG art from GitHub main is preserved, with its existing MIT notice
  in `public/assets/LICENSE.md`. New procedural facade/sign artwork is original.
- Runtime fonts are **local** Noto Sans Thai and Noto Serif SC subsets under
  SIL OFL 1.1, not MIT. License texts accompany the actual TTFs.
- Font sources: [Noto Sans Thai](https://github.com/google/fonts/tree/main/ofl/notosansthai)
  and [Noto Serif SC](https://github.com/google/fonts/tree/main/ofl/notoserifsc).
  Download recipe: Google Fonts CSS endpoint with families
  `Noto+Sans+Thai:wght@600` and `Noto+Serif+SC:wght@700` and `text=` set to
  the sign inventory's Thai/Chinese characters; download the returned font URLs.
  The resulting font binaries total 8652 bytes. They load before atlas drawing.
- Geographic coordinate data is © OpenStreetMap contributors under
  [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), separate from the art
  license. Title-screen attribution links to the OSM copyright page; editable
  inputs and adapted graph are distributed.
- Factual real-business names are **not** a license or endorsement. Obtain brand/
  trademark advice and necessary clearance before commercial publication; do not
  describe the research-only photos as licensed game assets.
