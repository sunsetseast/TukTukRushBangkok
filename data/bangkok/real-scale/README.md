# Bangkok's permanent geographic foundation

Open `/?world=geographic`. This expands the PR45 prototype in its existing coordinate frame; the default production game remains at `/`. No backend, online map API, buildings, passenger gameplay or on-foot controller is added.

## Geographic source and coordinates

The immutable origin remains **660000 E, 1520000 N, EPSG:32647**, X east/Z south, **one unit per meter**. Original WGS84 vertices, OSM node/way/relation identities and tags remain in `source.v1.json.gz`. Existing projection fixtures remain valid. The extraction is **100.46–100.65 E, 13.63–13.825 N**, combining the previous river extent with the legacy game's geographic references and buffered northern park/terminal locations. `coverage-targets.v1.json` explicitly audits all 53 canonical legacy features; coordinates labeled approximate are boundary checks, not surveyed building footprints.

The same pinned [Geofabrik Thailand 2026-10-24 snapshot](https://download.geofabrik.de/asia/thailand-261024.osm.pbf) is reused, SHA-256 `e8373240cf0be47cc641f2c8627e674064d8c47f4ff2a11f6a33fcbfc9a50949`. The country PBF is not committed. Relation-complete water assembly precedes clipping. The extended Chao Phraya, canals and polygon holes remain source-backed.

Every eligible existing highway way is retained across this extent, including minor sois, service roads, market passages, narrow footways, steps and area-tagged pedestrian spaces. A/B/C labels remain provenance annotations only; **they no longer filter geometry**. Construction/proposed/abandoned ways remain references, not completed roads. Widths retain their tagged/estimated basis. A source cannot certify unmapped passages or unseen gates, walls and obstructions.

Player graph directions ignore one-way/access restrictions; traffic graph directions retain them. Distinct source nodes are never welded by X/Z proximity. Height-aware graph identities keep incompatible deck levels separate. Walking references retain narrow paths; no walking gameplay is implemented. Open dry land remains freely explorable without an invented road-only restriction.

## Rail geography

Source railway ways, route relation member order/roles, station nodes, entrances, platforms and stop areas are retained. Tracks follow actual source vertices, never straight station-to-station connections or road centerlines. The regional rail reference extraction reaches outside the playable boundary, **100.25–100.95 E, 13.5–14.1 N**. Only intersecting segments are rendered inside the playable extent; outside stations/connections remain expandable references.

The catalog covers BTS Sukhumvit/Silom, Gold, MRT Blue/Purple/Yellow/Pink, Airport Rail Link, SRT Dark/Light Red and conventional railway corridors. The Pink Line and Muang Thong branch lie outside this playable boundary and are references, not claimed playable geometry. Operational, construction, proposed and disused status remain distinct. Source stop areas preserve interchange relationships; route memberships supply station line identity.

Physical level comes from tunnel/location/bridge/layer tags. `station=subway` describes a transport mode and does **not** classify BTS stations as underground. `tunnel=building_passage` describes a covered passage and does **not** bury the elevated terminal tracks at Krung Thep Aphiwat. Stations choose their own system's nearby source track rather than an unrelated underground interchange line.

The basic renderer uses batched guideways, source-oriented temporary station pads/canopies, and conservative support candidates outside road/junction envelopes and water. Underground tracks remain geographic/debug references; they are not drawn as surface rail. Heights are explicit **visual estimates**, retaining relative source layer ordering, not surveyed engineering clearances. Temporary station dimensions are placeholders, not measured platform outlines. Exact source platform geometry remains available for subsequent station work. Rail and road crossings use independent source geometry, including Saphan Taksin.

Cross-check sources: [BTS structure](https://www.bts.co.th/eng/library/system-structuer.html), [BTS map](https://www.bts.co.th/eng/routemap-mb/), [MRTA](https://www.mrta.co.th/en/bangkok-and-vicinities), [BEM Blue/Purple](https://metro.bemplc.co.th/MRT-System-Map?lang=en), [SRT Red Line](https://www.srtet.co.th/en/route-information). Operator information checks system/station identity and operational scope; the pinned OSM database supplies geographic geometry. This is not a surveyed operator GIS dataset.

## Streaming and physical surfaces

The persistent dataset carries the road/rail/navigation references, water collision polygons and a manifest of **1024-meter chunks**. Each chunk is a separate local gzip asset. Nearby player/chase-camera tiles activate through two concurrent requests and one mesh installation per frame. Already resident tiles have a two-tile retention collar, then their exclusive GPU geometry is disposed. Requests outside the active area are aborted; stale completions cannot reinstall evicted geometry. Shared materials survive eviction.

No full-world driving mesh construction occurs on startup. The city overhead is a separately batched coarse road/rail/water/station/boundary view. The source debug map uses one canvas background instead of a React tree containing 100,000 SVG road elements. Navigation and the existing vehicle instance persist across chunk changes.

Road decks use estimated source-topology ramps; ground vehicles cannot snap onto an overpass solely because it shares X/Z. The shared production controller retains water and obstacle collisions. Narrow geometry remains in the world even where too narrow for the physical vehicle. **Underground roads/steps are retained as geographic/future pedestrian references, but full tunnel driving, stair physics, terrain DEM and surveyed grade/clearance certification remain incomplete.** Supports are deliberately omitted where a clear source-backed ground placement cannot be established.

## Reproduce and check

From the repository root:

```sh
python -m pip install -r scripts/geography/requirements.txt
python scripts/geography/import_bangkok.py
python scripts/geography/check_data.py
# Re-extract only when recreating the bounded source (one pinned download):
curl -fL https://download.geofabrik.de/asia/thailand-261024.osm.pbf -o /tmp/thailand-261024.osm.pbf
python scripts/geography/import_bangkok.py --pbf /tmp/thailand-261024.osm.pbf
```

Country-source filtering runs in Osmium before Python callbacks while retaining the complete area assembler and location index. Offline builds canonicalize polygon ring/part order and millimeter precision. Gzip headers omit filename/time and use a fixed OS field via `GzipFile`; this avoids Python-version-dependent gzip bytes. Assets and the manifest contain SHA-256 hashes. The CI offline rebuild compares the complete geography asset directory, including chunks.

From `artifacts/tuk-tuk-rush/`:

```sh
pnpm typecheck
pnpm test:real-geography
pnpm test:geographic-streaming
PORT=24801 BASE_PATH=/ pnpm build
pnpm qa:geographic-streaming
```

Browser QA can use `CHROMIUM_PATH` for an available WebGL-capable Chromium. The opt-in `&geographyQA` coordinate inspection hook is restricted to the explicit geographic route; the normal game does not expose it. Reports and at most three visual evidence files live in `docs/qa/expanded-geography/`.

## Known limits

Mapping completeness is limited by this source. Disconnected compounds/components are reported without fabricated streets. Detailed buildings, train travel, station interiors, animated trains and pedestrian gameplay are excluded. Full persistent navigation references still consume CPU memory even though meshes stream; physical iPhone/Safari memory, thermal stability and FPS need device testing. Software WebGL results are identified separately in the certification report.

The waterfront source-hash successor explicitly approves PR45's polygon-union helper version. Existing legacy river, terrain, frontage and collision behavior assertions remain active.

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), derived geographic database under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
