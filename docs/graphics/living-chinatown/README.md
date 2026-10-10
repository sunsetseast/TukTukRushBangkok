# Living Chinatown art pass

Baseline: main `26389a9`, including the first graphics overhaul. The player reported that
that version ran smoothly on their iPhone. This new art pass has browser validation;
it has not been tested on their physical phone.

## What changed

- Three narrower shop bays on the showcase frontage; merchandise follows the existing
  eight sign-atlas categories. Red velvet/gold necklace displays, fruit racks, tea
  shelves, bowls, coffee equipment, counters and menu-board silhouettes replace a
  single repeated shop counter. Some shutters remain closed.
- Less bleached facade colors, repair/rain marks, varied awning patterns and window
  trim. Showcase upper floors use fewer, more readable windows to contain geometry cost.
- 116 deterministic street characters across Yaowarat, Charoen Krung and Soi Lantern:
  walkers, standing customers and food-cart vendors. Shared articulated character
  parts animate gait and serving motions. Contact blobs and cooking steam ground the
  scene. These are original stylized presentation characters, not finished premium
  character models or a pedestrian AI simulation.
- Curved layered roof surfaces, gate brackets/panels, temple steps/columns/spire and
  station pilasters/clock. The gate label is attached to a plane to avoid the billboard
  clipping its backing panel. Landmarks remain stylized interpretations, not replicas.
- Reduced fill/key/exposure retains more color and darker recessed shop interiors.

All art is original code-authored geometry, under the existing
[MIT art license](../../../artifacts/tuk-tuk-rush/public/assets/LICENSE.md). No new
textures, model downloads, decoder services or runtime dependencies were introduced.
The existing hero tuk-tuk GLB and baked Thai/Chinese signage remain in use.

## Placement, performance and ownership

Character routes are generated after the existing prop colliders are registered.
Entire walking segments are checked against every road (including diagonal shortcuts),
shop and cart footprint. Walkers reverse inside their sidewalk segment and never
cross traffic lanes. Vendors face nearby existing carts; customers remain standing.
Street animation freezes during pause/end and continues in title/playing states.
Characters are presentation-only, add no collision obstacles, and hide
within 1.7 m of a vehicle driven onto the sidewalk. No avoidance/collision AI is claimed.

Twelve shared instanced part meshes plus one steam mesh provide a bounded 13 draw
calls. Only nearby instances are submitted; hidden characters are removed from mesh
counts rather than left as zero-scale submitted geometry. Pretty radius is 100 m;
Fast radius is 65 m with half the people and no steam. This is a hard distance cutoff,
not blended LOD. `disposeObject` now also disposes InstancedMesh-owned GPU attributes.
No gameplay, road graph, traffic controller, mission, input or vehicle-physics files changed.

## Rendered evidence

[Before chase](screenshots/before-chase.jpg) / [after chase](screenshots/after-chase.jpg)

[Before shops](screenshots/before-street.jpg) / [after shops](screenshots/after-street.jpg)

[Before gate](screenshots/before-gate.jpg) / [after gate](screenshots/after-gate.jpg)

[Before temple](screenshots/before-temple.jpg) / [after temple](screenshots/after-temple.jpg)

[Before station](screenshots/before-station.jpg) / [after station](screenshots/after-station.jpg)

These are real WebGL frames with the gameplay HUD, identical camera configurations and
Pretty quality forced for comparable art captures. Landmark/shop views use the existing
dev inspection camera. Traffic/characters continue to animate, so their positions differ.
The additional hero, intersection and two mobile HUD frames come from the regression run.
Browser viewport emulation is not physical iPhone testing.

## Validation

- Game TypeScript and workspace project-reference TypeScript checks pass.
- Production Vite build passes: 1,239.74 KB minified JS / 352.06 KB gzip; existing
  large-chunk warning remains.
- Existing GLB parse/articulation and texture-budget checks pass; no new transfer assets.
- Gameplay check passes: connected road/shortcut envelopes, reachable missions,
  595 m+ route drive, traffic stability, recovery, steering, braking and reverse.
