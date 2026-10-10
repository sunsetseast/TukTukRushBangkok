# Playable Bangkok reconstruction

This is a browser-based connected graphics/geography slice, not native iOS,
TestFlight, a survey-accurate map, or a claim of completed AAA city art.
Source of truth was the current GitHub main including both prior graphics merges.
Review branch: `graphics/authentic-cartoon-bangkok`. Do not merge automatically.

## Implemented

- Connected sampled Yaowarat and Charoen Krung curves, meaningful named connectors,
  five clearly fictional market/service shortcuts and protected Odeon island.
- One shared graph for road rendering, AI routes, minimap and mission endpoints.
  Oriented collision footprints follow the actual facade and parked-car yaw.
- Twelve vehicles use left-side lane placement, directed main-road routes,
  junction yielding/headway and clockwise roundabout circulation.
- Five facade families: red/gold gold shop, bowl/arched-awning noodle shop,
  green pharmacy, stepped hotel, shuttered/gabled heritage shop. Rounded shells/
  trims, secondary side windows, balconies, merchandise, projecting signs and
  original two-atlas Thai/Chinese lettering replace repeated generic facades.
- Short-segment sidewalks, road markings, cables/poles, parked vehicles,
  food carts, greenery and bounded instanced street people follow new geometry.
- Existing hero GLB, wheels/body lean, controller, touch controls, synthetic audio,
  camera feel, menus, shift/free ride and score/fare loop are preserved.
  Spawn/recovery, four mission pairs and camera obstruction adapt to the new map.
- Small local licensed fonts guarantee glyph availability; no runtime font CDN.
  No new backend, database, accounts, map API or external keys.

## Where the actual new art lives

| Location under `artifacts/tuk-tuk-rush/` | Purpose |
|---|---|
| `src/game/miniatureFacade.ts` | Original sculpted facade/silhouette/side-wall geometry and trade details. |
| `src/game/streetscape.ts` | Spatial batching, rotated placement, facade signs and short-edge sidewalks. |
| `src/game/signArt.ts` | Original dynamic horizontal/vertical atlases; not a screenshot substitute. |
| `public/assets/fonts/` | Shipped Noto TTF subsets and their OFL license texts. |
| `src/game/mapData.ts`, `world.ts`, `roadGeometry.ts` | Geographic inputs, shared graph, oriented footprints and sidewalk ranges. |
| `src/game/traffic.ts`, `missions.ts`, `vehicle.ts` | Geography-dependent AI/mission/recovery integration, not an unrelated gameplay rewrite. |
| `src/game/cityMesh.ts`, `streetLife.ts`, `contactShadows.ts` | Road-aligned props, safe walkers/vendors and rotated ground shadows. |

Existing `public/assets/models/hero-tuktuk.glb` and `public/assets/textures/`
remain real locally shipped assets, not replacement placeholder downloads.

## Verification and screenshots

See [QA.md](QA.md) for executed checks and physical-device limitations, and
[RESEARCH.md](RESEARCH.md) for real-world comparisons, licensing and sign sources.

Reproduce from repository root:

```sh
pnpm --filter @workspace/tuk-tuk-rush run typecheck
PORT=24177 BASE_PATH=/ pnpm --filter @workspace/tuk-tuk-rush run build
pnpm --filter @workspace/tuk-tuk-rush run test:gameplay
pnpm --filter @workspace/tuk-tuk-rush run test:street-life
pnpm --filter @workspace/tuk-tuk-rush run test:assets
CHROMIUM_PATH=/repl/tools/bin/chromium GAME_URL=http://localhost:80/ \
  pnpm --filter @workspace/tuk-tuk-rush exec node scripts/capture-reconstruction.mjs
```

Build variables reflect this artifact's existing Vite configuration. Replace the
Chromium path as appropriate elsewhere. Managed workflow:
`artifacts/tuk-tuk-rush: web`, not a separate duplicate server.

Ten actual WebGL screenshots and machine-readable render measurements are
generated into ignored `generated-artifacts/bangkok-reconstruction/` at the
repository root. They include normal chase, close signage, shops, the curve,
Odeon, intersection, street life, miniature composition and two landscape phone
sizes. Prior-main comparison images remain under
`docs/graphics/living-chinatown/screenshots/`; those are historical baseline
captures, not a fresh claim to have recaptured the old code.

After the capture command, generate the self-contained before/after review with:

```sh
pnpm --filter @workspace/tuk-tuk-rush exec node scripts/create-reconstruction-review.mjs
```

The capture script uses Linux Chromium SwiftShader. Its frame times are software
rendering measurements, not evidence of physical-iPhone performance.

## Scope and next milestone

This is a useful reconstructed eastern/central corridor, not every famous shop.
Tang To Kang is researched but deferred to its proper side-street location.
Landmarks retain prior simplified meshes; the gate now has correct island
context, while exact temple/station frontage can improve in a subsequent pass.
Lighting retains the tropical sunset; a new dusk/neon lighting mode is deferred.
Some broad open areas and procedurally repeated generic trades remain.

**Next milestone:** profile Fast/Pretty during a full shift on the user's actual
iPhone, then spend that measured budget on 3–5 precisely located signature
storefronts and alley/roundabout frontage infill. Resolve business-sign clearance
before commercial publication rather than copying unlicensed photo/logo art.
