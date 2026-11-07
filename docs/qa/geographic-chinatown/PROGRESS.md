# PR60 checkpoint handoff

Base: `e2afddf273ad4bfd752180bffa0b8422ca242be7`, including merged PR59.
Tested runtime: `cfb0ad3e661a21bb1f98e9bc860e3b4ebdfc74d8`.
Draft: https://github.com/sunsetseast/TukTukRushBangkok/pull/60

- [x] A: source/renderer audit, photographic references and bounded Yaowarat/Song Wat selection.
- [x] B: source-edge adapter, worker transfer/layout, collision/clearance and disposal tests.
- [x] C: distinct storefront treatments, per-bay tenant variation and shared Thai/Chinese signage.
- [x] D: day/dusk/night, bounded static street life and Fast/Pretty/player-safe LOD.
- [x] E: 25 admitted Song Wat edges with restrained historic masonry/shutter grammar.
- [x] F: final-source regressions, fourteen actual rendered views, five matched before views, paired startup/driving/transition measurements and eviction evidence.
- [x] G: source remotely saved in one draft PR; durable evidence and iPhone/next-phase handoff.
- [ ] Physical iPhone performance sign-off and sustained 30 FPS / p95 ≤33.3 ms certification.

101 visible source edges receive decoration in two chunks. The canonical data and public-asset trees are identical to baseline. GPU/software-rendering cost remains material: matched daytime p95 overhead is 7.7–18.2%, with first-return transition cost also elevated. These are documented remaining risks, not passing device-performance claims. See PERFORMANCE.md and TESTS.md; canceled/skipped broader workflows are recorded explicitly.

PR61 should first measure this exact scene on the iPhone and refine Chinatown/GPU cost. Preserve the source-edge adapter, worker lifecycle, shared atlas and cell batching. Add selected authored hero storefronts and better pedestrian/material detail only within a measured budget. Defer Bang Rak/Charoen Krung expansion and advanced pedestrian AI until that review.