- Street-life check passes: deterministic placement, full-path road/obstacle clearance,
  vendors, animation, paused state, quality density and bounded instance meshes.
- Full browser regression passes: assets/errors, traffic, pickup/delivery/scoring,
  passenger visibility, free/shift clocks, pause, driving through the actual rendered
  city, quality submission reduction, five restarts, simultaneous touch steering/gas
  and independent release, steering articulation, 844x390/932x430 landscape,
  portrait pause, actual WebGL context loss/restoration, missing-model/texture retry.
  Additional checks verify actual rendered walkers move and freeze during pause.
- One earlier run timed out awaiting the recovery overlay after resizing. An isolated
  loss/restoration diagnostic passed. Waiting three rendered frames after the viewport
  change before requesting loss made the complete regression sequence pass.
- Five restarts: 492 GPU geometries, 10 textures, 11 root objects and 469 obstacles
  each time. The scene has about 71.26 MiB of unique geometry arrays, plus instance
  attributes, textures, renderer and browser overhead. This is not total GPU memory.

## Measurements and limits

Chromium 145/Linux, ANGLE Vulkan SwiftShader **software rendering**, Vite development
build, 1280x720, DPR 1. Frame times vary substantially and do not establish an iPhone
frame rate. [Full regression results](measurements.json),
[baseline samples](before-profile.json), [final samples](after-profile.json).

| Matched spawn view | Before | After |
|---|---:|---:|
| Pretty draw calls (median) | 198 | 213 |
| Pretty triangles (median) | 142,946 | 184,476 |
| Fast draw calls (median) | 129 | 142 |
| Fast triangles (median) | 101,618 | 125,828 |
| Scene texture count | 10 | 10 |

This adds roughly 29% Pretty triangles and 24% Fast triangles at spawn. The first
unoptimized pass submitted ~216,548 Pretty triangles; simplifying tiny merchandise
and repeated upper windows reduced that to ~184,476. The final matched capture's
median frame times were 247.5 ms Pretty / 419.6 ms Fast; the separate full regression
sample was 358.7 / 414.5 ms. Baseline capture was 136.0 / 404.2 ms. These unstable
software timings are disclosed, not used as evidence of mobile performance.

No native GPU, thermal, long-session or sustained 30 FPS claim is made for this pass.
The user's smooth test applies to the earlier merged version. Test this branch on
that same device before merging.

The rectangular geography, large blank side walls, limited traffic variety, basic
character faces, repeated silhouettes, distant detail cutoff and lack of night weather
remain. The next art milestone should improve close-range character/traffic art and
corner/side facades, guided by an actual iPhone route through these new streets.

## Reproduce

Use the workspace's pnpm dependencies. Set `PORT=5173 BASE_PATH=/` when running the
Vite server. `scripts/check-street-life.ts` and `scripts/check-gameplay.ts` run with
`node --import tsx`; the checked-out workspace's tsx dependency can be used directly.
`check-assets.mjs` runs with Node.

Run `scripts/visual-qa.mjs` against that server, setting
`QA_OUTPUT_DIR=../../../docs/graphics/living-chinatown/` to avoid overwriting the first
pass's evidence. `capture-chinatown.mjs` runs from repository root and accepts
`GAME_URL`, `CAPTURE_PREFIX`, `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH`. Capture main
at the baseline SHA and this branch separately. Debug hooks are removed from production.

## Cultural references

Visual vocabulary follows the Tourism Authority of Thailand's Chinatown/food references:

- https://www.tourismthailand.org/Articles/the-adventure-through-bangkok-s-chinatown
- https://www.tourismthailand.org/Articles/top-5-street-food-restaurants-in-yaowarat-to-turn-your-hunger-into-happiness

These are references only; no photographs, commercial logos or reference assets are
redistributed. Existing sign words remain real Thai/Chinese generic labels.
