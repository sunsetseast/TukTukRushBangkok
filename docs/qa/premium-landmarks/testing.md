# Validation and reproduction

Run from `artifacts/tuk-tuk-rush` with locked repository dependencies. No merge or deployment is required.

```sh
node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
PORT=24638 BASE_PATH=/ node node_modules/vite/bin/vite.js build
QA_PHASE=regression QA_OUTPUT=../../../docs/qa/premium-landmarks/validation/regression/ node scripts/qa-historic-regressions.mjs
HERO_TRAFFIC=1 node --import tsx scripts/check-premium-drives.ts
node --import tsx scripts/audit-premium-hotels.ts
CITY_INVENTORY_OUTPUT=../../docs/qa/premium-landmarks/after-inventory.json node --import tsx scripts/profile-city-inventory.ts
CHROMIUM_PATH=/path/to/chrome-headless-shell HERO_LABEL=after HERO_PORT=24635 node scripts/capture-premium-landmarks.mjs
CHROMIUM_PATH=/path/to/chrome-headless-shell QA_OUT=/absolute/path/to/docs/qa/premium-landmarks/browser node scripts/browser-landmark-accuracy.mjs
```

The runner executes 35 selected package groups. Existing suites cover gameplay/mission delivery, left traffic, routing/map, save/reload/career/discovery, boost, camera corrections, material/night transition, authored parcels, roads/river/public spaces, BTS and MRT. `test:historic-core` remains outside that runner and is reported separately if executed. Test results do not imply a new physical touch/gamepad session. The immutable first 208 parcels are checked against a fixture captured directly from untouched PR34 runtime.

New six-builder tests inspect both LODs, finite/bounded batched geometry, actual west/east Terminal and ICON entrance rays, physical pixel recess/core, 103 supporting parcel bounds and actual instanced window surfaces on four elevations across 12 district/variant combinations (240 rays). Blueprint comparison checks both PR33 and PR34 and rejects removed footprints outside the researched apron or new infill outside its 30m collar. Historic footprint guards explicitly recognize that canonical correction; road approval hashes remain fixed.

## Required controller journeys

The actual GameEngine/VehicleController receives steering, gas and brake at 60Hz until delivery triggers. Each route is placed once at its starting road/access node, with no mid-route teleport. Traffic-off/on runs and untouched-main comparisons are separate reports. These are automated controller-input journeys, not physical-device demonstrations.

1. Asok intersection → Terminal 21.
2. Terminal 21 → Emporium.
3. Silom corridor → MahaNakhon.
4. MahaNakhon → Chong Nonsi.
5. ICONSIAM → Charoen Nakhon.
6. ICONSIAM → Millennium Hilton.
7. Peninsula → ICONSIAM.
8. Oriental → River City.
9. Terminal 21 → MahaNakhon.

The baseline traffic issue on Peninsula → ICONSIAM and prior Wat Pho → Hua Lamphong must remain in backlog when reproduced. Report collision frames honestly; traffic-enabled completion is not a claim of collision-free traffic.

## Browser behavior and hardware limits

Fixed scenes include normal public-road approaches, street entrances, explicit river/elevated inspections and sunset/night. The inherited browser regression checks historic Hua Lamphong mesh rays, four viewports (375×812, 430×932, 844×390, 1280×800), ICON inspection reset/return, three restart cycles clearing stale camera overrides, resource stability and the live inspector. Software Chromium/SwiftShader does not certify physical iPhone 17 Pro Max Safari, sustained GPU FPS, thermals, touch driving or mobile memory.
