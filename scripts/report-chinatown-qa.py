"""Refresh the permanent report from retained runtime/test/browser evidence."""
from pathlib import Path
import json,gzip,csv,hashlib,statistics,subprocess
ROOT=Path(__file__).resolve().parents[1];Q=ROOT/'docs/qa/chinatown-reconstruction';SRC=ROOT/'artifacts/tuk-tuk-rush/src/game/bangkok'
def read(p):return json.loads((Q/p).read_text())
def write(p,t):(Q/p).write_text(t.rstrip()+'\n')
def world(n):return json.loads(gzip.decompress((Q/(n+'-world.json.gz')).read_bytes()))
a,b=world('before'),world('after');plan=json.loads((SRC/'chinatownPlan.v1.json').read_text());summary=read('validation/world-summary.json');checks=read('validation/chinatown.json')
# Full deterministic inventories, not an illustrative subset.
for label,d in [('before',a),('after',b)]:
 nodes={n['id']:n for n in d['nodes']}
 with (Q/(label+'-road-inventory.csv')).open('w') as f:
  c=csv.writer(f,lineterminator="\n");c.writerow(['a','b','corridor','name','oneWay','width','noTraffic','ax','az','bx','bz'])
  for r in d['roads']:c.writerow([r['a'],r['b'],r.get('corridor'),r.get('name'),r.get('oneWay',False),r['width'],r.get('noTraffic',False),nodes[r['a']]['x'],nodes[r['a']]['z'],nodes[r['b']]['x'],nodes[r['b']]['z']])
 with (Q/(label+'-landmark-access.csv')).open('w') as f:
  c=csv.writer(f,lineterminator="\n");c.writerow(['id','name','x','z','plotX','plotZ','accessNode','accessX','accessZ'])
  for l in d['landmarks']:
   p=l.get('plot',l);n=nodes.get(l.get('accessNode'),{});c.writerow([l.get('id'),l['name'],l['x'],l['z'],p['x'],p['z'],l.get('accessNode'),n.get('x'),n.get('z')])
