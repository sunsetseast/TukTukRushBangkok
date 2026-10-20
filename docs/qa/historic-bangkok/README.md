# Historic Bangkok reconstruction — draft PR32

Base: current main at `76b2e6c6994c4c2b9576c9d290b8669eee14166f` (merged PR31). This is a localized, implemented reconstruction, not a geographic certification or surveyed replica. No merge or deployment is part of this change.

## What changed

The Palace, Sanam Luang and Wat Pho now have closer, connected public perimeter streets. The visible Giant Swing is east and north of the Palace, with a civic plaza north of Wat Suthat and Bamrung Mueang between them. Golden Mount has a substantial terraced hill, stairs, summit and lower temple compound. Democracy Monument occupies a clockwise, four-arm road circle that is shared by asphalt baking, traffic and navigation. Hua Lamphong retains PR31's south facade and forecourt; its shed, ground-level railway yard and physical boundary extend north. Tri Mit connects the station to Wat Traimit and Odeon without driving through the temple.

Existing protection and procedural building systems handle all changes. Sanam Luang's original sourced lawn remains separate from its enlarged public perimeter; 53 procedural houses formerly between that lawn and the road are removed. Old Town and the station–gateway corridor receive bounded, district-specific frontage generation. There is no second reservation system, elevated MRT or unrelated transit redesign.

## Review the evidence

- [Localized geographic corrections and coordinate comparison](geography.md), [north-up before/after map](geography-before-after.png), [independent nominal real-world centers](geographic-reference.png).
- [Real photos and before/after game views](comparisons.md); [full local HTML gallery](comparisons.html) includes elevated and ordinary driving-camera views for ten locations.
- [Audit and implementation decisions](audit.md), [manual architectural scorecard](scorecard.md), [land-use review](land-review.md).
- [Automated validation and reproduction](testing.md), [performance measurements](performance.md), [remaining issues](backlog.md), [references and provenance](sources.md).

## Measured result

| Check | Result |
|---|---|
| Existing regression groups | 32 pass, including affected reruns |
| Requested controller journeys | 7 pass, 4,452 game metres, zero collision frames |
| Democracy controller turn pairs | 12 pass, 1,957 game metres, zero collision frames |
| Existing continuous passenger run | 11 fares, 10,403 metres, zero collisions, no intermediate teleports |
| Directed Democracy circle | Four connected arms, clockwise ring; all arm pairs reachable |
| World / landmark inventory | 49 scene landmarks, 92 registry places, 206 protected parcels |
| Procedural buildings | 6,965 → 7,091 citywide; 867 → 973 in selected region |
| Same 1,014 local land-use cells | Unclassified vacant 103 → 12; includes reclassification to roads, park and compounds |
| Building / protected parcel overlaps | Zero |
| Public-road volume sightlines | 18 / 24 clear; all 24 observers on actual road corridors |
| Mobile-sized browser views | 375×812, 430×932, 844×390 and 1280×800 pass camera/reset checks |
| Physical iPhone Safari | Unavailable; not certified |

Actual 3D raycasts and low river frames expose partial obstructions retained in the evidence. Architectural grades remain B/C. The current implementation is reviewable as a substantial draft; the limitations below prevent claiming all geographic and device-performance gates are satisfied.
