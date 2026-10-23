# Reproduction and certification

## Baseline and unchanged original regression

PR36/main is `d3823427bced0b04729beafe87a68ab444f98329`. The baseline [GitHub graphics run](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/39805361590) fails at `test:bangkok`; its six following package checks are skipped. The local [original failure](validation/baseline-original-fares.log) reproduces the zero-contact assertion. The original test file is byte-identical under the [frozen preservation contract](preservation-contract.json).

The corrected [graphics run](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/39830005929) and [canonical approval run](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/39830005934) pass on runtime source `61ce535afa6784721fd4e2b4ef17fb496ba41d40`. Previously skipped `test:gameplay`, `test:street-life`, `test:roadside`, `test:signature`, `test:sign-layers` and `test:assets` all execute and pass. Raw [graphics job steps](validation/graphics-jobs.json) and [canonical job steps](validation/canonical-jobs.json) retain the individual results. The final PR Checks tab records the complete workflow run against the final evidence commit; the PR description links its final run IDs.

The separate WebGL art workflow previously exhausted its 25-minute job budget after the actual captures and camera checks passed. Browser installation alone used approximately 13 minutes in that run. Its [timed-out steps](validation/timed-out-art-jobs.json) are retained as a failure to finish, not a passing test. This PR increases that job budget to 60 minutes, retaining all browser checks. Manual-only matched survey workflows intentionally do not run on pull-request events; their guarded skips are not counted as passes.

## Complete local package run

The fresh final-runtime batch passes **40/40** package groups. [Summary](validation/certified-suite/summary.json) and each individual log below retain the actual outcomes. TypeScript and both PR36/PR37 production builds pass separately; [build checks](validation/build-checks.json) and logs record their exit codes. CI also uses the frozen pnpm lockfile and repository-supported Node version. The local runtime record discloses the local toolchain rather than equating it to a physical device.

| Package group | Result | Wall time ms | Log |
|---|---|---:|---|
| test:assets | PASS | 167 | [test-assets.log](validation/certified-suite/test-assets.log) |
| test:authored-drives | PASS | 39517 | [test-authored-drives.log](validation/certified-suite/test-authored-drives.log) |
| test:authored-sites | PASS | 52355 | [test-authored-sites.log](validation/certified-suite/test-authored-sites.log) |
| test:bangkok | PASS | 203873 | [test-bangkok.log](validation/certified-suite/test-bangkok.log) |
| test:career | PASS | 77236 | [test-career.log](validation/certified-suite/test-career.log) |
| test:cinematic | PASS | 46175 | [test-cinematic.log](validation/certified-suite/test-cinematic.log) |
| test:city-blueprint | PASS | 34878 | [test-city-blueprint.log](validation/certified-suite/test-city-blueprint.log) |
| test:city-completion | PASS | 71171 | [test-city-completion.log](validation/certified-suite/test-city-completion.log) |
| test:city-drives | PASS | 41177 | [test-city-drives.log](validation/certified-suite/test-city-drives.log) |
| test:city-fabric | PASS | 30076 | [test-city-fabric.log](validation/certified-suite/test-city-fabric.log) |
| test:cityscapes | PASS | 69308 | [test-cityscapes.log](validation/certified-suite/test-cityscapes.log) |
| test:civic-roads | PASS | 36031 | [test-civic-roads.log](validation/certified-suite/test-civic-roads.log) |
| test:commercial-districts | PASS | 23904 | [test-commercial-districts.log](validation/certified-suite/test-commercial-districts.log) |
| test:convenience-urban | PASS | 23967 | [test-convenience-urban.log](validation/certified-suite/test-convenience-urban.log) |
| test:corrections | PASS | 37365 | [test-corrections.log](validation/certified-suite/test-corrections.log) |
| test:definitive | PASS | 81058 | [test-definitive.log](validation/certified-suite/test-definitive.log) |
| test:environment | PASS | 85046 | [test-environment.log](validation/certified-suite/test-environment.log) |
| test:gameplay | PASS | 4366 | [test-gameplay.log](validation/certified-suite/test-gameplay.log) |
| test:geographic-reference | PASS | 219 | [test-geographic-reference.log](validation/certified-suite/test-geographic-reference.log) |
| test:graphics-foundation | PASS | 575 | [test-graphics-foundation.log](validation/certified-suite/test-graphics-foundation.log) |
| test:historic-core | PASS | 94127 | [test-historic-core.log](validation/certified-suite/test-historic-core.log) |
| test:historic-districts | PASS | 1471 | [test-historic-districts.log](validation/certified-suite/test-historic-districts.log) |
| test:historic-fidelity | PASS | 32379 | [test-historic-fidelity.log](validation/certified-suite/test-historic-fidelity.log) |
| test:interface | PASS | 23892 | [test-interface.log](validation/certified-suite/test-interface.log) |
| test:landmark-accuracy | PASS | 56356 | [test-landmark-accuracy.log](validation/certified-suite/test-landmark-accuracy.log) |
| test:landmark-quality | PASS | 64242 | [test-landmark-quality.log](validation/certified-suite/test-landmark-quality.log) |
| test:master-plan | PASS | 56956 | [test-master-plan.log](validation/certified-suite/test-master-plan.log) |
| test:open-bangkok | PASS | 34652 | [test-open-bangkok.log](validation/certified-suite/test-open-bangkok.log) |
| test:premium-landmarks | PASS | 72113 | [test-premium-landmarks.log](validation/certified-suite/test-premium-landmarks.log) |
| test:public-spaces | PASS | 25584 | [test-public-spaces.log](validation/certified-suite/test-public-spaces.log) |
| test:real-architecture | PASS | 25459 | [test-real-architecture.log](validation/certified-suite/test-real-architecture.log) |
| test:river-drives | PASS | 52168 | [test-river-drives.log](validation/certified-suite/test-river-drives.log) |
| test:river-geography | PASS | 27801 | [test-river-geography.log](validation/certified-suite/test-river-geography.log) |
| test:roadside | PASS | 1804 | [test-roadside.log](validation/certified-suite/test-roadside.log) |
| test:sign-layers | PASS | 411 | [test-sign-layers.log](validation/certified-suite/test-sign-layers.log) |
| test:signature | PASS | 303 | [test-signature.log](validation/certified-suite/test-signature.log) |
| test:startup | PASS | 6019 | [test-startup.log](validation/certified-suite/test-startup.log) |
| test:street-life | PASS | 3030 | [test-street-life.log](validation/certified-suite/test-street-life.log) |
| test:waterfront-clearance | PASS | 27667 | [test-waterfront-clearance.log](validation/certified-suite/test-waterfront-clearance.log) |
| test:waterfront-drives | PASS | 113450 | [test-waterfront-drives.log](validation/certified-suite/test-waterfront-drives.log) |

