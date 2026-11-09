# Validation

Runtime: `8697d316d67262a2346ef1e8308b817e917588ee`. Local tests use Node 24 / Linux.
No physical-iPhone test is claimed.

All **23 local regression scripts passed**. Exact commands, exit codes, durations
and stdout/stderr are in [results](regressions/results.json) and adjacent logs.
They cover source geometry/compiled reproducibility, worker lifecycle, streaming,
landmark cache, source road rules, traffic art/contact, left-side geographic
traffic, authoritative collisions, actual driven fares, career persistence,
interface contracts, original signage and assets, transport fallback, original
gameplay and the new deterministic frontage/life/resource tests.

TypeScript and production build passed; raw logs are included. Vite retains its
existing large shared engine bundle warning. No build is deployed.

The new geographic font test checked **289 Thai/Chinese character occurrences**
against actual shipped cmap tables across 25 sign entries. A geography-only OFL
subset supplies missing characters; original compressed-world fonts are unchanged.

New placement tests cover 357 source edges, exact hero identity, deterministic
buffers, swept walking/road clearance, 24-anchor chunk caps, 12Hz update gating,
Fast/Pretty/pause/far transitions, shared materials, transferable ownership and
per-chunk geometry release. These supplement the original PR60 adapter tests.

Browser mobile fare completion is a **QA relocation + production fare-update
integration test** in the existing suite, not evidence of a driven fare. The
separate geographic/driven mission unit regressions test actual driven routes.

Initial local browser launch was blocked by restricted Unix sockets; the shared
browser could not reach the isolated local server. Both attempts are excluded
from passing browser results. Browser evidence comes from GitHub Actions.

## Browser regression results

[Mobile/WebKit workflow](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42392950732)
passed on `0177980c1048ebbc2e015fe71852e1a9aadfc3e4` (runtime identical
to `8697d31`; added CI workflow only). The [current-run report](mobile/summary.json)
records 14 successful checks (lossless raw report: `mobile/browser-after.json.gz`): touch steering/pedals/boost/horn, traffic toggle
with signs retained, map and destination selection, pause/resume/recovery,
Fast/Pretty, eviction/revisits, LOOK, orientation, shift/career integration,
context-loss recovery, original compressed-world startup, worker HTML fallback
and explicit retry after network failure. Zero captured page errors.

[WebKit payload results](mobile/webkit-gzip-report.json) confirm all four tested
packed payloads decode, including the decorated 3072:0 source chunk. The separate
WebKit HTTP-200-HTML fallback step also passed. This is Linux WebKit transport
coverage, not a physical iOS WebGL or audio listening test.

## Final capture and resource result

The [matched capture job](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42392802436)
completed 46 real images and all eight matched timing cases, then **failed** its
last equality heuristic for uploaded geometry counts on return (215 vs 732).
This job is not called passing. Both away samples had 63 geometries and zero
Chinatown bytes. Captured errors were empty. The original failed report is kept
losslessly, including its failure field.

The [focused replacement check](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42394133919)
**passed** three actual leave/return cycles with identical return chunk IDs,
owned meshes, building buffers and decorative buffers, bounded uploaded geometry,
away GPU release and zero stream errors. [Exact six samples](eviction-browser.json).
This identifies lazy upload/LOD state as the reason for the invalid equality
heuristic. The corrected primary harness checks the away release baseline.
Runtime source remained identical throughout these evidence-only checks.

Other automatic PR workflows may be pending or skipped; they are not counted
among the 23 local passing checks or the explicitly linked browser outcomes.
No canceled/skipped job is represented as passed.
