# Scoped road approval and migration

The user-authorized Chinatown reconstruction is encoded in `chinatownPlan.v1.json`, not a global road reset. Its nonrectangular boundary follows the northern commercial core, eastern station/gateway context and southern riverbank strip. `replacedCorridors` explicitly lists retired controls; the workshop shortcut is removed. Existing IDs are preserved outside the migration. Local intersection split nodes and arrival attachments are regenerated from the same physical graph.

The street migration runs before common intersection splitting. Rendering, physics, NPC traffic, fare routing and maps read the resulting graph. One-way directions are represented by ordered endpoints. Destination IDs are unchanged. Gate's annulus retains its center, radius32, width12 and legal direction. The necessary local Charoen Krung segment rejoins the preserved southern corridor at design540,690; Khao Lam meets the existing Rama IV chord without rerouting it.

Three explicit placement collars cover old frontage whose parent road is removed/resampled: old northern Charoen Krung arc (230 world units to cover previous offset wings), unchanged Rama IV chord (70), and unchanged southern Charoen Krung (90). These are documented placement transitions, not permission to move unrelated landmarks. Source sampling seeds preserve distant procedural background bodies; ten exact exterior PR37 bodies receive early placement priority. No duplicate road is rendered or routed by that art sampling catalog.

The strict PR37 successor contract compares every exterior road name, width, direction, traffic restriction, endpoint ID and coordinate, plus BTS/Gold Line paths and original landmark plot/yaw/size/kind/name. PR37's Asiatique is included in this strict comparison. Older pre-PR37 fixtures keep their explicitly inherited Asiatique exception, then also run the strict PR37 comparison.

`parcel-migration.json` records each removed and added footprint. Current result: 942 removed, 901 added, **zero outside the approved migration**. Coordinate signatures are quantized to 0.0001 world units to avoid floating-point reversal noise; physical tolerances are not loosened.

Current asphalt key: `783800152`; full geographic approval key: `3451122086`. `cityData.v1.json` and baked block/surface data carry the approved versions. Unauthorized or stale geometry fails construction/tests.

The local Wat Mangkon MRT entrance moves beside the corrected Charoen Krung/Plaeng Nam relationship. Its model identity and geographic source are retained, its old design position is recorded, and all unrelated transit stations remain unchanged. Existing Gate, Traimit, station, River City and hotel model origins are preserved. Arrival node numbering can change locally while destination identity and legal access remain valid.
