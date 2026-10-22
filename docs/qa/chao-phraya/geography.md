# Geography, comparison maps and compression

## Source interpretation

OpenStreetMap **water-covered polygons**, not a nominal named river line, supply the banks. Relations 14038958, 14038959 and 18576208 cover the historic/central/downstream reaches. Their member-way topology is assembled into outer and inner rings, dissolved and retained as GeoJSON. Relation 227317 supplies the separately mapped main-stream spine. Modern `natural=water + water=river` and legacy riverbank representations were investigated; the relevant retained bank relations use the modern scheme.

The source river moves south past the historic precinct, turns east through the Memorial/Song Wat shoulder, turns into the Talat Noi/central-hotel reach, then sweeps southwest past the southern hotels and bends east farther downstream. The final bend is sourced, not invented to close the game rectangle. The playable south edge corresponds to the adapted reach around latitude 13.681; scenic source water continues beyond it. Bang Kachao's complete loop and neighborhoods are excluded.

## Maps

| Map | What is actually plotted |
|---|---|
| [A](maps/map-A.png) | PR35's committed baked water surface, actual generated roads/bridges, landmark origins and playable rectangle. This includes existing canals. |
| [B](maps/map-B.png) | WGS84 OSM water polygons and main-stream line, fetched bridge ways, named nominal landmark coordinates and Asiatique's mapped wheel. North up; longitude aspect adjusted by latitude. |
| [C](maps/map-C.png) | Proposed approved river in game X/Z; old baked position dashed, existing roads/landmarks, affected procedural parcels, Asiatique's intended move and proposed boundary. |
| [D](maps/map-D.png) | Final live-world banks, actual reconciled roads, piers and landmark origins; old geometry retained for comparison. |

A and C use the same game coordinate scale. B uses geographic coordinates and is not silently labeled as game coordinates. The SVGs and retained input GeoJSON make the maps reproducible. `initial-conflicts.json` is the pre-implementation discrepancy inventory; `graph-approval-delta.json` and `parcel-migration-ledger.json` record the implemented reconciliation.

## Deliberate arcade adaptation

The existing **global** longitude/southing projection remains unchanged. The river has its own documented local compression, stored in `waterApproval.compression`:

- geographic longitude progression supplies the lateral shape;
- monotonic latitude/station knots fit the historic precinct, existing crossings and central hotel corridor into the existing playable scale;
- explicit lateral exaggeration retains usable widths and variation at miniature scale;
- bounded southern offsets integrate the already implemented hotel corridor;
- topology-preserving simplification has a 3-world-unit tolerance.

The resulting outer ring has 1,099 vertices, a 60-point flow spine and five separately retained source structure exclusions. The five OSM inner exclusions are tagged bridge supports or boathouses; they do not become terrain islands. Their source geometry remains a boat-clearance constraint. These are engineering coordinates, not surveyed meters. The local warping changes aspect ratios and station spacing. Approximate hotel origins retained from earlier PRs are not independently re-surveyed here; close north/south alignments, property lengths and exact gate bearings remain compressed. In particular, River City/Hilton are nearly abreast in game rather than exactly reproducing their real longitudinal station separation.

## Bend correction report

| Reach | PR35 discrepancy | Implemented correction / limit |
|---|---|---|
| Pinklao / historic bank | Broad fixed ribbon with very few changes in curvature | Source bank contours and narrowing, continuous upstream water. Existing approach network remains a compressed crossing representation. |
| Palace / Tha Tien / Arun | Nominal bank offset drove walls, land and ferry placement independently | One physical polygon and sampled banks; both public landing paths are checked against buildings. |
| Memorial / Song Wat | Generic diagonal shoulder, limited bank detail | Source-derived eastward shoulder, changing width and transition into the Talat Noi bend. |
| Chinatown / Talat Noi | Sparse spine defined the entire channel | Bank contour progression and inner/outer bend shape retained; submerged procedural frontage is reconciled rather than steering water around it. |
| River City / Hilton / ICONSIAM | Fixed width and simplified reach weakened the banks' relationship | Distinct variable-width central reach; correct source-backed bank identity; preserved hero origins/materials with adapted terraces and piers. |
| Oriental / Peninsula / Shangri-La / Taksin | Nominal-width bank tests and X-side assumptions | Polygon shore clearance and downstream bank identity, with a clear driveable bridge deck and connected Sathorn landing. |
| Capella / Four Seasons / Asiatique / Anantara | Simplified westward line ended before the downstream sweep | Source southern banks, Asiatique moved toward the bank, natural eastward continuation and extendable south limit. |

The geographic comparison supports the resemblance claim. Geometry and controller tests support implementation consistency; neither is an independent human certification of real-world likeness or surveyed precision.