base='4735f336cf53102e8079e3943a782239ed81e68c'
write('README.md',f'''# Chinatown reconstruction — PR38

Implemented against current main `{base}`, the verified merge of [PR37](https://github.com/sunsetseast/TukTukRushBangkok/pull/37). This is one reviewable draft; nothing is merged or deployed.

The playable district now has {summary['blockCount']} street-defined blocks and {summary['blockParcels']} frontage parcels. Curved Yaowarat, Charoen Krung, Ratchawong, Mangkon, Plaeng Nam, Song Wat and selected Talat Noi connections use one shared physical, routing and map graph. Chinese-Thai commercial rows, warehouse frontages and lower workshop streets have separate architectural rules. Wat Mangkon and Holy Rosary have protected compounds and original models. The persistent bilingual current-street badge uses indexed geometry and switch hysteresis.

The river and existing landmark model origins remain authoritative. The migration test reports **{checks['footprints']['exteriorChanges']} exterior footprint changes**. The world has {len(b['roads'])} road segments, {len(b['nodes'])} nodes and {len(b['buildings'])} buildings, compared with {len(a['roads'])}, {len(a['nodes'])} and {len(a['buildings'])} in PR37. This is organized density: replacing {checks['footprints']['removed']} old bodies with {checks['footprints']['added']} locally fitted bodies reduces total count by {len(a['buildings'])-len(b['buildings'])}.

Read the evidence in this order:

1. [Current-world audit](current-world-audit.md) and [source inventory](geographic-sources.md).
2. [Four comparison maps and transformations](maps.md).
3. [Road migration contract](road-migration.md), [one-way/intersection review](intersections-and-directions.md) and [block/parcel authority](urban-blocks.md).
4. [Landmark placement](landmarks.md), [architecture/signage](architecture-and-signage.md) and [actual WebGL gallery](gallery.md).
5. [Controller routes and collision categories](driving-and-collisions.md), [automated validation](testing.md), [performance and mobile layouts](performance.md).
6. [Recognizability scorecard](recognizability.md), [remaining issues and roadmap](remaining-issues.md), [PR37 documentation reconciliation](pr37-reconciliation.md).

This is a geographically informed arcade compression, not surveyed cadastral data. Physical iPhone Safari, thermal behavior and sustained device FPS remain unverified. Automated success is not an A-grade art certification.
''')
write('current-world-audit.md',f'''# Actual PR37 baseline audit

The remote main and PR37 merge were checked before creating the reconstruction branch. A separate detached worktree at `{base}` supplied the before world and WebGL renders. Existing PR descriptions were not used as runtime geometry. The retained [before snapshot](before-world.json.gz), [road inventory](before-road-inventory.csv), [landmark/access inventory](before-landmark-access.csv) and [current game map](maps/current-game.png) enumerate the actual baseline, including every node, footprint, landmark and protected destination route.

| Runtime inventory | PR37 | Implemented |
|---|---:|---:|
| Nodes | {len(a['nodes'])} | {len(b['nodes'])} |
| Road segments | {len(a['roads'])} | {len(b['roads'])} |
| Buildings | {len(a['buildings'])} | {len(b['buildings'])} |
| Landmarks | {len(a['landmarks'])} | {len(b['landmarks'])} |
| Destination access ensembles | {len(a['destinations'])} | {len(b['destinations'])} |

Code audit covered cityData/cityModel, cityLayout/geography, world/masterPlan/historicPlan, urbanBlocks/streetFabric/streetEdges, environmentPlan/buildingGrammar/authoredSites, landmarkVisibility, roadManeuvers/vehicleEnvelope/roadSurfaceGraph, generated asphalt, riverfront, map/HUD/navigation/Destination. PR36 geographic records, iconic inventory, OSM reference and PR37 clearance contract were read together with live exports.

The baseline's named corridors existed but their control points poorly represented the relationships among Yaowarat, Song Wat and Talat Noi. The station-to-gate arc was called Tri Mit although OSM identifies that approach as Mittraphap Thai-China. A workshop shortcut supplied an artificial local connection. Generic offset wings and street infill were unaware of coherent block interiors. Facades could face other building rows; independent diagonal frontage patches left poor corners. Existing Scala art lacked a resolved Chinatown restaurant identity. Wat Mangkon and Holy Rosary were absent as protected rendered sites.

The before gallery preserves those shortcomings. The baseline was not collision-broken: the merged PR37 maneuver system and original zero-contact fare test remain the starting foundation. They are independently rerun after reconstruction. Existing hotels, Gate, Traimit, station, River City, bridges, water, career and boost behavior are retained.

Baseline source provenance: `git fetch origin main`, main SHA equality to the verified PR37 merge, and GitHub merged PR metadata were checked. `pr37-recovered/provenance.json` additionally compares all 210 tracked runtime files from recovered final PR37 evidence with the merged source (zero differences).
''')
write('maps.md','''# Four reproducible maps

All panels are north-up. A/C/D use the existing design grid: x east, y south. Runtime world coordinates are `x=(designX-500)*4`, `z=(designY-600)*4`; inverse `designX=x/4+500`, `designY=z/4+600`. The global coordinate system is unchanged. B is WGS84 longitude/latitude, with longitude aspect corrected by cos(13.74°). Axis units differ deliberately; identical orientation does not imply a uniform metric scale.

| Panel | Evidence | Machine source |
|---|---|---|
| A · Current PR37 game | [PNG](maps/current-game.png) · [SVG](maps/current-game.svg) | before-world.json.gz |
| B · Real Chinatown | [PNG](maps/reference-map.png) · [SVG](maps/reference-map.svg) | retained OSM road, building and riverbank geometry |
| C · Approved compressed controls | [PNG](maps/proposed-compressed-map.png) · [SVG](maps/proposed-compressed-map.svg) | chinatownPlan.v1.json over PR37 context |
| D · Final actual game | [PNG](maps/implemented-game.png) · [SVG](maps/implemented-game.svg) | after-world.json.gz and blocks.json |

The curated plan preserves the sequence of intersections and relative north/south and river-side arrangement. Control vertices are individually authored rather than a single affine transform of every OSM point. Protected Odeon, Traimit, Hua Lamphong and River City origins constrain the miniature; Talat Noi is sheared southwest toward the existing River City approach. The real riverbank is a geographic reference; the game's approved PR36 river remains unchanged. These constraints deliberately distort lengths, bearings and some landmark spacing.

Plan review checked the Yaowarat curve, parallel Charoen Krung relationship, Ratchawong/Song Wat connection, Mangkon and Plaeng Nam frontage, opposing Song Wat direction sections, station/gate approach and Wanit 2/Yotha to River City. Discovery of a disconnected Phadung Dao end during graph certification led to adding real Phat Sai and Yaowaphanit local access instead of an invented shortcut. No exhaustive OSM street import was attempted.

Regenerate from the repository root:

```sh
python scripts/render-chinatown-maps.py
```

Game exports are generated from the production constructor by `scripts/export-chinatown-world.ts`. Rebuild approved blocks with `scripts/generate-chinatown-blocks.ts`, then regenerate asphalt with the existing `art:roads` command. Version keys reject stale blocks/surfaces.

![Final implemented blocks](maps/implemented-game.png)
''')
write('road-migration.md',f'''# Scoped road approval and migration

The user-authorized Chinatown reconstruction is encoded in `chinatownPlan.v1.json`, not a global road reset. Its nonrectangular boundary follows the northern commercial core, eastern station/gateway context and southern riverbank strip. `replacedCorridors` explicitly lists retired controls; the workshop shortcut is removed. Existing IDs are preserved outside the migration. Local intersection split nodes and arrival attachments are regenerated from the same physical graph.

The street migration runs before common intersection splitting. Rendering, physics, NPC traffic, fare routing and maps read the resulting graph. One-way directions are represented by ordered endpoints. Destination IDs are unchanged. Gate's annulus retains its center, radius32, width12 and legal direction. The necessary local Charoen Krung segment rejoins the preserved southern corridor at design540,690; Khao Lam meets the existing Rama IV chord without rerouting it.

Three explicit placement collars cover old frontage whose parent road is removed/resampled: old northern Charoen Krung arc (230 world units to cover previous offset wings), unchanged Rama IV chord (70), and unchanged southern Charoen Krung (90). These are documented placement transitions, not permission to move unrelated landmarks. Source sampling seeds preserve distant procedural background bodies; ten exact exterior PR37 bodies receive early placement priority. No duplicate road is rendered or routed by that art sampling catalog.

The strict PR37 successor contract compares every exterior road name, width, direction, traffic restriction, endpoint ID and coordinate, plus BTS/Gold Line paths and original landmark plot/yaw/size/kind/name. PR37's Asiatique is included in this strict comparison. Older pre-PR37 fixtures keep their explicitly inherited Asiatique exception, then also run the strict PR37 comparison.

`parcel-migration.json` records each removed and added footprint. Current result: {checks['footprints']['removed']} removed, {checks['footprints']['added']} added, **zero outside the approved migration**. Coordinate signatures are quantized to 0.0001 world units to avoid floating-point reversal noise; physical tolerances are not loosened.

Current asphalt key: `{summary['key']}`; full geographic approval key: `{summary['fullGraphKey']}`. `cityData.v1.json` and baked block/surface data carry the approved versions. Unauthorized or stale geometry fails construction/tests.

The local Wat Mangkon MRT entrance moves beside the corrected Charoen Krung/Plaeng Nam relationship. Its model identity and geographic source are retained, its old design position is recorded, and all unrelated transit stations remain unchanged. Existing Gate, Traimit, station, River City and hotel model origins are preserved. Arrival node numbering can change locally while destination identity and legal access remain valid.
''')
rows=['| Game corridor | Street / Thai | OSM ways | Direction / operation |','|---|---|---|---|']
for s in plan['streets']:
 dx=s['points'][-1][0]-s['points'][0][0];dy=s['points'][-1][1]-s['points'][0][1];direction=('S' if dy>0 else 'N')+('E' if dx>0 else 'W')
 op=('One-way '+direction if s['oneWay'] else 'Two-way')+(' · local vehicle access; no through NPC traffic' if s.get('noTraffic') else '')
 rows.append(f"| {s['corridor']} | {s['name']} / {s['thai']} | {', '.join(s['sourceWays'])} | {op} |")
