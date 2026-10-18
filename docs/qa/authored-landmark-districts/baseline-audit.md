# Baseline audit — current main 199321d (PR25)

Inspected the real-place registry/models, commercial and skyline models, map generation, destination roads, collision footprints, transit reservations, facade batching, street-edge sampling, landscape placement, mesh lifecycle and PR25 reference/screenshot/performance inventories.

- **Replace:** Oriental's flat broad glazed slab and compressed heritage wing; Shangri-La's indistinct pair of slabs; Four Seasons' three square courtyard tiers; Embassy's stack of rounded floor plates with a disconnected zigzag ribbon. All are C in PR25, confirmed by the actual renders and geometry.
- **Reconstruct frontage:** Paragon's shallow half-cylinder/portal; CentralWorld's short generic boxes. Siam Center/Discovery need separate street identities. River City's elevation needs more reference work.
- **Refine:** Mahanakhon's evenly rotating, oversized two-turn notch; room bands and ground-level entrances at Erawan/Eastin; Capella's court/villa detail. Preserve Peninsula's W plan, Hilton's rounded slab/disc, Rosewood's real open slot and State Tower's single Lebua ID.
- **Placement defect:** `placeRealArchitecture` searches nine nearby centers and installs one rectangular obstacle. The rectangle prevents real open courts and excludes an entire compound from traversal. Existing hotel roads are explicitly labeled fictional and attach near a rear facade.
- **District defect:** Hotel gardens are scattered identical landscape pockets beyond the site; large green gaps remain between inland hotel anchors and the river. Important hotels must gain deliberate compound surfaces, circulation and dense urban edges without turning water into land.
- **Geography:** West bank Hilton → ICONSIAM → Peninsula order is correct. Oriental → Shangri-La → Four Seasons → Capella order is retained. Embassy currently nudges 6 design units east; its authored anchor will be explicit. Existing map is compressed design coordinates, not GPS.
- **Cost baseline:** PR25 resident geometry/instance buffers 123.67 MiB, 372 materials, 13 texture objects. Taksin Detailed 203 calls / 295,134 triangles. These historical measurements must not be presented as new matched measurements; new samples are required for comparisons.
- **Unfinished streets:** PR25 reports 130 open rays of 8,322. Re-measure physical coverage after reconstruction; do not rename empty grass to satisfy coverage.

Priorities: authored reservations and separate physical wings; Oriental/Shangri-La/Four Seasons/Embassy; quieter Mahanakhon carving; retail frontage; four researched new destinations; compound landscapes and district street edges; rendered/route/performance verification. Reference photography is analysis-only; all runtime assets are original meshes/materials.
