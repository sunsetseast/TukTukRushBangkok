# Waterfront route certification

All journeys below use the production VehicleController with physics enabled. Start poses initialize each independent case; no position changes occur mid-route. Static runs isolate scenery, terrain, water and bridges. Traffic runs repeat the same journeys with 38 production traffic vehicles. Distances are compressed game-world units, not real Bangkok metres.

| Actual journey | Static distance / frames | Static physical contact frames | Traffic distance | Traffic physical contact frames (moving vehicles) | Other physical contacts |
|---|---:|---:|---:|---:|---:|
| gate>songwat | 709 / 4486 | 0 | 710 | 36 | 0 |
| songwat>talatnoi | 245 / 1655 | 0 | 245 | 0 | 0 |
| talatnoi>river-city | 1011 / 6283 | 0 | 1011 | 0 | 0 |
| river-city>oriental | 937 / 5848 | 0 | 937 | 0 | 0 |
| oriental>river-city | 937 / 5850 | 0 | 937 | 0 | 0 |
| hilton>icon | 239 / 1689 | 0 | 239 | 0 | 0 |
| icon>hilton | 240 / 1764 | 0 | 240 | 0 | 0 |
| icon>peninsula | 776 / 5003 | 0 | 776 | 0 | 0 |
| oriental>peninsula | 1665 / 10250 | 0 | 1665 | 0 | 0 |
| peninsula>oriental | 1665 / 10250 | 0 | 1665 | 0 | 0 |
| peninsula>shangri | 1286 / 7980 | 0 | 1286 | 0 | 0 |
| shangri>sathorn | 363 / 2391 | 0 | 363 | 0 | 0 |
| sathorn>capella | 307 / 2056 | 0 | 307 | 0 | 0 |
| capella>four-seasons | 831 / 5242 | 0 | 831 | 0 | 0 |
| four-seasons>asiatique | 383 / 2540 | 0 | 383 | 0 | 0 |
| asiatique>four-seasons | 383 / 2572 | 0 | 383 | 0 | 0 |
| asiatique>anantara | 2556 / 15647 | 0 | 2556 | 6 | 0 |
| anantara>asiatique | 2556 / 15619 | 0 | 2556 | 2 | 0 |
| anantara>icon | 1782 / 11011 | 0 | 1782 | 4 | 0 |
| pho>arun | 2297 / 14196 | 0 | 2297 | 4 | 0 |
| arun>pho | 2297 / 14145 | 0 | 2298 | 2 | 0 |
| pinklao-west>pinklao-east | 693 / 4339 | 0 | 693 | 2 | 0 |
| pinklao-east>pinklao-west | 693 / 4339 | 0 | 693 | 3 | 0 |
| memorial-west>memorial-east | 588 / 3710 | 0 | 588 | 2 | 0 |
| memorial-east>memorial-west | 588 / 3710 | 0 | 588 | 0 | 0 |
| taksin-west>taksin-east | 713 / 4459 | 0 | 713 | 0 | 0 |
| taksin-east>taksin-west | 713 / 4459 | 0 | 713 | 0 | 0 |
| original-3-delivery | 1305 / 8141 | 0 | 1305 | 3 | 0 |
| original-10-pickup | 242 / 1695 | 0 | 242 | 0 | 0 |

Every listed static/traffic journey completes. Total static distance is 29000 units. Traffic contact counts are actual resolver frames, not independent crash events or the longer collision-indicator cooldown. The traffic replay records **64 moving-vehicle contact frames**, and zero static-obstacle, roadside-prop, bridge, water or boundary contact frames. Those moving contacts are documented, not described as resolved.

The Song Wat/Talat Noi cases cover the existing game connectors. They do not certify a surveyed reconstruction of those real streets. Sathorn is the vehicle road approach to the pedestrian pier. Bridge-specific left-lane cases below additionally use the production Thai left-side lane offset, rather than treating a road-centerline test as a lane test.

| Bridge direction | Distance | Minimum signed left offset | Physical contacts |
|---|---:|---:|---:|
| pinklao-west>pinklao-east | 693 | 3.000 | 0 |
| pinklao-east>pinklao-west | 693 | 3.000 | 0 |
| memorial-west>memorial-east | 588 | 3.000 | 0 |
| memorial-east>memorial-west | 588 | 3.000 | 0 |
| taksin-west>taksin-east | 713 | 3.000 | 0 |
| taksin-east>taksin-west | 713 | 3.000 | 0 |

Asiatique’s existing PR36 origin and arrival loop are preserved. Four Seasons→Asiatique, the return, and the Asiatique↔Anantara opposite-bank journeys all complete with zero static contacts. The [matched entrance, loop and normal driving views](gallery.md) show the actual warehouse/Ferris-wheel setting and existing entrance. Its approach remains an arcade-compressed road connection; no southern expansion or new road network is implied.

Lifecycle tests pause/resume, inspect ICONSIAM then restart three times, recover a submerged save position without resetting career/mission progress, naturally complete a shift, and return to free roam. Browser tests separately return from the map, perform three real inspection/restart camera roundtrips, and check safe resume. The existing career suite checks save/load and rewards. See [raw static](static-routes.json), [traffic](traffic-routes.json), [left lanes](left-lane-routes.json), and [browser](browser/after-qa.json).