write('intersections-and-directions.md','''# Intersections, real street identities and one-way review

The retained OSM way order and `oneway` tags support each directed section below. Unknown/absent tags are not converted into invented one-way restrictions. Endpoint compass labels describe the compressed controls, not a survey bearing. Wanit 2 south and Yotha remain two-way where the selected data does not establish a one-way rule. Source restrictions are a dated geographic snapshot, not live legal driving advice.

'''+ '\n'.join(rows)+'''

Song Wat is intentionally split into three directional sections: west traffic eastward, east traffic westward, and a two-way central connection. Mangkon's short terminal is distinct from its one-way commercial section. Yaowaphanit approaches Phat Sai from opposite ends. Phadung Dao, Yaowaphanit and Phat Sai retain local player access while NPC through-traffic is suppressed; OSM marks destination-only motor access in this group. This is an explicit arcade traffic policy, not a claim that ordinary unrestricted traffic may use every source alley.

Yaowarat joins Odeon and curves northwest through Song Sawat, Phadung Dao/Plaeng Nam, Mangkon and Ratchawong. Corrected Tri Mit approaches the gateway from the southwest; the station-facing arc is Mittraphap Thai-China. Ratchawong reaches Song Wat; Wanit 2/Yotha provide the Talat Noi hierarchy and the preserved River City arrival connection. Visual pedestrian passages are omitted from the vehicle graph and protected by rendered posts with matching colliders.

Common graph splitting makes crossings into shared junctions; it does not leave overlapping unconnected road meshes. Asphalt is regenerated from that graph. Exact block paving is cut away from road/sidewalk ribbons and protected areas. At junctions the road surface remains authoritative; corner frontage is fitted inside residual polygons. No new water-crossing road is introduced. Bridge and river suites verify the existing crossings independently.
''')
write('urban-blocks.md',f'''# Block and parcel rules

`generate-chinatown-blocks.ts` performs integer polygon difference: approved district boundary minus the actual road-plus-sidewalk ribbons (`width/2 + 6.2`), protected landmark plots, arrival reservations and authoritative water. This produces bounded irregular polygons with interior holes. No cadastral authenticity is claimed for these game parcels. The baked road key prevents using polygons against a changed graph.

At world construction, actual boundary edges find nearby suitable road frontages. Arrival loops, bridges, roundabouts and distant boundary edges are not shopfront edges. Collinear edges on the same corridor merge. Frontages divide into roughly12-unit commercial bays or16-unit warehouse bays; shared row gaps are0.72 units. Depth attempts fit38/30,22,14,10-unit buildings wholly inside the polygon and outside holes. Normals point from each block toward its real frontage road; the rear sits in the block. No independently offset second row owns the same space.

The current output has **{summary['blockCount']} blocks / {summary['blockParcels']} parcels**. Every rectangle corner is tested against its containing block and holes. Physical placement also checks existing buildings, protected sites, pedestrian passages, road envelopes and PR37 maneuver sweeps. Accepted massing is simultaneously the rendered and collision authority. Generic rear/courtyard generators do not reseed from these parcels, and generic completeness/infill honors the reserved district.

Corners get facade returns, sill/cornice detail and appropriate side openings. Short concave or acute remnants can remain open rather than receiving an overlapping box. Some corners still have conservative setbacks and some upper party walls remain plain; this is reflected in the visual scorecard. Temple courts, station/gateway foregrounds and warehouse yards are deliberate open space.

`check-chinatown.ts` verifies containment, oriented nonoverlap, assigned street-facing normals, protected grounds, actual emitted architectural volumes, maneuver clearance and exact exterior footprint equality. This adds checks to the old contracts; zero-contact controller assertions remain unchanged.
''')
write('landmarks.md','''# Landmark placement and priority review

| Site | Implemented treatment | Geographic/architectural limitation |
|---|---|---|
| Chinatown Gate | Existing hero model and circular road preserved; curved Yaowarat/gateway context reconstructed | Arcade circle width and landmark separation retained |
| Wat Traimit | Existing model/compound preserved; corrected station approach identity and protected frontage | Not a surveyed temple compound |
| Hua Lamphong | Existing recognizable station facade preserved, approach network corrected | Foreground remains compressed and less detailed than real station precinct |
| Wat Mangkon Kamalawat | New protected Chinese courtyard compound, red columns, layered tiled roofs, nine-story Sino-Thai entrance block | Simplified heights, ornament and court arrangement; game origin design487,480 |
| Holy Rosary | New protected west-facing Gothic church, pale nave, pointed windows, rose window and spire | Compressed riverside plot north of preserved River City; game origin436,774 |
| Hua Seng Heng | Source-checked real identity, limited authored gold-shop facade and Thai sign at approved Yaowarat parcel | Identity and visual motifs, not a full commercial interior replica |
| Tang To Kang | Limited taller heritage/gold facade near Mangkon and visual Wanit 1 context | Seven-story reference simplified to29-unit stylized mass; not a museum reconstruction |
| Scala Yaowarat | Existing bespoke stepped commercial art moved onto approved street parcel; sign retained | Represents the Chinatown restaurant at483–485 Yaowarat/Chaloem Buri, not the former Siam Scala cinema |
| River City Bangkok | Existing model/origin and destination retained; Wanit 2/Yotha access relates to new Talat Noi fabric | Southern neighborhood compressed toward approved origin |
| Song Wat warehouses | Original repeated merchant/warehouse modules with gables, loading doors, shutters and quiet signs | Curated heritage ensemble, no claim each facade matches a named surveyed building |
| Grand Postal Building | Researched, intentionally not authored in this district | South of the selected River City boundary; remains an explicit Bang Rak follow-up |

Protected hero massing and public forecourts register before infill. Access nodes are selected on actual public corridors, not by a line crossing a neighboring building. Wat Mangkon's west wing was moved out of an existing road envelope after controller tests found the intrusion; this is the design487,480 final location. Church arrival remains on public Wanit 2 rather than an invented vehicle road through the sanctuary grounds.

The source inventory separates source coordinates from game placement. `final-registry.json`, `after-landmark-access.csv` and the iconic inventory retain identities, coordinates, model ownership and remaining research limitations. Real business names are limited to verified identities; generic merchant signs are fictional combinations, not additional official branches. No commercial logo image or restricted street photograph is redistributed.
''')
write('architecture-and-signage.md','''# Architectural and environmental treatment

Yaowarat uses narrow multistory shophouses with a varied14–23.6-unit roofline, recessed shop rooms, gold cases, restaurant counters, cornices, balconies, rooftop equipment and layered projecting signs. Song Wat uses wider lower warehouse bays, gables, muted plaster, merchant lintels, timber-like shutters and loading-door rhythm. Talat Noi uses lower7.8–12.6-unit workshop/residential rows, weathered masonry accents, plants at doors, side windows and fewer illuminated signs. Generic facades no longer overpaint these authored modules.

All modules feed the existing ArchitecturalBatch/PBR atlas and near/night layers. There is no independent renderer or per-shop point light. Recessed warm emissive panels, lamp details and selective occupied upper windows give nighttime depth with shared materials. Existing sunset/night uniforms, district sign illumination, lantern spans and environmental lights remain the time-of-day authority. Food/vendor/pedestrian/parked-object menus differ between busy Yaowarat, warehouse Song Wat and workshop Wanit 2/Yotha. Structural collision and prop placement still honor public road/maneuver clearance.

Horizontal sign cabinets sit against the owning lintel; blade panels project from the owner facade on two visible metal brackets. Their top must remain below the owner's roof, their attachment coordinate must lie within its frontage, and the bracket must reach the wall. Actual emitted sign/architectural volumes are checked against the live roads. Street lantern spans use live Yaowarat segments and road-clear support positions instead of removed hardcoded graph IDs. No major panel is positioned solely by an arbitrary world label coordinate.

The existing Thai/Chinese glyph atlas is retained. Hua Seng Heng and Tang To Kang use source-checked Thai identities; generic restaurant/merchant signs vary by trade and seeded composition. Song Wat and Talat Noi do not inherit the Yaowarat neon-blade system indiscriminately. The style remains intentionally geometric; fine ceramic temple ornament, bespoke murals and a fully authored business-by-business streetscape are still incomplete.

See `geographic-sources.md` for architectural photographs/pages inspected as references and licensing. The art is original procedural geometry, not extracted photographs. Glyph rendering is covered by the existing font checks and the WebGL gallery.
''')
write('pr37-reconciliation.md','''# Reconciliation of PR37's missing final evidence

Merged PR37's README still promised final screenshots, traffic categorization and performance data. A completed but unmerged final evidence package was present in the earlier project checkout. It has been recovered under [pr37-recovered/](pr37-recovered/), with an explicit [hash/provenance record](pr37-recovered/provenance.json).

All **210 tracked runtime source files** in that recovered checkout match merged PR37 byte-for-byte. Therefore its actual waterfront WebGL captures, route traces,40-group local result and retained performance measurements describe the same runtime foundation. This recovery adds documentation; it does not substitute those historical results for PR38 certification. Script and workflow differences in the recovered working tree are not silently imported.

Useful recovered evidence: [gallery](pr37-recovered/gallery.md), [controller route matrix](pr37-recovered/routes.md), [performance comparison](pr37-recovered/performance.md), [local and CI history](pr37-recovered/testing.md), and [limitations](pr37-recovered/limitations.md). Historical workflow run links and a proposed timeout change in those documents describe that package's context; they are not asserted to be new PR38 CI passes or current workflow modifications.

PR38 independently captures its own clean PR37 Chinatown baseline and final WebGL views, reruns the unchanged eleven-fare test, waterfront clearance, static/left-lane waterfront routes, river/boat checks and complete package suite. Current results live in this directory, outside the recovered package. Physical Safari was unavailable for both sets and remains explicitly unverified.
''')
write('pr37-recovered/README.md','''# Historical PR37 final evidence recovered for PR38

These are completed historical measurements from the earlier checkout, omitted from the merged PR37 documentation. See ../pr37-reconciliation.md and provenance.json before interpreting them. Runtime source is byte-identical to the PR37 merge; scripts/docs/workflow proposals differ. This directory is immutable historical evidence, not a fresh PR38 certification or deployment record.
''')
# Gallery includes every required scene, including two new hero sites.
scenes=read('scenes.json');rows=['# Actual WebGL before/after gallery','','All images are actual Chromium/SwiftShader WebGL application renders, medium quality,844×474 DPR1. Sunset elapsed40s; night650s. Traffic is disabled for matched art inspection. No generated illustrations or composited replacement scenery are used. Camera/target data and raw renderer samples are in before/capture.json and after/capture.json. The baseline is clean PR37; final images use the implemented game.','','Street-level cameras follow the migrated same named corridor where the old road no longer occupies its original position; those paired coordinates are explicitly recorded as `afterCamera`/`afterLook` in scenes.json. Elevated/landmark comparison cameras retain identical world coordinates. These are equivalent viewing purposes and optics, not a claim every pair has identical world coordinates.','']
for s in scenes:
 rows+=['## '+s['id'],'',f"{s['matchMethod']}",'','| PR37 | Reconstructed |','|---|---|',f"| ![Before {s['id']}](before/{s['id']}.jpg) | ![After {s['id']}](after/{s['id']}.jpg) |",'']
