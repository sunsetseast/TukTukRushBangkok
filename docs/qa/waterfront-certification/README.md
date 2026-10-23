# Riverfront driving certification — PR37

Implemented on current main `d3823427bced0b04729beafe87a68ab444f98329`, the verified merge of PR36. This draft keeps the approved Chao Phraya geography, roads, landmark origins, transit and premium architectural models intact. Nothing is merged or deployed.

The original, unchanged seed-20 eleven-fare test reproduces **119 collision-indicator frames before** and **zero after**. The pickup/destination sequence is identical. Additional seed-26 and seed-41 runs also complete eleven fares each with zero contacts.

Both original encounters were heading reversals on the narrow Mandarin Oriental arrival corridor. Straight road clearance did not reserve the moving vehicle's turning sweep. A shared, spatially indexed maneuver contract now protects low-speed two-way arrival reversals and legal junction turns. Procedural fitting keeps actual rendering and collision footprints together. The nearby kiosk is refitted 2.41 world units away as a 4.5×4.5 building; the tree moves three units. The tuk-tuk collider, handling and original zero-contact assertion remain active.

The first 29-route static sweep completes with no contacts, including both bridge directions and cross-bank southern travel. A final complete package run, browser evidence, traffic categorization and GitHub Actions certification are in progress; this draft is not yet the final certification report.

- [Frozen preservation contract](preservation-contract.json)
- [Original baseline trajectory, controls and geometry](traces/before-fares.json.gz)
- [PR36 world snapshot used by the preservation tests](before-world.json.gz)

Final root-cause diagrams, the full route matrix, actual WebGL gallery, raw CI results and measured performance will be added to this same draft. Physical iPhone Safari remains unverified.


## Final-evidence reconciliation in PR38

The missing completed PR37 WebGL, traffic, full-suite and performance package is now retained with runtime-source equivalence proof in [the Chinatown reconciliation report](../chinatown-reconstruction/pr37-reconciliation.md). PR38 also reruns the waterfront regressions against its explicitly scoped local street migration. Historical PR37 reports and new PR38 measurements are identified separately.
