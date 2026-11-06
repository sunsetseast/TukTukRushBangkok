# PR59 checkpoints
Base: b6a050ba3f21d98c3ea22aac26998eed739ad637 (merged PR58).

- [x] Audit actual streaming, gameplay, transport and sign implementation.
- [x] CPU profile: decode, surface construction and migrated landmarks cause stalls.
- [x] Move fetch, decode, surface triangulation and collider creation to two reusable cancellable workers; transfer geometry buffers without a copy.
- [x] Prepare four bounded migrated landmark CPU assets before gameplay; release GPU resources on eviction, reuse CPU artwork on revisit.
- [x] Geometry/collider equivalence test and TypeScript check.
- [x] Menu, compact HUD, route map pause, horn/audio, settings and orientation/context-loss recovery implementation.
- [ ] Browser interaction and matched before/after software WebGL evidence.
- [ ] Final regressions and production build.
- [ ] Final report, iPhone procedure and PR60 handoff.

Local Chromium launch is blocked by the managed environment's Unix-socket restriction. Browser QA will use GitHub Actions. No physical iPhone testing has been performed. Initial CPU samples are Node instrumentation, not FPS evidence.
