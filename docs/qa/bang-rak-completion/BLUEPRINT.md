# Bang Rak completion blueprint — PR44

Baseline: `e20d68dca51f2928b4cc6fae355965be2cac7bfc` (main verified through GitHub and local git on 2026-10-25). Read PR42/43 descriptions, source and surviving packets. This is the pre-implementation decision record; final outcomes belong in README.md and the machine ledgers.

## Scope and geographic contract

Bang Rak is the east-bank district between the Phadung Krung Kasem/Rama IV northern edge and Sathon southern edge. River City and Talat Noi are adjoining Samphanthawong context. Implement the selected principal corridors; do not claim every cadastral street. Keep north-up game coordinates (x east, z south), the canonical piecewise geographic transform, and separately recorded local arcade fits. Preserve river, bridges, existing named compound origins and adjoining reconstructed Chinatown.

Sources: the committed OSM reference (© OpenStreetMap contributors, ODbL), the PR43 Bang Rak OSM snapshot retrieved 2026-10-24, BTS operator route/area maps, hotel operators and cathedral parish. Source URLs, retrieval limits and road directions will be carried into SOURCES.md. A new Overpass request returned HTTP406; use the available attributed snapshot rather than invent live source verification.

## Audit findings

- Baseline: 2,260 directed/undirected road records, 2,196 nodes, 7,257 building bodies.
- PR42: Grand Postal articulated civic model, eight Warehouse30 sheds, Soi30/32. Preserve these.
- PR43: eastbound western Si Phraya, Captain Bush return, River City arrival spur, fourteen street-oriented properties. Preserve them.
- No named Surawong, Maha Set, Mahesak, Pan, Decho or Sathon corridors in the generated baseline.
- Inherited Silom begins at (140,940), bends southeast to (600,1100), then northeast to Sala Daeng. Its western start is beside the Postal block rather than State Tower (200,1180). This is the principal correction.
- Oriental, Shangri-La, Eastin, State Tower, River City and Mahanakhon already have specialized architecture. Keep their origins and physical arrival approaches.
- Cathedral, Customs House, House No.1 and Royal Orchid are missing. Placement must respect existing complete compounds and water; do not force a landmark into an occupied site.
- BTS already has Sala Daeng → Chong Nonsi → Saint Louis → Surasak → Saphan Taksin in that order. Audit its clearances before changing it. Existing station canopies/trains are production systems, not missing features.
- Procedural blocks exist but the arterial skeleton leaves long missing cross-connections and incoherent frontages. Reuse building grammar, batching and road-derived placement.
- Current Node retained inventory: 117,021,550 buffer bytes, 985,039 instances, 14,801,521 triangles across all LODs; 410 materials/9 Node textures. Fresh construction sample 39.20s, divided 19.49s world/19.63s mesh. This is host timing, not Safari performance.

## Controlled implementation priorities

1. Correct western Silom and add connected Si Phraya/Maha Set/Surawong/Mahesak/Surasak/Decho/Pan/Sathon relationships using actual junction splitting. Fit only selected verified public streets; do not connect unrelated roads or private hotel grounds.
2. Generate a precomputed exact migration manifest: every retired road and obstacle identified by full geometry/identity and reason. Fail if the baseline changes. No deletion rectangle. Named properties and authored reservations are excluded from ordinary parcel migration.
3. Rebuild asphalt/curb/sidewalk sources only for migrated corridors; retain all unaffected surfaces and water. Update canonical graph approvals explicitly.
4. Extend existing road-oriented frontage recipes with deterministic varied heritage/commercial compositions; reserve transit, protected compounds, sidewalks and collision lanes. Store physical parcel bodies independently of future façade materials.
5. Fit recognizable missing historic architecture only where complete usable reservations are possible. Record unfitted compounds as deferred, not implemented.
6. Preserve and audit BTS order, station entrances, rail clearances and hotel arrivals. Add transport context through researched approaches rather than fabricated rail/MRT links.
7. Profile startup hotspots; optimize supported repeat scans while retaining byte-identical world output where possible.

## Verification and evidence

Capture the 16 requested locations at fixed vehicle/elevated cameras, with representative night views, before runtime changes. Archive exact camera state and source hash with actual JPEGs. Include Wat Mangkon, Sanam Luang and flower-market baselines. Run topology/one-way/lane clearance/migration/frontage/sign tests, real controller journeys and applicable inherited suites, typecheck/build, scene disposal and viewport/state checks. Use software WebGL if available; explicitly distinguish it from physical Safari. Commit evidence incrementally to prevent PR43-style evidence loss.

## Acceptance / remaining-work rule

Connected legal driving is the first gate. A named road alone does not certify authentic streetscape quality. Final report must distinguish completed, approximate, inherited, deferred and unverified. Do not call the entire administrative district finished if historic campuses or visual quality remain open. No citywide façade engine, merge or deployment in this PR.
