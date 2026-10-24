# PR41 — storefront visibility and Chinatown quality certification

The shared streetfront system now places the fascia, lettering, cornice, canopy
and sign hardware together. It fixes the broad horizontal-lettering obstruction
visible in PR40's exact storefront-detail camera, improves both sides of
projecting signs, and applies the same physical rules citywide. Song Wat,
Talat Noi and Ratchawong receive selected batched architectural detail and
activity compositions. This remains an incremental game-art pass: the distant
waterfront and crowd acting are still below a finished premium environment.

## Source and evidence provenance

- Baseline: current main / PR40 merge `32420970706603e078cfea76c2f92ed881d0a306`.
  Main was checked before work; no newer merged commit was present.
- Verified production source: `8cc00493bf681ac2fad3ab92f55ec309f6db8854`.
  The evidence commit adds QA tooling, reports and screenshots; its game-source
  bytes are identical to this source checkpoint.
- [Comparison manifest](validation/comparisons.json) binds the captures to a
  SHA-256 of every `src/game` file and verifies camera position/quaternion/FOV,
  viewport, quality, DPR, clock and full player/traffic replay equality.
- Baseline game meshes are unchanged. [Instrumentation patch](baseline-instrumentation.patch)
  adds sign-face/ownership metadata for the depth audit and an unused mount-spec
  helper for the baseline geometry comparator. No loaded baseline mesh is altered.
  The [baseline comparator](baseline-sign-visibility.ts.txt) uses PR40 placement
  values and retains its rear/duplicate faces. No images are
  generated, cropped, composited or retouched.
- Actual production WebGL2, Chromium headless shell 131, ANGLE/SwiftShader;
  Medium, DPR1. Driving fixtures use the real controller, chase camera and 38
  seeded traffic vehicles, advanced 30 fixed ticks at 60Hz then frozen for matching.
  Static views use the existing QA art camera. HUD is hidden for art comparisons;
  [separate production UI evidence](validation/production-ui.json) retains it.

## Verified conflicts and production corrections

| Class | Before substantial self-obstruction findings | Correction |
|---|---:|---|
| Horizontal fascia | 2,633 | Shared facade plane, 9cm physical lettering relief, lower canopy/lip, raised cornice and first upper-floor details. Short cabinet returns attach recessed bays to their wall. |
| District blade | 121 | Both front-wound faces clear rails; support arms stop behind the cabinet; upper/lower envelopes and district-specific placement are coordinated. |
| Generic projecting cabinet | 63 | Face relief and appropriate ownership; remove duplicate cabinets where district signage already supplies the commercial identity. |
| Secondary panel | 13 | Face outside its frame; use available facade area and reserve the primary fascia band. |
| Convenience / authored identity | Additional rendered population | Physical face relief, including corner/side panels; protected landmark source/geometry remains unchanged through a separate mounting adapter. |

The exhaustive emitter audit changes **6,934 → 6,723 faces** and
**2,830 → 0 substantial self-obstruction findings**. The population reduction is
explicit: 116 duplicate cabinet faces, 89 erroneous rear-service retail fascia
faces and six blade faces on three buildings without enough overhead space.
No building, difficult commercial bay or legitimate primary sign is removed to
obtain a pass. The audit covers every represented region, including Khao San,
Old Town, Siam, Silom, Sukhumvit, west bank/ICONSIAM and existing connectors.

The test uses actual production `ArtPiece` transforms, pitched conservative
oriented volumes, 45 lettering samples and four roadward views: 9/12/14m,
1.7/3.2/6.5m heights and ±0.55 lateral approach. More than four self-blocked
samples fails. Ownership, cabinet separation, overhead clearance and the reserved
band are asserted; decorative meshes are included. Negative controls prove a
foreground box blocks and a behind-sign box does not.

