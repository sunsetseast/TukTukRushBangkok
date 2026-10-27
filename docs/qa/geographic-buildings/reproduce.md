# Reproduction

Use the repository's locked JavaScript dependencies and pinned Python GIS requirements. From the root:

```sh
pnpm install --frozen-lockfile
python -m pip install -r scripts/geography/requirements.txt
python scripts/geography/import_bangkok.py
pnpm --filter @workspace/tuk-tuk-rush geography:pack
python scripts/geography/check_buildings.py
pnpm --filter @workspace/tuk-tuk-rush test:geographic-buildings
pnpm --filter @workspace/tuk-tuk-rush test:geographic-gameplay
pnpm --filter @workspace/tuk-tuk-rush test:geographic-streaming
pnpm --filter @workspace/tuk-tuk-rush typecheck
PORT=24818 BASE_PATH=/ pnpm --filter @workspace/tuk-tuk-rush build
```

The ordinary offline import rebuilds the original geography, then attaches the building companion to existing chunk files and refreshes hashes. The pack step updates gameplay chunk references; navigation bytes and road placement remain unchanged. CI byte-compares runtime/chunks/manifest/building report. Source is not fetched in CI or at play time.

Recreate the building source only if needed, using the cached PBF when available:

```sh
curl -fL https://download.geofabrik.de/asia/thailand-261024.osm.pbf -o /tmp/thailand-261024.osm.pbf
sha256sum /tmp/thailand-261024.osm.pbf
# Required: e8373240cf0be47cc641f2c8627e674064d8c47f4ff2a11f6a33fcbfc9a50949
python scripts/geography/import_bangkok.py --buildings-pbf /tmp/thailand-261024.osm.pbf
pnpm --filter @workspace/tuk-tuk-rush geography:pack
```

The original `--pbf` option remains the original road/water/rail extraction. `--buildings-pbf` adds the companion without rewriting the original source snapshot or changing its import date. The building companion records its own extraction date and the same source snapshot date/checksum. Runtime gzip has canonical JSON, fixed headers and millimeter coordinates.

Browser evidence (from the app directory):

```sh
QA_SCREENSHOTS_ONLY=1 CHROMIUM_PATH=/usr/bin/chromium node scripts/browser-geographic-buildings.mjs after
QA_TRAVEL_ONLY=1 QA_TRAVEL_CYCLES=6 CHROMIUM_PATH=/usr/bin/chromium node scripts/browser-geographic-buildings.mjs travel-proof
GEOGRAPHIC_BROWSER_REPORT=../../../docs/qa/geographic-buildings/gameplay-browser/ CHROMIUM_PATH=/usr/bin/chromium node scripts/browser-geographic-gameplay.mjs
GEOGRAPHIC_REGRESSION_REPORT=../../../docs/qa/geographic-buildings/legacy-regressions.json node scripts/run-geographic-regressions.mjs
```

The browser harness starts local Vite and uses actual ANGLE SwiftShader WebGL. DEV-only `&geographyQA` exposes fixed camera poses, source-road relocation, building inspection and live renderer counters. This hook is not available in production. Fixed screenshot poses are stored in the harness; named driving views snap to source Yaowarat, Charoen Krung and Si Phraya roads. Relocations test residency and are **not** evidence of physically driving those distances. The production-controller test drives the paid fare and bridge route without teleporting, with imported building colliders present.

For a fresh before comparison, export the base commit's `public/assets/geography/` directory outside the repository and set `GEOGRAPHY_ASSET_ROOT` to that directory when running the browser harness with a separate report label. This substitutes the actual base runtime/chunks, never conceptual geometry. `QA_TRAVEL_ONLY=1` skips screenshots for a residency-only rerun. The original baseline was captured before installing new building assets. The accepted matched before gallery was subsequently recaptured with corrected camera poses using the exact base-commit assets. `measured-after-metrics.json` preserves the paired implementation timing run; `after/metrics.json` describes the final screenshot refresh.

Source license: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). The bounded source and derived runtime database are available under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/); retain attribution and these source/reproduction records when redistributing geographic data. No country PBF is committed.
