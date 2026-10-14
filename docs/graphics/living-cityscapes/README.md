# Bangkok living cityscapes

Base: merged PR #12, `d8597be90685073a80581b7abc3dbbaf739adbe8`. This is an original arcade interpretation of Bangkok, not a surveyed replica. The PR remains a draft; physical iPhone acceptance is unverified.

## Initial architectural and visual audit

| Finding | Implementation decision |
|---|---|
| PR #12's fourteen building typologies, recessed frontage, shared atlases and trade signage already provide useful variety. | Preserve the building grammar. Author destinations and their surroundings rather than add another general facade system. |
| Broad asphalt, low sidewalk slabs, empty corners and sparse approaches dominate the driving view. | Retain road widths/IDs/centerlines; raise and articulate edges, drainage, paving, crossings and safe roadside concentrations. |
| Ordinary parcels obstruct four civic arrivals. | Remove six frontage parcels and their colliders together, retaining the landmark plots and access nodes. Plant and pave those approaches. |
| Priority tourist models still use blockouts. | Replace five flagships with original curved roof, lathed prang/chedi and faceted retail artwork. Keep secondary foundations. |
| River craft, banks and park tree grids have weak silhouettes. | Use shaped boats on bounded validated loops, quays, piers, bridge profiles, irregular groves, paths and ponds. |
| Flat sky and uniform darkness hide architecture. | Add a gradient atmosphere, readable night fill, bounded light spill and signal lenses following the existing traffic phase. |
| PR #12 already costs 127/224 calls, 165,626/226,494 triangles and roughly 89.9 MiB scene buffers in its published software-browser survey. | Reuse spatial batches/atlases; shorten near-detail ranges, use 20-triangle foliage lobes and an ordered collision broad phase. Measure equivalent scenes again. |

The audit covered `world`, `mesh`, `architecture`, `buildingGrammar`, `architecturalBatch`, `landmarkArchitecture`, `urbanLayers`, `clearanceIndex`, `signage`, `Renderer`, `streetLife`, `streetscape`, `landmarkArt`, `staticBatch`, layout/traffic/road helpers and PR #12's architectural-character captures/QA. Asphalt, enclosure and activity placement address scale impressions without altering the playable graph. Landmark silhouettes and public arrivals need authored art. Existing fonts, material tiles, facade/core batching, pedestrian parts and disposal ownership are reused.

## Implemented systems and destinations

- Deterministic regional environment sites; solid cart, scooter, planter, pole, bench and workshop footprints are registered before physics and pedestrians.
- Raised curbs, gutters, drains, covers, paving seams, graph-derived crossings/stop lines and arrows aligned with the existing lane convention. One original 128×128 asphalt pattern uses world-space UVs.
- Four structurally different food setups, vendors/customers from the existing street-life renderer, irregular tropical planting and screened sagged cable spans above vehicle height.
- Shared bridge rail footprints for rendering and collision, screened against all neighboring road corridors and cut back at actual junctions.
- Seven closed boat loops with continuous position/heading; longtail, ferry and working hulls; cheap ripples/wakes/reflection approximations and safe banks/piers. No planar reflections or point-light grid.
- Original sky and local light footprints. Fast retains defining assets; Pretty adds nearby surface/fitting details and more displayed people.

| Flagship | Authored result | Remaining limit |
|---|---|---|
| Yaowarat / Gate | Food scenes, scooters, vendors, overhead infrastructure, warm activity; red pillars, curved green ceremonial roofs and gold trim on the protected island. | Long modular rows remain regular at distance. |
| Talat Noi / Song Wat | Workshop parts, quiet tea/cafe scenes, plants and inherited heritage/warehouse frontage. | Murals and individual courtyard stories remain sparse. |
| Wat Pho / Old Town | White compound, gates, columned halls, tiered red roofs and four green/white/yellow/blue chedis. No outdoor Reclining Buddha. | Compressed compound; no temple interiors. |
| Siam / Ratchaprasong | Paragon glazing, jewel entrance/canopy, layered retail, planting and the established aligned elevated corridor. | Secondary malls and the broader retail precinct remain simplified. |
| ICONSIAM / Chao Phraya | Pleated glass, folded gold crown, articulated entrance/river elevation, planted approach, promenade, piers and moving craft. | Compact approximation; no fountain show. |

