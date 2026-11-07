# Regression evidence

Tested runtime commit: `cfb0ad3e661a21bb1f98e9bc860e3b4ebdfc74d8`. Exact job/step outcomes, including canceled and skipped work, are retained in [ci-steps.json](ci-steps.json).

## Passing final-source workflows

| Workflow | Result | Run |
| --- | --- | --- |
| Geographic Chinatown visual certification | PASS | [42299624805](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42299624805) |
| Geographic mobile consolidation | PASS | [42299624870](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42299624870) |
| Real-scale Bangkok geography | PASS | [42299624893](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42299624893) |
| Geographic map loading / HTML recovery | PASS | [42299624768](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42299624768) |
| Geographic local traffic foundation | PASS | [42299624774](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42299624774) |
| Original game graphics checks | PASS | [42299624814](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42299624814) |
| Original Yaowarat art inspection | PASS | [42299624880](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42299624880) |

Final-source Chinatown geography/driving certification, Bang Rak completion, and canonical approval workflows were **canceled**, not passed. Living-city driving and matched-environment survey workflows were **skipped**. Their complete step statuses remain in the JSON. Required geographic/gameplay/traffic/legacy coverage also runs in the passing targeted workflows above; no canceled suite is represented as complete.

## Commands executed

From repository root, the final targeted workflow passed:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @workspace/tuk-tuk-rush typecheck
pnpm --filter @workspace/tuk-tuk-rush exec node --import tsx scripts/check-geographic-chinatown.ts
pnpm --filter @workspace/tuk-tuk-rush exec node --import tsx scripts/check-geographic-worker.ts
pnpm --filter @workspace/tuk-tuk-rush exec node --import tsx scripts/check-geographic-landmark-cache.ts
pnpm --filter @workspace/tuk-tuk-rush test:geographic-streaming
pnpm --filter @workspace/tuk-tuk-rush test:geographic-gameplay
pnpm --filter @workspace/tuk-tuk-rush test:geographic-asset-delivery
pnpm --filter @workspace/tuk-tuk-rush test:geographic-traffic
pnpm --filter @workspace/tuk-tuk-rush test:thai-road-signage
pnpm --filter @workspace/tuk-tuk-rush exec vite build
```

Derived asset preparation, pinned PR59 baseline/final Chromium captures, repeated streaming, and WebKit SPA fallback also passed in that workflow. The passing real-scale suite additionally checks original building/compiled geometry and geographic source integrity. Local checks passed `check-geographic-preparation.ts`, `test:geographic-buildings` (222,123 records / 471 chunks), `test:gameplay` (399 m simulated delivery without teleports) and `test:career` (rewards, saves, corruption/backup protection and legacy discovery). The facade tests separately prove decoration does not mutate original source building/collision records.

The facade unit report's `prepareMs` includes repeated deterministic construction, buffer round trips, clearance and LOD/disposal assertions; it is **not** a production worker benchmark. Actual worker preparation and main attachment timing are in the browser diagnostics.

## Browser scenarios

Chromium/SwiftShader uses an 844×390 touch viewport. [mobile-regression.json](mobile-regression.json) records all fourteen passed interaction checks:

- Steering, gas, brake, boost, horn, LOOK, pause/recover/resume, route map, destination selection, Fast/Pretty settings, landscape/portrait handling, return to geographic menu and Start Shift.
- Boarding/delivery, ฿214 earnings, 57 XP and serialized career storage. The browser fare uses explicitly labeled QA relocation followed by real production fare updates; the separate geographic suite tests driven fare completion.
- Repeated source-chunk eviction/revisit preserves mission/wallet; AI OFF retains source regulatory signs and bilingual plaques.
- Synthetic DOM context-loss event exposes the recovery UI; this is event-handler testing, not a physical GPU failure.
- Original compressed Bangkok welcome and Free Roam startup.
- Malformed `.pack` recovers via a `.gz` delivery fixture containing identical real compiled bytes. Main intentionally retired the old generated `.gz` files; the test does not pretend those aliases ship in the normal build.
- Genuine metadata failures expose meaningful errors and recover after explicit Retry; no fake/empty data substitution.

The final visual workflow verifies Thai/Chinese fonts, day/dusk/night settings, source-camera screenshots, bounded draw calls, zero renderer/stream errors and repeated resource eviction. [webkit-gzip-report.json](webkit-gzip-report.json) records real Playwright WebKit decoding of four geographic payloads.

Physical iPhone 17 Pro Max performance, sustained warm-device p95 ≤33.3 ms, thermals, long-duration JS heap/VRAM and a genuinely lost/restored hardware GPU context remain **unverified**. The developer's earlier PR59 feedback applies to the baseline only.
