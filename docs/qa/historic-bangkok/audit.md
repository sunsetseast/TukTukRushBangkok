# Audit of current main and reconstruction decisions

The base is merged PR31, not an earlier working branch. PR29 geographic reconstruction and PR31 landmark-accuracy maps, scorecards, actual screenshots, protected parcels, registry and driven-route reports were read before editing. Relevant retained evidence is in `../geographic-city-reconstruction`, `../landmark-accuracy` and `../master-plan`. `baseline-world.json.gz`, `before/capture.json` and `registry-before.json` preserve the actual main world used for comparisons.

## System audit

| Existing source / system | Finding and action |
|---|---|
| `layout.json`, `geography.ts`, `masterPlan.ts`, `world.ts` | Regional compression and fallback plots were mixing landmark origins with actual features. Add explicit local controls; keep global scale and unrelated anchors. Correct the Swing feature rather than merely renaming a model origin. |
| `civicRoads.ts`, `publicSpaces.ts`, `roadSurfaceGraph.ts`, road bake | Segment splitting already feeds all gameplay consumers. Reconstruct segments before splitting, bake once, assert the shared graph key. Sanam lawn and outer public grounds need separate boundaries within the same public-space type. |
| `authoredSites.ts`, `realPlaces.ts`, `historicDistricts.ts`, `landmarkSites.ts` | Reuse existing detailed Palace, Pho, Suthat and Gate art. Explicitly place fallback Golden Mount, Democracy and Traimit. Add a hill and lower compound, preserve Pho's reclining Buddha. |
| `landmarkParcels.ts`, registry, visibility, context and spatial validation | Retain the sole protected-parcel index. Expand actual compound/rail-yard boundaries and semantic feature positions. Existing single-observer facade checks are supplemented by 24 distinct road approaches and 12 rendered-mesh rays. |
| `huaLamphong.ts` | PR31 facade is a successful foundation: no replacement. South clock, glazed arch, wings, columns and forecourt remain. North train shed and ground-level tracks were too short. Add the rear yard inside an asymmetric protected boundary. |
| `destinationAccess.ts`, `destinationArt.ts` | The Palace's invented vehicle loop conflicts with tighter perimeter geography. Use a public north curbside boarding stop; keep sacred interiors closed. Traimit uses the actual Tri Mit approach. |
| `streetFabric.ts`, `streetEdges.ts`, `urbanBlocks.ts`, `urbanCompleteness.ts` | Existing facade grammar, material sharing and instancing work. Expand only selected Old Town blocks and station/gateway frontage budgets, using the existing land and parcel checks. No citywide density setting changed. |
| `transit/network.ts`, navigation and traffic | Existing graph is authoritative. Preserve BTS/Gold Line geometry, underground MRT BL28, bridges and one-way Yaowarat. New circles must be graph edges, not decorative asphalt. |
| `Renderer.tsx`, `WorldMap.tsx` | Already consume shared city data. No competing map or renderer patch required. Verify actual WebGL, map markup, lifecycle and inspection reset through existing hooks. |

## Specific defects corrected

The PR31 visible Swing was south of the Palace. Moving only the red structure would have left Suthat, roads and collision reservations behind; instead the combined site, public square and road network move together. Wat Pho was southwest and too remote from the Palace. Maha Rat and Sanam Chai left whole generic blocks against compound frontages. Democracy was on a fallback plot without a complete playable civic ring. Golden Mount looked like a small decorative mound. Wat Traimit's fallback plot and the station-to-gateway chord weakened the neighborhood relationship. Sanam's lawn-only reservation permitted a row of houses inside its perimeter roads.

A junction defect found during implementation is also fixed: after bending Ratchadamnoen onto its new circle, Boripat and Maha Chai ended just short of the final avenue chord. Visual asphalt overlap concealed disconnected graph nodes. Reprojecting endpoints onto the final chord eliminates that near miss; explicit node-degree and arm-pair reachability checks guard it.

## Compatibility and scope

Destination IDs, discovery IDs, fare identities, save schema and all three existing rail-line IDs stay intact. Career saves store progress and discovered IDs, not permanent road-node paths; routes are recomputed against the new world. Active sessions should reload to construct the new graph and bake together. Local generated node/edge IDs change; protected geography tests still check 679 preserved edges and unchanged named sites outside the authorized corridor. The Swing registry now separately records its visible feature and combined model origin. This is a semantic correction, not a new save format.

The eastern Khao San approach and southern Old Town chords necessarily change with this network. Unrelated Siam/Asok architecture, hotel parcels, northern districts, Thonburi and Terminal 21's BTS-support sightline are deferred.
