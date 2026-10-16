# Validation and reproduction

All captures are actual browser-rendered gameplay, with no generated art mockups. The local browser is Chromium 138 with SwiftShader software WebGL. Physical iPhone Safari was **not available**; 60 FPS / stable 30 FPS on an iPhone remain targets requiring device testing, not verified results. Browser touch tests use native CDP input but cannot certify Safari's driver, thermal behavior or browser chrome.

## Automated checks

The [suite manifest](validation/suite.json) records exit codes and duration for all 15 existing/new script groups. Logs are committed alongside it. TypeScript and production build also pass; the existing large-bundle warning remains. No acceptance suite was disabled.

Coverage includes left-hand traffic and roundabouts; steering, braking/reverse and collision contracts; 5-second boost / 10-second recharge; all 11 driven Bangkok fares; one-way connected navigation and temple access; discovery save compatibility; BTS; landmark viewpoints and disposal; original Chinatown gameplay and street-life placements. The deterministic fare-driving test disables traffic and is not a claim of a collision-free crowded human playthrough.

`test:graphics-foundation` adds checks for unchanged position arrays/repeating UVs, compact attribute budgets, linear data textures, continuous lighting/full night at 240 seconds, and substantially cheaper far traffic templates. The map markup assertion now counts road segments inside batched paths, rather than requiring obsolete individual line nodes. It still checks local culling, route markup and discovery isolation. The street-life exact stream count changed from 13 to 14 solely for the shared accessory stream; placement/clearance assertions remain.

The [PR18 interface browser report](validation/qa.json) passes 15 interaction groups: exact 5000 ms manual banner expiry/restart, map/LOOK timer suspension, approach/departure hysteresis, keyboard focus, native touch map pan/pinch/zoom/recenter/layers, simultaneous controls, pointer cancel, pause/settings/restart/title/results flows, safe-area simulation and original Chinatown entry/recovery. It covers all five dimensions below.

The [graphics browser report](validation/graphics-browser.json) adds native simultaneous steering/throttle, map opening with held input, no continuing 3D frames while the map is idle, marker-origin drag/tap, five responsive dimensions, night HUD screenshots and high-detail LOOK lock/alternate views for Wat Arun, Wat Pho and Wat Paknam. The marker test checks the whole 40-pixel drag rather than merely checking that some movement occurred.

| Viewport | Coverage |
| --- | --- |
| 375×812 | Portrait rotation/pause and map controls/close button; screenshot |
| 430×932 | Portrait rotation/pause and map controls/close button; screenshot |
| 844×390 | Landscape HUD, multitouch, map, inspection and night screenshots |
| 932×430 | Landscape controls/menus and night screenshot |
| 1280×800 | Larger HUD/map/menu layout and night screenshot |

## Repaired visual workflow

The complete [Yaowarat art inspection run](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/38837784181) passed on final graphics source `45a4552`, including both capture scripts and both artifact uploads. The [graphics/gameplay workflow](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/38837784275) also passed. [Committed CI metadata](validation/ci.json) records jobs, steps and artifact IDs. The final documentation-only head is rechecked in the PR.

The old pan assertion used a fixed screen coordinate. After PR18 it could land on a marker or control instead of the pannable canvas. `capture-bangkok.mjs` now hit-tests an actual uncovered point, sends a stepped native drag, verifies changed viewBox **and direction**, recomputes the pinch anchor after panning, and waits for the real whole-city extent. Timeout remains bounded. Pinch, pause, portrait, culling and inspection checks remain.

A separate native-touch test exposed an actual marker-origin defect: transferring implicit capture from a marker child to SVG fired a bubbling `lostpointercapture` and discarded the still-active pointer. The SVG now ends the gesture on loss of **its own** capture, and retains pointer-up/cancel cleanup. A drag cannot accidentally select a landmark; the following tap still selects. Layout-sensitive test points use the SVG origin's screen transform and wait for a visible, unobstructed discovered pin.

The two manual-only survey/driving Actions jobs are reported as skipped on PR pushes by their existing dispatch guards; they were not disabled to obtain green checks. The 23-pair local survey and deterministic driven route suite provide the accompanying evidence.

## Reproduce locally / Replit

Use Node 22 and the repository's pnpm workspace. No decoder service, new runtime package or asset download is required.

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/tuk-tuk-rush run typecheck
PORT=24177 BASE_PATH=/ pnpm --filter @workspace/tuk-tuk-rush run build
pnpm --filter @workspace/tuk-tuk-rush exec node scripts/validate-graphics.mjs
pnpm --filter @workspace/tuk-tuk-rush exec playwright install chromium
pnpm --filter @workspace/tuk-tuk-rush exec node scripts/run-art-workflow.mjs
pnpm --filter @workspace/tuk-tuk-rush exec node scripts/browser-night-drive.mjs
pnpm --filter @workspace/tuk-tuk-rush exec node scripts/browser-graphics-qa.mjs
```

The browser scripts start/stop their own local Vite child, unless an existing `GAME_URL` is supplied to the art captures. `CHROMIUM_PATH` can select a local browser executable. The matched survey and isolated profile commands are in [performance.md](performance.md). Existing generated-artifact directories remain CI output; this report commits only selected stills and compact JSON/log evidence, not recordings.

On Replit, check out this PR branch and use the existing Run command/preview. On iPhone open that preview in Safari, rotate to landscape, select Fast first, then compare Detailed. Drive Yaowarat at night, Siam traffic/BTS, temple approaches and bridges; hold steering and GO together, brake/reverse, activate boost and pause while a control is held. Open/pan/pinch/recenter the map from a landmark marker, toggle BTS/Places, close back to the correct simulation state, then enter LOOK and exercise orbit/pinch/two-finger pan/reset/viewpoints/return. Repeat map and quality switches, complete fares and a shift, restart and reload to check saved discovery/preferences. Check safe areas, heat, memory-pressure reloads and frame pacing for a sustained session. This is a device verification checklist, **not** a claim those physical tests were performed.

## Capture readback investigation

One long-tour software capture showed terrain-colored road pixels at the residential sunset fixture. The same pose in a fresh browser and a repeated complete tour rendered the asphalt correctly; forced-material/depth diagnostics also confirmed the road geometry. No application regression could be reproduced. The final complete survey waited for submitted GPU work and captured the road correctly. The survey now fences **only screenshot readback**; gameplay and ordinary scene/frame/map measurements never call `gl.finish()`. An explicit `GPU_PROFILE=1` diagnostic uses a fence to read disjoint-checked timer queries; its perturbed frames are excluded from timing comparisons. This is a capture precaution, not a claim of a diagnosed physical-device graphics defect or a driver fix.

## Remaining limits

The city is still stylized; some background walls, foliage silhouettes and riverbank compositions remain simple. Shadowing is a cheap ground approximation, not full dynamic self-shadowing. World construction is still largely synchronous; the bundle is still large. No fabricated hardware FPS, GPU memory allocation, isolated shader-compilation duration or sustained thermal result is reported. See the measured diagnostic costs in [performance.md](performance.md).
