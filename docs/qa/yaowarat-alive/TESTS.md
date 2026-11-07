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
