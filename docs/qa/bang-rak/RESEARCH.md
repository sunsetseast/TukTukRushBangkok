# Historic Bang Rak reference and ownership register

Research checked 24 October 2026. All production meshes, signs and displays are
original code geometry. Reference photographs were inspected for art direction;
none is shipped, traced into a texture, or presented as a gameplay capture.
Existing locally licensed fonts and facade atlas are reused.

| Decision / source | Real location and identifying evidence | Implemented interpretation / limit |
|---|---|---|
| [TCDC directory](https://library.tcdc.or.th/visit/bkk_contact) | Grand Postal Building, 1160 Charoen Krung, Bang Rak | Named roadside landmark, actual existing mission/discovery contract. No tenant opening hours encoded. |
| [Docomomo Thailand, building 6](https://www.docomomothailand.org/pages/no6.html) | T plan; documented front body 103.80 × 38.52 m, stem 22 × 96 m; concrete frame, masonry, symmetrical elevation, recessed joints, central entry and upper Garuda sculptures | Original 92 m front, articulated three-wing facade, piers, deep bays, clock, stairs, simplified sculptural Garudas, shortened rear T stem. Model is an arcade interpretation, not a measured replica. |
| [Restoration architect](https://departmentofarchitecture.co.th/portfolio/thailand-creative-and-design-center-tcdc/) and [architect-authored project description/plans](https://www.archdaily.com/878178/thailand-creative-and-design-center-department-of-architecture) | Restored building; design library and creative workspaces in side/back wings; exterior photo and exploded plans inspected | Distinguish civic frontage from rear library wing. Recessed selective warm window panels; no point lights or full interiors. |
| [Warehouse 30 operator history](https://www.warehouse30.com/timeline/siamese-revolution-of-1932/) | Eight sheds, maps dated 1925–41, warehouse uses, timber floors, exposed beams/steel; historic exterior views from Sois 30 and 32 | Eight low industrial sheds in two compact rows. Pitched ribbed roofs, sliding/folding doors, beams, recessed original gallery displays, cafe and design-shop thresholds. Exact existing shed arrangement and current tenants are **not** reproduced. |
| [Warehouse 30 Captain Bush Lane history](https://www.warehouse30.com/explore-neighborhood/captain-bush-lane/) | Captain Bush Lane is Charoen Krung Soi 30; historic international merchant context | Named north approach and separate Soi 32 south approach from the existing Charoen Krung arterial. Public road stubs terminate before protected river compounds; internal aisles remain pedestrian spaces. |
| [River City visitor page](https://rivercitybangkok.com/plan-your-visit/) | Existing northern arts-centre and pier anchor | Identity, origin, wings, pier and existing approach retained exactly. Page timed out during this pass; rely on inherited approved venue register, not a new dimensional claim. |
| [Mandarin Oriental Creative District map](https://photos.mandarinoriental.com/is/content/MandarinOriental/bangkok-offer-creative-district-map) | Requested orientation reference | URL returned 410; not treated as retrieved map evidence. Existing approved Oriental Avenue and hotel grounds retained. |
| [Assumption Cathedral church office](https://www.assumption-cathedral.com/2018/06/17/สำนักงานวัด-church-office/) | 23 Charoen Krung 40 / Oriental Avenue | Outside the selected new parcel band. Do not place a generic church in the protected Mandarin Oriental compound to satisfy a landmark checklist. Deferred with its campus context. |
| [Customs House owner redevelopment notice](https://www.rabbitholdings.co.th/en/newsroom/news-releases/83/the-treasury-department-joins-hands-with-u-city-to-revitalize-more-than-130-year-old-custom-house-in-the-historic-charoen-krung-neighborhood-on-the-chao-phraya-river) | Heritage Customs House, Soi 36, protected riverfront redevelopment | Reviewed, not added. Current access/redevelopment needs a dedicated verified property boundary. No invented drive through the embassy/customs grounds. |

## Coordinate and ownership decisions

`district-plan.json` is generated from `bangRakPlan.ts`, the same objects consumed
by production collision, architecture, maps and navigation. Coordinates are
existing game-world metres (north is −Z). They are not latitude/longitude or a
new city projection. The two public lanes reuse existing arterial junction nodes
and append 26 nodes/26 edges; all 2,210 old edges retain their complete records.
A new immutable snapshot of PR41 (`validation/pr41-world.json.gz`) supports exact
migration checks, including every Chinatown building and all old landmark origins.

The original proposed River City–Oriental boundary overlaps already approved
Chinatown front/rear properties. This pass deliberately completes the highest-value
postal/warehouse portion rather than deleting those properties. **It does not
claim a geographically complete Si Phraya reconstruction.** River City remains
connected through the existing northern graph. A direct Si Phraya junction would
need a researched, explicit migration of those Chinatown interface lots.

The fitted `approvedBoundary` encloses complete retired/new footprints and road
aprons; `plan.boundary` retains the initial fitting seed. The work collar includes
separately protected hotel property, which retains its original ownership and
geometry. The eastern collar includes immediately adjacent Charoen Krung frontages. The post-office front is east-facing; its rear stem
is compressed east of the Mandarin Oriental reservation. Removed mutable lots
are explicitly listed with their full prior geometry. No protected building,
Chinatown frontage/rear parcel, road, river, bridge or transit structure is removed.
The rejected east-side corner lot remains rejected for street clearance; it is
not forced onto the Silom junction.

Working/public spaces, forecourt, loading approaches and private heritage grounds
have distinct uses. The generic new trade labels describe activities rather than
unverified real tenants. No claims of surveyed street widths, cadastral boundaries,
exact facade dimensions beyond the cited historic dimensions, or universal
photographic fidelity are made.
