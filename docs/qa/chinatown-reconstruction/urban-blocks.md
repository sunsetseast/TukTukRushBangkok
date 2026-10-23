# Block and parcel rules

`generate-chinatown-blocks.ts` performs integer polygon difference: approved district boundary minus the actual road-plus-sidewalk ribbons (`width/2 + 6.2`), protected landmark plots, arrival reservations and authoritative water. This produces bounded irregular polygons with interior holes. No cadastral authenticity is claimed for these game parcels. The baked road key prevents using polygons against a changed graph.

At world construction, actual boundary edges find nearby suitable road frontages. Arrival loops, bridges, roundabouts and distant boundary edges are not shopfront edges. Collinear edges on the same corridor merge. Frontages divide into roughly12-unit commercial bays or16-unit warehouse bays; shared row gaps are0.72 units. Depth attempts fit38/30,22,14,10-unit buildings wholly inside the polygon and outside holes. Normals point from each block toward its real frontage road; the rear sits in the block. No independently offset second row owns the same space.

The current output has **24 blocks / 798 parcels**. Every rectangle corner is tested against its containing block and holes. Physical placement also checks existing buildings, protected sites, pedestrian passages, road envelopes and PR37 maneuver sweeps. Accepted massing is simultaneously the rendered and collision authority. Generic rear/courtyard generators do not reseed from these parcels, and generic completeness/infill honors the reserved district.

Corners get facade returns, sill/cornice detail and appropriate side openings. Short concave or acute remnants can remain open rather than receiving an overlapping box. Some corners still have conservative setbacks and some upper party walls remain plain; this is reflected in the visual scorecard. Temple courts, station/gateway foregrounds and warehouse yards are deliberate open space.

`check-chinatown.ts` verifies containment, oriented nonoverlap, assigned street-facing normals, protected grounds, actual emitted architectural volumes, maneuver clearance and exact exterior footprint equality. This adds checks to the old contracts; zero-contact controller assertions remain unchanged.
