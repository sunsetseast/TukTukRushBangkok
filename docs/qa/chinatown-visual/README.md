# Chinatown visual transformation — PR40

Base: `997e960295838891c134e7c2caa6253f83f29a24` (verified PR39 merge).

## Initial visual assessment and implementation plan

All six PR39 comparison pairs were inspected. The central Yaowarat driving views have nearly identical plain cornices, two-column dark windows, small repeated red blade signs, box-like carts and empty pale sidewalks. The full-night facade brightness is close to daytime, reducing shop/sign contrast. Ratchawong has stronger sign silhouettes but still repeats the same merchant front. Talat Noi repeats green shutters and indistinct counters. Raised Song Wat views demonstrate successful block completion; service courts, passages, pier access and protected compounds are intentional open space and must remain clear.

1. Capture eight matched views on the exact base, including normal third-person cameras and production traffic.
2. Add selective per-piece illumination to the existing architectural batches; tune evening contrast without per-shop lights or postprocessing.
3. Art-direct commercial thresholds, upper facades, sign silhouettes and original lettering layouts by neighborhood. Preserve all footprints and geographic sources.
4. Enrich existing fitted carts and frontage activity; compose historic warehouse and workshop details within their existing envelopes.
5. Inspect real WebGL output, refine weak scenes, then certify resource growth, geography, legal traffic, UI/recovery, disposal and all package test groups. Publish one draft PR only.

References, gallery, measured results and candid grades will be consolidated here after verification.
