# Transform Tuk Tuk Rush into a visually rich, authentic Bangkok arcade driving game

The playable game previously drew its player, streets, and traffic mostly as flat
primitive shapes. This draft introduces an original detailed tuk-tuk GLB and a
continuous shophouse streetscape along Yaowarat, while keeping the working arcade
simulation and touch controls.

**This is a first substantial art delivery, not a claim of finished premium graphics
or verified 30 FPS on iPhone.** The available software WebGL renderer runs about 3 FPS.
A physical iPhone Safari test is required before mobile performance can be accepted.

## Initial audit and architecture

The audit found box-only bodywork/facades, Lambert-only traffic that discarded material
classes, no real local model/texture pipeline, whole-district culling disabled, and
incomplete ownership/disposal. Some Thai labels depended on system font coverage.

- Local GLB + required-texture loading, explicit retry/error UI, named articulation.
- Indexed spatial PBR batches, geometry/material reuse, culling, shorter Fast draw
  distance, existing adaptive quality and DPR 1/1.5 caps.
- sRGB/ACES, warm key/cool fill, modest environment reflections, gradient sky/haze,
  static projected architectural shadows and soft vehicle contact shadow; no bloom
  or recurring shadow-map passes.
- Resource disposal, five stable restarts, and genuine context-loss/restoration.

## Models, textures and sources

- Original `hero-tuktuk.glb`: 606,816 bytes, 29,068 triangles, 13 materials; curved
  cowl/canopy, tubular metal supports, suspension/fender, tires/hubs, chrome trim,
  mirrors, upholstery, driver/passenger, lights, license plate; wheels/steering animate.
- Seven original PNGs (328,831 bytes total): asphalt, plaster, paving, horizontal and
  vertical bilingual signs, Thai landmark labels and fictional Bangkok plate.
- Authored procedural shophouse modules: recessed shops, shutters, framing, balconies,
  striped awnings, signs, AC units, pipes and floor/roof trim. Continuous 620 m corridor.
- Rebuilt sedan/taxi/scooter silhouettes; parked delivery vans; stainless carts,
  umbrellas, cookware, seating, utility cables/poles, lamps, lanterns, planted trees,
  lane edges/crossings and signals that read the actual simulation phase.

All shipped art is original MIT work, with attribution/license record in
`public/assets/LICENSE.md`. Noto fonts (SIL OFL) are used for baked signage only;
font files are not shipped. No downloaded third-party model was imported. A licensed
Sketchfab Thai tuk-tuk was considered but its usable download could not be verified.
TAT Chinatown/gold-market references informed the setting; references are recorded
in `docs/graphics/README.md`. No protected game assets, remote models, keys or decoder
CDNs are required.

## Before and after

Actual WebGL captures. Chase captures share spawn/heading and HUD; the slightly lower
chase pose and narrowed road affect framing. Other art views use a dev-only inspection
camera. Traffic is genuinely simulated. Mobile views are simulated browser sizes.

| Before                                                                                                                                              | After                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![Before](https://raw.githubusercontent.com/sunsetseast/TukTukRushBangkok/graphics/yaowarat-golden-hour/docs/graphics/screenshots/before-chase.jpg) | ![After](https://raw.githubusercontent.com/sunsetseast/TukTukRushBangkok/graphics/yaowarat-golden-hour/docs/graphics/screenshots/after-chase.jpg) |

![Hero tuk-tuk](https://raw.githubusercontent.com/sunsetseast/TukTukRushBangkok/graphics/yaowarat-golden-hour/docs/graphics/screenshots/after-hero.jpg)
![Chinatown](https://raw.githubusercontent.com/sunsetseast/TukTukRushBangkok/graphics/yaowarat-golden-hour/docs/graphics/screenshots/after-chinatown.jpg)
![Moving traffic](https://raw.githubusercontent.com/sunsetseast/TukTukRushBangkok/graphics/yaowarat-golden-hour/docs/graphics/screenshots/after-intersection.jpg)
![Mobile HUD](https://raw.githubusercontent.com/sunsetseast/TukTukRushBangkok/graphics/yaowarat-golden-hour/docs/graphics/screenshots/after-mobile-hud.jpg)

## Map and gameplay scope

Only Yaowarat narrows from 32 m to 20 m; its frontage row moves 8 m toward the street.
Visual and collision footprints move together. The road graph, shortcut connections,
traffic lanes and mission points stay intact. Driving, braking/reverse, collisions,
recovery, passenger loop, clocks, scoring, HUD and input logic remain.

The rectangle grid and simplified landmark locations/structures remain inaccuracies
for a separate map/art PR; this is not a geographic reconstruction of Bangkok.

## Validation and measured limitations

- Game TypeScript, workspace TypeScript project references, production Vite build.
  Build retains a chunk-size warning: 1.23 MB minified JS / 348 KB gzip.
- GLB parse/articulation/normal/size checks and asset/texture budgets/integrity.
- All 63 road/shortcut centerlines and all mission endpoints clear/reachable.
  > 595 m drive with traffic, steering, braking/reverse and recovery checks pass.
- Browser checks pass for loading/errors, moving traffic, missions/scoring, passenger
  visibility, pause, mode clocks, actual-scene collision traversal, quality submission
  reduction, two simultaneous touch contacts and independent release, front steering,
  landscape resizing, portrait auto-pause, context restoration and missing-art retry.
- Five restarts show stable resource and collider counts. Full frame samples, exact
  renderer, allocated geometry/texture counters and scenario notes are committed in
  `docs/graphics/measurements.json`.
- Measurement environment: Chromium 153/Linux/ANGLE Vulkan **SwiftShader software**,
  Vite dev build, 1280×720/DPR 1. Both modes run around 3 FPS here; **the 30 FPS target
  was not met in this environment**. This cannot establish iPhone GPU/thermal results.
  About 59.5 MiB of unique scene geometry arrays plus texture/renderer/browser overhead.

No physical iPhone Safari, long-session heat/memory, or sustained native-GPU frame-rate
claim is made. This draft must remain unmerged pending that device review.

## Remaining art and recommended next milestone

Landmark modeling, more varied weathering/store merchandise, pedestrian/vendor character
art, traffic wheel animation, distant LOD blending and richer surface maps remain.
The scene is a meaningful visual leap but still needs further art direction to reach
the requested finished Nintendo-quality standard. No normal/roughness atlases,
Draco/Meshopt/KTX2 or expensive glass transmission were added.

Next: capture a 60-second actual iPhone Safari route in both modes, tune budgets from
that evidence, then create a few distinctive storefront/stall variants and upgrade
Chinatown Gate/Wat Traimit inside their collision footprints. Keep map reconstruction
separate. **Draft only; do not merge.**
