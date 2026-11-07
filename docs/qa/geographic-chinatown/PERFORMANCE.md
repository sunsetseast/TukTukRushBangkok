# Matched PR59 / PR60 performance evidence

Tested runtime: `cfb0ad3e661a21bb1f98e9bc860e3b4ebdfc74d8`. Baseline: `e2afddf273ad4bfd752180bffa0b8422ca242be7` (latest main including PR59).

[Passing visual workflow](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42299624805) · [Passing mobile workflow](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42299624870) · [Raw before](browser-before.json) · [Raw after](browser-after.json)

Linux Chromium / SwiftShader, 844×390 touch simulation. **No physical iPhone testing or 30 FPS certification.** These short software-rendering windows are not an estimate of iPhone GPU speed.

## Startup and chunk work

| Metric | PR59 baseline | PR60 |
| --- | ---: | ---: |
| Initialization / network + shared artwork | 747.9 ms | 668.7 ms |
| First installed chunk | 1.988 s | 2.631 s |
| Controllable Free Roam | 2.659 s | 3.465 s |
| Nine chunks settled | 3.111 s | 3.532 s |
| Largest sampled main-thread chunk attachment | 22.6 ms | 15.7 ms |
| Largest initial worker preparation | 123.0 ms | 214.2 ms |
| Initial resident source buildings | 14,874 | 14,874 |
| Initial source building buffer bytes | 19,528,344 | 19,528,344 |
| Decoded navigation bytes | 27,528,506 | 27,528,506 |

Main attachment is CPU work, not GPU upload/shader time. Worker work increases for architectural preparation while main attachment stays bounded in this run. Startup is measured from page navigation; values include browser/Vite overhead. Initialization is the existing game diagnostic, not an isolated network benchmark.

## Matched daytime driving

Same recorded source start, road heading, gas input, following camera and graphics setting. Public quality is pinned so automatic fallback cannot disguise Pretty cost. Each case records 60 RAF deltas over about 53.6–53.8 m of production driving. Minor displacement differences are recorded; this is a short segment, not sustained device certification. Both versions have 17,987 source buildings and 12 chunks resident in these samples.

| Mode / AI | Median ms before → after | p95 ms before → after | p95 change | Worst ms before → after | >50 ms frames before → after | Calls before → after | Triangles before → after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Fast / ON | 100.0 → 116.7 | 183.4 → 216.7 | +18.2% | 233.3 → 233.4 | 52 → 53 | 136 → 164 | 138,055 → 152,655 |
| Fast / OFF | 100.0 → 116.6 | 183.4 → 216.7 | +18.2% | 200.1 → 233.3 | 49 → 52 | 117 → 140 | 137,045 → 151,773 |
| Pretty / ON | 116.6 → 133.3 | 216.7 → 233.3 | +7.7% | 233.4 → 266.7 | 58 → 54 | 154 → 180 | 155,113 → 175,769 |
| Pretty / OFF | 116.6 → 133.3 | 216.6 → 250.0 | +15.4% | 216.7 → 283.4 | 55 → 56 | 139 → 170 | 158,770 → 180,104 |

**Remaining risk:** p95 overhead is 7.7–18.2%. Fast and Pretty/AI OFF remain around or above the intended ~15% regression threshold. This is measured residual cost, not a passing performance-budget claim. Earlier expensive materials and hidden geometry were reduced; further GPU/driver profiling and a physical iPhone comparison are still needed before expansion.

## Night driving (PR60 only)

PR59 had no equivalent night controller, so a matched night baseline is unavailable. Settings, camera and route match the daytime method.

| Mode / AI | Median ms | p95 ms | Worst ms | >50 ms frames / 60 | Calls | Triangles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Fast / ON | 116.6 | 216.7 | 250.1 | 51 | 159 | 153,593 |
| Fast / OFF | 116.7 | 233.3 | 233.4 | 50 | 140 | 151,773 |
| Pretty / ON | 133.3 | 266.6 | 266.7 | 53 | 175 | 175,653 |
| Pretty / OFF | 133.3 | 250.0 | 266.6 | 54 | 174 | 179,506 |

## Leaving, eviction and revisit

Both versions use the same four QA relocations: far north → showcase → far north → showcase, Day/Fast/AI OFF. These are source-road relocations, not an organically driven city tour. RAF windows include loading, attachment and presentation; they are short and include network/browser scheduling.

| Transition | p95 ms before → after | Worst ms before → after | >50 ms frames before → after |
| --- | ---: | ---: | ---: |
| Leave showcase | 133.4 → 183.3 | 183.3 → 200.0 | 18 → 22 |
| First return | 116.7 → 183.4 | 116.7 → 216.6 | 21 → 23 |
| Leave again | 133.3 → 116.7 | 150.0 → 133.4 | 22 → 25 |
| Second return | 216.7 → 216.6 | 249.9 → 233.3 | 22 → 23 |

Nine chunks remain resident at each checkpoint; 39 disposals are recorded by the last return. Decoration returns to exactly 1,948,991 bytes (1.86 MiB) and 101 facades, then zero when outside the developed area. Renderer geometries at the two showcase returns are 357 → 319; stream errors are zero. This shows bounded residency in two cycles; long-duration JS heap, VRAM and thermal behavior remain unverified.

The first re-entry p95 is higher even though the second return is comparable. GPU upload/shader/driver stalls remain a plausible next profiling target; this run does not isolate them from other presentation costs.

## Reproduce

Run the existing `geographic-chinatown.yml` workflow on the branch. It prepares derived assets without changing pinned source, runs targeted checks and the production bundle, installs Chromium/WebKit, then runs:

```sh
cd artifacts/tuk-tuk-rush
GEOGRAPHY_QA_BASELINE_REF=e2afddf273ad4bfd752180bffa0b8422ca242be7 node scripts/browser-geographic-chinatown.mjs
node scripts/browser-geographic-chinatown.mjs
```

Use `geographic-chinatown-views.json` for the exact recorded source cameras. All screenshots are actual renderer output. Architectural close-ups hide HUD elements through test-only CSS; they do not alter world geometry. Driving and Fast/Pretty views retain the real HUD. The source building and public asset trees are byte-identical to baseline; see [provenance.json](provenance.json).
