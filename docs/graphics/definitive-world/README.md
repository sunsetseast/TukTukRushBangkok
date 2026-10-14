# Bangkok world transformation

Starts from merged PR #13 / main `69e1b06`. One draft PR; no merge or deployment.

## What was actually wrong

| Finding | Evidence and repair |
| --- | --- |
| Cars occupied the right carriageway | With +Z forward and +Y up, left is (+dz, −dx). Both spawn and movement used the opposite normal. The old test used the same mistaken sign. Moving-position certification now tests both directions of every two-way segment. |
| Cars converged at junction centers | Replace center easing with directed lane endpoints and sampled, distance-parameterized cubic turns. Signals and roundabout entry yields remain; Odeon is detected by incident road metadata rather than a node-name prefix absent in compact Bangkok. |
| Sidewalk wedges and dark asphalt pieces | Road beds, asphalt rectangles, junction discs and independent sidewalk strips overlapped at several elevations/materials. The replacement unions road envelopes and subtracts asphalt from sidewalk envelopes. Three consistent upward-facing surfaces replace the overlapping assembly. |
| Approach paving crossed asphalt | Civic paths started at the road node. They now start 18m beyond the node, with clear approach corridors and curb boundaries. |
| Rejected parcels left exposed ground | Deterministic smaller frontage parcels, rear buildings and shoreline housing now use the same road, water, obstacle and approach clearance checks. |
| Night arrived late | Full night now arrives at 240 simulated seconds; the shift remains 1,440 seconds. |
| The map's shortest paths ignored one-way restrictions | Both shared routing and route attachment now respect directed edges. Existing discovery IDs/storage remain compatible. |

Preserved: original Chinatown mode, compact geography and existing corridors, original asset/font licenses, missions, discovery, vehicle contact solver, river routes and successful flagship artwork. Added Khao San and west-bank canal approaches rather than replacing the city.

## Implementation

- Unified road polygons retain the Odeon island hole. Millimetre snapping and Float32-safe triangulation avoid sliver/winding problems. Generated surfaces have a topology key and a recomputation fallback; regenerate with `pnpm --filter @workspace/tuk-tuk-rush art:roads` after road edits.
- Smaller frontage alternatives and restrained rear massing complete previously rejected lots. Rear buildings use inexpensive shells; modern rear rows have sparse illuminated bands. Existing protected parks, roads, water and landmark approaches are excluded.
- Two shared lettering atlases contain 50 entries. Larger mounted Yaowarat cabinets, gold-shop treatments and projecting signs coexist with the Scala-inspired facade. Hua Seng Heng, Nai Ek, Thong Bai and So Seng Heng are original arcade adaptations in a curated sequence, **not surveyed branch replicas**.
- Khao San has its own connected approach, hotel/bar/market sign palette, clothing racks, awnings, guesthouse courtyard and district-balanced pedestrian staging. Crowds remain bounded to the existing nearby renderer capacity.
- Six food families now include wok and dessert setups, with cookware, produce, condiments, warm cabinet lights, vendor motions and bounded nearby steam.
- Waterfront embankments, lanterns, pier steps, mooring equipment, shore houses and canal walkways accompany five main-river boat silhouettes and two canal longtails. Water shading uses actual instance/world coordinates and inexpensive moving light streaks; no full-scene reflections or new grid of point lights.
- Mahanakhon has missing pixel volumes; Baiyoke II has tiered setbacks, observation crown and antenna; State Tower has balcony rhythm and a gold dome. Each has a cheaper distant silhouette.
- Wat Pho contains an original reclining figure inside a columned, tiered-roof hall. Stop near its road access to open the view; return restores driving. Shift, fare and boost timers are frozen throughout inspection.
- Wat Paknam is west of the main river, along a smaller connected canal branch. The seated Buddha faces the approach; its white pagoda, temple buildings and cleared sightline rise above local housing. A fare and discovery destination use the same connected graph, map and collision data.
- BOOST: 5s active, 10s recharge after it ends, 1.4× throttle acceleration, 37m/s cap versus 31m/s normally. The 19% cap increase uses the existing steering curve and ≤1/90s collision substeps. Brake wins over throttle. Timers advance only while playing; repeated inputs cannot reset cooldown. Keyboard B/Shift and the landscape touch button activate it.

