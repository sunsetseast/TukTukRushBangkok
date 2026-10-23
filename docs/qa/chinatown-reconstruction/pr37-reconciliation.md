# Reconciliation of PR37's missing final evidence

Merged PR37's README still promised final screenshots, traffic categorization and performance data. A completed but unmerged final evidence package was present in the earlier project checkout. It has been recovered under [pr37-recovered/](pr37-recovered/), with an explicit [hash/provenance record](pr37-recovered/provenance.json).

All **210 tracked runtime source files** in that recovered checkout match merged PR37 byte-for-byte. Therefore its actual waterfront WebGL captures, route traces,40-group local result and retained performance measurements describe the same runtime foundation. This recovery adds documentation; it does not substitute those historical results for PR38 certification. Script and workflow differences in the recovered working tree are not silently imported.

Useful recovered evidence: [gallery](pr37-recovered/gallery.md), [controller route matrix](pr37-recovered/routes.md), [performance comparison](pr37-recovered/performance.md), [local and CI history](pr37-recovered/testing.md), and [limitations](pr37-recovered/limitations.md). Historical workflow run links and a proposed timeout change in those documents describe that package's context; they are not asserted to be new PR38 CI passes or current workflow modifications.

PR38 independently captures its own clean PR37 Chinatown baseline and final WebGL views, reruns the unchanged eleven-fare test, waterfront clearance, static/left-lane waterfront routes, river/boat checks and complete package suite. Current results live in this directory, outside the recovered package. Physical Safari was unavailable for both sets and remains explicitly unverified.
