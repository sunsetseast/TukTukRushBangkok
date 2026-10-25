# Bangkok's permanent geographic foundation

Open `/?world=geographic` on the existing Vite server or built app. The default URL still creates the legacy production game. The proof reuses the production `VehicleController`, `Controls`, tuk-tuk GLB, `ChaseCamera`, water shader, `waterGeometry.ts`, and baked surface triangulator. No missions, career progress, external map service, or backend is involved. Use arrows/WASD or the existing touch controls; B boosts. Source map shows coordinates, current road names and administrative boundaries. Reset returns to real Yaowarat.

## Permanent coordinates and data

WGS84 lon/lat and `osm:way/…`, `osm:node/…`, `osm:relation/…` preserve geographic identity. Geometry uses **EPSG:32647**, X east and Z south, with the immutable UTM origin **660000 E, 1520000 N**. One world unit is one meter. Terrain/road/water buffers use fixed 1024-meter chunks with local float coordinates. Extending the extraction never moves this origin or existing anchors. `projection.ts` implements forward/inverse conversion; independent PROJ anchors test it to better than 1 mm. `geography.ts`, `toWorld` and `cityModel` retain their explicitly compressed legacy meaning; no old saved position is reinterpreted.

The pinned [Geofabrik Thailand 2026-10-24 PBF](https://download.geofabrik.de/asia/thailand-261024.osm.pbf) has SHA-256 `e8373240cf0be47cc641f2c8627e674064d8c47f4ff2a11f6a33fcbfc9a50949`, replication timestamp `2026-10-24T20:20:51Z`, extracted October 25. The bounded snapshot covers **100.46–100.65 E, 13.63–13.80 N**: beyond Rama VIII, through Old Town/Chinatown/ICONSIAM/Bang Rak, beyond Asiatique and Rama III to and beyond Bhumibol. It also retains the Bang Kachao bend and connecting mapped canals. Country PBF is scratch input and is never committed.

Osmium assembles country-source multipolygons with complete relations **before clipping**. `natural=water + water=river/canal` and legacy `waterway=riverbank` are imported as actual polygons, including 15 union holes. Centerlines are reference data only. Independent features are unioned rather than XORed; polygon holes remain dry islands. Land is the polygon difference from water; non-bridge asphalt is clipped to land; OSM bridge-tagged decks cross water. Existing compressed-world baking/freshness gates remain active. A 1 mm precision grid prevents invalid rounding slivers; independent checks bound total rounding overlap to under 1 m² across the full extraction.

`source.v1.json.gz` is a compact, versioned bounded **derived OSM database**, with original WGS84 road vertices/node IDs/tags, water polygons, river/canal centerlines and administrative boundaries. `manifest.v1.json` records source/runtime hashes and counts. The runtime is a 4.8 MiB gzip asset loaded only by the explicit prototype route, with no geographic requests on default startup. Both server-advertised HTTP gzip and ordinary static hosting of raw gzip bytes are supported.

## Coverage and exploration

| Class | Implemented selection | Accuracy |
| --- | --- | --- |
| A | 6,904 source ways intersecting the explicit featured-coverage polygon: Yaowarat/Chinatown, Sampeng, Song Wat, Talat Noi and historic Bang Rak, plus connected context | All identifiable source streets/passages retained, without rescaling |
| B | 7,500 source primary/secondary/tertiary and link ways outside A, including Old Town, Siam, Silom, Sathorn, Sukhumvit and crossings | Source geometry and source-node topology retained |
| C | 78,162 other ways retained in the source snapshot and runtime ID/class index | Geographic reference for later activation, no generated roads yet |

14,335 A/B ways become initial runtime references/roads; 69 area, construction or proposed ways stay source references rather than being misrepresented as completed linear roads. 2,958 runtime ways have widths below 3 m. Area-tagged plazas remain source polygons/closed ways for a later ground-surface migration. The authored A coverage polygon is **not** an administrative boundary or a claim about informal neighborhood borders. Administrative OSM features stay separately identified by boundary/admin-level tags.

Every road vertex keeps its original node ID. No proximity welding creates false overpass intersections. Width is marked `tagged`, `osm-estimate`, or `class-estimate`; class estimates are not surveys. Separate player/pedestrian/traffic graphs retain narrow paths. Player graph is bidirectional even on real one-way roads and ignores vehicle-access prohibitions; traffic graph preserves OSM direction/access rules. The production player controller itself never restricts movement to these graph edges: open dry ground remains freely driveable. Existing physical vehicle radius remains 1.5 m. Future walking has a separate 0.6 m reference threshold. These are clearance hints, not certifications of a passage's unseen obstacles.

## Reproduce and verify

From repository root, in a Python 3.12 environment:

```sh
python -m pip install -r scripts/geography/requirements.txt
# Normal offline rebuild; no PBF/network required:
python scripts/geography/import_bangkok.py
python scripts/geography/check_data.py
# To recreate the bounded source snapshot, download the pinned source ONCE outside git:
curl -fL https://download.geofabrik.de/asia/thailand-261024.osm.pbf -o /tmp/thailand-261024.osm.pbf
python scripts/geography/import_bangkok.py --pbf /tmp/thailand-261024.osm.pbf
```

The fresh-import command rejects a different PBF hash; changing snapshots requires an explicit versioned import. Tool versions are pinned. An offline rebuild has been checked byte-for-byte against the committed runtime.

From `artifacts/tuk-tuk-rush/`:

```sh
pnpm test:real-geography
pnpm typecheck
PORT=24801 BASE_PATH=/ pnpm build
pnpm qa:real-geography
```

Browser QA uses Playwright Chromium; `CHROMIUM_PATH` can select an existing WebGL-enabled executable. Its default command exercises real keyboard and pointer inputs, debug map, and default startup, with one 90-frame software-rendering sample. It produces one driving capture and a temporary overhead capture. To regenerate the two comparison figures after browser QA, install matplotlib/Pillow and run `python scripts/geography/visual_evidence.py` from root. The overhead figure's right panel is the actual browser capture; the river figure compares source polygons against the runtime union. The full check/CI records are under `docs/qa/real-scale/`.

PR44 regression repairs recognize only exact retirement body keys from its approved ledger and explicitly add its four protected landmark IDs. Older frontage and landmark preservation assertions remain. No blanket district exclusion or reduced expected count is used.

## Known limits and next migration

This is bare-ground geographic proof, not a replacement production city. OSM completeness varies: unrecorded alleys/market links cannot be asserted to exist in this extract. Width/access tags and estimated dimensions need spot checks before detailed physical walls/curbs are placed. Compound boundaries, gates and obstructions are not yet authored. Tunnels and steps are preserved but not modeled as playable vertical surfaces. Bridge decks use the correct horizontal footprints and water crossing exemptions; surveyed heights, ramps, terrain elevation, grade-separated collision surfaces and under-bridge driving remain future migration work. No walking character, building interiors, architecture or traffic population is added to the proof. The legacy default game's traffic and collisions remain intact.

Prototype measurements use headless Chromium/ANGLE SwiftShader, not physical iPhone hardware. The single captured run records load/first-frame time, visible draw calls/triangles and frame cadence in `browser-checks.json`; it does not certify Safari FPS, thermals or mobile memory use. Dense overhead view is a diagnostic and renders much more geometry than driving. The next PR should transfer production destinations, routing and rendering into this **same verified frame and dataset**, with chunk activation and physical grade/clearance work. Do not introduce another city transform or replan the river.

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Source and derived geographic databases: [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). [Geofabrik source](https://download.geofabrik.de/asia/thailand.html); [OSM river-water polygon definition](https://wiki.openstreetmap.org/wiki/Tag:water=river). Attribution is also visible inside the proof.
