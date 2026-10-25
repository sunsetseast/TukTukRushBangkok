# Bang Rak northern phase — final draft handoff

**Draft PR43. Do not merge or deploy.** Runtime implementation: [6d893a5](https://github.com/sunsetseast/TukTukRushBangkok/commit/6d893a50e098c357fa9acc406c0b167c677f6017). Final runtime and QA source checkpoint: [66fcb4d](https://github.com/sunsetseast/TukTukRushBangkok/commit/66fcb4df912843893fb4e3bfb179e593ce70424c). Base main remains PR42 merge `dbd15109924bb89898b94a838e3c39d69c25f55a`.

## Delivered scope

This implements a bounded, connected northern phase around western Si Phraya, River City's arrival interface and Captain Bush Lane. It does not complete the full Bang Rak administrative district. River City itself is in Talat Noi, Samphanthawong; its access joins the Bang Rak reconstruction without relabeling the venue's district.

- Adds 24 road edges and 22 nodes, reaching 2,260 roads and 2,196 nodes.
- Adds 17 eastbound Si Phraya edges, four northern Captain Bush return edges and three separate two-way River City public arrival edges. Thirteen inherited Soi30 edges acquire the researched one-way rule.
- Makes Captain Bush's former dead end a connected route. Drivers can turn directly into River City's local arrival spur.
- Authors 14 street-facing properties with merchant, gallery, cafe, timber and workshop recipes. Thirty activity candidates remain within the existing district/global crowd allowances.
- Explicitly retires seven conflicting building bodies and four yard fixtures. One retained rear workshop transfers ownership without moving its physical body. Every other prior building and protected compound remains unchanged.
- Preserves all 2,174 old nodes and old road geometry. Exact PR42 asphalt, curb and sidewalk sources are retained and only new lane envelopes are added. Water, landmark compounds, hotels and inherited transit geometry remain protected.
- Refreshes turn-clearance caches when roads are appended. GPS prefers ordinary public streets over narrow two-way service shortcuts while preserving local access and direction restrictions.

[Production plan](district-plan.json), [street/access inventory](street-inventory.json), [landmark/hotel inventory](landmark-hotel-inventory.json), [transit inventory](transit-inventory.json), [geographic anchors](geographic-anchors.json), [source research](RESEARCH.md), [four comparison maps](geographic-comparison.png).

The maps use separate real-reference and compressed game coordinates; they are not surveyed equivalents. The final production plan distinguishes the two-way local arrival spur from eastbound named Si Phraya.

## Verification and evidence status

All four applicable GitHub Actions workflows pass on checkpoint `66fcb4d`: geographic approval, Chinatown certification, game regression/build, and WebGL capture. The two optional manual workflows are skipped and are not counted as passes. [Exact statuses and links](validation/ci.json).

Before workspace maintenance removed the unpushed local evidence package, final local certification reported:

| Check | Recorded outcome |
|---|---|
| Chinatown legal driving | 42 seeded journeys complete, zero physical contacts |
| Retained Bang Rak legal driving | 24 seeded journeys complete, zero physical contacts |
| New seam legal driving | 18 seeded journeys complete, zero physical contacts |
| Traffic population | 38 production vehicles per legal run |
| Matched actual WebGL captures | 24 pairs; camera/time/viewport/player/traffic equality passed |
| Final capture runtime digest | `22e70aa676d000c77e2ab1f4129323b9c01d5f564ba8ea120d935db428453946` |
| Browser state | Save/load, map, bilingual HUD, LOOK recovery and eight stable restarts passed |
| Sign geometry | 6,723 sign faces, zero geometric mounting failures |
| Local package groups | 49 passed initially; one temporary approval-key mismatch was successfully rerun, giving 50 effective passing groups |
| Application TypeScript and production build | Passed; existing bundle-size warning remains |

**Evidence limitation:** the final 161-file local evidence commit was not published before automated workspace maintenance removed it. The complete 24-pair gallery, final raw local route matrices, per-view frame samples and final checksum manifest could not be recovered. They are therefore not represented as attached, independently reviewable acceptance evidence. The archived local report preserves the measurements and limitations recorded before that loss; it is not a replacement for missing raw files.

The code and all independently generated GitHub Actions evidence survive. Use the retained CI artifacts below. They are actual game-renderer output, but are not presented as a substitute for the missing matched northern-seam gallery.

- [Actual WebGL capture run](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/40127661201): [compact Bangkok captures](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/40127661201/artifacts/12574321518), [Yaowarat captures](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/40127661201/artifacts/12574196518).
- [Chinatown certification artifact](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/40127661202/artifacts/12574840129), including independently generated legal route records.
- [Waterfront controller certification](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/40127661214/artifacts/12574297102).
- [City blueprint certification](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/40127661775/artifacts/12573214961).
- [Archived local certification report](validation/local-certification-before-pruning.md).
- [Screenshot evidence index](GALLERY.md).

CI artifacts have GitHub retention periods. Their metadata and digests are recorded in [CI status](validation/ci.json). The immutable PR42 snapshots committed with the source remain available.

## Performance

These values were recorded by the completed local inventory before pruning. Original final raw profile/frame files are unavailable; treat the summary as an archived measurement, not a fresh physical-device benchmark.

| Metric | PR42 | Final runtime | Change |
|---|---:|---:|---:|
| Retained geometry/instance buffers | 116,942,912 B | 117,021,550 B | +0.067% |
| Retained triangles across all LOD levels | 14,798,778 | 14,801,521 | +0.019% |
| Instances across chunks | 984,747 | 985,039 | +292 |
| Geometry objects | 9,970 | 9,973 | +3 |
| Materials / Node textures | 410 / 9 | 410 / 9 | unchanged |
| Emitted JavaScript gzip | 800,965 B | 808,706 B | +0.966% |
| Matched night-drive draw calls | 464 | 465 | +1 |

The initial PR42 construction sample was 51.78s; a later sample was 86.44s wall / 88.43s CPU. Final runtime measured 103.11s wall / 99.79s CPU: 55.62s world planning plus 47.41s mesh construction. Shared-host load varies too much to establish a reliable causal delta from the earlier reported 6.12% regression. **Startup remains expensive and is not certified as improved.** Resource disposal counts matched the inventoried geometry/material/texture counts.

Desktop Chromium/SwiftShader covered 375×812, 430×932, 844×390 and 1280×800. Portrait retains the existing rotate-device guard. The game begins at sunset, then reaches dusk/night; filenames labeled day in the lost local captures meant shift-start sunset, not midday. **No physical iPhone17 Pro Max/Safari performance verification was performed.** [Physical-device test route](DEVICE-ROUTE.md).

## Environmental quality and remaining work

The selected streets now have connected driving access, street-facing frontage, working signs and bounded activity. Reusable low-rise recipes still repeat; broad inherited setbacks, generic skyline masses and unfinished transitions outside these rows remain. This draft does not award district-wide premium or photographic-fidelity acceptance.

No new named landmark/hotel model or new transit station is claimed. Existing Postal, Warehouse30, River City, Oriental and other compounds are retained. HouseNo1, Royal Orchid Sheraton, cathedral/customs/embassy context, dedicated Si Phraya piers, eastern Si Phraya/Maha Set, Surawong, Silom, Pan, Convent, Decho and the Sathon transit band remain deferred. No BTS/MRT station lies inside this finished northern seam; the wider rail alignment is inventoried, not newly certified.

The new bends, widths and distances are documented arcade fits between inherited anchors. Real Soi24 remains a distinct deferred approach. Source one-way tags are a dated OSM reference rather than field verification of temporary traffic orders. The inherited narrow university service lane can still require backing out in voluntary head-on encounters; GPS no longer favors it for through journeys.

**Next phase:** extend Si Phraya east to Maha Set and its Surawong relationship, then correct the Silom/State Tower axis through an explicit parcel migration before adding hotels or stations. Pair that work with startup/chunk profiling and physical Safari checks. Restore the missing matched capture/raw certification packet before claiming the original full evidence acceptance criteria.
