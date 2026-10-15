# Open Bangkok: visitor grounds and living elevated transit

Built from current main `040bdde` (merged PR #14). This is one draft change; no merge or deployment is requested.

## What the player can do

Turn off public roads into ten connected destinations. Wat Pho, Wat Arun, Wat Paknam, ICONSIAM, Siam Paragon, CentralWorld and Terminal 21 have visitor circulation loops; the Grand Palace has a perimeter drop-off; Asiatique and Wat Traimit have smaller two-way pull-in forecourts. Gates, walls, gardens, halls, canopy columns, statues and pedestrian barriers remain physical obstacles. Sacred courts, retail floors and the river promenade are not vehicle routes.

The arrival roads are real road-graph edges. They feed the asphalt/sidewalk polygon bake, recovery, route guidance, missions and world map. `noTraffic` keeps normal city AI out of visitor-only roads. Arrival zones replace vague passing-near discovery for these properties without changing saved landmark IDs. Stopping turns the normal gameplay camera toward the landmark; accelerating returns to the driving view. Wat Pho retains the paused indoor Reclining Buddha view; the Palace gains a paused exterior roofline view.

The dedicated rail graph is completely separate from vehicle routing. Three lines contain 25 line/station records and 24 distinct station structures. Six deterministic trains (20 cars) serve all represented stops. Standard four-car BTS sets and smaller two-car Gold APMs have different bodies, cab arrangements and guideways. They accelerate, dwell for seven seconds, reverse through run-outs, and freeze with the simulation clock during pause, blur or inspection.

## Audit of PR #14 main

Confirmed: whole-plot landmark obstacles prevented meaningful property entry; landmark access nodes and fares were predominantly roadside; Siam's isolated elevated slabs lacked rail continuity, station data and service. The existing repaired road polygon system, left-hand AI, 24-minute shift, four-minute night transition, boost, discovery IDs, authored landmarks and Chinatown mode were working foundations and are preserved.

Improved systems: split compound collision footprints; shared access data; fitting and infill reservations; a bridge over the Wat Paknam canal approach; a connected Krung Thon Buri/Wongwian Yai road continuation; rail envelope clearance and shared batches. Existing provisional Siam slabs are removed. Sightline reservations prevent infill from hiding new arrivals. Open platform handrails replace opaque station parapets that hid moving trains from road views.

## Geographic and architectural scope

| Line | Represented station order | Boundary treatment |
| --- | --- | --- |
| Sukhumvit | Mo Chit N8, Saphan Khwai N7, Ari N5, Sanam Pao N4, Victory Monument N3, Phaya Thai N2, Ratchathewi N1, Siam CEN, Chit Lom E1, Phloen Chit E2, Nana E3, Asok E4 | Map labels show continuation toward Khu Khot and Kheha; no invented N6 or misplaced Phrom Phong |
| Silom | National Stadium W1, Siam CEN, Ratchadamri S1, Sala Daeng S2, Chong Nonsi S3, Saint Louis S4, Surasak S5, Saphan Taksin S6, Krung Thon Buri S7, Wongwian Yai S8 | Correct Taksin river corridor; continuation toward Bang Wa |
| Gold | Krung Thon Buri G1, Charoen Nakhon G2, Khlong San G3 | Separate APM guideway, G1 transfer to S7, G2 pedestrian link toward ICONSIAM |

Siam has two island-platform levels, each carrying both lines in the same travel direction, with four distinct tracks and smooth grade transitions. Chong Nonsi has the white arch/cable skywalk context beside Mahanakhon. Saphan Taksin uses a narrow single-track throat and river/ferry approach. Asok includes Terminal 21 linkage and separately labelled MRT Sukhumvit cues; Sala Daeng has MRT Si Lom cues. National Stadium has its terminal/MBK skywalk treatment. Gold stations are smaller, with yellow roof/wayfinding treatment. Grounded stairs connect to concourses; repetitive piers and architecture use shared spatial batches. Supports have ground colliders; overhead decks do not become invisible ground walls.

These are original stylized models, not measured replicas. Station spacing, roof dimensions and forecourt circulation are compressed to the existing world. Standard decks are about 13 game metres high, Gold about 12, with an upper Siam deck around 19. Real beyond-map routes are labelled, but the simulated central service uses compact run-out turnbacks at the modeled boundaries. This is not the entire metropolitan BTS system or an operational signalling simulator.

### Access authenticity

| Site | Basis and deliberate adaptation |
| --- | --- |
| Wat Pho | Chetuphon-associated visitor/service arrival concept fitted to the existing Maha Rat-side compact road layout. Exact real parking dimensions were not verified. Outer loop is an arcade adaptation; sacred courts stay closed. |
| Wat Arun | Wang Doem-side approach, gate, outer drop-off, galleries and gardens; central prang precinct remains pedestrian. The compact loop is authored rather than a public-access claim. |
| Wat Paknam | Canal-side approach in Phasi Charoen, separate white pagoda, low-rise neighborhood and dramatic front-facing Buddha sightline. Visitor parking circulation is compressed. |
| Grand Palace | Na Phra Lan perimeter arrival outside a closed ceremonial enclosure; optional exterior inspection, never interior tuk-tuk driving. |
| ICONSIAM | Charoen Nakhon vehicle access and covered taxi/drop-off concept; Gold G2 and elevated pedestrian connection. Retail floors and river promenade remain solid/restricted. |
| Other malls / Asiatique / Traimit | Distinct mall canopies, warehouse approach or small temple pull-in. Useful connected arrival spaces rather than surveyed driveway replicas. |

### Primary references

Research used official route, design and rolling-stock information, map/station photographs, property visitor information and existing PR #14 geographic research. No reference photographs, watermarks or downloaded operator logo artwork are shipped. Thai/English signs use a shared locally rendered atlas and the game's Thai font.

- [BTS route structure, Taksin crossing and viaduct design](https://www.bts.co.th/eng/library/system-structuer.html)
- [BTS platform design and Siam's two directional island levels](https://www.bts.co.th/eng/library/system-design.html)
- [Official route map](https://www.bts.co.th/eng/routemap-mb/)
- [Standard BTS rolling-stock design](https://www.bts.co.th/eng/library/system-smodel.html)
- [Gold Line: three stops, rubber-tyred two-car APM](https://www.bts.co.th/eng/info/GoldLine-info-history.html)
- [ICONSIAM HALL: Gold interchange, Charoen Nakhon and car access](https://www.iconsiamhall.com/en/plan-your-visit)
- [Grand Palace practical visitor information](https://www.royalgrandpalace.th/en/visit/practical-information)
- [TAT Wat Arun approach reference](https://www.tattpe.org.tw/News/Info.html?id=211)
- [Mahanakhon / Chong Nonsi context](https://www.kingpowermahanakhon.co.th/location)

Wat Pho official travel pages were unavailable during research. The Palace's large plan PDF could not be fully retrieved through the research tool. Neither limitation is presented as verified exact access geometry.

## Validation and evidence

`validation/` contains the reproducible command outputs. `evidence/qa.json` records browser journeys, rail movement, touch ownership, viewports and resource lifecycle. Screenshots use the production chase/arrival/inspection cameras; UI is hidden only for readable art evidence. No video was recorded.

- `art:roads` (executed directly as `node --import tsx scripts/generate-road-surfaces.ts` in the restored workspace): refreshed rendered-road data; automated key assertion detects stale graph/bake pairs.
- `test:open-bangkok`: ten real public-road entry/arrival/exit controller journeys, zero collision frames, boosted input included; connected directed roads, every represented station served over 36,000 train frames, continuous track attachment, opposing service and 1,708 actual car-body clearance comparisons, cross-line grade clearance, support placement, pause/restart determinism.
- `test:definitive`: 7,479 actual moving left-lane samples across all districts; 1,504 transitions; clockwise roundabout behavior; zero sidewalk/asphalt overlap; 5s boost + 10s recharge, 1.4 acceleration and 37m/s cap; braking and thin-wall collision safety. Visitor-only roads are deliberately excluded from injected NPC traffic tests.
- Existing fare controller test: all 11 fares, 21,990 metres, zero collisions or teleports. AI traffic is disabled for repeatability and certified separately.
- Existing gameplay, original Chinatown delivery, map, architecture, environment disposal, street life, roadside, signature, sign layers, assets, TypeScript and production build checks.
- Browser: five primary property journeys with real engine/controller inputs from one initial public-road setup pose, then no position edits; simulation is accelerated in batches between rendered frames. Real CDP multi-touch checks steering + gas + boost, brake and pointer cancellation. Portrait safety, map rail toggle, blur pause, inspection pause and restart resource stability are covered.
- Viewports: 844×390, 932×430, 1280×800, 375×812 and 430×932. Seven flagship station chase views; moving service at night.

Matched public-road before/after views and resource measurements are in [performance/summary.md](performance/summary.md). Arrival views: [Wat Pho](evidence/pho-arrival.jpg), [Wat Arun](evidence/arun-arrival.jpg), [Wat Paknam](evidence/paknam-arrival.jpg), [ICONSIAM](evidence/icon-arrival.jpg), [Siam Paragon](evidence/paragon-arrival.jpg), [Reclining Buddha inspection](evidence/pho-inspection.jpg). Station images use `station-*.jpg` in the same folder.

## Review recommendation and limitations

Ready for draft code/art review. Hold merge for a physical landscape iPhone Safari pass and acceptance of the compressed geography/access adaptations. Desktop SwiftShader establishes relative scene costs and browser correctness; it does not establish native mobile FPS, thermal behavior or Safari GPU memory. No deployment has been performed.

Secondary stations deliberately share modular shells; there is no passenger boarding simulation, walkable mall interior, unrestricted sacred-ground driving or full metropolitan service. The existing landmark art is expanded with visitor context, not replaced with survey-quality architectural replicas. The central network's model-boundary turnbacks are a documented arcade compromise. These are remaining fidelity limits, not hidden placeholders.