rows+=['## Interface and actual map','',*[f'![HUD {w}×{h}](after/hud-{w}x{h}.jpg)\n' for w,h in [(375,812),(430,932),(844,390),(1280,800)]],'![Long bilingual road name](after/hud-long-name-844x390.jpg)', '![Live world map](after/world-map.jpg)']
write('gallery.md','\n'.join(rows))
# Full source file checksums, without private OSM user identities.
retained=[Q/'references/osm-selected-roads.json',Q/'references/osm-buildings-water.geojson',ROOT/'docs/qa/chao-phraya/reference/riverbanks-osm.geojson',SRC/'chinatownPlan.v1.json',SRC/'chinatownBlocks.generated.json']
write('references/checksums.json',json.dumps({str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in retained},indent=2))
print('Updated permanent audit, migration, planning, architecture, gallery and inventories.')
# Controller contact telemetry separates dynamic traffic from static-world faults.
route_sets={n:read(n+'-routes.json') for n in ['static','left-lane','traffic']}
rows=['# Controller-driven route and collision report','','Each independent journey begins at an actual graph stop. From there every metre, turn and arrival uses the production controller at60Hz. There are no mid-route teleports. Static routes disable NPCs for repeatability; the same matrix is repeated with Thai-left lane waypoints and with normal NPC traffic. Journey setup is not counted as traveled distance. The original eleven-fare test is byte-unchanged; only guidance now includes its final bounded curb offset.','','| Journey | Static complete / contacts | Left-lane complete / contacts | Traffic complete / static / NPC contacts |','|---|---|---|---|']
for i,r in enumerate(route_sets['static']['results']):
 vals=[]
 for n in ['static','left-lane','traffic']:
  q=route_sets[n]['results'][i];p=q['physical'];static=sum(v for k,v in p.items() if k!='traffic');vals.append(('PASS' if q['complete'] else 'FAIL')+f' / {static}'+(f" / {p['traffic']}" if n=='traffic' else ''))
 rows.append('| '+r['id']+' | '+' | '.join(vals)+' |')