**Not a claim of universal zero pixel overlap:** 35 faces retain one to three
sample hits from a projecting sign/support in oblique or elevated views. These
small sign-on-sign perspective overlaps remain disclosed in the
[conflict inventory](validation/conflict-inventory.json), with the complete
[resolved-ID inventory](validation/conflict-inventory.json.gz). No residual blocker in
that inventory is the primary sign's own awning or cornice. Twenty-four faces are
screened by unrelated buildings in all four synthetic views, and 185 have some
foreign perspective overlap. Their IDs and blockers remain in the full audit;
visibility through another solid property is not promised.

The WebGL pass evaluates the **actual scene depth**, including poles, vehicles,
neighboring buildings, current LOD and sign mounts. It uses Three r186 RGBA
packing, an 8cm depth tolerance and on-screen front-facing signs within 65m,
8px minimum height and 25 samples. Raw obscured counts are reported, not relabeled
as zero: the lamp post in the storefront close-up still crosses a narrow strip,
and foreground buildings legitimately hide distant signs. The comparison report
retains per-face before/after fractions and all raw depth records are in the two
capture manifests. Thai shaping, Chinese arrangements, licensed fonts, atlas
materials and depth testing are preserved.

Rendered depth confirms the change: the original storefront-detail fascia drops
from 33.3% to 11.1% sampled obstruction (the retained pole); Ratchawong’s target
fascia drops 20% → 0%, Song Wat merchant 20% → 0%, and Siam 35.6% → 0%.
The evidence certifier asserts these improvements and requires each target to
remain in the population. It also retains less successful and fully screened
faces instead of reporting only the examples that improved.

Full machine data (gzip, lossless): [before](validation/sign-geometry-before.json.gz),
[after](validation/sign-geometry.json.gz). Readable regional summaries:
[before](validation/sign-geometry-before-summary.json),
[after](validation/sign-geometry-summary.json).

## Matched WebGL evidence

All pairs below have identical coordinates, FOV, lighting clock, quality,
viewport and traffic replay. The first eight retain the PR40 inspection/driving
locations. The production chase camera includes the tuk-tuk and traffic; static
inspection views deliberately retain street furniture and other occluders.

**16 unobscured WebGL comparison pairs plus two matched portrait rotate-guard checks** (18 captures per source). The guard is intentionally retained in portrait screenshots; those two are layout checks, not sign-readability evidence.

| Location / fixture | Mode / viewport | Before | After |
|---|---|---|---|
| yaowarat-sunset | production chase, 844×390 | ![Before yaowarat-sunset](before-certified/yaowarat-sunset.jpg) | ![After yaowarat-sunset](after-certified/yaowarat-sunset.jpg) |
| yaowarat-dusk | production chase, 844×390 | ![Before yaowarat-dusk](before-certified/yaowarat-dusk.jpg) | ![After yaowarat-dusk](after-certified/yaowarat-dusk.jpg) |
| yaowarat-night | production chase, 844×390 | ![Before yaowarat-night](before-certified/yaowarat-night.jpg) | ![After yaowarat-night](after-certified/yaowarat-night.jpg) |
| storefront-detail | inspection, 844×390 | ![Before storefront-detail](before-certified/storefront-detail.jpg) | ![After storefront-detail](after-certified/storefront-detail.jpg) |
| ratchawong | inspection, 844×390 | ![Before ratchawong](before-certified/ratchawong.jpg) | ![After ratchawong](after-certified/ratchawong.jpg) |
| song-wat-street | production chase, 844×390 | ![Before song-wat-street](before-certified/song-wat-street.jpg) | ![After song-wat-street](after-certified/song-wat-street.jpg) |
| song-wat-waterfront | inspection, 844×390 | ![Before song-wat-waterfront](before-certified/song-wat-waterfront.jpg) | ![After song-wat-waterfront](after-certified/song-wat-waterfront.jpg) |
| talat-noi | production chase, 844×390 | ![Before talat-noi](before-certified/talat-noi.jpg) | ![After talat-noi](after-certified/talat-noi.jpg) |
| yaowarat-fascia | inspection, 844×390 | ![Before yaowarat-fascia](before-certified/yaowarat-fascia.jpg) | ![After yaowarat-fascia](after-certified/yaowarat-fascia.jpg) |
| yaowarat-vertical | inspection, 844×390 | ![Before yaowarat-vertical](before-certified/yaowarat-vertical.jpg) | ![After yaowarat-vertical](after-certified/yaowarat-vertical.jpg) |
| ratchawong-sign | inspection, 844×390 | ![Before ratchawong-sign](before-certified/ratchawong-sign.jpg) | ![After ratchawong-sign](after-certified/ratchawong-sign.jpg) |
| song-wat-merchant | inspection, 844×390 | ![Before song-wat-merchant](before-certified/song-wat-merchant.jpg) | ![After song-wat-merchant](after-certified/song-wat-merchant.jpg) |
| khaosan-sign | inspection, 844×390 | ![Before khaosan-sign](before-certified/khaosan-sign.jpg) | ![After khaosan-sign](after-certified/khaosan-sign.jpg) |
| siam-sign | inspection, 844×390 | ![Before siam-sign](before-certified/siam-sign.jpg) | ![After siam-sign](after-certified/siam-sign.jpg) |
| talat-noi-sign | inspection, 844×390 | ![Before talat-noi-sign](before-certified/talat-noi-sign.jpg) | ![After talat-noi-sign](after-certified/talat-noi-sign.jpg) |
| night-375x812 | portrait guard, 375×812 | ![Before night-375x812](before-certified/night-375x812.jpg) | ![After night-375x812](after-certified/night-375x812.jpg) |
| night-430x932 | portrait guard, 430×932 | ![Before night-430x932](before-certified/night-430x932.jpg) | ![After night-430x932](after-certified/night-430x932.jpg) |
| night-1280x800 | production chase, 1280×800 | ![Before night-1280x800](before-certified/night-1280x800.jpg) | ![After night-1280x800](after-certified/night-1280x800.jpg) |

