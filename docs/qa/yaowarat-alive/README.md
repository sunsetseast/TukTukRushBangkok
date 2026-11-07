# Yaowarat Alive

PR61 extends merged PR60 (`0c84000d896922ba512d54f4c52d90881be0f105`)
through the existing geographic edge adapter, ArchitecturalBatch, two preparation
workers, chunk ownership, collision policy and Fast/Pretty LOD.

## Implemented

- **357 valid source edges / 4,330.75m of summed frontage**, versus PR60's
  101 / 1,099.86m. Song Wat grows from 25 to 48 edges. Four chunks receive
  decoration. Summed edges are not route length or a claim of gap-free buildings.
- Continuous selection along real Yaowarat and connected Song Wat, Song Sawat,
  Plaeng Nam, Phadung Dao, Yaowaphanit, Mangkon, Phat Sai, Ratchawong and Wanit 1.
  Road-facing selection handles misleading nearest-alley hints while retaining
  source-edge visibility, normals, road-envelope and collision checks.
- Three precisely attributed real sites and ten authored original tenants.
  Distinct gold tower, heritage goldsmith, restaurant, bakery, market, tea/cafe,
  merchant warehouse and hotel entrance compositions. Source heights and widths
  remain authoritative.
- Recess-like sheltered displays, ceiling/floor/jamb depth, jewelry busts,
  necklace arches, kitchen equipment, food preparation/seating, shutters,
  cornices, parapets, drainage, AC, lanterns and restrained Song Wat palettes.
- Two shared sign atlases / four shared materials. Upright Chinese vertical
  lettering, mounted projecting blades and an uninterrupted gold-tower wall strip.
  A new small OFL font subset guarantees every geographic sign glyph.
- Chunk-owned instanced cooks, serving/browsing/walking activity, fans and steam.
  At most 24 anchors per chunk; updates at most 12Hz, nearby Pretty mode only.
  Swept local paths stay within admitted pedestrian setbacks. Original simple
  character rigs use object transforms rather than skeletal crowd simulation.
- Warmer displays and commercial sign contrast, varied window illumination,
  darker night building masses, existing Day/Dusk/Night controls, and localized
  synthetic cooking/fan ambience respecting sound, pause and quality controls.

## Verified real sites and placement decisions

| Site | Exact pinned footprint / main edge | Evidence | Confidence / treatment |
|---|---|---|---|
| Tang To Kang Gold Shop / ห้างทองตั้งโต๊ะกัง / 陳焯剛 | `osm:way/305102098:0:4` | [Mapped site, source ID and photo](https://mapcarta.com/W305102098); pinned name, address 345 Mangkon and seven levels | High identity confidence; historic Mangkon/Sampheng site, never relocated onto Yaowarat |
| Grand China Bangkok podium / แกรนด์ ไชน่า | `osm:way/305102108:0:4` | [Official address](https://www.grandchina.com/contact-us/), 215 Yaowarat at Ratchawong; exact named pinned footprint | High identity confidence; stylized source-height street podium, not an invented high-rise reconstruction |
| Chinatown Hotel / ไชน่าทาวน์ โฮเทล | `osm:way/305102087:0:4` | [526 Yaowarat listing](https://www.agoda.com/en-us/chinatown-hotel/hotel/bangkok-th.html); exact named pinned footprint | High identity confidence; simplified frontage interpretation |

Hua Seng Heng's [official branch register](https://www.huasengheng.com/en/contact/)
places the Yao Phanit branch at 418–420. Its checked map anchor
13.740462,100.50964 is near source `449024048`, whose road-facing edges are disabled
by the existing clearance policy. The name is not reassigned across the road.
Hua Seng Hong's [official photos/map](https://www.huasenghong.com/branch-yaowarat)
place it at 371–373 / 13.740855,100.509102. Its candidate source edges intersect
or lack the required road margin, so no falsely attributed restaurant was added.
Original restaurant compositions provide food-business detail at safe edges.

The original Song Wat merchants/cafes reflect the district's [documented heritage
and contemporary commerce](https://thailand.go.th/issue-focus-detail/----280?hl=en).
The [historic-building node](https://mapcarta.com/N4605868307) at
13.73809,100.50761 is a research anchor, not sufficient evidence to assign a
specific real business to an adjacent footprint. Original tenants make no such claim.

## Evidence

[Exact tests](TESTS.md), [source/life inventory](source-tests.json),
[unchanged source/art tree proof](provenance.json). [46 rendered views and matched examples](SCREENSHOTS.md), [performance comparison](PERFORMANCE.md) and lossless raw reports complete the evidence.

## Limits and next work

The art remains stylized and constrained by sparse/overlapping source footprints.
Unsafe or obscured edges remain undecorated. Display rooms are shallow geometry
inside cleared setbacks, not walkable interiors. Real-site architecture is a
simplified interpretation, not a photogrammetric replica. No new missions or
optional automatic dusk progression were added; existing fares and manual time
selection remain in use. Sounds are synthetic ambience, not field recordings.

PR62 should begin with the developer's physical-iPhone route comparison and
GPU/upload profiling, then improve character silhouettes and the most visible
remaining source gaps. Desktop software rendering does not certify mobile FPS,
long-duration thermals or VRAM behavior.
