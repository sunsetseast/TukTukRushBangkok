# Geographic architecture implementation checklist

- [x] Verify clean branch, latest main and merged PR47: d7ed15f4c7e5b4df4d4e8eb8dcc6cb28f070a940.
- [x] Audit projection, source, roads, water, rail, streaming, landmarks and legacy grammar.
- [x] Record matched WebGL baseline and performance before runtime changes.
- [x] Extract relation-complete buildings from checksum-pinned PBF; version bounded source.
- [x] Validate geometry, deduplicate relations/parts, interpret heights and protect landmarks.
- [x] Integrate footprint walls/roofs, façade metadata, road-facing edges and conservative collisions.
- [x] Integrate chunk ownership, batching, quality LOD and disposal.
- [x] Inspect priority districts in actual renderer; capture ten matched views.
- [x] Run source, geometry, gameplay, streaming, legacy, TypeScript and build checks.
- [x] Record performance, coverage gaps and certification limitations.
- [ ] Commit, push and create one draft PR; no merge/deploy/publish.
