import assert from "node:assert/strict";
import fs from "node:fs";
import type { District } from "../src/game/types";
/** Deliberate PR27 road surgery. Everything outside this list must retain its
 * prior segment IDs, coordinates, direction, width and connectivity. */
export const RECONSTRUCTED_CORRIDORS = new Set([
  "phaya",
  "phetchaburi",
  "old_w",
  "old_e",
  "old_siam",
  "ratchadamri",
  "silom",
  "ramaiv",
  "park_n",
  "sukhumvit",
  "asok_ratchada",
]);
export function assertProtectedGeography(d: District) {
  const baseline = JSON.parse(
    fs.readFileSync(
      new URL(
        "../../../docs/qa/geographic-city-reconstruction/protected-baseline.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as District;
  const nodes = new Map(d.nodes.map((n) => [n.id, n])),
    oldNodes = new Map(baseline.nodes.map((n) => [n.id, n]));
  let checked = 0;
  for (const r of baseline.roads) {
    if (
      RECONSTRUCTED_CORRIDORS.has(r.corridor ?? "") ||
      r.noTraffic ||
      r.destinationId ||
      r.corridor?.startsWith("real-arrival:")
    )
      continue;
    const current = d.roads.find(
      (q) => q.a === r.a && q.b === r.b && q.corridor === r.corridor,
    );
    assert.deepEqual(current, r, `Protected edge ${r.corridor} ${r.a}/${r.b}`);
    for (const id of [r.a, r.b]) {
      const a = nodes.get(id)!,
        b = oldNodes.get(id)!;
      assert(
        a && Math.hypot(a.x - b.x, a.z - b.z) < 1e-6,
        `Protected node ${id}`,
      );
    }
    checked++;
  }
  assert(
    checked > 650,
    "Protect the majority of the old road graph, including all river bridges",
  );
  for (const id of [
    "gate",
    "palace",
    "pho",
    "arun",
    "icon",
    "state",
    "mahanakhon",
    "baiyoke",
    "oriental",
    "peninsula",
    "hilton",
    "shangri",
  ]) {
    const old = baseline.landmarks.find((l) => l.id === id)!,
      now = d.landmarks.find((l) => l.id === id)!;
    assert.deepEqual(now.plot, old.plot, `Protected landmark plot ${id}`);
  }
  return checked;
}
