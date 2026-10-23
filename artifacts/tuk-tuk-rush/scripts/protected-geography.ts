import { gunzipSync } from "node:zlib";
import {
  assertChinatownGraphMigration,
  approvedChinatownRoad,
} from "./chinatown-migration-contract";
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
  // PR32 explicitly reconstructs these historic approaches. Unrelated roads
  // retain the exact coordinate/direction/width checks below.
  "north_old",
  "charoen_n",
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
  let checked = 0,
    migrated = 0;
  for (const r of baseline.roads) {
    if (approvedChinatownRoad(r, baseline)) {
      migrated++;
      continue;
    }
    if (
      RECONSTRUCTED_CORRIDORS.has(r.corridor ?? "") ||
      (r.corridor === "khaosan" &&
        Math.min(oldNodes.get(r.a)!.x, oldNodes.get(r.b)!.x) >=
          (365 - 500) * 4) ||
      r.noTraffic ||
      r.destinationId ||
      r.corridor?.startsWith("real-arrival:")
    )
      continue;
    const current = d.roads.find(
      (q) => q.a === r.a && q.b === r.b && q.corridor === r.corridor,
    );
    if (current)
      assert.deepEqual(
        current,
        r,
        `Protected edge ${r.corridor} ${r.a}/${r.b}`,
      );
    else {
      // A new connected junction may subdivide an unchanged historical edge.
      // Prove the complete original directed centerline/width still exists;
      // do not exempt a whole corridor or accept a nearby replacement route.
      const a = oldNodes.get(r.a)!,
        b = oldNodes.get(r.b)!,
        dx = b.x - a.x,
        dz = b.z - a.z,
        len2 = dx * dx + dz * dz;
      const project = (p: { x: number; z: number }) =>
        ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2;
      const on = (p: { x: number; z: number }) =>
        Math.abs((p.x - a.x) * dz - (p.z - a.z) * dx) < 1e-5 * Math.sqrt(len2);
      const edges = d.roads.filter(
        (q) =>
          q.corridor === r.corridor &&
          q.width === r.width &&
          !!q.oneWay === !!r.oneWay &&
          q.name === r.name &&
          on(nodes.get(q.a)!) &&
          on(nodes.get(q.b)!) &&
          (!r.oneWay || project(nodes.get(q.b)!) > project(nodes.get(q.a)!)),
      );
      const intervals = edges
        .map((q) => [
          Math.max(
            0,
            Math.min(project(nodes.get(q.a)!), project(nodes.get(q.b)!)),
          ),
          Math.min(
            1,
            Math.max(project(nodes.get(q.a)!), project(nodes.get(q.b)!)),
          ),
        ])
        .filter(([lo, hi]) => hi! >= lo!)
        .sort((x, y) => x[0]! - y[0]!);
      let end = 0;
      for (const [lo, hi] of intervals) {
        assert(lo! <= end + 1e-7, `Gap in protected corridor ${r.corridor}`);
        end = Math.max(end, hi!);
      }
      assert(
        end > 1 - 1e-7,
        `Protected edge lost: ${r.corridor} ${r.a}/${r.b}`,
      );
    }
    for (const id of [r.a, r.b]) {
      const a = nodes.get(id)!,
        b = oldNodes.get(id)!;
      assert(
        !a || Math.hypot(a.x - b.x, a.z - b.z) < 1e-6,
        `Protected node ${id}`,
      );
    }
    checked++;
  }
  assert(
    checked + migrated > 650,
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
    if (id === "pho") {
      assert.deepEqual(
        now.plot,
        { x: (300 - 500) * 4, z: (425 - 600) * 4 },
        "Explicit PR32 Wat Pho parcel, southeast of Palace",
      );
    } else
      assert(
        Math.hypot(now.plot!.x - old.plot!.x, now.plot!.z - old.plot!.z) < 1e-8,
        `Protected landmark plot ${id}`,
      );
  }
  // Stronger successor gate: every untouched PR37 edge and node is compared exactly.
  const pr37 = JSON.parse(
    gunzipSync(
      fs.readFileSync(
        new URL(
          "../../../docs/qa/chinatown-reconstruction/before-world.json.gz",
          import.meta.url,
        ),
      ),
    ).toString(),
  ) as District;
  assertChinatownGraphMigration(d, pr37);
  return checked;
}
