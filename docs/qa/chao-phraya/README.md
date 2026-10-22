# Chao Phraya reconstruction — PR36 review index

The river is now a source-derived, variable-width polygon rather than an 11-point, 288-world-unit-wide channel. Water, terrain openings, collision, both player maps, bank placement and the developer export share that approved shape. The central shoulder, Chinatown bend, hotel reach and downstream west-to-east sweep are reconstructed without adding Bang Kachao or new southern districts.

**Base:** merged PR35, `9cfac02c7ccc960b2e153f407e0a6543d44b5a19`, independently rechecked through GitHub. [Verification](base-verification.json). No merge or deployment is requested or performed.

## Review in this order

1. [Geographic comparison and compromises](geography.md), with actual [current-main map A](maps/map-A.png), [OSM reference B](maps/map-B.png), [proposed correction C](maps/map-C.png) and [final runtime overlay D](maps/map-D.png). SVG originals are alongside the PNGs.
2. [Matched WebGL gallery](gallery.md). These are application renders, not generated artwork. High geographic inspections explicitly extend the normal driving clip/fog; driving views retain production settings.
3. [Engineering and dependency audit](engineering.md), [source inventory](sources.md), [bridge/pier and placement report](waterfront.md).
4. [Validation and reproduction](testing.md), [measured performance](performance.md), [remaining limitations and next work](limitations.md).

## What changes and what stays

- `cityData.v1.json.waterApproval`, version `chao-phraya-osm-v2`, holds the approved bank rings, flow spine, compression controls and southern boundary. The global geographic projection is unchanged.
- The world boundary extends to Z=2750, beyond Asiatique/Anantara and into the sourced downstream eastward sweep. Scenic water continues beyond that edge. No additional district, destination or citywide road network is introduced.
- **Asiatique translates 110 world units west.** Its model, collision plot, arrival loop and protected grounds are generated together from its approved origin. The connected approach changes locally; its destination and access-stop identities remain stable. [Exact graph delta](graph-approval-delta.json).
- ICONSIAM, Hilton, Peninsula, Mandarin Oriental, Terminal 21 and MahaNakhon retain their model geometry and origins. Hotel grounds adapt to the bank. Existing guideway/station geometry stays fixed; bank-dependent support placement can change.
- Existing named piers remain represented and connected. Boats use closed, source-spine-following loops with rounded turns, explicit bank clearance and bridge avoidance.
- Retained geometry buffers rise about 1%. Visible waterfront draw calls rise more than that; see the measurements rather than treating the buffer total as an FPS guarantee.

## Open acceptance gates

The targeted 15-route package completes 16,616 world units with no static contacts. **37 of 38 package test groups pass.** One broader, unchanged seeded fare test still records contacts on two pre-existing tight-turn fixtures after the moved destination changes its itinerary. Baseline and diagnostic evidence are retained; this is an open regression gate, not a passing test or a traffic fix. Physical iPhone Safari, sustained hardware frame times and thermal behavior are also unverified. See [limitations](limitations.md).
