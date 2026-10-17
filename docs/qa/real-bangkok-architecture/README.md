# Real Bangkok architecture — PR #25

Base: `46cb98c` (merged PR #24). Original source geometry and materials; no purchased models, copied hotel logos, photographic textures or external runtime asset dependency.

## Production scope

This draft adds **13 individually authored physical sites**: ten new hotel properties, River City, a paired Siam Center/Discovery composition, and Jim Thompson House. Lebua uses the existing State Tower, giving **11 real hotel destinations**, replacing the three generic hotel markers. Four existing shopping complexes receive separate new compositions; ICONSIAM retains PR24's stronger folded architecture with corrected east-facing orientation. State Tower, Mahanakhon and Baiyoke receive smaller silhouette/facade refinements. Existing major temple assets and their accessible outer courts are preserved.

This is a coherent first architectural collection, **not completion of the entire requested inventory**. An installed model is not automatically a completed recognizability pass. The visual review below distinguishes asset fidelity from functional integration. No A grades are inferred from a label or an automated test.

## Geography and access

`registry.json` is generated from `realPlaces.ts`: official names, verified source addresses, neighborhood, bank, neighbors, intended and resolved game coordinates, source URLs, asset ID, fidelity tier, save/discovery ID and actual road node. These are north-up authored game coordinates, **not GPS or surveyed building dimensions**. All game/map transforms remain `toWorld`/`toMap`.

- Hilton is north of ICONSIAM, Peninsula south of it, all on the west bank. River City, Oriental, Shangri-La and State Tower remain on the east bank. Four Seasons and Capella are south of Taksin, in their shared Charoen Krung district.
- Rosewood is east of the Embassy/Park Hyatt development, along the Phloen Chit corridor. Grand Hyatt Erawan is near Ratchaprasong; Eastin is near the existing Surasak station.
- Short fictional hotel driveways connect actual public graph nodes to rear drop-offs where a riverfront site would otherwise be inaccessible. They contain no NPC through traffic, remain bidirectional, and are included in routing, collision clearance, asphalt baking, the map and recovery.
- Hotel interiors, pools and gardens are closed pedestrian/property space. Stops are exterior drop-offs; no hotel interior access is claimed.
- The Embassy shifts six map units east to clear CentralWorld; Siam Center/Discovery shifts six west to clear a street. These local fit adjustments are recorded in `registry.json`. Existing public streets and BTS lines retain their coordinates and connections. Compression makes the southern hotel spacing and Siam retail footprints much smaller than reality.
- Anantara needs a southern west-bank road extension. The Siam needs a defensible Dusit extension. Neither is moved to an unrelated neighborhood.

## Evidence

- [Reference catalog and provenance](references.md) links actual official/architect exterior photographs. Reference photos are viewed during production and linked for comparison, not shipped as game textures or relicensed as our art.
- [Asset fidelity review](visual-review.md) records per-place results, limitations and screenshot links.
- `after/`: normal chase-camera road views and explicitly identified QA camera front, elevated, river and skyline views. The QA camera is an existing development-only, opt-in facility; game camera recovery/lease protections are preserved.
- `before/`: PR24 baseline captures. Matched comparisons use the exact after-camera poses against an isolated PR24 checkout; new hotels have no before model.
- `performance/`: matched Fast/Detailed mode samples on desktop Chromium's **SwiftShader software renderer**. They establish rendering cost and resource changes, not physical iPhone FPS.
- `browser/`: controller-driven hotel approach, Fast/Detailed renders, selectable hotel markers and landscape/portrait map checks. Portrait is checked with the map open; driving retains the existing landscape orientation requirement.
- `validation/`: all 20 automated groups pass; test and production-build logs. `asset-budgets.json` measures triangles, meshes and footprints for both geometry levels.

## Street completeness

The regenerated PR24 baseline contains **151 open rays** out of 8,138 street-edge samples. Both sides of every road are tested, including arrivals, bridges, shortcuts and oblique intersections. Smaller, properly oriented physical infill fits and additional along-street offsets reduce genuine open rays while preserving water, parks, station approaches and compound grounds.

`baseline-edges.json` preserves all 151 original locations. `remaining-edges.json` lists every remaining unresolved ray with coordinates and corridor. These are not silently called parks or completed merely to lower the count. Physical water/park/compound/station/junction classifications remain separate in the audit. Residual open samples require further art inspection; this draft does **not** claim zero unfinished city edges.

## Runtime and ownership

Each bespoke property owns two batched geometry levels. Shared facade helpers create floor/balcony rhythm, while each property's silhouette and site composition remain explicit. Distance LOD, existing sector/hero culling, the existing night-light update and root resource disposal apply. The new original text atlas is shared across named-property signs. No new dependency was added.

`check-real-architecture.ts` verifies physical bounds, riverbank/order relationships, connected and clear passenger stops, discovery, driveway clearance, finite geometry, bounded draw batches, lighter distant geometry and disposal. The previous graph hash is checked after excluding the new hotel driveways, so a silent redesign of public streets cannot pass by simply updating a hash.

## Remaining production work

See [remaining inventory](remaining-inventory.md). Current source photos are architectural references rather than dimensioned surveys. Exact room/window counts, commercial artwork, interiors and full city footprints are intentionally not replicated. Names identify simulated places; the game claims no hotel/operator endorsement or affiliation. No trademark clearance or physical-device performance certification is asserted.

No merge or deployment.