## Run the same checks

From the repository root, use the existing pnpm 10 workspace setup and install the frozen dependencies. The normal package commands remain available:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/tuk-tuk-rush run test:bangkok
pnpm --filter @workspace/tuk-tuk-rush run test:waterfront-clearance
pnpm --filter @workspace/tuk-tuk-rush run test:waterfront-drives
pnpm --filter @workspace/tuk-tuk-rush run typecheck
pnpm --filter @workspace/tuk-tuk-rush run build
```

For the complete package batch and additional evidence, run these from `artifacts/tuk-tuk-rush`. `CHROMIUM_PATH` must identify a real installed Chromium binary. The browser harness starts its own local Vite server. It creates actual application frames; it does not synthesize screenshots.

```sh
CITY_TEST_WORKERS=3 node scripts/run-city-completion-suite.mjs
FARE_LABEL=after node --import tsx scripts/trace-waterfront-fares.ts
FARE_LABEL=seed26 FARE_SEED=26 node --import tsx scripts/trace-waterfront-fares.ts
FARE_LABEL=seed41 FARE_SEED=41 node --import tsx scripts/trace-waterfront-fares.ts
WATERFRONT_TRAFFIC=1 node --import tsx scripts/check-waterfront-drives.ts
WATERFRONT_LANES=1 node --import tsx scripts/check-waterfront-drives.ts
node --import tsx scripts/survey-waterfront-world.ts
RIVER_LABEL=after node scripts/capture-waterfront.mjs
RIVER_QA_LABEL=after node scripts/browser-waterfront.mjs
```

For a clean baseline reproduction, check out the exact PR36 commit in an isolated worktree, install/link the same dependencies and run its original `test:bangkok` unchanged. It should fail with 119 indicator frames. Copy only the trace/capture/browser harness files from this PR into that worktree's scripts directory as untracked QA tools. Keep every baseline runtime source file unchanged. Use `FARE_LABEL=before FARE_ALLOW_CONTACTS=1`, `RIVER_LABEL=before`, `RIVER_QA_LABEL=before`, and an absolute `RIVER_OUTPUT` pointing to this PR's shared QA directory. The allowance applies only to the diagnostic recorder; it never changes the original test assertion. `scenes.json` and `performance-scenes.json` supply identical cameras to both runs. Before captures record the exact PR36 source commit and an empty runtime-source diff.

The Node-only inventory harness `scripts/profile-city-inventory.ts` imports `createBangkokWorld` and `buildBangkokGraybox` from `CITY_CHECKOUT` (or the current repository). Set `CITY_INVENTORY_OUTPUT` to the output JSON path. It counts all retained LODs, not visible draw calls; the recorded inventory JSON describes the protocol. Final documents/figures are regenerated from raw evidence by `python scripts/finalize-waterfront-certification.py` at the repository root (Python 3 plus matplotlib). It asserts matched cameras/source state, target sequence, source hashes and all reported pass counts before writing certification outputs.

## What the new coverage establishes

The clearance test validates 1,959 generated objects, 40 independent segment/footprint sample cases and both active original colliders. The world contract requires all road/node/destination/river/transit/boundary records to equal PR36. The dedicated river suite verifies polygon/mesh/water/boat/pier/bridge agreement; no water geometry is re-authored here.

Three seed runs complete 33 fares with zero collision-indicator frames. Twenty-nine static journeys and 29 traffic-enabled repeats cover the requested waterfront corridor and opposite-bank connections, with resolver-category telemetry and completion distances. Six additional bridge journeys explicitly follow the production left-side lane offset. Pause/resume, map return, three ICONSIAM inspection/restart cycles, submerged-save recovery preserving progress, shift completion and free-roam return are covered. Career/interface suites retain save/load, progression and rewards coverage.

Four browser layouts check 375×812, 430×932, 844×390 and 1280×800. The player map path must equal the canonical river polygon exactly and the whole playable boundary must fit. Landscape controls receive actual gas/brake pointer presses and releases. Portrait retains the production rotate guard. The browser reports real WebGL errors and reset resource counts. Physical iPhone Safari remains unverified.

No skipped test is counted as passing. Moving traffic contacts and device limitations remain disclosed in [limitations](limitations.md) and the [route matrix](routes.md).
