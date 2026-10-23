# Automated validation and reproduction

Latest complete package summary: **43/43 groups pass**; complete=True, pass=True. [Machine summary](validation/suite/summary.json). Each group runs the actual package script, including its chained checks. Failed development attempts remain in separate logs and are superseded only by an actual rerun.

| Group | Result | Wall seconds | Evidence |
|---|---|---:|---|
| test:assets | PASS | 0.2 | [test-assets.log](validation/suite/test-assets.log) |
| test:authored-drives | PASS | 50.8 | [test-authored-drives.log](validation/suite/test-authored-drives.log) |
| test:authored-sites | PASS | 64.6 | [test-authored-sites.log](validation/suite/test-authored-sites.log) |
| test:bangkok | PASS | 197.0 | [test-bangkok.log](validation/suite/test-bangkok.log) |
| test:career | PASS | 97.6 | [test-career.log](validation/suite/test-career.log) |
| test:chinatown | PASS | 36.6 | [test-chinatown.log](validation/suite/test-chinatown.log) |
| test:chinatown-drives | PASS | 81.7 | [test-chinatown-drives.log](validation/suite/test-chinatown-drives.log) |
| test:chinatown-traffic | PASS | 42.7 | [test-chinatown-traffic.log](validation/suite/test-chinatown-traffic.log) |
| test:cinematic | PASS | 62.1 | [test-cinematic.log](validation/suite/test-cinematic.log) |
| test:city-blueprint | PASS | 39.5 | [test-city-blueprint.log](validation/suite/test-city-blueprint.log) |
| test:city-completion | PASS | 84.4 | [test-city-completion.log](validation/suite/test-city-completion.log) |
| test:city-drives | PASS | 48.2 | [test-city-drives.log](validation/suite/test-city-drives.log) |
| test:city-fabric | PASS | 43.0 | [test-city-fabric.log](validation/suite/test-city-fabric.log) |
| test:cityscapes | PASS | 65.7 | [test-cityscapes.log](validation/suite/test-cityscapes.log) |
| test:civic-roads | PASS | 42.6 | [test-civic-roads.log](validation/suite/test-civic-roads.log) |
| test:commercial-districts | PASS | 27.4 | [test-commercial-districts.log](validation/suite/test-commercial-districts.log) |
| test:convenience-urban | PASS | 27.2 | [test-convenience-urban.log](validation/suite/test-convenience-urban.log) |
| test:corrections | PASS | 40.4 | [test-corrections.log](validation/suite/test-corrections.log) |
| test:definitive | PASS | 89.6 | [test-definitive.log](validation/suite/test-definitive.log) |
| test:environment | PASS | 98.0 | [test-environment.log](validation/suite/test-environment.log) |
| test:gameplay | PASS | 3.5 | [test-gameplay.log](validation/suite/test-gameplay.log) |
| test:geographic-reference | PASS | 0.1 | [test-geographic-reference.log](validation/suite/test-geographic-reference.log) |
| test:graphics-foundation | PASS | 0.7 | [test-graphics-foundation.log](validation/suite/test-graphics-foundation.log) |
| test:historic-core | PASS | 106.9 | [test-historic-core.log](validation/suite/test-historic-core.log) |
| test:historic-districts | PASS | 1.7 | [test-historic-districts.log](validation/suite/test-historic-districts.log) |
| test:historic-fidelity | PASS | 43.0 | [test-historic-fidelity.log](validation/suite/test-historic-fidelity.log) |
| test:interface | PASS | 25.4 | [test-interface.log](validation/suite/test-interface.log) |
| test:landmark-accuracy | PASS | 69.2 | [test-landmark-accuracy.log](validation/suite/test-landmark-accuracy.log) |
| test:landmark-quality | PASS | 73.2 | [test-landmark-quality.log](validation/suite/test-landmark-quality.log) |
| test:master-plan | PASS | 65.1 | [test-master-plan.log](validation/suite/test-master-plan.log) |
| test:open-bangkok | PASS | 38.3 | [test-open-bangkok.log](validation/suite/test-open-bangkok.log) |
| test:premium-landmarks | PASS | 75.8 | [test-premium-landmarks.log](validation/suite/test-premium-landmarks.log) |
| test:public-spaces | PASS | 32.2 | [test-public-spaces.log](validation/suite/test-public-spaces.log) |
| test:real-architecture | PASS | 31.8 | [test-real-architecture.log](validation/suite/test-real-architecture.log) |
| test:river-drives | PASS | 51.8 | [test-river-drives.log](validation/suite/test-river-drives.log) |
| test:river-geography | PASS | 28.8 | [test-river-geography.log](validation/suite/test-river-geography.log) |
| test:roadside | PASS | 1.1 | [test-roadside.log](validation/suite/test-roadside.log) |
| test:sign-layers | PASS | 0.4 | [test-sign-layers.log](validation/suite/test-sign-layers.log) |
| test:signature | PASS | 0.2 | [test-signature.log](validation/suite/test-signature.log) |
| test:startup | PASS | 7.1 | [test-startup.log](validation/suite/test-startup.log) |
| test:street-life | PASS | 2.4 | [test-street-life.log](validation/suite/test-street-life.log) |
| test:waterfront-clearance | PASS | 22.0 | [test-waterfront-clearance.log](validation/suite/test-waterfront-clearance.log) |
| test:waterfront-drives | PASS | 117.8 | [test-waterfront-drives.log](validation/suite/test-waterfront-drives.log) |

