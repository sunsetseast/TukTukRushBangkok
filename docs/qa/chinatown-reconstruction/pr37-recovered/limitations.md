# Scope and remaining limitations

The original eleven-fare static-world regression is resolved without weakening its assertion. Certification covers the recorded journeys, three eleven-fare seeds, both directions on the three existing bridges, targeted placement checks, four browser viewports and lifecycle cases. It does not certify every street, every itinerary/seed, arbitrary steering or every high-speed turn.

Traffic-enabled journeys record moving-vehicle contacts separately. All complete, with zero static/prop/bridge/water/boundary contacts, but traffic interaction is not described as collision-free or repaired. The existing traffic-contact limitation remains visible in raw telemetry.

Physical iPhone Safari is unavailable in this environment. Chromium/SwiftShader layout and WebGL checks are browser simulation. They cannot establish stable iPhone FPS, battery usage, thermal behavior or Safari-specific stability. Portrait driving continues to show the existing rotate-to-landscape guard. Landscape gas/brake pointer handlers and control bounds are tested.

This correction preserves the approved river, every road/node/destination and premium architecture. Existing arcade compression and road/arrival approximations remain, including the current Song Wat/Talat Noi connectors and Sathorn's road approach to its pedestrian pier. ICONSIAM's Gold Line still crosses part of the fixed street-view camera composition; the comparison keeps it visible. No broad facade, park, signage or citywide street redesign is claimed. The local shift is small, so most matched frames intentionally look very similar.

The retained city has substantial draw-call costs from PR36. ICONSIAM software frame timing is slower in the matched measurements, including the fresh-process repeat; the cause remains unresolved. This PR measures its own impact and preserves useful detail. It does not claim to remove PR36's draw-call growth or to prove a mobile performance budget from software-rendered frames. Scene disposal counters and three reset iterations are bounded resource checks, not a days-long leak proof.

Next phase: reconstruct selected Yaowarat, Song Wat and Talat Noi streets/intersections/blocks using the approved PR36 river and geographic comparison maps. Preserve stable destination/road identities where possible; retain the maneuver-clearance contract and re-run the unchanged fare regression and explicit left-lane bridge cases. Real street-name banners, a wider southern city, Bang Kachao and architectural replacement remain outside this PR.

No merge or deployment is performed. This remains one draft PR for review and physical-device testing.
