# Bangkok citywide streetfronts — visual foundation (draft)

## Why this exists

The compact Bangkok world (merged PRs #9/#10) is a tested driving and discovery
graybox, but its main renderer previously used only flat-color cuboids and skipped
the hand-built Chinatown facade/life system. New buildings were also created at
~54 m spacing with a tangent-aligned yaw, leaving empty gaps and side-facing
frontages. This pass improves **the existing world**, without building another
Bangkok mode or importing the conflicting 1:1 OSM driving graph from draft #8.

## What changed

- Road-adjacent collision parcels are now sampled at 26 m along eligible
  corridors, with 22 m shop widths and small gaps where graph intersections,
  water, parks and landmark footprints allow. Frontage normals face the road.
- A deterministic, original geometry kit provides differentiated Chinatown and
  market shop houses, older plaster/balcony neighborhoods, modern window bands
  and roof structures, and warm riverside buildings.
- In both quality modes, visible buildings have shop openings, columns,
  awnings, fascias and different roof treatments instead of a single block.
- Pretty mode adds balconies, shutters, window arrays and hanging sign cabinets.
  Some windows become emissive as simulated sunset progresses to night, and dim
  when the clock restarts. Original Chinatown mode remains unchanged.
- Static art reuses the existing 80 m spatial merging and correct bounds-based
  culling. Decorative pieces are visual-only and remain attached to existing
  collidable building lots; no new unsynchronized traffic obstructions.

## Reality and limits

This is **Phase 1 of the citywide art pass**, not completed Bangkok architecture.
Facades and colored sign cabinets are stylized, not exact real-business replicas;
Thai/Chinese text and licensed venue identities are not fabricated. Some streets
will still have empty parcels where safety envelopes or the source layout do not
permit buildings. Landmark hero models, street vendors, animated pedestrians,
bridge silhouettes, river boats and full environment/audio richness are follow-on
work. The world is intentionally a compressed arcade interpretation, not GPS.

## Validation

Run the normal test:bangkok suite, now including check-bangkok-architecture.ts
for district families, street-facing facades, density, detail counts, and
night emissive behavior. The existing full-graph, safe road centerline, river
crossing, mission drive, older Chinatown, and browser regression tests remain
the acceptance gates. CI captures **normal chase-camera views** at sunset and
at simulated nighttime in addition to its landmark inspection cameras.

Physical iPhone Safari is still required for actual GPU frame rate, long-session
memory/heat, readable details and hands-on route testing. Software Chromium
screenshots do not prove those properties. Keep the PR in draft until the
device review and any budget reductions needed.
