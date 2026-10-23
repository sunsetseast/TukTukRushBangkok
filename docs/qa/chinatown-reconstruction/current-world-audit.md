# Actual PR37 baseline audit

The remote main and PR37 merge were checked before creating the reconstruction branch. A separate detached worktree at `4735f336cf53102e8079e3943a782239ed81e68c` supplied the before world and WebGL renders. Existing PR descriptions were not used as runtime geometry. The retained [before snapshot](before-world.json.gz), [road inventory](before-road-inventory.csv), [landmark/access inventory](before-landmark-access.csv) and [current game map](maps/current-game.png) enumerate the actual baseline, including every node, footprint, landmark and protected destination route.

| Runtime inventory | PR37 | Implemented |
|---|---:|---:|
| Nodes | 2034 | 2148 |
| Road segments | 2087 | 2210 |
| Buildings | 7204 | 7163 |
| Landmarks | 49 | 51 |
| Destination access ensembles | 10 | 10 |

Code audit covered cityData/cityModel, cityLayout/geography, world/masterPlan/historicPlan, urbanBlocks/streetFabric/streetEdges, environmentPlan/buildingGrammar/authoredSites, landmarkVisibility, roadManeuvers/vehicleEnvelope/roadSurfaceGraph, generated asphalt, riverfront, map/HUD/navigation/Destination. PR36 geographic records, iconic inventory, OSM reference and PR37 clearance contract were read together with live exports.

The baseline's named corridors existed but their control points poorly represented the relationships among Yaowarat, Song Wat and Talat Noi. The station-to-gate arc was called Tri Mit although OSM identifies that approach as Mittraphap Thai-China. A workshop shortcut supplied an artificial local connection. Generic offset wings and street infill were unaware of coherent block interiors. Facades could face other building rows; independent diagonal frontage patches left poor corners. Existing Scala art lacked a resolved Chinatown restaurant identity. Wat Mangkon and Holy Rosary were absent as protected rendered sites.

The before gallery preserves those shortcomings. The baseline was not collision-broken: the merged PR37 maneuver system and original zero-contact fare test remain the starting foundation. They are independently rerun after reconstruction. Existing hotels, Gate, Traimit, station, River City, bridges, water, career and boost behavior are retained.

Baseline source provenance: `git fetch origin main`, main SHA equality to the verified PR37 merge, and GitHub merged PR metadata were checked. `pr37-recovered/provenance.json` additionally compares all 210 tracked runtime files from recovered final PR37 evidence with the merged source (zero differences).
