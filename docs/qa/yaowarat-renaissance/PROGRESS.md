# PR62 — Geographic Yaowarat Visual Renaissance

Base: PR61 `b1ebccdf536a6b72a0cf8afb45bcdcd409a6d735`, still an open draft on 2026-11-08. Stack targets `feature/yaowarat-alive-pr61`. No merge/deployment/Replit.

- A: COMPLETE. Fresh original golden/night and 18 pinned PR61 views captured and inspected in successful run 42527618107. Actual comparison findings in VISUAL-GAP.md. Original midday absence remains explicit.
- B: IMPLEMENTED + rendered. One 512KiB finish array, source-backed shared light field and cinematic sky. Browser renders confirm tactile plaster/metal and localized pavement pools; zero WebGL errors.
- C: IMPLEMENTED, visual review pending. 47 source edges in the ~180m signature sequence. Opening-aware wall grammar and source-wall draw-index masks preserve pinned source buffers/collision data.
- D: PASSED for the signature architecture/material/lighting benchmark after two rendered iterations. Run 42528852340 passes TypeScript, new regressions, production build and all real captures. Inspected closeups, day/golden/night, Fast and native chase driving. Source gaps/background blank sides remain visible and are addressed in E; no claim of photorealism.
- E: IMPLEMENTED. Extend the opening-aware grammar across all 357 previously admitted source frontages, with quiet Song Wat shutters/arches, source-backed corner elevations, distinct hotel/merchant/cafe interiors, retained real business identities and source-width road edge paint. Expanded visual certification pending.
- F: In progress. Core instancing replaces repeated transformed vertex arrays: representative chunks fall from 11.5/13.5MB in the initial expansion to 3.4/3.9MB. Preserve the existing 12MB/chunk packed-buffer ceiling; the old 30,000-piece count is raised to 50,000 for opening construction, while actual memory/renderer/ownership checks remain. Matched 8-case browser profiling and WebKit/gameplay checks queued. Physical iPhone unavailable.
- G: Final gallery/certification pending.

## Audit observations (code, not visual certification)

The original uses eight surface finishes (color/PBR/normal arrays), coherent authored rooms/openings, per-piece bounce and a world-space commercial light field. Geographic architecture packs the same UV/surface information but ignores it with MeshBasicMaterial and per-vertex lighting. Most geographic pieces default to plaster. Continuous full-height skins visually flatten entrances and windows. Night wash is uniform by height rather than actual shop locations. Background source masses use a very bright ambient light, undermining shop contrast.

Candidate: one compact repeatable finish array containing grayscale albedo plus relief, one directional fragment shader with surface-specific highlights, existing packed surface IDs, world coordinates and chunk-independent local light field. Compare against the existing texture-free material and full three-array PBR. Keep shared texture ownership at scene lifetime and chunk geometries at chunk lifetime.

Source-backed showcase candidate: existing central Yaowarat gold/restaurant sequence around longitude 100.5102–100.5118 (approximately 180m); actual source edges and road-clearance policy retained. Confirm coverage with actual views before expanding.

## Environment

Local Chromium launch was attempted and is denied by the execution sandbox (`socket() failed: Operation not permitted`). Local command escalation is disabled. Real browser captures run in a read-only GitHub Actions job, never a deployment. All inspected images must come from that running game. Direct git writes require authentication; GitHub connector commits preserve remote checkpoints.

Original condensed production world has sunset→night lighting and no midday control. Golden and night comparisons preserve it byte-for-byte. A true matched midday original capture remains an explicit evidence gap, not silently relabeled sunset.
