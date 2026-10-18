# PR26 — authored Bangkok landmark districts

Base: current main `199321d`, merged PR25. This draft replaces restrictive landmark fitting with deliberate compound planning, reconstructs weak hotel/retail/skyline models, adds four destination sites, and improves physical street coverage. **It does not certify every architectural asset as finished.** See the explicit C grades and remaining work below.

## Implementation

- Twenty-five authored sites. Important existing mall/skyline anchors are explicit world coordinates; newly reconstructed compounds have multiple wing footprints, separate reservations and public/private ground uses. Open courts are not filled by one whole-property collision box.
- Seventeen real-place compounds, including four new destinations. Separate building masses drive hero geometry and physical collision; procedural parcels are excluded/cleared before construction. Site construction is idempotent and retains stable landmark/discovery IDs.
- Reconstructed Oriental River/Garden/Authors composition and exposed faceted window bands; distinct rounded Shangri-La / balconied Krungthep wings and connecting lobby; broadened Four Seasons cascade with lower Palm Courtyard wings; Capella villa/pool layout; continuous curved Embassy study; quieter, narrower Mahanakhon pixel carving; differentiated Paragon and CentralWorld frontage.
- Dusit Thani / Dusit Central Park southwest of Lumphini; One Bangkok / Ritz-Carlton east of the park; Park Ventures / Okura on the Phloen Chit corridor; Anantara on the west bank, served by a modest connected southern Charoen Nakhon extension. These are real map/discovery/fare destinations, not decorative labels. Dusit and One Bangkok remain C-grade architectural studies.
- Same-bank hotel approach selection, private no-traffic exterior drives, planted river terraces and collision-backed garden islands. Existing ICONSIAM and temple arrival loops, bridges, public-road nodes/edges, left-side traffic, discovery and restart/camera systems are preserved.
- Smaller physical street-food kiosks fit under elevated rail where taller buildings cannot. Rail supports and station entrances remain solid clearance constraints. This adds real frontage rather than renaming empty terrain as a park.
- Landmark detail is batched in one local cell per material because landmarks already have whole-object culling. Generic city geometry retains spatial cells. Near/far LOD, quality settings, selective emissive windows and resource disposal remain active. No new dependency or photographic runtime asset.

## Evidence

Final validation: all 22 automated test groups, TypeScript and production build pass. Fifty current rendered views cover 13 assets. Open roadside samples fall from 130/8,322 to 77/8,534 (40.8% fewer unresolved samples despite the extended corridor). The remaining inventory is retained rather than relabeled as completed parkland.

- [Baseline audit](baseline-audit.md)
- [Primary reference inventory and geographic decisions](references.md)
- [Site footprints, reservations, grounds, approaches and references](site-inventory.json)
- [Manual fidelity grades and incomplete assets](visual-review.md)
- [Before/after and current views](comparisons.md)
- [Matched rendering cost and resource inventory](performance.md)
- [Per-asset near/far geometry budgets](asset-budgets.json)
- [Site validation](site-validation.json)
- [Controller-driven requested routes](driven-routes.json)
- [Browser interaction / controller report](browser/report.json)
- [Automated test summary](validation/summary.json)
- [Unresolved roadside inventory](remaining-edges.json)

The requested eleven route checks cover about 14.4 km through the real vehicle controller, with no static collisions and traffic disabled for repeatability. Each route has a documented start setup; positions are not teleported during the drive. Browser evidence separately checks keyboard-driven approach/braking, new hotel map markers, no discovery awarded just by selecting a marker, Fast/Detailed scenes and landscape/portrait map layouts. These two forms of evidence are not conflated into a physical-device playthrough.

The old public graph is checked edge-by-edge against the committed PR25 baseline. Legacy non-hotel arrival graph hashes remain unchanged when the intentional private drives and southern extension are excluded. The road polygon bake is regenerated and checked against the complete current graph.

## Remaining work

- Embassy's crown/envelope, Dusit's precise tower/crown/roof park, One Bangkok's individual tower silhouettes/master plan, and CentralWorld's full long frontage/skywalk system remain **C/partial**. No A grade is claimed and partial buildings are not counted as completed faithful replicas.
- Erawan, Eastin, River City, Siam Center/Discovery and Terminal 21 retain supporting-model limitations from PR25; exact station/hotel pedestrian bridges and full retail facades remain outstanding. Peninsula/Hilton/Lebua/Rosewood/Baiyoke useful existing silhouettes are preserved, not presented as newly rebuilt assets.
- Riverfront compounds have more intentional terraces and vegetation, but broader inter-block ground and full hotel garden/pier layouts still need work. Remaining sampled gaps are listed individually; the whole city is not declared complete.
- Tier 2 additions are deferred to protect scope and rendering budgets. No random placements or future One Bangkok supertall are inserted to increase destination counts.
- Measurements are desktop Chromium / SwiftShader. Draw calls, triangles and typed-array inventories are comparable; wall frame times are not hardware-FPS proof. **No physical iPhone Safari validation was performed.**

No merge or deployment.