## Evidence

[Matched street repair](evidence/matched-street-repair.jpg) shows identical survey poses before/after at sunset and night. Surveys use the regular chase camera or the stated normal-height comparison camera, with setup repositioning; they are not claims of uninterrupted drives.

| Player-visible feature | Capture |
| --- | --- |
| Yaowarat sunset / early night | [Sunset](evidence/yaowarat.jpg) · [Night](evidence/yaowarat-night.jpg) |
| Khao San identity | [Night street](evidence/khaosan.jpg) |
| Riverfront / ICONSIAM / Wat Arun | [River](evidence/riverfront.jpg) · [ICONSIAM](evidence/icon.jpg) · [Wat Arun](evidence/arun.jpg) |
| Buddha destinations | [Wat Pho roadside](evidence/pho-road.jpg) · [Reclining Buddha hall](evidence/reclining-buddha.jpg) · [Wat Paknam approach](evidence/paknam.jpg) |
| Tower silhouettes | [Mahanakhon](evidence/sathorn.jpg) · [Baiyoke II](evidence/baiyoke.jpg) · [State Tower](evidence/state.jpg) |
| Other neighborhoods | [Talat Noi](evidence/talatnoi.jpg) · [Siam](evidence/siam.jpg) · [Residential](evidence/residential.jpg) · [Gate](evidence/gate.jpg) |

[Browser results](evidence/qa.json) distinguish repositioned surveys from keyboard/pointer-driven stretches. The [short boost sequence](evidence/boost-demo.gif) ([setup/times](evidence/boost-demo.json)) and [traffic sequence](evidence/traffic-demo.gif) ([setup/times](evidence/traffic-demo.json)) are sampled browser frames with their setup/time data linked alongside them. No large video archive is committed.

## Verification

- TypeScript, production build, gameplay, original Chinatown driven fare, street-life, roadside, signature, sign-layer and asset suites.
- 7,365 actual moving lane samples across the 12 designed districts and connector areas; 1,508 edge transitions; 3,633 clockwise circulating frames; maximum sampled movement 0.184m per 1/60s step.
- Road/sidewalk polygon intersection is empty; triangles face upward. Downward rays against the actual rendered mesh confirm asphalt is the top surface at 2,560 road samples. Road clearance, water/bridge physics, directed connectivity and thin-wall boosted collision checks pass.
- All **11** fares driven through the controller for **20.5 km**, without teleports or collision frames. Traffic is disabled for this deterministic whole-tour test and certified separately.
- Discovery persistence, map markup, all landmark road accesses, 800 indexed/full-scan collision comparisons, pedestrian clearance and exact-once geometry/material/texture disposal.
- Browser matrix: 844×390, 932×430, 1280×800, 375×812 and 430×932. Landscape controls, map and portrait rotation guidance checked. Multi-touch covers steer+gas+boost, brake during boost and touch cancellation; pause/focus and inspection timer suspension checked.
- Real browser-input stretches in Yaowarat, Khao San, Wat Paknam and the riverfront use the normal chase camera, with no transform edits during a drive.

The paired four-view browser profile (Chinatown and ICONSIAM, Fast/Pretty, 40 warm samples each) measured:

| Cost | PR #13 | This PR |
| --- | ---: | ---: |
| Fast median draw calls | 159.5 | 165.5 |
| Pretty median draw calls | 243.5 | 242.5 |
| Fast median submitted triangles | 188,238 | 249,548 |
| Pretty median submitted triangles | 270,339 | 333,662 |
| Resident scene buffers | 104.6 MiB | 127.2 MiB |
| Resident material objects | 1,733 | 1,257 |
| Browser first scene, this host | 7.6s | 10.1s |

The additional density raises geometry and memory costs. Fewer materials, generated road unions, bounded animation and tower LOD limit the increase; they do not erase it. Raw frame timings vary sharply by view and software renderer and are retained in the data without a native FPS inference.

