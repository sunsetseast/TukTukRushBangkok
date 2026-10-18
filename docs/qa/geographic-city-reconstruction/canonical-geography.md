# Canonical geography and compression policy

PR27 starts at merged PR26, commit `9e24ada`. Geographic references were checked on 18 October 2026. The executable catalog is [`geography.ts`](../../../artifacts/tuk-tuk-rush/src/game/bangkok/geography.ts). Its 27 entries contain nominal latitude/longitude, district, riverbank, nearby corridors, frontage orientation, neighbors, public access, source links, and the authored game anchor. Latitude/longitude identifies the site; it is not a surveyed entrance or an assertion that the game preserves metric distance.

The coordinate observations and selected footprints are available in [the reference snapshot](references/anchor-observations-osm.json). Centers of OSM ways are bounding-box centers rather than building entrance points. Hotel markers can fall on a wing or entrance rather than the estate centroid. The complete research coordinate must therefore remain separate from the route graph's passenger stopping point.

## Transform

The previous layout used east/south design coordinates with `world.x = (design.x - 500) × 4` and `world.z = (design.y - 600) × 4`. That convention remains stable. `geographicToDesign` first maps longitude and negative latitude through strictly monotonic piecewise affine knots. `designToGeographic` applies the exact inverse, including endpoint extrapolation. `geographicToWorld` and `worldToGeographic` combine those operations. North is negative world Z.

Knots distribute space between the historic center, the riverfront, Siam, Lumphini, Asok and the northern district. They provide one consistent overview transform for future planning and for revealing distortions. They do not pretend to produce accurate parcels from latitude/longitude alone. `geographicOffset(reference)` exposes each authored site's residual relative to that overview. The authored coordinate is deliberate local design, never a hidden radial fitting result.

The projection and geographic adjacency test exercises every reference, all knot directions, 101 additional points spanning and exceeding the knot domain, invalid input and the public-space relationships below. The report is [geographic-reference-check.json](geographic-reference-check.json). A passing transform test certifies invertibility and recorded relationships, not architectural or GPS accuracy.

## Relationships that guide reconstruction

| Area | Required relationship | Authored decision |
|---|---|---|
| Lumphini | Rama IV south, Ratchadamri west, Wireless east, Sarasin north | The four connected perimeter roads surround an actual-outline-derived park, with the Rama IV / Ratchadamri southwest junction realigned to `[766,763]` and parking accessed from Wireless. |
| Lumphini skyline | Dusit southwest; One Bangkok east/southeast of park | Dusit moves to `[756,804]` across the corrected southwest park corner; One Bangkok remains east at `[880,779]`. |
| Victory Monument | Phaya Thai south, Phahonyothin north, Ratchawithi west/east | Monument occupies an island; the four approaches join a clockwise roundabout. BTS remains south and curves around the junction. |
| Sanam Luang | Ceremonial field north of Grand Palace, east bank | Field anchor is `[309,285]`, palace `[295,365]`; public streets are reconstructed around its boundary. |
| Giant Swing / Wat Suthat | Swing north of the temple and its north gate | Swing frame `[410,416.25]`, temple center `[410,429.5]`; the court does not become a drive-through shortcut. |
| Pak Khlong Talat | East bank, south of Wat Pho, near Memorial Bridge and river piers | Selected market blocks at `[318,535]`; public Chak Phet approach and pedestrian flower aisles differ. |
| Jim Thompson | North of National Stadium, northwest of MBK, beside Saen Saep | Compound `[626,426]`, south entrance lane and northern canal edge; retained discovery ID. |
| Siam | Discovery → Center → Paragon → CentralWorld from west to east; MBK and Siam Square south of Rama I | Separate mall forms and contiguous urban frontage; the shopping strip is authored as a district. |
| River City | East bank, north of Oriental; Hilton/ICONSIAM across the river | Plot moves from `[470,796]` to `[431,796]`, close to the east bank, with west-facing waterfront and eastern street arrival. |
| Resort/hotel banks | ICONSIAM, Hilton, Peninsula and Anantara west; Bang Rak hotels east | Existing crossings are the driving routes; no hotel driveway crosses the river. |

## Source-shaped public spaces

[`lumphini-osm.json`](references/lumphini-osm.json) records the park boundary and water features. [`lumphini-normalized.json`](references/lumphini-normalized.json) expresses them in east/south coordinates normalized to the park bounding box. Main northwest lake `31990692` contains island `32019474`; the southeast lake is `23483302`, with separate smaller water features. The island is an inner ring and must remain land, not another water surface. Boundary channels have deliberately not been mistaken for the main lake.

The actual park bounding box is approximately 870 m east/west by 835 m north/south. The game's four perimeter corridors allow a smaller, more elongated park; the southwest Rama IV / Ratchadamri junction is adjusted to follow the actual diagonal boundary. The boundary/lakes preserve their relative arrangement under the same local affine compression; exact aspect and distance are compromised. Dense planting, recreational clearings, lake walks and the Wireless parking strip serve distinct uses. Ordinary tuk-tuk navigation does not use pedestrian lake walks.

Bangkok Metropolitan Administration's [Greener Bangkok park page](https://greener.bangkok.go.th/park/suan-lumpini/) explicitly identifies vehicle access through the school-side Wireless Road gate. Its [parking update](https://webportal.bangkok.go.th/environmentbma/page/sub/6671/-/0/info/538966) describes the parking area continuing toward Sarasin Road. This is the basis for the parking access, rather than inventing a normal public road across the park.

[`sanam-normalized.json`](references/sanam-normalized.json) records the ceremonial field's elongated, rounded boundary. It is intentional open land. The game field is 224 × 288 m, compressed from an approximately 300 × 575 m geographic bounding box. Local perimeter realignment is necessary because the former Maha Rat diagonal crossed the chosen field. No procedural infill should occupy this ceremonial reservation.

## Explicit unresolved geographic compromises

- Victory's real longitude is slightly east of central Siam, while the retained Phaya Thai gameplay corridor places it to the west. The connected northern corridor/BTS route is preserved in this PR; this distortion is explicit rather than being concealed by the projection.
- Terminal 21 is northwest of the real Asok junction. The existing compressed branch has the tower plot slightly east of the junction. Its Sukhumvit approach and elevated relationship are represented, but the whole Asok corridor has not been rebuilt to surveyed alignment.
- The Four Seasons/Capella north–south order has been corrected in this PR, but the shared estate remains heavily compressed; its internal wing spacing and exact arrival distances are not surveyed.
- Old Town, Siam and the southern hotel corridor use different compression factors. Cardinal direction is an overall guide; two local cross-district sightlines will not reproduce real-world bearings.
- Exact gate counts, private loading/service access, underground MRT concourses, all mall wings, all neighboring buildings and public transport lane operations remain simplified. The authored access note is a gameplay statement, not permission to drive in a real pedestrian compound.

## Open data attribution

Geographic data derived from **© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)** is available under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/). The referenced coordinate/footprint database, including normalized outlines and provenance, is provided in this directory. Hand-authored stylized meshes are separately authored code. No satellite raster, street photograph or licensed architectural image is embedded as a game texture. Public website photographs are analytical references only.

## Additional geographic corrections

The shared Charoen Krung estate now places Capella at `[430,1013]`, north of Four Seasons at `[430,1058]`, correcting PR26's reversed north/south order. Stable landmark IDs are retained; exact estate distances are compressed. Dusit's final cleared plot is `[756,804]`, south of the reconstructed southwest park junction.