rows+=['','| Matrix | Journeys | Travelled metres | Static / props / bridge / water / boundary contact frames | NPC contact frames |','|---|---:|---:|---:|---:|']
for n,d in route_sets.items():
 rows.append(f"| {n} | {len(d['results'])} | {sum(r['metres'] for r in d['results']):,} | {sum(sum(v for k,v in r['physical'].items() if k!='traffic') for r in d['results'])} | {sum(r['physical']['traffic'] for r in d['results'])} |")
rows+=['','The traffic pass records13 NPC contact frames in the current seeded sweep. These are actual dynamic traffic encounters and remain a traffic-behavior limitation; they are not counted as static geometry regressions. Event IDs, positions and path traces are retained in [traffic-routes.json](traffic-routes.json). Destination-only local streets suppress NPC through-spawning. The existing traffic transition/left-lane tests check legal directions and junction transitions; the route pass is not proof that every possible traffic seed avoids deadlock.','', 'The unchanged broad fare test completes11 deliveries,9,414m and991 simulated seconds with zero collision-indicator frames, including cross-bank travel and pause/recovery/restart checks. Its full package log is [test-bangkok.log](validation/suite/test-bangkok.log). The new14-journey matrix covers Yaowarat end-to-end, gate/Traimit/station, Ratchawong, Song Wat, Talat Noi/River City/Bang Rak, Memorial crossing, ICONSIAM, Old Town, Siam, Plaeng Nam/Mangkon and the two new heritage sites.','', 'PR37 clearance tests still drive into the original isolated solids to prove collisions remain active, validate swept maneuver envelopes and retain the exact original fare assertions. Waterfront static/left-lane, river geometry/boat, premium destination, career/boost, save/discovery and recovery regressions run in the complete suite.']
write('driving-and-collisions.md','\n'.join(rows))
suite=read('validation/suite/summary.json');results=suite['results'];passed=sum(r['exitCode']==0 for r in results)
rows=['# Automated validation and reproduction','',f'Latest complete package summary: **{passed}/{len(results)} groups pass**; complete={suite.get("complete")}, pass={suite.get("pass")}. [Machine summary](validation/suite/summary.json). Each group runs the actual package script, including its chained checks. Failed development attempts remain in separate logs and are superseded only by an actual rerun.','','| Group | Result | Wall seconds | Evidence |','|---|---|---:|---|']
for r in sorted(results,key=lambda r:r['key']):rows.append(f"| {r['key']} | {'PASS' if r['exitCode']==0 else 'FAIL'} | {r['wallMs']/1000:.1f} | [{r['log']}](validation/suite/{r['log']}) |")
rows+=['','Production Vite builds are measured for both clean PR37 and final source; TypeScript is checked separately. See [build-before.log](validation/build-before.log), [build-after.log](validation/build-after.log) and [typecheck.log](validation/typecheck.log). The existing oversized-bundle warning remains visible and is not hidden.','', 'New structural checks validate block containment/holes, facing normals, real road frontage, oriented massing nonoverlap, protected sites/passages, actual emitted volumes, physical sign attachments, exact exterior footprint preservation, source-backed directions, street-name hysteresis/rate limit and restart clock handling. The unmodified original fare assertion continues to demand zero contacts.','', 'Legacy geographic freezes now invoke the explicit PR38 local migration plus strict PR37 exterior equality. The old global building-density check applies at its existing threshold to the unaffected city; replaced Chinatown has its stronger parcel/exterior-delta checks. Legacy architecture counts use the actual new emitter and retained piece budget rather than displaced old facade plans. No static contact assertion is reduced. The scoped source-approval file permits only cityData, its regenerated road surfaces and the bounded curbside navigation fix; all other PR37 frozen source hashes remain active.','', 'Reproduce with the repository-supported pnpm10 / Node22 setup from the package directory:','', '```sh','pnpm install --frozen-lockfile','pnpm --filter @workspace/tuk-tuk-rush typecheck','pnpm --filter @workspace/tuk-tuk-rush test:chinatown','pnpm --filter @workspace/tuk-tuk-rush test:chinatown-drives','pnpm --filter @workspace/tuk-tuk-rush test:chinatown-traffic','pnpm --filter @workspace/tuk-tuk-rush test:bangkok','pnpm --filter @workspace/tuk-tuk-rush test:waterfront-clearance','pnpm --filter @workspace/tuk-tuk-rush test:waterfront-drives','pnpm --filter @workspace/tuk-tuk-rush build','```','', 'For the entire package matrix, run `node scripts/run-chinatown-suite.mjs` from the app directory. It executes exact package commands directly, preserving individual logs. The local host uses Node24.19.0 and preinstalled workspace dependencies; its pnpm bootstrap wrapper attempted an unrelated reinstall, so direct package commands were used. CI installs the frozen lockfile with supported Node22. No local install/lockfile change is included.','', 'WebGL reproduction: set `CHROMIUM_PATH` to a Playwright-compatible Chromium and run `node scripts/browser-chinatown.mjs` in the relevant app checkout. Use `CHINATOWN_LABEL=before` in a clean PR37 checkout, with the output script pointing at this evidence directory. Scene controls live in scenes.json. The browser runner has real page-error checks, mobile overlap checks, a long road-name case, map capture and repeated restarts. Chromium/SwiftShader is not physical Safari.']
write('testing.md','\n'.join(rows))
# Static visual review is deliberately independent of automated pass/fail.
score=[
('Yaowarat elevated','B','B','C','B','B','B','B','C','A','B','B','Curve and connected cross streets read clearly; large internal courts and roofs remain simplified.'),
('Yaowarat sunset','B','B','B','B','B','B','B','C','A','B','B','Continuous frontages and supports improve the street; corner walls and repeated bays still show procedural origin.'),
('Yaowarat night','B','B','B','B','B','B','C','C','A','B','B','Selective shop/sign light gives contrast; lacks real Yaowarat crowd intensity and fine luminous layering.'),
('Gate / Odeon','B','B','B','A','B','B','B','C','A','B','B','Existing gate silhouette and circular carriageway preserved; use elevated comparison to avoid a foreground roof.'),
('Wat Traimit approach','B','B','B','A','B','B','B','C','A','B','B','Protected temple entrance is visible; adjacent corner elevations remain plain.'),
('Hua Lamphong','B','B','A','A','B','B','B','C','A','B','B','Station facade remains the strongest recognition anchor; foreground less specific than real precinct.'),
('Ratchawong','B','B','B','C','B','B','B','C','A','B','B','Correct cross-street hierarchy; repeated signs/shops could be more individual.'),
('Mangkon','B','B','B','B','B','B','B','C','A','B','B','Denser gold/merchant corridor with meaningful Song Wat connection.'),
('Plaeng Nam','B','B','B','B','B','B','B','C','A','B','B','Narrow directional connector with consistent street walls; corner geometry conservative.'),
('Song Wat warehouse','B','B','B','C','B','B','B','C','A','B','B','Gabled warehouse rhythm and muted signage differ from Yaowarat; loading-yard character needs finer detail.'),
('Song Wat river relation','C','B','B','C','C','B','B','C','A','C','C','Correct river side and street order, but inherited compressed bank offsets leave oversized waterfront open space.'),
('Talat Noi streets','B','B','B','B','B','B','B','B','A','B','B','Lower workshop fronts, shutters and planting establish a quieter identity; lanes remain wider than real pedestrian alleys.'),
('Talat Noi / River City','B','B','B','B','B','B','B','C','A','B','B','Playable public-lane connection and preserved destination; southern shear is visible in plan.'),
('Overall road/block map','B','B','C','B','B','B','B','C','A','B','B','The neighborhood now has a coherent hierarchy; not a cadastral-scale likeness.'),
('Chao Phraya relation','B','B','B','B','C','B','B','C','A','B','B','Approved river unchanged; district aligned on the east bank with honest bank-to-street distance compromises.'),
('Wat Mangkon','B','B','C','B','B','C','B','C','A','B','B','Tall Sino-Thai entrance and courtyard temple are present; text/roof ornament and proportions need refinement.'),
('Holy Rosary','B','B','B','B','B','C','B','C','A','B','B','Pale Gothic nave/spire reads clearly; window tracery and riverside enclosure remain stylized.')]
rows=['# A–F visual recognizability scorecard','','A means strong recognizable likeness with convincing composition; B means recognizable arcade interpretation with visible simplification; C means useful structure/character with material likeness limitations; D weak, E inadequate, F absent/broken. This is an internal source-and-screenshot assessment, not an independent Bangkok-resident panel. A driving grade refers only to the certified controller cases. No overall A is claimed merely because tests pass.','','| Benchmark | Geography | Arrangement | Architecture | Landmark visibility | Density | Signage | Lighting | Detail | Driving | Bangkok similarity | Overall | Reason |','|---|---|---|---|---|---|---|---|---|---|---|---|']
for r in score:rows.append('| '+' | '.join(r)+' |')
rows+=['','The strongest improvement is structural: street curves/intersections, coherent outward frontages, preserved access and distinct commercial/warehouse/workshop treatments. Remaining C areas are retained in the gallery, especially oversized waterfront/inner-block spaces and simplified ornament. These are substantive art/geography limitations rather than hidden test failures.']
write('recognizability.md','\n'.join(rows))
write('remaining-issues.md','''# Remaining issues and follow-up roadmap

| Priority | Observed limit | Concrete follow-up |
|---|---|---|
| P1 device validation | No physical iPhone17ProMax/Safari, thermal or sustained mobile GPU run available | Profile a fixed Yaowarat sunset/night drive on physical Safari; capture frame distribution, memory, battery/thermal behavior and landscape safe areas |
| P1 visual likeness | Some inner blocks and the Song Wat-to-bank strip retain oversized empty courts/yards | Author reference-backed back-of-house warehouse courts and selected pedestrian frontage without altering the approved river or blocking maneuver access |
| P1 traffic |13 NPC contact frames in seeded traffic matrix; zero static contacts | Review NPC yielding and narrow-junction conflicts with event traces; preserve vehicle/static collision envelopes |
| P2 corner art | Conservative acute-corner setbacks and blank party walls remain in several driver views | Add a small set of fitted corner modules/side storefront elevations against actual parcel polygons |
| P2 heritage | New Wat Mangkon/Holy Rosary simplify ornament, precise proportions and enclosure | License detailed photographic references, refine temple entrance signage/roof ceramics and church window tracery |
| P2 streetscape | Repeated sign vocabulary and modular bays remain apparent; fewer people than real evening Yaowarat | Expand curated business composition and batched pedestrian/vendor variety within measured draw-call budget |
| P2 geography | Hand-authored compression distorts lengths, southern bearings and exact river setback | Preserve topology and approved landmark origins; refine only with explicit scoped migration and repeat this certification |
| P2 performance | Large baseline JS bundle, hundreds of submitted calls and slow software-rendered frame samples | Split loadable geographic data and profile real device bottlenecks before claiming a sustained FPS target |
| P3 adjacent heritage | Grand Postal reviewed but not authored; small shrines and exhaustive Wanit1 lanes omitted | Add selected Bang Rak heritage in a separate scoped neighborhood pass |

This draft includes implemented roads, parcels, art, HUD, actual renders and completed local certification. The limitations above are observed bounds of this arcade version, not placeholder promises for missing evidence. There is no claim of surveyed accuracy, exhaustive alleys, A-grade likeness everywhere or verified physical-device performance. No merge/deploy is authorized.
''')
# Measured resource cost; geometry buffers are typed-array estimates, not VRAM.
pa=read('validation/inventory-before-final.json');pb=read('validation/inventory-after-final.json');ca=read('before/capture.json');cb=read('after/capture.json')
rows=['# Performance and mobile interface results','','The sequential final inventories construct clean PR37 and final Chinatown source with the same Node/Three protocol, all retained LODs/chunks and no browser-canvas labels. These are real resource counts. Geometry-buffer bytes sum unique typed arrays and instance buffers; they exclude GPU-driver padding/copies and texture allocations, so they are an estimate rather than measured VRAM. Construction times are one observation per version, not a statistical mobile startup benchmark.','','| Complete scene inventory | PR37 | Chinatown | Delta |','|---|---:|---:|---:|']
keys=['buildings','roads','geometryBuffersBytes','geometries','materials','textures','trianglesAllLevels','instances','constructionMs','constructionCpuMs']
for k in keys:
 av,bv=pa[k],pb[k];rows.append(f'| {k} | {av:,} | {bv:,} | {bv-av:+,} ({(bv/av-1)*100:+.2f}%) |')
