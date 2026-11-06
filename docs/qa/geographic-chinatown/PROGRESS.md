# PR60 checkpoints
Base: e2afddf273ad4bfd752180bffa0b8422ca242be7, including merged PR59.
- [x] A: inspected source buildings/edges, selected Yaowarat corridor and a Song Wat block; reviewed actual photographic references.
- [x] B: source-edge adapter, worker batches, ownership/clearance tests.
- [x] C: varied storefronts and commercial sign atlas; rendered QA.
- [x] D: day/dusk/night, street life and quality LOD.
- [x] E: historic Song Wat grammar and coherent block.
- [ ] F: matched browser benchmarks, 10+ real screenshots and regressions.
- [ ] G: final draft PR, evidence, iPhone instructions and PR61 recommendation.

No map source/footprint/projection changes. The later main cleanup removed obsolete generated packs; generated geometry will be compiled once for QA, without importing the map anew.

Initial implementation/unit check: 127 admitted source-edge facades, including 10 Song Wat facades, 12 generic trade sign types. TypeScript and deterministic geometry/identity tests pass locally. C/D/E visual approval remains pending actual browser captures; checked boxes describe code checkpoints only.
