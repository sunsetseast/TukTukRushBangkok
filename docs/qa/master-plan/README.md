# Bangkok master plan reconstruction — PR29

This draft implements a connected geographic foundation and a coherent Phrom Phong expansion on main `617230cb0d9b9a22ac4b9aebeba67505730ab662` (PR28). It does not claim that every district in the assignment has been rebuilt or that the miniature is GPS accurate. No merge or deployment is part of this work.

## Implemented scope

- Shared north-up master-plan controls reconstruct roads **before** intersections, collision, traffic, passenger access, navigation and map generation. Phaya Thai approaches Rama I west of the Siam retail parcels; the northern boulevard and stations share the same road anchors.
- Connected Sukhumvit extension through Phrom Phong, compressed Sois 11/22/24/31/39 and a southern service loop; Dinso, Ti Thong, Atsadang, Mangkon and Plaeng Nam connections. Existing Yaowarat directionality, left-side traffic, bridge crossings and riverbanks are preserved.
- Original Emporium, EmQuartier and EmSphere miniature models and matching physical masses. Benchasiri has a pond, pedestrian circuit, entrance gates, commemorative coin and sculptures; a separate Chatuchak lake park sits east of Mo Chit. Stable IDs participate in passenger stops, discovery, saves and maps.
- Full rotated collision/decorative/canopy volume checks against road ribbons, rounded junction caps, stations and train corridors. Tight arrival furnishings are moved as complete bounded assemblies together with their colliders. Late procedural infill respects the transit reservation.
- E5 Phrom Phong, 26 represented station stops, Thai/English signage, distinctive E5 station frontage, four underground-MRT surface entrances and map markers. Tangent-continuous rail corner fillets avoid spline overshoot. Siam changes lateral alignment only after grade separation; terminal crossovers return continuously to a common elevation.
- Nine original tropical plant forms with district-specific planting, opaque leaf/frond geometry, near/far LODs and full crown clearance. Repeated leaf, frond, trunk and crown geometry shares instanced buffers between spatial cells.
- Integer-millimetre offline road polygon booleans replace fragile near-coincident floating sweeps. Clipper is a development dependency; runtime still reads the committed surface bake.

## Quantitative inventory

| Measure | PR28 | This draft |
|---|---:|---:|
| Playable graph segments | 1,727 | 1,991 |
| Connected graph nodes | 1,691 | 1,946 |
| Procedural buildings | 6,312 | 6,951 |
| Landmark/discovery entries | 44 | 49 |
| Public-space areas | 3 | 5 |
| Represented rail station stops (Siam counted on both lines) | 25 | 26 |
| Underground MRT surface entrances | 0 | 4 |
| Tropical species/forms in unified plan | — | 9 |
| Unified plant placements | — | 1,436 |
| Coconut / royal palms | — | 183 / 105 |

Eight retained station anchors move more than 3.5 game metres; this is a code-to-code displacement count, not proof of geographic accuracy. The directed graph traversal reaches all 1,946 nodes. All five new places have routable public stops; six additional controller-driven fare routes exercise the new district and northern park.

All **31 regression groups pass**. The six new controller-driven fares cover 4,263 game metres with zero static collision frames; traffic is disabled for deterministic route certification. The train check runs 36,000 frames, checks 3,404 cross-line configurations and 1,457 nearby moving car-body pairs, and serves all 26 represented stops.

## Review evidence

- [Audit, inventory disposition and explicit compression compromises](audit.md)
- [Primary research and attribution](references.md)
- [Complete before spatial inventory](master-plan-before.json) / [after spatial inventory](master-plan-after.json)
- [Placement conflict report](conflict-report.md), [full validation output](validation.json), [post-change conflict data](conflicts-after.json)
- [Actual paired game screenshot gallery](gallery.md): 30 locations, normal driving camera and elevated inspection camera in both revisions
- [Regression summary](regression/summary.json), [new controller-driven routes](driven-routes.json)
- [Performance measurements and limits](performance.md)

The screenshot capture uses local Chromium with SwiftShader at 844×480 and medium graphics. It hides the HUD for inspection, never city objects. Both revisions use the same requested design poses; road views snap to the actual drivable graph and use the normal chase camera. New eastern roads did not exist in PR28, so its nearest legal road view is necessarily farther away. Inspection images use identical camera positions.

## Reproduction

From `artifacts/tuk-tuk-rush`, after the repository's frozen dependency install:

```sh
pnpm run typecheck
pnpm run test:master-plan
pnpm run test:open-bangkok
pnpm run art:roads
pnpm run test:definitive
CITY_SUITE_OUTPUT=/absolute/path/to/results/ node scripts/run-city-completion-suite.mjs
CITY_LABEL=after node --import tsx scripts/survey-master-plan.ts
CITY_INVENTORY_OUTPUT=/absolute/path/performance.json pnpm run qa:scene-inventory
CHROMIUM_PATH=/path/to/chromium CITY_POSES=./master-plan-poses.mjs CITY_LABEL=after CITY_OUTPUT=/absolute/path/to/gallery node scripts/capture-city-completion.mjs
```

`test:master-plan` is included in the PR CI workflow. The existing full suite additionally covers fares, boost, steering, left-side traffic, navigation UI, camera reset, discovery/save compatibility, bridges, parks, shops, authored compounds, rendering budgets and disposal. Tests protect old directed corridor coverage by geometry rather than unstable post-intersection sample IDs.

## Remaining limits and next work

The [audit's priority list](audit.md#priority-expansions) is part of the scope, not a claim of completion. Dusit/Banglamphu, Kudi Chin, the northern market/terminal cluster, exact historic lanes and the full QSNCC/Green Mile remain future coherent expansions. Existing large vacant parcels, generic supporting blocks and some obstructed street-camera landmark views remain visible in the gallery. Park outlines, mall massing and soi bearings are deliberate miniature interpretations.

Clearance certification uses conservative oriented bounding volumes and declared authored masses, plus emitted forecourt/MRT/tropical geometry. It is not a triangle-level proof for every retained bespoke architectural ornament. The river/major bridges and most old landmarks are preserved and regression-checked, not newly surveyed. Station stairs/skywalks remain stylized; no physical passenger boarding system is added.

Physical iPhone Safari has **not** been tested. Retained geometry memory improves, while scene complexity and some draw-call costs increase; software rendering cannot establish acceptable mobile FPS. Physical-device startup, thermals and frame pacing remain required before calling this mobile-certified.
