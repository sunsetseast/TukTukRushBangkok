import { beforeBangRakSeam } from "./bang-rak-seam-migration-contract";
import { bangRakSeamState, retiredBangRakIds } from "../src/game/bangkok/bangRakSeam";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import type { District, Obstacle } from "../src/game/types";
import { bangRakState } from "../src/game/bangkok/bangRakPlan";
const fixture = () =>
  JSON.parse(
    gunzipSync(
      fs.readFileSync(
        new URL(
          "../../../docs/qa/bang-rak/validation/pr41-world.json.gz",
          import.meta.url,
        ),
      ),
    ).toString(),
  ) as District;
const key = (o: Obstacle) =>
  [o.x, o.z, o.w, o.d, o.yaw ?? 0].map((n) => n.toFixed(4)).join(":");
export function approvedBangRakParcel(o: Obstacle, d: District) {
  const s = bangRakState(d);
  const seam = bangRakSeamState(d);
  if(seam && [...seam.retired,...seam.parcels].some(p=>key(p)===key(o))) return true;
  return (
    !!s &&
    [...s.removed, ...s.parcels.map((p) => p.body)].some(
      (p) => key(p) === key(o),
    )
  );
}
/** Exact additive graph ledger, not a broad geographic exclusion. */
export function assertBangRakMigration(d: District) {
  const old = fixture(),
    s = bangRakState(d)!;
  assert(s);
  d = beforeBangRakSeam(d);
  d = JSON.parse(JSON.stringify(d)) as District;
  assert.deepEqual(
    d.nodes.filter((n) => !n.id.startsWith("br:")),
    old.nodes,
    "All PR41 nodes retained byte-for-byte",
  );
  assert.deepEqual(
    d.roads.filter((r) => !r.a.startsWith("br:") && !r.b.startsWith("br:")),
    old.roads,
    "All PR41 roads/directions retained byte-for-byte",
  );
  assert.equal(d.nodes.length - old.nodes.length, 26);
  assert.equal(d.roads.length - old.roads.length, 26);
  assert.deepEqual(
    d.landmarks.filter(
      (l) => !["grand-postal", "warehouse-30"].includes(l.id!),
    ),
    old.landmarks,
    "All protected identities/approaches retained",
  );
  for (const k of [
    "river",
    "riverPolygon",
    "riverStructures",
    "waterVersion",
    "canals",
    "transit",
    "authoredSites",
  ] as const)
    assert.deepEqual(d[k], old[k], `Preserve ${k}`);
  assert.deepEqual(
    d.buildings.filter((o) => o.chinatown),
    old.buildings.filter((o) => o.chinatown),
    "Every Chinatown property retained",
  );
  const removed = new Set(s.removed.map(key)),
    now = new Set(d.buildings.map(key));
  for (const o of old.buildings)
    assert(
      now.has(key(o)) || removed.has(key(o)),
      "All removed lots appear in bounded ledger",
    );
  for (const o of s.removed) {
    assert(!o.chinatown && !o.landmarkId && !o.protected);
    assert(
      o.x > -210 && o.x < 220 && o.z > 861 && o.z < 1050,
      "Removal stays inside declared collar",
    );
  }
  return old;
}
export function beforeBangRak(d: District) {
  assertBangRakMigration(d);
  return fixture();
}
