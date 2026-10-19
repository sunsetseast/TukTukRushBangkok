# Placement conflict report

The same current validator was run against untouched PR28 and this draft. It checks rotated footprints, pitched decorative extents, full road width and rounded node turning caps. Seven distinct object volumes produced twelve road/turn-envelope contacts in PR28; zero remain in the implemented world. A wall and its render parts are separate volumes, not seven separate landmark buildings.

| Baseline object ID | Landmark / world X,Z | Conflicting corridor or turn cap | Severity | Source correction | Result |
|---|---|---|---|---|---|
| `arrival-prop:pho:6900` | Wat Pho: -868.00, -526.00 | old_w, turn | severe lane intrusion | Fit the complete forecourt wall/cap/post/planting assembly against the live road graph; collider and art share the fitted point | clear |
| `destinationArt:34` | Wat Pho: -868.00, -526.00 | old_w, turn | severe lane intrusion | Fit the complete forecourt wall/cap/post/planting assembly against the live road graph; collider and art share the fitted point | clear |
| `destinationArt:35` | Wat Pho: -868.00, -526.00 | old_w, turn | severe lane intrusion | Fit the complete forecourt wall/cap/post/planting assembly against the live road graph; collider and art share the fitted point | clear |
| `destinationArt:36` | Wat Pho: -868.00, -508.00 | old_w | severe lane intrusion | Fit the complete forecourt wall/cap/post/planting assembly against the live road graph; collider and art share the fitted point | clear |
| `destinationArt:37` | Wat Pho: -868.00, -508.00 | old_w | severe lane intrusion | Fit the complete forecourt wall/cap/post/planting assembly against the live road graph; collider and art share the fitted point | clear |
| `destinationArt:90` | Wat Arun: -1461.04, -489.16 | west | severe lane intrusion | Fit the complete forecourt wall/cap/post/planting assembly against the live road graph; collider and art share the fitted point | clear |
| `destinationArt:736` | Asiatique: -286.37, 2021.19 | arrival, turn | severe lane intrusion | Fit the complete forecourt wall/cap/post/planting assembly against the live road graph; collider and art share the fitted point | clear |

The offsets are deterministic and bounded to 32 game metres. The landmarks retain their declared mass and orientation. Collisions remain active. `arrivalFurniturePoint` is shared by physical furniture and emitted art, so decorative caps cannot silently remain at an obsolete location.

During reconstruction, the full visible tropical crown/frond plan is screened against road and elevated transit envelopes. Sites with insufficient space receive actual shorter understory models and corresponding collider heights. This is planting design, not a collision exemption. The final plant-volume report tests both near and coarse LODs.

Rail-specific corrections include shared road station anchors, the Phaya Thai approach west of Siam Center, tangent-continuous rounded track controls, Siam grade separation before lateral convergence, and larger swept procedural infill reservations. These are verified by station/track tests, building-versus-rail volume tests and actual moving car-body intersections.

See [raw baseline contacts](conflicts-before-survey.json), [after collision/decorative survey](conflicts-after-survey.json), [full lane/canopy/rail results](conflicts-after.json), and [validation inventory](validation.json). Bounds are conservative declarations, not a triangle-level survey of every retained sculptural ornament.