Production Vite builds are measured for both clean PR37 and final source; TypeScript is checked separately. See [build-before.log](validation/build-before.log), [build-after.log](validation/build-after.log) and [typecheck.log](validation/typecheck.log). The existing oversized-bundle warning remains visible and is not hidden.

New structural checks validate block containment/holes, facing normals, real road frontage, oriented massing nonoverlap, protected sites/passages, actual emitted volumes, physical sign attachments, exact exterior footprint preservation, source-backed directions, street-name hysteresis/rate limit and restart clock handling. The unmodified original fare assertion continues to demand zero contacts.

Legacy geographic freezes now invoke the explicit PR38 local migration plus strict PR37 exterior equality. The old global building-density check applies at its existing threshold to the unaffected city; replaced Chinatown has its stronger parcel/exterior-delta checks. Legacy architecture counts use the actual new emitter and retained piece budget rather than displaced old facade plans. No static contact assertion is reduced. The scoped source-approval file permits only cityData, its regenerated road surfaces and the bounded curbside navigation fix; all other PR37 frozen source hashes remain active.

Reproduce with the repository-supported pnpm10 / Node22 setup from the package directory:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/tuk-tuk-rush typecheck
pnpm --filter @workspace/tuk-tuk-rush test:chinatown
pnpm --filter @workspace/tuk-tuk-rush test:chinatown-drives
pnpm --filter @workspace/tuk-tuk-rush test:chinatown-traffic
pnpm --filter @workspace/tuk-tuk-rush test:bangkok
pnpm --filter @workspace/tuk-tuk-rush test:waterfront-clearance
pnpm --filter @workspace/tuk-tuk-rush test:waterfront-drives
pnpm --filter @workspace/tuk-tuk-rush build
```

For the entire package matrix, run `node scripts/run-chinatown-suite.mjs` from the app directory. It executes exact package commands directly, preserving individual logs. The local host uses Node24.19.0 and preinstalled workspace dependencies; its pnpm bootstrap wrapper attempted an unrelated reinstall, so direct package commands were used. CI installs the frozen lockfile with supported Node22. No local install/lockfile change is included.

WebGL reproduction: set `CHROMIUM_PATH` to a Playwright-compatible Chromium and run `node scripts/browser-chinatown.mjs` in the relevant app checkout. Use `CHINATOWN_LABEL=before` in a clean PR37 checkout, with the output script pointing at this evidence directory. Scene controls live in scenes.json. The browser runner has real page-error checks, mobile overlap checks, a long road-name case, map capture and repeated restarts. Chromium/SwiftShader is not physical Safari.

Final production UI replay: PASS at all four requested viewports using visible game controls, with the street badge visibly painted and no page errors. See [production-ui.json](validation/production-ui.json). Production screenshots use low quality in Chromium138; the matched art gallery remains medium quality in its recorded renderer. Production intentionally omits development debug hooks. This replay appends the final source stacking declaration verbatim to the already built stylesheet and does not substitute synthetic scenery.
