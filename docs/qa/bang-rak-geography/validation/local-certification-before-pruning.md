# Archived local report — raw evidence incomplete

This is the report recovered from a successfully uploaded Git blob after workspace maintenance removed its unpushed companion files. Relative artifact links below describe the original local packet and may be unavailable in this branch. Read [the final handoff](../README.md) for the current evidence status. This archive is not a claim that the original 161-file evidence commit was published.

---

# Bang Rak northern seam — implementation and certification

**Draft PR43. Do not merge or deploy.** This completes a bounded, connected northern street phase, not the definitive reconstruction of the full Bang Rak administrative district. The playable change resolves PR42's deferred Si Phraya connection and Captain Bush dead end, with source-backed directionality and a continuous low-rise streetscape.

Runtime implementation commit: `6d893a50e098c357fa9acc406c0b167c677f6017`. Published runtime blobs match the local source bytes. The final after-capture runtime hash is checked against every final `src/game` file; independent GitHub Actions results identify their own exact source checkpoint. Later evidence/tooling commits do not change the runtime implementation.

## Review entry points

- [Four geographic comparison maps](geographic-comparison.png): A real OSM reference, B immutable PR42 game world, C selected proposal, D final production world. [Vector version](geographic-comparison.svg).
- [24 matched before/after WebGL pairs](GALLERY.md) and [local HTML gallery](gallery.html).
- [Production geography plan](district-plan.json), [WGS84/game anchor correspondence](geographic-anchors.json), [street/access inventory](street-inventory.json), [landmark/hotel inventory](landmark-hotel-inventory.json), [transit inventory](transit-inventory.json).
- [Research and photographic decisions](RESEARCH.md), [heritage reference footprints](heritage-reference-footprints.json), [exact code approval](source-approval.json).
- [Machine-readable certification and checksums](validation/certification.json), [physical Safari follow-up](DEVICE-ROUTE.md).

## Implemented behavior

A separately named, two-way public arrival spur connects River City's retained interface to eastbound Si Phraya. Captain Bush arrivals can turn directly toward River City without the old northern detour. The named western Si Phraya reach continues east to Charoen Krung. Captain Bush Lane runs west from Charoen Krung, bends north, and joins eastbound Si Phraya. Its previous bidirectional dead-end interpretation is corrected. Soi32 and the existing Postal/Warehouse30/Oriental destinations remain accessible through the authoritative graph.

The graph gains **24 edges and 22 nodes**: **2,260 roads / 2,196 nodes** total. All 2,174 prior node records remain exact. Preexisting road geometry remains exact; thirteen Captain Bush edges acquire the researched one-way rule. Seventeen new Si Phraya edges and four northern-return edges are one-way; the three local arrival edges are two-way. New edges participate in route finding, NPC traversal, minimap/fullscreen map and roadside destination guidance. Named public streets have bilingual current-street identification; the local arrival spur follows the existing unnamed-approach HUD convention. They retain the full seeded 38-vehicle production population.

Fourteen authored street-facing properties replace seven conflicting building bodies: five frontage properties and two rear buildings. Four retired yard fixtures are listed separately. One retained rear workshop transfers to an adjacent surviving street owner in the same block; its entire physical body remains unchanged. Every other old building, landmark, hotel compound, transit structure and water geometry is preserved. The production retirement ledger names each body and checks its original dimensions before changing anything. Cached block/court ownership is reconciled, and turn-clearance indices rebuild when the graph grows.

The new properties use five established Bang Rak architectural recipes: merchant, gallery, cafe, timber and workshop. They have recessed businesses, upper windows/shutters, service elevations, shared night materials and the PR41 sign-mounting contract. **30 purposeful activity candidates** occupy the original/new quarter within the existing 32-candidate district allowance and global crowd budget. No new always-active citywide crowd, point-light network or transport gameplay system is introduced.

The final additive surface authoring carries forward exact PR42 asphalt/curb/sidewalk sources and unions only the new lane envelopes. It refuses silent node, road-width or shoreline changes. Water/land remain byte-equivalent, no approved asphalt is removed beyond the unchanged original tolerance, and surface changes are restricted to the exact approved lane collars. The original preservation thresholds remain intact.

### GPS regression caught by the full legal matrix

A seeded Chinatown-to-Paragon journey exposed mutual yielding in the inherited six-metre university service shortcut. Its opposing lane centres are only 3m apart while the existing taxi contact envelope is 3.1m. This was a real stalled journey, not counted as a pass merely because no collision occurred.

Production GPS now assigns a two-times distance/time preference penalty to narrow, two-way service shortcuts. Normal streets are preferred for through travel; local destinations inside the service lane remain connected and all one-way/access restrictions remain unchanged. The affected trip takes a slightly longer ordinary-street route and completes with zero contacts. No vehicle was removed, collider reduced, hazard rule weakened, test journey removed or completion threshold relaxed. Voluntary head-on entry into that inherited service lane can still require backing out; universal single-track traffic negotiation remains outside this phase.

