import { beforeBangRakSeam } from "./bang-rak-seam-migration-contract";
import assert from "node:assert/strict";
import {
  CHINATOWN_PLAN,
  inChinatownMigration,
} from "../src/game/bangkok/chinatownPlan";
import type { District, Obstacle, Road } from "../src/game/types";
import { distanceToSegment } from "../src/game/world";
export const chinatownFootprintKey = (o: Obstacle) =>
  [o.x, o.z, o.w, o.d, o.yaw ?? 0].map((n) => n.toFixed(4)).join(":");
export const approvedChinatownParcel = (o: Obstacle) =>
  inChinatownMigration(o, Math.hypot(o.w, o.d) / 2);
export function approvedChinatownRoad(r: Road, d: District) {
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const a = nodes.get(r.a)!,
    b = nodes.get(r.b)!,
    id = r.corridor ?? "";
  if (
    [
      ...CHINATOWN_PLAN.replacedCorridors,
      ...CHINATOWN_PLAN.streets.map((s) => s.corridor),
      "real-arrival:river-city",
      "odeon",
    ].includes(id)
  ) {
    if (id === "charoen_s") return Math.max(a.z, b.z) <= 940.0001;
    return inChinatownMigration(a, 5) && inChinatownMigration(b, 5);
  }
  const on = (p: typeof a, x: number, z: number, X: number, Z: number) =>
    distanceToSegment(p, { x, z }, { x: X, z: Z }).distance < 0.001;
  return (
    (id === "ramaiv" &&
      on(a, 400, -200, 660, 300) &&
      on(b, 400, -200, 660, 300)) ||
    (id === "memorial_approach" &&
      on(a, -680, 0, -240, 160) &&
      on(b, -680, 0, -240, 160))
  );
}
const quant = (v: number) => Math.round(v * 1e4) / 1e4;
const roadKey = (r: Road) =>
  JSON.stringify([
    r.a,
    r.b,
    r.width,
    r.name,
    r.corridor,
    !!r.oneWay,
    !!r.bridge,
    !!r.noTraffic,
    r.destinationId ?? "",
    !!r.shortcut,
    r.surface ?? "",
  ]);
/** Extends old geographic freeze contracts with the explicit PR38 corridor
 * migration. Equality outside this scoped ledger remains exact. */
export function assertChinatownGraphMigration(
  d: District,
  before: District,
  legacyAsiatique = false,
) {
  const migrated = (x: District) =>
    new Set(
      x.roads
        .filter((r) => approvedChinatownRoad(r, x))
        .flatMap((r) => [r.a, r.b]),
    );
  d = beforeBangRakSeam(d); // Verify the entire explicit PR43 ledger first.
  // PR42 adds exactly scoped side-lane nodes/edges; the PR42 contract tests them.
  d = {...d,nodes:d.nodes.filter(n=>!n.id.startsWith("br:")),roads:d.roads.filter(r=>!r.a.startsWith("br:")&&!r.b.startsWith("br:"))};
  const a = migrated(d),
    b = migrated(before);
  assert.deepEqual(
    d.roads
      .filter(
        (r) =>
          !approvedChinatownRoad(r, d) &&
          (!legacyAsiatique || r.corridor !== "arrival:asiatique"),
      )
      .map(roadKey)
      .sort(),
    before.roads
      .filter(
        (r) =>
          !approvedChinatownRoad(r, before) &&
          (!legacyAsiatique || r.corridor !== "arrival:asiatique"),
      )
      .map(roadKey)
      .sort(),
    "No roads, directions, names or bridge edges change outside the approved Chinatown migration",
  );
  const nodeKeys = (x: District, skip: Set<string>) =>
    x.nodes
      .filter(
        (n) =>
          !skip.has(n.id) &&
          (!legacyAsiatique || !n.id.startsWith("arrival:asiatique:")),
      )
      .map((n) => JSON.stringify([n.id, quant(n.x), quant(n.z), n.name ?? ""]))
      .sort();
  assert.deepEqual(
    nodeKeys(d, a),
    nodeKeys(before, b),
    "All unrelated road nodes retain stable identities and coordinates",
  );
  for (const old of before.landmarks) {
    if (legacyAsiatique && old.id === "asiatique") continue;
    const now = d.landmarks.find((l) => l.id === old.id);
    assert(now, "Preserve destination identity " + old.id);
    for (const key of ["plot", "yaw", "size", "name", "kind"] as const)
      assert.deepEqual(
        now[key],
        old[key],
        "Preserve approved landmark architecture and origin " + old.id,
      );
    if (!inChinatownMigration(old.plot ?? old))
      assert.equal(
        now.accessNode,
        old.accessNode,
        "Preserve exterior arrival identity " + old.id,
      );
  }
  for (const x of [d, before]) {
    const n = new Map(x.nodes.map((n) => [n.id, n]));
    const ring = x.roads.filter((r) => r.corridor === "odeon");
    assert(
      ring.every(
        (r) =>
          r.oneWay &&
          r.width === 12 &&
          [n.get(r.a)!, n.get(r.b)!].every(
            (p) => Math.abs(Math.hypot(p.x - 140, p.z + 40) - 32) < 0.5,
          ),
      ),
      "Odeon annulus retains its approved center, radius, width and direction",
    );
  }
  assert.deepEqual(
    JSON.parse(JSON.stringify(d.transit?.lines)),
    before.transit?.lines,
    "All BTS and Gold Line geometry and station identities remain unchanged",
  );
}