Portrait art views test aspect/framing behind the game's existing rotate guard;
they do not certify portrait driving support. Actual production landscape HUD and portrait pause/rotate layout checks:
[375×812](ui/hud-375x812.jpg), [430×932](ui/hud-430x932.jpg),
[844×390](ui/hud-844x390.jpg), [1280×800](ui/hud-1280x800.jpg). Additional final-source state captures:
[long bilingual name](ui/hud-long-name.jpg), [map](ui/world-map.jpg).

## Architecture, materials and activity

- Song Wat: sliding warehouse doors, rails/latches, varied loading bays,
  transoms, pilasters, pipes, merchant stock and restrained adapted thresholds.
  Rear-bank warehouse elevations gain working entrances without converting
  private yards into retail. The broad waterfront view remains understated.
- Talat Noi: folding shutters, repair entrances, engines/tires/tool racks and
  residential thresholds. Workshop/customer placement follows trade activity.
- Ratchawong: cloth/retail display variations, merchant stock and clearer
  fascia/canopy hierarchy. Yaowarat retains PR40's seven authored compositions;
  the shared correction clears their important horizontal identity.
- Up to 64 deliberately staged existing people, versus 24, are selected for
  quiet merchant/workshop activity. City candidates remain capped at 360;
  nearby rendering stays 32, or 20 on Low. Existing instanced arms support
  browsing, talking and working poses. No new skeletal crowd system.