## Driving and regression verification

| Matrix | Seeds | Seeded journeys | Outcome |
|---|---|---:|---|
| Existing Chinatown legal journeys | 982, 41, 67 | 42 | All complete; zero static, prop, bridge, traffic, water or boundary contacts |
| Existing Bang Rak legal journeys | 982, 41, 67 | 24 | All complete; zero physical contacts |
| Added seam legal journeys | 982, 41, 67 | 18 | All complete; zero physical contacts |

These are **84 seeded journeys over 28 distinct origin/destination pairs**. Each legal run retains 38 production vehicles, uses the production controller at 60Hz, obeys directed edges and left lanes, and performs no mid-route teleports. The new NPC traversal check covers 316m and confirms a car follows Captain Bush into its legal River City arrival exit without clipping its surrounding physical bodies.

[Driving matrix index](validation/geography-driving-matrices.json), [Chinatown seed982](validation/chinatown-legal-982.json), [seed41](validation/chinatown-legal-41.json), [seed67](validation/chinatown-legal-67.json), [previously stalled trip regression](validation/service-route-41.json), [district structural proof](validation/seam.json).

TypeScript and production build pass; the existing large-bundle warning remains. Targeted checks pass for the PR42 core, exact parcel migration, all street-facing facade normals, source-approved geographic graph, deep-block ownership/courts, road/sidewalk/waterfront clearance, NPC movement and signage. **6,723 sign faces have zero geometric mounting failures.** The known historical non-yielding traffic diagnostic remains separate from legal-driving certification; its output is never used as a zero-contact legal pass.

The local package runner completed **50 test groups**: 49 passed initially; one legal-driving group encountered a temporary approval-key mismatch while the final access correction was being authored. That entire three-seed group was rerun successfully on the finalized graph. The original failed checkpoint is retained, with the successful rerun and separate service-route regression recorded in [final reruns](validation/final-reruns.json). [Live/archived group results](validation/tests.json) record exact commands and exit codes. This is a checkpoint-based local run; affected navigation, ownership and surface gates were rerun after their fixes. [Independent GitHub Actions status and source commit](validation/ci.json) distinguish completed checks from pending/manual jobs. All four applicable GitHub Actions workflows (`approve`, `certify`, `game`, `capture`) pass on final source checkpoint `66fcb4df912843893fb4e3bfb179e593ce70424c`. The two optional manual workflows are skipped and are not counted as passes. No CI steps or existing tests were removed.

## Rendered and UI evidence

The [24 matched pairs](GALLERY.md) use the actual production world, engine, camera and 38-car seed982 fixture. Camera position/quaternion/FOV, time, viewport, quality/DPR and complete player/traffic fixture equality are asserted. Original JPEGs are kept unchanged and individually hashed. No generated imagery is used as gameplay evidence.

The views cover Si Phraya west/east, continuous urban frontage, Captain Bush's bend, River City seam, district overview, Charoen Krung and nighttime chase driving. Required viewports are 375×812, 430×932, 844×390 and 1280×800. **The current game starts at sunset; `day` filenames denote shift-start 0s, not midday.** 100s is dusk and 1000s is night. A midday lighting mode was not invented for this report.

The 24 final after captures include the two-way arrival correction, GPS preference and exact additive surface preservation. Their complete runtime-source hash must equal the final source bytes. UI/restart and production-bundle layout replays record earlier source epochs, before the final local arrival direction correction; those checks validate unchanged interface behavior and do not substitute for the final route matrices.

[Browser state replay](validation/browser-state.json) verifies long bilingual street labels, map/back, Postal/Warehouse30 LOOK entry/return, saved career/discoveries, ICONSIAM LOOK recovery and eight restarts with stable retained resource counts and no WebGL errors. [Certified production-bundle UI replay](validation/production-ui-certified.json) passes all four layouts, map return and zero page errors. [Production landscape HUD](ui/certified-production-hud-844x390.jpg), [production map](ui/certified-production-world-map.jpg), [long alley name](ui/hud-long-name.jpg).

Portrait checks retain the existing rotate-device guard; they do not establish portrait driving support. **Physical iPhone17 Pro Max/Safari FPS, memory pressure and thermal performance remain unverified.**

## Performance and construction-cost investigation

| Metric | PR42 baseline | Final PR43 | Change |
|---|---:|---:|---:|
| Geometry/instance buffers | 116,942,912 B | 117,021,550 B | +0.067% |
| Retained triangles, all LOD levels | 14,798,778 | 14,801,521 | +0.019% |
| Instances, all chunks | 984,747 | 985,039 | +0.030% |
| Geometry objects | 9,970 | 9,973 | +3 |
| Materials / Node textures | 410 / 9 | 410 / 9 | unchanged |
| Emitted JS gzip | 800,965 B | 808,706 B | +0.966% |
| Matched night-drive calls | 464 | 465 | +1 |
| Matched night-drive rendered triangles | 593,131 | 591,868 | -0.213% |

