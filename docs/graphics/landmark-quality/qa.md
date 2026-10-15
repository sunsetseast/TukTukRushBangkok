# Validation record

Base: current main `1d85bee`, with PR #16 startup safeguards and PR #15 access/transit systems.

Automated checks exercised actual world generation and simulation, not screenshot assertions alone:

| Area | Result |
| --- | --- |
| Traffic | 7,479 moving left-lane samples across 13 district/connector areas; 1,504 junction transitions; 2,521 clockwise roundabout frames |
| Road bake | 2,850 rendered-road sample checks; zero sidewalk/asphalt polygon overlap; unchanged graph key |
| Visitor circulation | All 10 controller-driven public-road entrance/arrival/exit journeys, boosted as well as normal input; zero collision frames |
| Missions | 11 driven fares; 21,990 metres; preserved discovery and pause/recovery/restart |
| Rail | 36,000 deterministic train frames; all 25 line-station records served; 189 supports clear of vehicle lanes; 1,284 cross-line clearance comparisons and 1,708 car-body overlap checks |
| Boost | 5 seconds active, 10 seconds recharge, 1.4 acceleration, retained 37 m/s cap; braking priority and thin-obstacle collision checks |
| Art and camera | All 27 named sites inventoried; finite mesh positions; owned resources dispose; all inspection presets bounded under repeated orbit/pan/zoom inputs; authored indoor aisle limits |
| Fonts | Actual shipped cmap coverage for 105 strings, including 658 Thai and 26 Chinese glyph occurrences |
| Materials | Spatial cells share output material only by source identity; shader hooks, maps, transparency and vertex color settings preserved; texture/material disposal exactly once |
| Browser startup | Both Bangkok and original Chinatown drive, pause, resume and restart with offline road-authoring dependencies deliberately blocked |

The browser interaction report records real CDP multi-touch orbit, pinch, pan, reset and cancellation; input isolation; paused fare/shift/boost/rail state; return; map station selection; restart allocation counts; and viewport checks at 375×812, 430×932, 844×390 and 1280×800. The inspection photo survey includes every named site plus the six flagship station environments and four sunset temple views. Where a generic camera composition was obstructed, it was revised after actual screenshot review.

The visitor-sign survey uses the normal chase camera and three geometric rays across each of the ten boards from public-road approaches. The moving-train proof uses actual engine time at Asok, with before/after images and route-state data, rather than a model viewer or video. The road approach screenshots use staged player poses on the actual road graph. The access controller tests use simulation inputs without vehicle teleports during a journey; traffic is disabled in those deterministic route runs.

Physical iPhone Safari, GPU timers, thermal behavior, touch hardware and true device memory pressure have not been tested. SwiftShader frame timings are software-renderer observations; they do not establish an iPhone frame rate. Keep the PR draft until device and art review.

## Browser results and reproduction

- [Interaction report](interaction/qa.json): pass, no browser or HTTP errors; actual CDP touch orbit/pinch/pan/cancel; keyboard/reset/exit; frozen gameplay clocks; nine inspection sites; four requested viewports; portrait return remains paused; station-layer selection; train pause/restart; stable allocation counts over three restarts.
- [Wayfinding report](wayfinding/qa.json): all ten destination boards visible at three sampled points from real public-road chase-camera approaches; 4.41875 m minimum ground clearance. The test checks those authored approach poses, not every possible oblique viewpoint.
- [Train movement report](transit/transit-detail.json): actual engine clock advances, cars remain attached to their routes, and the two Asok images show different positions. Deterministic rail tests additionally cover station stopping, reversal, route ordering and clearance.
- [Startup log](validation/startup.log): production build and browser sessions for Bangkok and original Chinatown pass while polygon-clipping, splaytree and robust-predicates are deliberately unavailable to the runtime.
- [TypeScript](validation/typecheck.log) and [production build](validation/production-build.log): pass. The pre-existing bundle-size warning remains.
- [Visitor/rail controller results](validation/destination-rail.json), [traffic/boost](validation/traffic-boost.json), [missions](validation/missions.json), [original Chinatown](validation/chinatown.json), [world](validation/world.json) and [environment/disposal](validation/environment.log) preserve the detailed simulation evidence.

The project checks include `typecheck`, `build`, `test:startup`, `test:landmark-quality`, `test:open-bangkok`, `test:definitive`, `test:bangkok`, `test:gameplay`, `test:environment`, `test:cityscapes`, `test:street-life`, `test:roadside`, `test:signature`, `test:sign-layers`, and `test:assets`. The new art/camera/font/material tests are included in the existing GitHub workflow. With dependencies installed, run them through `pnpm --filter @workspace/tuk-tuk-rush run <script>`.

Browser scripts run from `artifacts/tuk-tuk-rush`: set `CHROMIUM_PATH` if Chromium is not installed at Playwright's default path, then run `node scripts/browser-landmark-quality.mjs`, `node scripts/browser-transit-quality.mjs`, or `node scripts/capture-wayfinding-quality.mjs`. They start a local Vite server. `profile-landmark-quality.mjs` uses the committed matched poses. Capture scripts overwrite a bounded evidence set; they do not record video.

## Visual review and changes made after rendering

The photograph survey covers all 27 named sites, six flagship rail environments, head/body/feet views and four temple sunset views. Review found and corrected a support hand obscuring the Buddha face, a hall ceiling cutting the crown, spiky hair geometry, monument bases hidden behind roof envelopes, cropped tower crowns, obstructed mall default views, an arrival board inside a gate beam, a floating fare beacon in inspection, and the portrait rotation overlay blocking look controls. Road-level BTS poses were moved onto suitable public-road interiors with clear station sightlines. These adjustments are in the implementation rather than hidden with screenshot-only model edits.

## Remaining limitations / merge recommendation

Keep this PR **draft** for technical and art review. The implemented camera, signs and models are ready to inspect, but full final visual acceptance and native iPhone performance certification remain open.

- Physical iPhone Safari and real multi-touch hardware were unavailable. CDP emulation does not prove device frame rate, thermals, memory pressure or browser-specific gesture behavior.
- Resident buffers increase 10.5%, and this run shows a slower software-rendered Chong Nonsi low sample and slower first startup. The exact values and limitations are retained in the [performance report](performance/README.md). Reproduce on target hardware and optimize any persistent slowdown before merge.
- Sculpture faces, hands and continuous robe surfaces are newly authored; specialist character-art review may still refine anatomy. Pearl-style sole motifs and mural panels are original interpretations, not exact historic replicas. Tiny ceramic and relief details are selective.
- All named sites are audited; commercial buildings and secondary facades remain stylized and comparatively simple. This PR does not claim every building reaches hero-asset fidelity. Khao San and the parks preserve their existing compositions.
- Exterior occlusion avoidance uses bounded authored envelopes and a local search, not a full navigation mesh for cameras. Dense sites can still benefit from manual orbit or another preset; indoor Pho views intentionally have narrow safe limits.
- Municipal and commercial text has shipped-glyph coverage and readable approach samples; long-distance lettering is still limited by atlas resolution. Native Thai/Chinese editorial review would be valuable.
- The central BTS network is refined, not extended to the entire metropolitan system. Trains retain the existing deterministic station service. Real-time train audio remains the existing subtle transit sound system.
- Main-site sign approaches and all named night views were reviewed. Selected hero sites were also checked at sunset; not every minor site has a separate daytime/nighttime pair. No paid/proprietary/reference-photo assets are shipped.