References: the [Thai government Song Wat/Talat Noi guide](https://www.am2026thailand.go.th/explore-bangkok/talat-noi-song-wat-street-art)
and its street photograph informed the metal doors, repair hardware and quiet
mercantile character. All added geometry is original. No reference photograph,
new font, model, texture or per-store point light is imported.

## Rendering and resource comparison

Node inventory counts all retained levels/chunks and excludes browser canvas
labels. Rendered measurements use identical final certified fixtures. Counts
from different clocks/cameras should not be compared with one another.

| Measurement | PR40 main | PR41 source | Change |
|---|---:|---:|---:|
| Geometry / instance buffers, bytes | 115,275,463 | 117,073,964 | +1.56% |
| Retained triangles, all levels | 14,517,546 | 14,828,558 | +2.14% |
| Retained geometries | 9,951 | 9,951 | same |
| Materials | 410 | 410 | same |
| Node inventory textures | 9 | 9 | same |
| Instances | 961,762 | 987,093 | +2.63% |
| JavaScript gzip, bytes | 793,324 | 796,052 | +0.34% |
| CSS gzip, bytes | 24,900 | 24,900 | same |
| Sequential scene construction, wall ms | 35,995 | 37,530 | +4.26% |
| Sequential scene construction, CPU ms | 41,805 | 43,391 | +3.79% |

| Matched rendered fixture | Calls before → after | Triangles before → after |
|---|---:|---:|
| yaowarat-night | 562 → 560 | 799,428 → 830,042 |
| ratchawong | 471 → 482 | 662,872 → 687,186 |
| song-wat-street | 502 → 496 | 774,783 → 817,799 |
| song-wat-waterfront | 431 → 404 | 481,468 → 514,092 |
| talat-noi | 439 → 432 | 437,824 → 467,830 |
| night-1280x800 | 486 → 485 | 724,664 → 752,284 |

[Inventory before](validation/inventory-before.json),
[after](validation/inventory-after.json), [bundle sizes](validation/bundles.json).
All retained geometries/materials/textures receive disposal events. Browser
labels and QA depth targets add textures beyond the Node inventory; the raw
capture reports preserve those counts. The depth target is cached and disposed.
Frame times are software-renderer observations under shared-host load, **not
physical iPhone FPS**. Construction is one sequential before/after Node pair after our capture/suite
processes ended, on a shared host, without a statistical confidence claim.
Timings and their method are recorded in the
inventory files; they must not be interpreted as mobile startup measurements.
The existing large-chunk Vite warning remains.

## Regression and CI status

All **47/47 package test groups pass** on the final production source. TypeScript
compilation and the production build pass. [Exact suite commands/results](validation/suite-summary.json),
[complete logs](validation/suite-logs.tar.gz), [log hashes](validation/suite-log-sha256.json).
The legal-traffic acceptance reports are retained losslessly for seeds
[982](validation/legal-982.json.gz), [41](validation/legal-41.json.gz) and
[67](validation/legal-67.json.gz). The separate [historical non-yielding diagnostic](validation/historical-nonyielding.json.gz)
still records its known contact frames.

The preserved world remains 798 frontages, 111 rear buildings and 111 service
courts. Approved road/river/bridge/block/compound sources, landmark coordinates,
left-hand directions and sidewalk ribbons are unchanged. `realArchitecture.ts`
is restored byte-for-byte to main; the canonical preservation gate passes.
No vehicle, camera, boost, career/save or navigation system was modified.

The full package suite includes glyphs/signage, ownership/containment,
sidewalk/road and waterfront clearance, landmark identity, navigation, traffic,
mission completion, save/load, boost, resources and long-running driving.
Additional browser checks cover four viewports, long bilingual names, map/LOOK
transitions and eight restarts: no GL errors or stale inspection camera, with
stable late resource counts. See [browser state](validation/browser-state.json)
and [production UI](validation/production-ui.json).

The 42 legal left-lane journeys with 38 vehicles under seeds 982, 41 and 67 remain
required with no NPC/static contacts. The historical non-yielding diagnostic is
preserved separately, including its known contacts; it is not an acceptance route
and has not been erased or disguised.

Remote checks on verified source `8cc0049`: **all four required workflows pass**.
[Machine status](validation/source-ci.json).

| Workflow | Source result | Run |
|---|---|---|
| Yaowarat art inspection | success | [run 40041899804](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/40041899804) |
| Chinatown geography and driving certification | success | [run 40041899841](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/40041899841) |
| Bangkok matched environment survey | skipped | [run 40041899813](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/40041899813) |
| Bangkok living cityscapes driving QA | skipped | [run 40041899914](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/40041899914) |
| Canonical Bangkok approval and benchmark gates | success | [run 40041899763](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/40041899763) |
| Tuk Tuk Rush graphics checks | success | [run 40041899826](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/40041899826) |

The evidence-only commit triggers fresh checks on the PR head; their live status
is on the PR. These source-checkpoint passes must not be described as completed
head checks before those runs finish. The initial recovered checkpoint failed the
protected-source hash because identity text mounting was edited in the landmark
source; restoring that file and using the separate mounting adapter resolved it.

PR40's cancelled graphics job lasted about 20m21s under `timeout-minutes: 20`,
with no workflow concurrency cancellation policy. Its logs say only that the
operation was canceled. A timeout is the supported inference, not a proven
explicit cancellation reason. PR41 extends the limit to 60 minutes; all original
steps remain enabled. Optional workflow skips are reported separately from passes.

## Full-resolution art-direction review

Grades reflect full-resolution matched renders and actual tests, not automatic
A grades from geometry checks.

| Category | Grade | Evidence / remaining weakness |
|---|---|---|
| Store sign visibility | B+ | Fascias visibly clear and known rendered defects improve; small sign-on-sign/pole overlap remains disclosed. |
| Sign mounting realism | B+ | Wall returns and rear-ending brackets; both cabinet faces clear their rails. |
| Storefront quality | B | Business entrances and trade displays read clearly; generic upper/frontage rhythms still repeat. |
| Yaowarat atmosphere | B+ | Strong night identity retained, clearer neon fascia; some plain corner masses remain. |
| Ratchawong commercial detail | B | Merchant displays and sign hierarchy improve; long stall sequences remain regular. |
| Song Wat historic character | B− | Working doors/hardware and restrained character improve; distant waterfront remains C+ visually. |
| Talat Noi personality | B | Workshop/threshold vocabulary is clearer; shutter sequences still show repetition. |
| Street life | C+ | Better directed worker/customer poses within the cap; acting and grouping remain simple. |
| Rendering efficiency | B | Small retained-memory increase, shared materials and several fewer calls; physical mobile gate open. |
| Gameplay integrity | A− | 47 groups, 42 legal journeys, UI/LOOK/eight restarts pass; no physical-device driving certification. |

Residual limits: distant warehouse elevations remain simple; some upper facades
and merchant sequences repeat; crowds use inexpensive geometric poses rather
than rich acting. Small legitimate sign-on-sign/pole/foreign-building overlaps
remain inventoried. The audit samples representative intended approaches; it
does not prove every possible camera ray or certify readability at any distance.
Sustained physical iPhone 17 Pro Max Safari performance is **unverified**.
Use the [12-minute sunset-to-night device route](DEVICE-ROUTE.md) before a device
performance claim. No merge or deployment has been performed.

## Reproduction and next phase

From `artifacts/tuk-tuk-rush`, use the locked workspace dependencies:

```sh
node --import tsx scripts/check-sign-visibility.ts
TEST_WORKERS=4 node scripts/run-chinatown-suite.mjs
CHROMIUM_PATH=/path/to/chrome-headless-shell VISUAL_LABEL=after-certified node scripts/browser-storefront-quality.mjs
node scripts/certify-storefront-evidence.mjs
CHROMIUM_PATH=/path/to/chrome-headless-shell node scripts/browser-chinatown-state.mjs
CHROMIUM_PATH=/path/to/chrome-headless-shell node scripts/browser-chinatown-production-ui.mjs
```

Use the same capture script/fixtures against main with the metadata-only patch
for `before-certified`; do not use a different approach angle. The suite summary
records each exact package command. Vite/browser scripts require their documented
ports and `CHROMIUM_PATH`; build/typecheck logs are included in validation.

[Reusable streetfront code/quality rules](STREETFRONT-STANDARD.md) are backed by
the production mounting module and automated checks. [PR42 blueprint](PR42-BLUEPRINT.md)
recommends surveying the east-bank Postal Building / Charoen Krung creative
corridor between River City/Si Phraya and Oriental Avenue first. Boundaries are
provisional until parcel/reference review. No Bang Rak expansion is included here.