An initial PR42 construction sample here was 51.78s; the later sequential PR42 sample was 86.44s wall / 88.43s CPU. The final PR43 sample is 103.11s wall / 99.79s CPU, divided into 55.62s world planning and 47.41s mesh construction. These shared-host, concurrently loaded samples vary substantially more than the earlier reported 6.12% regression. **They do not establish a startup speedup or a reliable causal construction-time delta.** Startup remains expensive; city planning plus approximately 985,000 retained instances across all chunks/LODs deserves dedicated profiling before further scene growth.

[Initial baseline](validation/performance-before.json), [sequential baseline](validation/performance-baseline-sequential.json), [final resource/disposal inventory](validation/performance-after.json), [bundle baseline](validation/bundle-before.json), [bundle final](validation/bundle-after.json). Geometry/material/texture disposal event counts match each complete inventory. Browser frameMs samples are archived per view; software WebGL has large concurrent-load outliers and is not an iPhone FPS measurement. Final retained counts include the last surface-preservation refinement; matched-view render counts identify their capture epoch.

## Environmental quality assessment

| Area | Assessment | Remaining visible deficiency |
|---|---|---|
| Selected street topology and legal access | Strong bounded improvement | Locally compressed bends/lengths; eastern Si Phraya absent |
| Frontage placement and silhouette rhythm | Improved continuous low-rise block | Five reusable recipes still repeat; not literal surveyed facades |
| Recessed businesses and sign support | Geometry gates pass | Distant signs simplify at mobile LOD; photographic surface weathering remains limited |
| Rear/service context and skyline | Mixed inherited quality | Broad setbacks and generic background masses remain outside the new frontage rows |
| Night scene and street life | Purposeful bounded activity | Simple walking/browsing animation; no rich delivery/hotel-arrival behavior |
| Waterfront and protected compounds | Existing geometry preserved | Dedicated Si Phraya piers, Sheraton and HouseNo1 context are still missing |

The new road connection and continuous frontage are reviewable, playable improvements. This report **does not award blanket premium/AAA or district-wide photographic-fidelity acceptance**. Generic distant transitions and remaining compounds must be improved in later geographic phases.

## Geographic compromises and remaining scope

1. The separate River City arrival spur bends into the retained Wanit interface; this is a local game fit, not a geographic projection. The named Si Phraya remains eastbound. Real Soi24 remains a distinct deferred northern approach.
2. Captain Bush retains PR42's compressed lateral alignment while gaining its true northern connection and recorded direction. Widths and Soi30–32 spacing are interpreted.
3. No new named landmark/hotel model is claimed. Existing Postal, Warehouse30, River City, Oriental, State Tower and other compounds keep their approved origins. HouseNo1, Royal Orchid Sheraton, cathedral/customs/embassy contexts remain inventory items requiring complete site work.
4. Eastern Si Phraya/Maha Set, Surawong, Silom/State Tower relationship, Pan/Convent/Decho and wider commercial Bang Rak remain unfinished. The inherited Silom chord is a known geography debt.
5. No BTS/MRT station falls inside this finished northern seam. Existing network structures are retained exactly; the broader Silom/Sathon alignment/stations are not newly certified here. Dedicated Si Phraya ferry/express piers remain deferred; River City's existing pier is not relabeled.
6. Physical Safari verification and reliable cold-start profiling remain open. The optional inherited university service lane can still require manual yielding/backing out; GPS no longer selects it as the preferred through route.

**Recommended next phase:** extend real Si Phraya east to Maha Set and its Surawong relationship, then correct the Silom/State Tower axis through another explicit parcel migration. Lock those streets before adding the broader temple, hotel and BTS/MRT inventory. Pair the geography pass with dedicated startup/chunk-construction profiling and the physical-device route in this packet.

## Reproduction

From `artifacts/tuk-tuk-rush`, use the repository's pinned pnpm installation:

```sh
PORT=24681 BASE_PATH=/ pnpm typecheck
PORT=24681 BASE_PATH=/ pnpm build
pnpm test:bang-rak-geography
pnpm test:bang-rak
pnpm test:waterfront-clearance
node scripts/certify-bang-rak-geography-drives.mjs
node scripts/check-chinatown-legal-traffic.mjs
node scripts/run-bang-rak-geography-tests.mjs
CHROMIUM_PATH=/path/to/chromium VISUAL_LABEL=after node scripts/browser-bang-rak-geography.mjs
CHROMIUM_PATH=/path/to/chromium node scripts/browser-bang-rak-geography-state.mjs
CHROMIUM_PATH=/path/to/chromium node scripts/browser-bang-rak-geography-production-ui.mjs
python scripts/certify-bang-rak-geography.py
```

Baseline captures require an isolated checkout of PR42 with the same camera file and capture harness. The committed immutable baseline snapshot and complete before-capture manifest identify that input. Geographic maps use separate reference/game coordinates and are not cadastral evidence.
