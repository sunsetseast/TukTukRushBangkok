# Bangkok landmark accuracy and protected urban parcels — PR30

Built from current main `ce74d6b09854675a1b75a5d9675ed6c91225eccf` (merged PR29). This is a substantial corrective draft with a reusable audit system and a prioritized backlog. It does not certify every existing building as perfected. No merge or deployment is part of this work.

## Implemented corrections

- **Hua Lamphong:** explicit south-facing site shifted 18 game metres north, replacing the radial free-square search. A broad glazed arched facade, clock, classical colonnade, balustrade, recessed doors, side wings and barrel-vault train shed replace the earlier generic station. A road-fitted trapezoid protects and finishes the approach. The mainline station and underground MRT BL28 remain separate.
- **MBK:** detailed entrance/model and physical footprint rotate together to face Rama I to the north. **CentralWorld:** Centara's physical/rendered mass moves from the south to the north after correcting the local-axis interpretation.
- **Grand Palace and Giant Swing:** principal north approaches receive their own reservations rather than relying only on off-centre vehicle loops. The Palace's closed exterior gate moves onto the visible north boundary, with matching post colliders; visitor driving stays on the perimeter.
- **Shared parcel protection:** derived rotated structure/compound reservations, forecourts and narrow entrance connections are queried by every existing procedural generation path through the shared destination/placement checks. No city objects are hidden for a screenshot. Principal river elevations and separate street arrival roles are preserved.
- **Urban context:** 31 deterministic physical low-rise parcels across 12 landmark neighborhoods, with district-specific existing building grammar and finished mineral bases. All pass road, water, compound and obstruction checks. This is a bounded local infill pass, not citywide vacancy elimination.
- **Transit regressions found during audit:** terminal run-outs now continue to their appended endpoints. Siam's grade separation returns to normal platform height before nearby ordinary stations; an explicit lateral shoulder separates the shared approach. Rendered rails, train bodies, supports, reservations and the validator share the same track sampler. Late street infill now checks those actual positions.

## Quantitative results

| Measure | Result |
|---|---:|
| Named-place registry entries | 92 |
| Existing scene landmarks inventoried | 49 |
| Unique BTS station places / represented line stops | 25 / 26 |
| MRT surface entrances / embedded named sub-places / physical piers | 4 / 3 / 11 |
| Paired capture locations | 31 (30 scene landmarks plus Yaowarat street) |
| Actual before/after game screenshots | 144 |
| Licensed real-world reference photographs | 25 |
| Landmark centres repositioned / whole models reoriented | 1 / 1 |
| Additional compound tower mass relocated | 1 (Centara, 100 game metres north) |
| Major geometry/entry reconstructions | Hua Lamphong station; Palace exterior gate |
| Protected polygons | 179 (144 structure/compound, 20 forecourt, 15 entrance) |
| Cardinal facade-orientation checks | 20 passing |
| Sampled facade rays | 60 clear / 61 tested |
| Old building footprints removed inside current protected parcels | 42 |
| Current protected-parcel building conflicts | 0 |
| Context pocket candidates classified / developed | 1,150 / 31 |
| Fixed-grid roadside land samples / remaining vacant samples | 7,168 / 812 |
| Procedural building count | 6,951 → 6,965 |
| New controller-driven fares / distance / static collision frames | 5 / 4,830 game metres / 0 |

No hotel property centre is newly relocated. Existing bank relationships and river-facing architecture are checked; exact hotel boundaries and driveway surveys remain in the backlog. A registry entry or an automated pass alone never receives a visual grade. The [scorecard](scorecard.md) records before/after grades across eight dimensions, including the remaining C and D locations; unreviewed entries remain ungraded.

The untouched baseline has 34 clear rays, 24 blocked rays and three missing meaningful MBK approach samples under the new framework. Current main has 60 clear rays and one obstructed Terminal 21 side ray. That residual is reported; the neighboring parcel and correct approach require individual site research. Hua Lamphong's four critical features are clear both in the independent volume test and actual rendered-mesh raycasts.

The physical building generator reflows when protected parcels change: 1,210 footprint identities disappear and 1,224 appear, for a net change of only +14. These are not 1,224 net new buildings or individually researched properties. [Generation delta](generation-delta.json) distinguishes this reflow from the 42 directly obstructing old footprints. The baseline parcel replay and current-parcel removal count use different live plot/rotation inputs and are not identical metrics.

## Evidence and certification

- [Named-place inventory](inventory.md), [current researched/derived registry](registry-after.json), [baseline projection](registry-before.json).
- [Real photographs vs actual game comparisons](comparisons.md), [combined HTML review index](comparisons.html), [full paired screenshot gallery](gallery.md), [photographic attribution and checked primary sources](references/ATTRIBUTION.md).
- [Quality scorecard](scorecard.md), [machine-readable eight-dimension grades](scorecard.json), [manual observations](visual-observations.json), [prioritized remaining work](backlog.md).
- [Orientation and sightline output](visibility-after.json), [protected polygons and occupancy](parcels-after.json), [vacant-land classification](land-after.json), [bounded context plan](changes.json).
- [Latest passing regression matrix](regression-summary.json), [eight affected groups rerun after the rail fix](regression-final/summary.json), [new driven routes](driven-routes.json), [browser checks](browser/checks.json), [performance](performance.md).

The full initial sweep found two late street-infill parcels violating the corrected track envelope. Their actual placement rule was fixed; the original failed result is preserved in `regression/`, with passing affected rechecks in `regression-final/`. Across the latest result for each group, 32/32 groups pass. Typecheck and production build pass. The new controller tests drive through the real update/controller loop with traffic disabled for deterministic static-clearance certification; they do not teleport during a route.

Fixed cameras are labelled as inspection views, including river-facing inspections. Road and driving observers use the shared playable road graph and stay on the landmark's riverbank. The normal driving camera is separately captured at five representative locations. Both revisions share the same road geometry; no road bake or saved public node IDs change. Captures were made in multiple sessions, with corrected/affected views recaptured after review. Software WebGL and emulated viewports are not physical iPhone testing.

## Reproduction

From `artifacts/tuk-tuk-rush`, with the repository dependencies installed:

```sh
pnpm run typecheck
pnpm run test:landmark-accuracy
pnpm run test:master-plan
pnpm run test:open-bangkok
pnpm run qa:landmark-accuracy
CITY_SUITE_OUTPUT=/absolute/path/results/ node scripts/run-city-completion-suite.mjs
CHROMIUM_PATH=/path/to/chromium CITY_OUTPUT=/absolute/path/gallery CITY_LABEL=after node scripts/capture-landmark-accuracy.mjs
CHROMIUM_PATH=/path/to/chromium node scripts/browser-landmark-accuracy.mjs
```

For the baseline capture, use an untouched worktree at `ce74d6b`, copy only the two capture/pose scripts and run with `CITY_LABEL=before`. `CITY_RESUME=1` retains completed views and replaces outdated road poses; `CITY_NAMES=hua,palace` forces a selected recapture. `baseline-world.json.gz` is the actual untouched PR29 world snapshot used by the repeatable data replay. Reference photographs are documentation assets, never shipped runtime textures.

Further work is ordered in the [backlog](backlog.md). Hua Lamphong is the reference correction in this draft; the broader miniature still has significant architectural and urban-composition gaps.