**Chinatown Scala:** one authored override of a real Yaowarat parcel near the opening drive. Stacked green tile eaves, pink-red columns, broad glazing, gold geometric friezes, a cream central billboard and projecting illuminated red SCALA sign follow the user's reference. Geometry and lettering are original; the photograph and its watermark are not shipped. The collider retains its footprint and matches the taller building.

Additional original improvements: pixel-cut Mahanakhon, hill-mounted Golden Mount and Giant Swing. Other secondary landmarks retain earlier simplified artwork.

## Evidence and validation

<!-- EVIDENCE -->
Fresh matched captures, controller recordings, viewport/context checks and final measurements are being attached. This section is incomplete until their files and manifests are present.
<!-- /EVIDENCE -->

## Performance

<!-- PERFORMANCE -->
Equivalent current-main and branch measurements are pending. Software Chromium results cannot certify iPhone 30 FPS, VRAM, thermal behavior or memory pressure.
<!-- /PERFORMANCE -->

## Acceptance and remaining work

<!-- REVIEW -->
Final aesthetic review follows inspection of the actual captures and driving footage. Automated geometry/count checks are not proof of visual quality.
<!-- /REVIEW -->

1. Required: sustained physical iPhone Safari Fast/Pretty driving, thermal/frame pacing, memory pressure, background/resume, touch rotation and repeated sessions.
2. Important art work: secondary landmark sites, open block interiors and broader civic/plaza compositions remain simplified.
3. Optional: richer food-service gestures, seated people, murals, bus shelters and selective reflection/shadow refinement after device profiling.

## Reference and asset provenance

All new meshes, patterns, shader effects and lettering are authored in code. No commercial models, reference photographs, copied shop textures or paid assets are shipped. Existing Noto subsets and SIL OFL provenance remain intact.

- [UNESCO Wat Arun](https://whc.unesco.org/en/tentativelists/6821/): central/four subsidiary prangs and porcelain composition.
- [Wat Pho official four great chedis](https://www.watpho.com/en/architecture/detail/262): color, compound and architectural context.
- [ICONSIAM official River Park](https://www.iconsiam.com/en/attraction/river-park) and [facade project reference](https://www.irisfmg.com/projects/public-areas/iconsiam-mixed-use-complex/): river setting, pleated glass and folded-leaf inspiration.
- [Siam Paragon official](https://www.siamparagon.co.th/en) and [entrance photograph](https://commons.wikimedia.org/wiki/File:Siam_Paragon_entrance.jpg).
- [Tourism Authority: Talat Noi](https://www.tourismthailand.org/Attraction/talat-noi), [Chinatown](https://www.tourismthailand.org/Articles/the-adventure-through-bangkok-s-chinatown).
- [Odeon Circle reference context](https://en.wikipedia.org/wiki/Odeon_Circle), [Express Boat official](https://www.chaophrayaexpressboat.com/chaophrayaexpressboat).
- [JICA bridge inventory](https://openjicareport.jica.go.jp/pdf/11988862_01.pdf), [Memorial Bridge photographs](https://commons.wikimedia.org/wiki/Category:Memorial_Bridge,_Bangkok).
- User-provided Chinatown Scala reference, Alamy image DF1GKK: proportions and composition only. No claim to reproduce current operation or exact surveyed geography.

## Reproduce

In `artifacts/tuk-tuk-rush`, use the existing dependencies:

```sh
node --import tsx scripts/check-cityscapes.ts
node --import tsx scripts/check-environment-art.ts
CHROMIUM_PATH=/path/to/chromium CAPTURE_LABEL=after node scripts/capture-cityscapes.mjs
CHROMIUM_PATH=/path/to/chromium node scripts/browser-cityscapes-qa.mjs
```

The matched baseline uses an isolated worktree at the base commit and the same capture script. Survey poses are paused art inspections, distinct from controller recordings.
