# Geography, access and compression

Base: merged PR27, `da733970864ff2cf1d670b04c4550dfdf38ab216`. East/south design grid remains `world = (design - [500,600]) × 4`.

| Relationship | Before | Implemented |
|---|---|---|
| Terminal 21 / Asok | Plot `[961,535]`, east of junction | Plot `[918,499]`, northwest of junction `[945,550]`; shared design anchor derives world location `[1672,-404]` |
| Victory / Siam BTS | Monument `[675,230]`, west of Siam `[710,455]` | Monument `[717,230]`, east of Siam BTS; clockwise circle and west-side BTS bend move together |
| CentralWorld frontage | Documentation said east; geometry/collider faced south | Root and physical masses rotate east by π/2; public event plaza is excluded from solid retail volumes |
| Benjakitti | Narrow lake strip | East lake with three west wetland fields and 28 islands; separate boardwalk/skywalk elevations, three pedestrian gates and roadside stops |
| Wat Pho | 50-unit isolated pavilion grouping | Expanded reserved sacred precinct at the existing anchor; separate hall/cloister/wall volumes, retained Reclining Buddha and connected outer vehicle arrival |

`EXISTING_SITE_WORLD_ANCHORS` now derives from the design catalog, removing a second independently maintained position table. Binary floating-point differences below 1e-8 world units are allowed in protected-position tests, matching the existing road-coordinate tolerance; this is not permission for visible relocation.

Landmark IDs, destination identities and discovery IDs remain stable. Generated roads feed asphalt, navigation, physics, passenger missions and map. The road bake is regenerated with key `1330215652`. Separate tests preserve 773 unaffected historical public edges and all established river crossings. The net road-count change comes from fitted private approach segmentation, not disconnected public routes.

Remaining compromises are explicit: Terminal's northward setback is exaggerated by the diagonal compressed Sukhumvit; Victory is east of Siam BTS but still west of Paragon's authored center despite the real longitude order. The invertible monotonic overview transform is retained, and authored residuals remain separate from nominal geographic coordinates. Full northern/downtown metric reconciliation would require more corridor surgery and visual validation. Benjakitti's boundary is an interpreted miniature plan, not an OSM survey. QSNCC/Green Mile and full Asok MRT public-space context remain deferred.
