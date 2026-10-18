# PR27 — Bangkok geography and living public spaces

Base: current main `9e24ada`, merged PR26. This draft reconstructs public-space geography and whole street settings, rather than treating every destination as a nearby rectangle. Original stylized meshes and local vector/canvas branding are used; research photographs are references, not runtime assets.

## Implemented

- Canonical 27-location geographic reference catalog with latitude/longitude, roads, riverbank, entrances, adjacent landmarks and explicit compression residuals. The invertible piecewise projection supports future planning without claiming that the compressed game is GPS-accurate.
- Lumphini's actual-outline-derived boundary and lake/island topology, varied groves, recreation paths/bridges, gates, boundary fencing, Rama VI monument, clock tower, pavilions and a connected Wireless school-side parking loop. Pedestrian paths remain separate from traffic roads. Rama IV/Ratchadamri now follow the diagonal southwest boundary. Dusit moves south of that junction; One Bangkok remains east of the park.
- Victory Monument centered in a 40-edge clockwise, two-lane roundabout with four connected approaches. Five-bayonet memorial, bronze service figures, stepped base, horseshoe skywalk, paved bus-stop apron and shelters. BTS wraps west of the memorial. Ambient traffic uses both lanes with continuous junction turns.
- Sanam Luang's sourced ceremonial-field outline, tree-lined edge, entrance paths and reconstructed perimeter streets north of the Palace. Benjakitti receives a bounded, reachable public-space plan, while its detailed forest-park reconstruction remains partial.
- Giant Swing / Wat Suthat compound; covered flower-wholesaler blocks and Yodpiman frontage; six-house teak Jim Thompson compound with garden/pond/canal-side context and a Kasemsan drop-off lane; River City screened waterfront facade and a plot closer to the east riverbank.
- Larger, distinct MBK, Siam Discovery, Siam Center, Paragon, CentralWorld and Terminal 21 models. Discovery is west of Center and both face Rama I; new Siam Square streets and an Asok north connector join the same collision/navigation/traffic graph. Retail arrival collisions preserve the declared rectangular footprints rather than overwriting them with square barriers.
- Thirty-five representative Thai 7-Eleven premises use the actual name, recreated red/orange/green identity, five storefront configurations, illuminated local atlas, glass/door/product detail and safe collision-backed forecourt props. Store records support future water/snack interactions; purchases and energy systems are not enabled.
- Bounded low-rise back-block fabric, more flexible physical frontage fitting, service-court ground aprons and urban aggregate ground. This is separate from explicit green parks/gardens and does not declare every interstitial patch finished.
- River City is brought to the shore, and the shared hotel estate is realigned so Capella lies north of Four Seasons. Other useful PR26 hotel plots and the major river bridges retain their identities.

## Regenerated before/after inventory

| Measurement | Main `9e24ada` | Draft |
|---|---:|---:|
| Authored landmark sites | 25 | 27 |
| Real-place compounds | 17 | 17 |
| Separate real-place solid masses | 47 | 54 |
| Procedural/collision-backed buildings | 5,111 | 5,639 |
| Sourced/bounded public-space plans | 0 | 3 |
| Registered 7-Eleven premises | 0 | 35 |
| Unresolved roadside samples | 77 / 8,534 | 71 / 9,546 |
| Automated test groups | 22 / 22 | 29 / 29 |

The sampling graph changes with new streets; the open-edge totals are not the same denominator and are not a terrain-area percentage. Generic ground color changes are not counted as added buildings. Behind-frontage gaps remain visible in the gallery.

## Evidence

[Baseline audit](baseline-audit.md) · [Canonical geography](canonical-geography.md) · [Reference inventory](references.md) · [Commercial references](commercial-references.md) · [Historic references](historic-references.md) · [Victory references](victory-references.md) · [Stores/urban audit](stores-urban-audit.md)

[Visual approval gallery](gallery.md) · [Fidelity grades](visual-review.md) · [Performance](performance.md) · [Public-space/site inventory](site-inventory.json) · [Remaining roadside gaps](remaining-edges.json) · [Store/source inventory](store-source-inventory.json)

[Test summary](validation/summary.json) · [Public-space validation](public-space-validation.json) · [Victory traffic/controller validation](victory-validation.json) · [Driven routes](driven-routes.json) · [Browser interaction report](browser/report.json)

## Integrity and performance

Unchanged-position public nodes retain legacy identifiers. An explicit protected-road baseline checks all unaffected corridors and major bridges; intentional civic/intersection realignments are listed in the regression helper and geographic decisions. Landmark/discovery/save identifiers remain stable. Navigation, asphalt/curbs, traffic and map all consume the same reconstructed graph. The road bake is regenerated; hashing uses 0.1 mm coordinate precision so sub-nanometer JavaScript-engine trig differences cannot falsely invalidate it.

Public-space detail uses batched near/far meshes, shared opaque materials and selective emissive elements. Stores share a 512×256 atlas; park gates share another bounded atlas. No new dependency or per-store/park point light was added. The gallery, resource inventory and before/after samples are actual WebGL evidence, not physical iPhone testing.

## Remaining work

Exact Victory/Siam east-west alignment and Terminal 21's precise northwest-corner plot remain compressed compromises. Full Siam skywalk/retail-master-plan detail, Benjakitti's forest/wetland geography, historic civic surroundings, complete pier networks, and all residual inter-block ground remain incomplete. PR26's partial Embassy / Dusit / One Bangkok architecture is retained and not promoted to a higher fidelity grade by this work. Some approach views remain occluded; these are documented, not hidden by deleting scenery.

Open gaps and partial fidelity grades remain explicit. This is not a claim that every part of Bangkok is finished. Physical iPhone Safari validation is still required. No merge or deployment.
