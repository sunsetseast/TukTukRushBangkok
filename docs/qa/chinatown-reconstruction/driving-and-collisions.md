# Controller-driven route and collision report

Each independent journey begins at an actual graph stop. From there every metre, turn and arrival uses the production controller at60Hz. There are no mid-route teleports. Static routes disable NPCs for repeatability; the same matrix is repeated with Thai-left lane waypoints and with normal NPC traffic. Journey setup is not counted as traveled distance. The original eleven-fare test is byte-unchanged; only guidance now includes its final bounded curb offset.

| Journey | Static complete / contacts | Left-lane complete / contacts | Traffic complete / static / NPC contacts |
|---|---|---|---|
| yaowarat-east>yaowarat-west | PASS / 0 | PASS / 0 | PASS / 0 / 1 |
| gate>traimit | PASS / 0 | PASS / 0 | PASS / 0 / 2 |
| hua>gate | PASS / 0 | PASS / 0 | PASS / 0 / 0 |
| yaowarat-east>ratchawong | PASS / 0 | PASS / 0 | PASS / 0 / 1 |
| yaowarat-east>song-wat | PASS / 0 | PASS / 0 | PASS / 0 / 1 |
| song-wat>talat-noi | PASS / 0 | PASS / 0 | PASS / 0 / 0 |
| talat-noi>river-city | PASS / 0 | PASS / 0 | PASS / 0 / 0 |
| river-city>bang-rak | PASS / 0 | PASS / 0 | PASS / 0 / 0 |
| yaowarat-east>memorial-east | PASS / 0 | PASS / 0 | PASS / 0 / 1 |
| yaowarat-east>icon | PASS / 0 | PASS / 0 | PASS / 0 / 3 |
| yaowarat-east>pho | PASS / 0 | PASS / 0 | PASS / 0 / 1 |
| yaowarat-east>paragon | PASS / 0 | PASS / 0 | PASS / 0 / 3 |
| plaeng-nam>mangkon | PASS / 0 | PASS / 0 | PASS / 0 / 0 |
| wat-mangkon>holy-rosary | PASS / 0 | PASS / 0 | PASS / 0 / 0 |

| Matrix | Journeys | Travelled metres | Static / props / bridge / water / boundary contact frames | NPC contact frames |
|---|---:|---:|---:|---:|
| static | 14 | 16,315 | 0 | 0 |
| left-lane | 14 | 16,300 | 0 | 0 |
| traffic | 14 | 16,315 | 0 | 13 |

The traffic pass records13 NPC contact frames in the current seeded sweep. These are actual dynamic traffic encounters and remain a traffic-behavior limitation; they are not counted as static geometry regressions. Event IDs, positions and path traces are retained in [traffic-routes.json](traffic-routes.json). Destination-only local streets suppress NPC through-spawning. The existing traffic transition/left-lane tests check legal directions and junction transitions; the route pass is not proof that every possible traffic seed avoids deadlock.

The unchanged broad fare test completes11 deliveries,9,414m and991 simulated seconds with zero collision-indicator frames, including cross-bank travel and pause/recovery/restart checks. Its full package log is [test-bangkok.log](validation/suite/test-bangkok.log). The new14-journey matrix covers Yaowarat end-to-end, gate/Traimit/station, Ratchawong, Song Wat, Talat Noi/River City/Bang Rak, Memorial crossing, ICONSIAM, Old Town, Siam, Plaeng Nam/Mangkon and the two new heritage sites.

PR37 clearance tests still drive into the original isolated solids to prove collisions remain active, validate swept maneuver envelopes and retain the exact original fare assertions. Waterfront static/left-lane, river geometry/boat, premium destination, career/boost, save/discovery and recovery regressions run in the complete suite.
