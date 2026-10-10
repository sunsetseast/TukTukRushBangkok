# Tuk Tuk Rush: Bangkok

Landscape browser-based 3D arcade driving prototype (TypeScript, Three.js / React Three Fiber, original procedural meshes and canvas-generated sign textures). No remote assets, accounts, backend calls, or API keys.

## Architecture
- `src/game/world.ts` – approximately 700 m × 700 m hybrid Chinatown district; connected major corridors, landmark footprints and fictional diagonal shortcuts. Coordinates are stylized, not survey-accurate.
- `vehicle.ts` – custom stable arcade controller with small collision substeps, circle/AABB obstacle response, traffic collision, lateral skid momentum and recovery. No Rapier or realistic tipping simulation.
- `traffic.ts` – twelve routed vehicles, alternating intersection phases, spacing and player yielding.
- `missions.ts` – four reachable pickup/destination combinations. `engine.ts` – lifecycle, 180-second shifts, optional Free Ride, stopped boarding/drop-off, trip deadlines, baht fares and bonuses. `types.ts` is the shared contract.
- `Renderer.tsx` – R3F canvas; `useFrame` calls `engine.update(dt)` then imperatively updates tuk-tuk, traffic, beacon, chase camera (building obstruction pull-in). Title phase orbits the live city.
- `cityMesh.ts` – builds the city from `engine.model.district` (instanced roads, dashes, lamps, wires, buildings, windows, awnings, parked cars, food stalls, trees, canvas Thai signs, landmarks, sky). Prop collision footprints are registered once. `tukMesh.ts`, `trafficMesh.ts`, `meshUtil.ts` – shared geometry/materials; moving traffic geometry is merged into one draw call per vehicle.
- `Hud.tsx` (10Hz, SVG heading-up minimap with route + bearing arrow), `Controls.tsx` (floating stick + pedals, per-pointer capture), `Menus.tsx`, `audio.ts` (WebAudio synth engine + horn).
- Sign changes: steer + is right; front wheel yaw = -steer; arrow rotates by -bearing.

## Verification performed
- TypeScript typecheck passes.
- Node simulation assertions checked throttle, paused timers/resume, recovery, all four pickup/delivery pairs, score/baht rewards, trip timeout, shift end/restart, Free Ride, solid building collisions and traffic movement.
- The standard preview screenshot browser could not create a WebGL context and displayed the explicit WebGL failure screen.
- A separate Chromium capture using software WebGL rendered the actual 3D title scene at 844×390. This is **not** an iPhone performance measurement.
- No browser end-to-end automation or real iPhone testing was performed.

## Real iPhone checklist (not yet verified)
1. Title shows orbiting tuk-tuk in the city; Start shift.
2. Drag left half to steer while holding GO (multitouch); release all fingers - input clears.
3. Pause, rotate to portrait (auto-pause + hint), toggle quality/sound, Reset, Restart.
4. Pickup beacon (yellow) ~60m east; drop-off beacon is pink.
5. Stop inside the ring for approximately 1.1 seconds; deliver before the trip timer expires. Check at least three trips, fare feedback and shift results.
6. Test collisions, reversing out of corners, near-miss bonuses, horn, phone interruptions, Safari toolbar resizing, safe-area edges and background/foreground transitions.
7. Compare Fast and Pretty on the actual device; measure frame rate and heat over a full shift. Stable 30 FPS is a target, **not a verified result**.

## Known prototype limitations
- WebGL 2 required. No native iOS, TestFlight build, installed PWA, offline service worker or manifest yet. The simulation/renderer/interface separation keeps later packaging straightforward.
- Simple traffic stops/turns, not a full traffic simulator. No walking pedestrians or advanced crowd behavior.
- Stylized rectangular major corridors and exaggerated landmarks; not suitable for real navigation.
- Synthetic engine/horn audio, not a recorded soundtrack. Thai signs use system-font support, so glyph appearance needs checking in Safari.
- Performance adaptation lowers pixel ratio from a maximum of 1.5 to 1 when sustained render frame rate is below 28; no postprocessing or real-time shadows.
- Scores and fares are per-session; refreshing restarts the prototype.