rows+=['',f"All counted geometry/material/texture resources dispatch disposal on both sides: PR37 {pa['disposal']}; final {pb['disposal']}. Final geometry buffers are lower by {pa['geometryBuffersBytes']-pb['geometryBuffersBytes']:,} bytes, while materials increase by {pb['materials']-pa['materials']}. New models share geometry/material infrastructure; no per-building light allocation or per-frame geometry rebuilding is introduced.",'', '| Production asset | PR37 bytes | Final bytes | Growth |','|---|---:|---:|---:|']
# Build logs are retained separately; derive exact raw/gzip bytes from built assets.
import zlib
bundle={}
for label,root in [('before',ROOT.parent/'TukTukRushBangkok-pr37-baseline'),('after',ROOT)]:
 assets=root/'artifacts/tuk-tuk-rush/dist/public/assets';bundle[label]={}
 for ext in ['js','css']:
  paths=list(assets.glob('*.'+ext));raw=sum(p.stat().st_size for p in paths);gz=sum(len(gzip.compress(p.read_bytes(),mtime=0)) for p in paths);bundle[label][ext]={'raw':raw,'gzip':gz}
for ext in ['js','css']:
 for kind in ['raw','gzip']:
  av,bv=bundle['before'][ext][kind],bundle['after'][ext][kind];rows.append(f'| {ext} {kind} | {av:,} | {bv:,} | {bv-av:+,} ({(bv/av-1)*100:+.2f}%) |')
