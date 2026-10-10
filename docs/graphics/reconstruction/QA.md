# Verification report

Executed against the reconstruction on 2026-10-10. Physical iPhone testing was
not available. This remains a browser prototype, not native iOS/TestFlight.

## Executed checks

| Check | Actual result / scope |
|---|---|
| TypeScript | `run typecheck` passes. |
| Production build | `PORT=24177 BASE_PATH=/ ... run build` passes. Vite warns about the existing large application chunk: about 1.26MB uncompressed / 357KB gzip. Not a build failure; startup/code splitting remains a profiling opportunity. |
| Graph/collision tests | 81 nodes, 87 edges, 87 buildings, all edges nonzero; sampled road centres clear of rotated solid footprints; five facade trade classes. |
| Curvature | Yaowarat tangent variation exceeds the straight-grid regression threshold; shared short edges drive scenery/AI/navigation. |
| Left-hand traffic | All twelve initial lane offsets are left of their directed route; main-road one-way direction remains valid throughout simulation. |
| Roundabout | All loop edges have the correct clockwise orientation. Five-minute AI run contains 8,578 vehicle-frames on the loop. |
| Sustained AI simulation | Five minutes / 18,000 frames: 429 edge changes, finite state, bounded road offset, no obstacle clipping above the test tolerance, no one-way violations. This is CPU simulation, not a rendered five-minute device soak. |
| Mission connectivity | All four pickup/destination pairs connect; stops are outside solid footprints. |
| Actual controller-driven mission | 260m, 25.18 simulated seconds; approach/stop/board, drive to drop-off, fare/score/delivery increment and next passenger. No teleporting and zero collision frames. **Traffic disabled for this deterministic integration test.** |
| Handling/recovery | Throttle, steering, brake/reverse and road recovery covered by focused controller tests. |
| Street-life paths | 107 deterministic walkers/customers/vendors; entire sampled routes outside all road corridors and oriented shops/carts; movement, pause and reduced Fast visibility pass; 13 bounded instanced part batches. |
| Hero/texture assets | Existing 606,816-byte GLB, 29,068 triangles, 13 materials; legacy textures validate. Hero retained rather than replaced. |
| Runtime assets/fonts | Actual browser captures: no failed requests, both local Thai/Chinese fonts loaded, no JS errors. |
| Actual 3D rendering | Ten screenshots from WebGL-enabled Chromium: chase, signs, shops, curve, gate, intersection, people, miniature view, 844×390 and 932×430 landscape. No missing textures or GL error. |
| Real multitouch events | Two CDP touch contacts activated gas and steer concurrently (steer about 0.845). Five rendered frames moved the vehicle about 1.29 world units; speed rose about 3.43→6.72. Release cleared both inputs; page did not scroll. Brake contact activated. **Browser emulation, not Safari hardware testing.** |
| Pause/quality/resume | Ordinary browser clicks open Pause, freeze both player and traffic through render frames, select Pretty/Fast and resume. |
| Recovery/restart UI | Ordinary clicks reset to finite stopped state and restart Free Roam with playing/pickup/zero deliveries. |
| Orientation UI | 390×844 shows rotate guidance; returning to 844×390 hides it. Landscape controls were inside the viewport. Physical safe-area insets remain untested. |
| GPU cleanup | Disposing the rendered street-life subsystem releases five GPU geometry registrations. Not a full-session whole-game leak certification. |
| GL status | Actual capture browser returns `gl.getError() === 0`. |
| Workflow | Managed game workflow restarted after final configuration changes; Vite serves cleanly. No replacement/duplicate workflow created. |

The first touch-test attempt lost its render hook and could not complete.
Cause was not established. A fresh continuation kept the hook through actual
touch-driven frames, with no reload, context-loss event or page error.
The next interruption was a confirmed development-banner overlay intercepting
Pause. Its injection is now disabled **for this fullscreen game**; cartographer
and error tooling remain. The final ordinary-click UI pass verified the fix.
These interruptions are recorded rather than counted as passing checks.

The built-in screenshot service did not provide WebGL 2 and correctly showed
the game's unsupported-device screen. Successful game screenshots used installed
Chromium with ANGLE/SwiftShader; this is an environment distinction, not proof
that every browser or iPhone supports the game.

## Render complexity

Actual Linux Chromium software-renderer samples, after final geometry reduction:

| Sample | Submitted draw calls | Submitted triangles |
|---|---:|---:|
| Pretty chase | 210 | 230,716 |
| Pretty sampled landscape | 228 | 240,628 |
| Fast sampled landscape | 161 | 138,952 |
| Pretty signage close-up | 60 | 127,038 |
| Pretty Odeon view | 219 | 159,534 |

These are snapshots, not worst-case budgets or hardware timing results. Small
sub-pixel trim bevels are plain boxes; major shells/pillars/canopies retain soft
geometry. Spatial batching, shorter Fast detail range, no real shadow-map passes,
no postprocessing and bounded instanced people control cost.

Fast reduced the sampled submitted triangle count by about 42% and draw calls
by about 29% versus Pretty. Geometry remains significantly heavier than the old
boxy art. A physical-phone profile is needed before claiming stable 30 FPS.
Software capture frame times are dominated by the test renderer and screenshot
environment and cannot be translated into iPhone performance.

Raw samples, GPU description and error arrays:
`generated-artifacts/bangkok-reconstruction/visual-measurements.json`.
Actual before/after review:
`generated-artifacts/bangkok-reconstruction/review.html`.
Generated outputs are intentionally excluded from Git and publishing; the
scripts recreate them and the delivered review file embeds the images.

## Still needs an actual iPhone

- Safari and Replit preview: simultaneous steering/gas, brake/reverse, release
  after pointer cancellation, backgrounding, lock/unlock and orientation changes.
- Notch/Dynamic Island safe areas, address-bar expansion and fullscreen constraints.
- A complete three-minute shift with real moving traffic, repeated deliveries
  and resets, near misses, sound activation and interruption recovery.
- Fast/Pretty FPS, frame-time distribution, memory and thermal throttling during
  a sustained 5–10 minute session on the user's specific device.
- Long-session GPU/resource behavior; complete app unmount/remount and context restoration.
- PWA installation/offline behavior as a separate packaging check. No new native
  app, TestFlight build, App Store submission or deployment was performed.

## Known scope limits

Road widths, landmark offsets, several junctions and roundabout routing are
documented arcade adaptations. Most storefronts are original generic trades;
one factual Hua Seng Heng name is included, with brand clearance still pending.
Tang To Kang and further exact signature storefronts are deferred. Open parcels
and repeated trade motifs remain; this is not a full landmark-grade streetscape
reconstruction. A new optional dusk/neon lighting mode is not implemented.
