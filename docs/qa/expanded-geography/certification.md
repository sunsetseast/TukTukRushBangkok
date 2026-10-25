# PR46 geographic foundation certification

Base: `340d5382e4616ad3f14852c0259ce10a866274ad` (merged PR45). Draft only; no merge or deployment.

## Implemented

- Existing geographic route expanded to 100.46–100.65 E / 13.63–13.825 N; immutable UTM origin and real distances preserved. All 53 canonical legacy features have explicit coverage checks, alongside existing location anchors.
- **104,949 eligible source highway ways**, from 105,061 references, including **17,602 narrow ways**. Construction/proposed/abandoned features stay references. No A/B/C rendering exclusion remains. Source omissions are not claimed complete real-world coverage.
- **1,994 regional rail ways; 1,153 intersect the playable area**, 43 route relations, source station/entrance/platform/stop-area geometry and metadata. BTS, Gold, MRT, ARL, SRT Red and conventional corridors retain source alignments and operating states. Pink and its operational Muang Thong branch are outside connections, not playable claims. All **21 required station identities/positions/physical levels pass**; Saphan Taksin has its separate source-aligned elevated rail river crossing.
- **471 separate visual chunks**, request/activation budgets, eviction and GPU geometry disposal. Navigation, water collisions and vehicle state are independent of visual residency. Coarse city overview and source canvas map avoid full-world mesh initialization.
- Ground/elevated source surfaces are distinct. Existing vehicle controller, controls, camera, art, water shader and surface triangulation are reused. Source-topology ramps and rail heights are labeled estimates. Covered building passages do not bury above-ground terminal rail.
- Fixed canonical polygon order and gzip headers; source hash successor explicitly approves PR45's water-polygon union helper. Legacy behavior assertions remain active.

## Completed validation

| Check | Result |
| --- | --- |
| TypeScript and production build | Pass; existing bundle-size advisory remains |
| Offline source eligibility and source vertex/ID/tag preservation | Pass; projection rounding max 0.000707 m |
| Independent land/water/road borders | 2,694 seam comparisons pass |
| Source versus rendered operational rail coverage | Pass; aggregate clipped length error 0.0023 m |
| Required stations, outside Pink branch and Saphan Taksin | Pass |
| Ground/overpass graph and surface isolation | Pass |
| Streaming requests, eviction, stale-result cleanup | Pass |
| Production controller across real chunk seams | Three crossings pass; speed retained |
| Distant named public approaches | Source-node connectivity checks, including Chatuchak, Sukhumvit, Wat Paknam and Asiatique |
| Road graph components | 667; largest 340,884 nodes; no fabricated connections |
| Waterfront clearance | Pass: 5,937 maneuver sweeps; preserved water, terrain, frontage and collider assertions |
| Chinatown completion and historic fidelity | Pass |
| Browser keyboard driving, northern activation/southern eviction, mobile map | Pass; no page errors |
| Default production game | 2,405 roads, 38 traffic vehicles, zero geographic asset requests |
| Canonical asset round trip | 473 source/runtime/chunk gzip assets byte-identical |

Full offline **geometric rebuild and byte comparison** is enforced by the PR's GitHub Actions workflow. Local canonical round-trip verification is a separate check, not a substitute for a green CI rebuild. See actual workflow status on the PR.

## Performance sample and limits

Headless Chromium 153 / ANGLE SwiftShader, Linux container, 1280×800. This is **software WebGL**, not iPhone/Safari performance.

- First 9 resident chunks: **4.94 s** from navigation; source/assets/session loading **2.79 s**.
- Driving sample: **45 draw calls / 57,174 triangles**; 60 frame sample median **99.9 ms**, p95 **116.6 ms**.
- Initial requests: **9 / 471 chunks**. Northern relocation evicted the initial region. The next inspected region again retained 9 chunks, rather than accumulating the city. Overhead made no full-world chunk requests.
- Persistent geographic gzip: **8.99 MiB**. All optional chunk assets: **10.27 MiB**. Global references contain 412,233 nodes and still incur substantial decoded JS memory; streaming meshes does not eliminate that cost.

**Incomplete / not certified:** physical iPhone/Safari FPS, memory pressure and thermals; surveyed elevations, DEM, exact ramp slopes and engineering clearances; fully driveable underground roads and stair physics; every unmapped market passage, gate and compound obstruction. Conservative support candidates are omitted where roads/junctions/water prevent a safe placement. Temporary station structures use estimated dimensions; original platform source geometry remains a permanent reference. No building reconstruction, animated trains, station interiors, passenger travel or on-foot gameplay was added.

## Three evidence images

1. [Full-city WebGL network](city-network.png): roads, waterways, line-colored rail, station markers and administrative references.
2. [Yaowarat / Talat Noi / Bang Rak source close-up](dense-streets.png): exact mapped street/path and rail geometry; this panel is a 2D verification view, not an architecture render.
3. [Streamed WebGL driving under elevated rail](streamed-driving.png): genuine browser rendering, source corridor and driving clearance.

Reproduction commands, attribution, source provenance and implementation limits: [geographic README](../../../data/bangkok/real-scale/README.md).