write('validation/bundle-comparison.json',json.dumps(bundle,indent=2))
rows+=['', 'The existing large-chunk build warning remains. The extra street/block data and architecture increase JS payload even though retained scene buffers fall. Final CSS includes the explicit street-badge stacking fix; that reversible style-only change is checked in the actual production preview.','', '## Actual rendered views','', 'Medium quality,844×474,DPR1, elapsed40s sunset/650s night, traffic disabled. Counts below come from the actual WebGL renderer. Eight recorded frames follow four warmup frames in the gallery protocol. They include software rendering, shader compilation/streaming and shared-host contention; p95 from eight observations is coarse. They are not sustained iPhone FPS and are not presented as a proven speedup. Camera adjustments for migrated street-level views are recorded in scenes.json.','', '| View | Calls before → after | Triangles before → after | Software frame median ms before → after | Software p95 ms before → after |','|---|---:|---:|---:|---:|']
perf=[]
def percentile(xs,p):
 s=sorted(xs);i=(len(s)-1)*p;a=int(i);b=min(a+1,len(s)-1);return s[a]+(s[b]-s[a])*(i-a)
for scene in scenes:
 x=next(s for s in ca['scenes'] if s['id']==scene['id']);y=next(s for s in cb['scenes'] if s['id']==scene['id']);X=x['samples'];Y=y['samples'];vx=[s['frameMs'] for s in X];vy=[s['frameMs'] for s in Y]
 r={'id':scene['id'],'cameraBefore':x.get('camera',scene['camera']),'cameraAfter':y.get('camera',scene.get('afterCamera',scene['camera'])),'callsBefore':X[-1]['calls'],'callsAfter':Y[-1]['calls'],'trianglesBefore':X[-1]['triangles'],'trianglesAfter':Y[-1]['triangles'],'medianMsBefore':statistics.median(vx),'medianMsAfter':statistics.median(vy),'p95MsBefore':percentile(vx,.95),'p95MsAfter':percentile(vy,.95)};perf.append(r)
 rows.append(f"| {r['id']} | {r['callsBefore']} → {r['callsAfter']} | {r['trianglesBefore']:,} → {r['trianglesAfter']:,} | {r['medianMsBefore']:.1f} → {r['medianMsAfter']:.1f} | {r['p95MsBefore']:.1f} → {r['p95MsAfter']:.1f} |")
