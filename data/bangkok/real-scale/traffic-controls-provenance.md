# Verified Bangkok traffic-control source — imported 2026-11-03 UTC

The source file `traffic-controls.v1.json.gz.b64` is the **unchanged, gzip-compressed and Base64-encoded** result of the [GitHub Actions real-OSM traffic-control extraction](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/41547370500) for PR #56. The archive decompresses to a 461,102-byte UTF-8 JSON document, with SHA-256:

`c404139a87a573a0737631fc4119885c29959f7b3c58307a37cc558aab5f1cc9`

The extracted source explicitly records `https://download.geofabrik.de/asia/thailand-latest.osm.pbf` and SHA-256 `ad4a11a4632397ae7f6fe9f9d02ed8852b695ea6db4f3ad61acbf7ecffbfa64b`, with extraction time `2026-11-03T01:02:34Z`. This is a **newer** source than the original 2026-10-24 Bangkok geography: the original PBF is no longer available at the documented Geofabrik archive URL, and this archive must not be called an identical snapshot. All controls must match the game's *existing* OSM vertex IDs and projected coordinates before they are allowed to influence traffic.

The raw extraction contains **462 signal nodes, 25 stop nodes, 8 additional tagged sign nodes, and 2,016 restriction relations**, many of which may not be usable in the smaller drivable graph. These are not claims that the same number of lights or restrictions work in the game; the compiled runtime audits and reports that separately.

The compiler `artifacts/tuk-tuk-rush/scripts/pack-geographic-traffic-controls.ts` reads this archive on ordinary build and creates the compressed optional browser runtime `traffic-controls.v1.json.gz`. The explicit `test:geographic-controls-ready` release gate must pass, and the map-loading browser QA plus physical iPhone driving test must pass before this can be called complete.

If the runtime pack reports `not-imported`, a new import is not being picked up; do not mask this error with inferred stop lights. If the pack reports `ready` with `mappedSignals=0`, the two source versions do not currently align; do not override source matching to force placement.

No roads, building footprints, routes or traffic laws were changed in this data-only PR.
