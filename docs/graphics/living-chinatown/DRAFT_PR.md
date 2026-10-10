The first art pass improved the tuk-tuk and streets, but Chinatown still had empty sidewalks and repeated shop counters. This pass adds animated neighborhood life and distinct storefront displays while preserving the tested driving and mission systems.

## Visible changes

- 116 deterministic walkers, customers and food-cart vendors distributed along Yaowarat, Charoen Krung and Soi Lantern; articulated gait/serving animation, small contact shadows and cooking steam.
- Merchandise that matches the existing Thai/Chinese signs: gold necklaces, noodles/bowls, coffee equipment, tea shelves and fruit racks. Narrower storefront bays, facade weathering, varied shutters/awnings and less bleached lighting.
- Curved layered roofs and decorative gate brackets/panels; temple steps, columns and spire; station pilasters and clock. These remain stylized interpretations, not geographic or architectural replicas.
- Existing hero GLB, gameplay physics, traffic logic, missions, collision data and mobile input remain the foundation. No new engine, dependencies, downloaded models or textures.

## Rendered before/after

Real WebGL captures from the baseline main SHA `26389a9` and this branch, using the same camera setups and Pretty quality. Shop/landmark views use a dev inspection camera. Traffic/people keep moving between captures.

| Before | After |
|---|---|
| ![Chase before](https://raw.githubusercontent.com/sunsetseast/TukTukRushBangkok/graphics/living-chinatown/docs/graphics/living-chinatown/screenshots/before-chase.jpg) | ![Chase after](https://raw.githubusercontent.com/sunsetseast/TukTukRushBangkok/graphics/living-chinatown/docs/graphics/living-chinatown/screenshots/after-chase.jpg) |
| ![Shops before](https://raw.githubusercontent.com/sunsetseast/TukTukRushBangkok/graphics/living-chinatown/docs/graphics/living-chinatown/screenshots/before-street.jpg) | ![Shops after](https://raw.githubusercontent.com/sunsetseast/TukTukRushBangkok/graphics/living-chinatown/docs/graphics/living-chinatown/screenshots/after-street.jpg) |
| ![Gate before](https://raw.githubusercontent.com/sunsetseast/TukTukRushBangkok/graphics/living-chinatown/docs/graphics/living-chinatown/screenshots/before-gate.jpg) | ![Gate after](https://raw.githubusercontent.com/sunsetseast/TukTukRushBangkok/graphics/living-chinatown/docs/graphics/living-chinatown/screenshots/after-gate.jpg) |

Additional temple, station, hero, traffic and mobile HUD captures are committed beside these images.

## Mobile cost and placement

People use 12 shared instanced part meshes plus one steam mesh, with only nearby instances submitted. Fast mode halves density, shortens the radius and disables steam. Routes stay outside all road/shortcut and obstacle footprints. People freeze when paused; they are cosmetic, add no colliders, and hide near a vehicle driven onto the sidewalk. No sophisticated pedestrian AI or finished premium character art is claimed.

At the matched 1280x720 spawn view:

| Median submission | Before | After |
|---|---:|---:|
| Pretty calls / triangles | 198 / 142,946 | 213 / 184,476 |
| Fast calls / triangles | 129 / 101,618 | 142 / 125,828 |
| Scene textures | 10 | 10 |

That is ~29% more Pretty triangles and ~24% more Fast triangles. Tiny display meshes and repeated upper-floor windows were simplified after the first pass measured ~216,548 Pretty triangles. Unique scene geometry arrays occupy ~71.26 MiB plus instance/texture/renderer/browser overhead.

**Measurement environment: Chromium 145, Linux, ANGLE Vulkan SwiftShader software rendering, Vite dev build, DPR 1.** Matched final median frame times were 247.5 ms Pretty / 419.6 ms Fast; baseline 136.0 / 404.2 ms. Full-regression samples were 358.7 / 414.5 ms. These unstable software timings do not prove an iPhone FPS or thermal result. The user's smooth physical-iPhone test covered the earlier merged version; this new branch needs the same-device test before merge.

## Validation

- Game and workspace TypeScript checks; production build; existing GLB articulation/loading and texture-budget checks pass. Build retains the existing large-chunk warning (1,239.74 KB JS / 352.06 KB gzip).
- Road/shortcut envelopes, reachable missions, 595 m+ drive, traffic stability, recovery, steering and braking/reverse pass.
- New street-life checks cover deterministic clear routes, vendors, movement, pause, quality reduction and bounded batches.
- Full browser regression passes: assets/errors, actual traffic and walking animation, pickup/delivery/scoring, passenger visibility, clocks/pause, actual-scene route traversal, quality, five restarts, simultaneous touch steering/gas and independent release, landscape/portrait behavior, real WebGL loss/restoration and missing-asset retry.
- Five restarts retain 492 GPU geometries, 10 textures, 11 root objects and 469 obstacles. InstancedMesh-owned GPU buffers are explicitly disposed on scene teardown.
- An earlier recovery check timed out immediately after resizing. Isolated restoration passed; waiting three rendered frames for the resized canvas made the full regression sequence pass.

Full measurements, sources, scripts, limits and reproducing instructions: [Living Chinatown evidence](https://github.com/sunsetseast/TukTukRushBangkok/blob/graphics/living-chinatown/docs/graphics/living-chinatown/README.md).

## Art ownership and remaining work

All new art is original code-authored geometry under the existing MIT art license. Existing font-baked sign textures remain; no third-party model/photo/texture is redistributed. TAT Chinatown and street-food references informed the shop/street vocabulary; links are recorded in the evidence document.

The map remains a fictional rectangular layout. Blank side walls, repeated character silhouettes/faces, hard distance cutoffs, limited traffic art and absent night/weather presentation remain visible limitations. This is another tangible art step, not a finished premium-game claim. Next: physical iPhone route test, then better close-range character/traffic art and corner/side facades.

Draft only. Do not merge.