write('validation/render-comparison.json',json.dumps({'protocol':'Actual gallery renderer telemetry,8 recorded samples per view; shared-host SwiftShader, not hardware FPS','physicalSafari':False,'views':perf},indent=2))
rows+=['', '## Interface, restart and limitations','', '| Viewport | Verified result |','|---|---|','|375×812|Portrait rotate-to-landscape guard retained; no document overflow|','|430×932|Portrait rotate-to-landscape guard retained; no document overflow|','|844×390|Street badge/long bilingual name, destination, map, pause and driving controls fit; rectangle nonoverlap assertions and actual screenshots|','|1280×800|Desktop landscape driving layout, street badge and navigation fit|','',f"The completed browser report records {len(cb['resets'])} restarts, no WebGL errors, no stale art-camera override and stable geometry/texture counts after warmup. Last restart resource counts: {cb['resets'][-1]['stats']['geometries']} geometries / {cb['resets'][-1]['stats']['textures']} textures. The route matrices additionally exercise long simulated driving sessions. This is bounded restart stability, not a multi-hour physical-device soak.", '', 'Current-road lookup uses64-unit spatial cells, at most5 queries per second, and two-sample switch hysteresis; it does not scan the whole graph per render frame. Reverse route fields remain cached per destination. The minimap now joins adjacent styled edges into SVG subpaths while retaining every vertex; the unchanged culling/mounting budget passes.', '', '**Physical iPhone17ProMax Safari remains unverified.** No thermal, battery, physical safe-area, sustained GPU FPS or hardware memory claim is made. Software frame results are visibly slow/variable; the larger bundle and hundreds of submitted draw calls still warrant real-device profiling.']
write('performance.md','\n'.join(rows))

# Supplementary final stylesheet verification uses the real production build.
u=Q/'validation/production-ui.json'
if u.exists():
 d=json.loads(u.read_text())
 if d.get('pass'):
  for name in ['testing.md','performance.md']:
   f=Q/name;f.write_text(f.read_text()+"\nFinal production UI replay: PASS at all four requested viewports using visible game controls, with the street badge visibly painted and no page errors. See [production-ui.json](validation/production-ui.json). Production screenshots use low quality in Chromium138; the matched art gallery remains medium quality in its recorded renderer. Production intentionally omits development debug hooks. This replay appends the final source stacking declaration verbatim to the already built stylesheet and does not substitute synthetic scenery.\n")