See [validation logs](validation/) and [performance data](performance/). Chromium software rendering is useful for lifecycle and scene-cost checks; **it is not physical iPhone Safari FPS, memory-pressure or thermal certification**.

## Landmark quality inventory

| Landmark | Result / boundary |
| --- | --- |
| Wat Pho | New indoor reclining figure, hall, columns, royal chedis and paused viewing interaction. Stylized sculpture, not a museum-quality replica. |
| Wat Paknam | New seated figure, white pagoda, canal neighborhood, rotated approach composition, road stop and discovery/fare integration. Geography is deliberately compressed. |
| Mahanakhon / Baiyoke II / State Tower | New signature silhouettes and distant LOD. Street-level visibility depends on viewing distance, as shown in road-based surveys. |
| Grand Palace / Wat Traimit | New multi-hall/chedi compound and raised marble/roof composition respectively. Architectural interpretation rather than exact measured elevations. |
| Democracy / Victory / Hua Lamphong | Authored wings, obelisk/figures and arched station front replace interchangeable blockouts. |
| Wat Arun / Chinatown Gate / Golden Mount / Giant Swing | Successful PR #13 forms retained; streets, approaches and night context improved. |
| ICONSIAM / Siam Paragon / Asiatique | Existing authored art retained; urban/waterfront surroundings improved. |
| CentralWorld / MBK / Terminal 21 / markets / civic open spaces | Still less detailed than flagship destinations. Exact storefront sequences and all rear elevations remain approximate. |
| Rama VIII Bridge | Not represented by the existing playable graph; none of the existing bridges is mislabeled as Rama VIII. |

## Reference and asset provenance

No reference photographs, watermarks or commercial logo bitmaps are shipped. Geometry, sign layouts, road polygons, steam and water patterns are original. Bundled fonts retain their existing license notices.

- [Wat Pho official sculpture description](https://www.watpho.org/en/buddha/detail/204) and [official gallery](https://www.watpho.org/en/album): reclining posture, monumental length, head/feet and indoor hall.
- [Princess Maha Chakri Sirindhorn Anthropology Centre art reference](https://seaarts.sac.or.th/artwork/340?lang=en): reclining figure and viharn context.
- [Chulalongkorn University, Arc of Memory](https://www.arcofmemory.arts.chula.ac.th/yaowarat-architectural-melting-pot/): Sino-Thai architectural context and Wat Traimit's raised marble structure.
- [Hua Seng Heng contact/location reference](https://www.huasengheng.com/en/contact/), with the repository's existing researched [signature sequence](../../../artifacts/tuk-tuk-rush/src/game/signatureCorridor.ts), informs business names and original facade treatments.
- [Wat Paknam context](https://www.thailandee.com/en/visit-thailand/wat-paknam-phasi-charoen-bangkok-531) and actual reference photographs: canal location, seated figure and adjacent white pagoda.
- [Council on Vertical Urbanism, Baiyoke II](https://www.skyscrapercenter.com/bangkok/baiyoke-tower-ii/487), [Mahanakhon architect](https://buro-os.com/projects/mahanakhon), and [Lebua](https://lebua.com/state-tower/) inform tiering, missing-volume facade and rooftop dome.
- The user's Yaowarat and day/night Khao San images informed composition and sign density only.

## Review recommendation and remaining work

Ready for code/art review as a draft. **Hold merge for a physical landscape iPhone Safari test** of loading, sustained driving, heat, memory pressure, multi-touch and the two landmark views. The visual additions increase resident scene data and submitted geometry despite fewer geometry objects, generated road surfaces, shared atlases and tower LOD; do not interpret desktop frame timing as a phone performance guarantee.

This is a substantial repair and environment implementation, not a claim that every square metre of Bangkok has been recreated. Remaining limitations are simplified secondary landmarks/civic settings, some plain rear/side elevations, bounded rather than dense simulated crowds, approximate historic business placement, and arcade traffic signals/yielding rather than a full traffic-law simulator. Gamepad support remains outside the existing input system. Optional future art polish should be driven by actual route screenshots, not another blanket increase in object counts.
