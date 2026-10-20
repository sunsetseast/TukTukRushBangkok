# Validation and reproduction

Run from `artifacts/tuk-tuk-rush`, after installing the repository's locked dependencies. This QA only serves a local Vite process; it does not deploy.

```sh
pnpm run typecheck
PORT=24500 BASE_PATH=/ pnpm run build
node scripts/qa-historic-regressions.mjs
pnpm run test:historic-core
pnpm run test:historic-fidelity
HISTORIC_WATERFRONT=1 HISTORIC_OUTPUT=../../../docs/qa/historic-visual-fidelity/waterfront-drives.json node --import tsx scripts/check-historic-drives.ts
HISTORIC_TRAFFIC=1 HISTORIC_OUTPUT=../../../docs/qa/historic-visual-fidelity/traffic-drives.json node --import tsx scripts/check-historic-drives.ts
```

The two immutable `baseline-*` fixtures are exact copies from main `341e02f`, not regenerated expected output. Legacy `test:historic-core` rewrites its own PR32 QA directory; fidelity reads the frozen copies so CI order cannot silently redefine the baseline. The core → fidelity sequence is explicitly rerun. Road/node/landmark/transit/river data equality, local footprint changes, building/parcel safety, continuous pier clearance, two-storey waterfront collision/render agreement and Sanam species are asserted. Existing geometry/clearance thresholds are retained.

The regression rollup covers the existing 32 groups plus fidelity. It includes gameplay, missions, navigation, discovery persistence, save/load, turbo, cameras, road surfaces, protected parcels, public spaces, vegetation, transit clearances, material batching and disposal. See `regression-summary.json` and logs in `regression-initial/`. Build and TypeScript logs are retained separately.

## Controller journeys

Each route initializes the vehicle once, then follows the production navigation path using `GameEngine` input and fixed 1/60s updates. Steering, throttle and braking remain active throughout; no player position is reassigned during a journey. Delivery completion is required. Screenshots at setup poses are not counted as drives.

| Journey | Metres | Static collision frames |
|---|---:|---:|
| Palace → Swing | 487 | 0 |
| Swing → Golden Mount | 525 | 0 |
| Democracy → Sanam | 919 | 0 |
| Pho → Hua Lamphong | 1,605 | 0 |
| Hua → Traimit | 237 | 0 |
| Traimit → Gate | 373 | 0 |
| Gate → Yaowarat | 307 | 0 |

The seven established journeys total 4,452m. All twelve ordered Democracy arm-pair drives total 1,957m. Waterfront checks cover Tha Chang → Tha Tien, the return, and Thai Wang → Sanam Chai, totaling 1,107m. See `driven-routes.json`, `intersection-drives.json` and `waterfront-drives.json`.

Traffic-enabled tests are separate: all seven deliveries complete with the real 38-vehicle traffic state, but Pho → Hua records 31 collision frames. The main worktree runs the same controller script/seed and also records 31. This is an inherited traffic interaction, not a claim of collision-free traffic gameplay.

## Actual renderer

```sh
CHROMIUM_PATH=/path/to/chrome-headless-shell CITY_OUTPUT=/absolute/repo/docs/qa/historic-visual-fidelity CITY_LABEL=after CITY_WIDTH=768 CITY_HEIGHT=432 CITY_NIGHT_ALL=1 node scripts/capture-historic-bangkok.mjs
CHROMIUM_PATH=/path/to/chrome-headless-shell node scripts/browser-historic-fidelity.mjs
CHROMIUM_PATH=/path/to/chrome-headless-shell QA_OUT=/absolute/repo/docs/qa/historic-visual-fidelity/browser node scripts/browser-landmark-accuracy.mjs
python scripts/document-historic-fidelity.py
python scripts/summarize-historic-fidelity.py
```

The baseline uses an isolated main worktree with the same capture script and dimensions. Capture metadata records camera pose, real public-road approach, normal chase versus inspection camera, quality and actual renderer counters. Visual comparisons pause the engine and disable traffic but never hide city objects. The 42 final images include all ten sites in ground, elevated, normal driving and night views plus two river views; baseline has 35 matched daytime/selected-night frames. All37 feature rays run against visible rendered meshes. Original six cases are reproduced in both checkouts.

Entrance/roof/principal-feature labels are distinct. A hit elsewhere on the compound can show landmark visibility while failing named-feature certification. No-surface targets are recorded honestly. Four independent Hua facade rays additionally verify the retained clock/entrance/arches.

Viewport checks use 375×812, 430×932, 844×390 and 1280×800, inspection controls/reset/return, then three restart cycles. They assert normal camera restoration and stable allocated geometry/texture counts. This is Chromium138 headless with touch emulation and SwiftShader, not physical iPhone Safari. Retained scene inventory and production bundle measurements are described in [performance](performance.md).

The first temporary QA batch was lost when the execution environment reset after interruption. The evidence committed here was regenerated from the already-published implementation branch. Earlier summary claims were not substituted for missing files.
