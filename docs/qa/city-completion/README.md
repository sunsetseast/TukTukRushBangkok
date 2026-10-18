# Bangkok urban-block and landmark reconstruction

This draft starts from current main `da73397` (merged PR27). It implements geographic corrections, more complete block fabric, commercial/historic geometry and Benjakitti wetlands. **The full visual definition of done is not certified.** Browser captures and physical iPhone Safari validation are unavailable in this session; no new A/B fidelity grades are claimed.

## Implemented behavior

- Terminal 21 moves northwest of Asok through a shared geographic anchor; arrival roads, collision, missions, map/discovery and BTS linkage consume the new world location. Victory moves east of Siam BTS with its functioning clockwise circle, approaches and west-side guideway. A northern rail bend found by the continuity test is corrected rather than relaxing that test.
- Road-oriented, bounded district block planning fits asymmetric connected wings, service courts, secondary buildings and rear elevations into actual clear land. 13 planning grammars cover historic, Chinatown, riverfront, Siam Square, office/residential, northern and southern settings. Every building participates in collision, rail/site/water exclusions and existing quality/culling paths. Service courts reserve circulation without becoming solid vehicle blockers.
- Siam Square's ordinary buildings use two/three-storey retail, cafés and shophouses instead of tall office grammar. CentralWorld faces east and gains northern connected hotel massing, an integrated LED facade and round plaza pavilion. Its retail/Paragon collisions use separate masses so forecourts remain open. MBK gains a roof barrel/metal shoulder; Siam Center gains deep bronze frames and a projecting entrance. Discovery and Paragon's stronger forms are preserved.
- Bang Rak, Khlong San, Talat Noi and other districts receive fitted heritage/residential/service blocks with finished side/rear elevations, canopies, selective night windows, roof equipment and drainage/loading courts. Hotel compounds remain authored assets. River City, Oriental, Shangri-La, Hilton and Peninsula gain nearby passenger-pier context.
- Wat Pho retains the sculpted Reclining Buddha and expands into a multi-hall, cloister, wall/gate and sala precinct. Suthat gains another roof tier/terrace details. Jim Thompson's six-house compound gains mature canopy with an updated overall height declaration.
- Benjakitti gains an eastern lake and three western wetland fields, 28 dry micro-islands, reeds, planted islands, ground paths, low boardwalk and elevated canopy walk, plus reused factory structures with collision. Vehicles use perimeter stops; pedestrian walks are absent from the road graph.
- Original 7-Eleven name/logo/tricolor premises and five storefront configurations are retained and tested.
- Immutable box position/normal/UV/color/index buffers are shared across architectural cells; per-cell surface IDs, transforms, colors, culling and ownership remain independent. No new dependency, runtime photo texture, per-building light or transparent vegetation layer is added.

## Evidence and boundaries

[Measurements](performance.md) · [Geographic decisions](geographic-decisions.md) · [Primary references](references.md) · [Structural checks](structural-validation.json) · [Driven routes](driven-routes.json) · [Regression logs](validation/summary.json) · [Visual acceptance status](gallery-status.md)

The fixed-grid survey complements roadside samples. It classifies water, public space, roads, authored/circulation reservations, developed cells and vacancy separately. Counts are samples, not exact cadastral parcels or a finished-city percentage. Ground color never counts as development. Raw before/after cells and district breakdowns are retained in `survey-before.json` and `survey-after.json`.

## Deferred work and acceptance limits

- **35-location / 82-view capture manifest is preparation only. Zero new rendered screenshots are supplied.** The earlier gallery remains a historical baseline. Driving-height, elevated and night review must be completed before accepting visual fidelity; no grades are raised on the basis of geometry tests.
- Physical iPhone Safari frame rate, thermals, memory pressure, touch interaction and real hardware draw-call measurements remain unvalidated. Node retained-resource inventory excludes browser canvas labels and cannot substitute for GPU profiling.
- This is substantial bounded block reconstruction, not completion of every parcel. Vacancies remain in western/northern/southern districts. Generic supporting architecture and repeated forms still need visual art direction.
- The full Siam master plan, exact CentralWorld proportions/skywalk network, individual Siam Square storefronts, full MRT/Asok public environment, precise riverfront entrances/piers and additional hotel refinements remain incomplete.
- Wat Pho is a compressed precinct with omitted structures; Pak Khlong Talat gains denser surrounding blocks but its stock market halls still need a deeper architectural pass. Sanam Luang's civic perimeter and One Bangkok/Dusit/Embassy's previous partial models are retained without claiming new fidelity.
- Benjakitti's wetland topology is interpreted rather than survey-derived. Complete QSNCC surroundings, Green Mile, accurate species/ecology and full recreation facilities are deferred.
- True geographic compression reconciliation, lazy district generation/loading, bundle splitting and physical-device performance certification remain future work. The existing large-bundle warning remains.

Draft only. No merge or deployment.
