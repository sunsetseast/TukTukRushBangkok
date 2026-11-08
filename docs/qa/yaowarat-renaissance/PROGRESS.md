# PR62 — Geographic Yaowarat Visual Renaissance

Base: PR61 `b1ebccdf536a6b72a0cf8afb45bcdcd409a6d735`, still an open draft on 2026-11-08. Stack targets `feature/yaowarat-alive-pr61`. No merge/deployment/Replit.

- A: Source audit complete. Actual new baseline capture and visual gap review pending CI browser evidence.
- B: Materials/lighting pending.
- C: Signature corridor pending.
- D: Visual comparison gate NOT MET.
- E: Connected corridor expansion pending.
- F: Matched performance/regressions pending. Physical iPhone unavailable.
- G: Final gallery/certification pending.

## Audit observations (code, not visual certification)

The original uses eight surface finishes (color/PBR/normal arrays), coherent authored rooms/openings, per-piece bounce and a world-space commercial light field. Geographic architecture packs the same UV/surface information but ignores it with MeshBasicMaterial and per-vertex lighting. Most geographic pieces default to plaster. Continuous full-height skins visually flatten entrances and windows. Night wash is uniform by height rather than actual shop locations. Background source masses use a very bright ambient light, undermining shop contrast.

Candidate: one compact repeatable finish array containing grayscale albedo plus relief, one directional fragment shader with surface-specific highlights, existing packed surface IDs, world coordinates and chunk-independent local light field. Compare against the existing texture-free material and full three-array PBR. Keep shared texture ownership at scene lifetime and chunk geometries at chunk lifetime.

Source-backed showcase candidate: existing central Yaowarat gold/restaurant sequence around longitude 100.5102–100.5118 (approximately 180m); actual source edges and road-clearance policy retained. Confirm coverage with actual views before expanding.

## Environment

Local Chromium launch was attempted and is denied by the execution sandbox (`socket() failed: Operation not permitted`). Local command escalation is disabled. Real browser captures run in a read-only GitHub Actions job, never a deployment. All inspected images must come from that running game. Direct git writes require authentication; GitHub connector commits preserve remote checkpoints.

Original condensed production world has sunset→night lighting and no midday control. Golden and night comparisons preserve it byte-for-byte. A true matched midday original capture remains an explicit evidence gap, not silently relabeled sunset.
