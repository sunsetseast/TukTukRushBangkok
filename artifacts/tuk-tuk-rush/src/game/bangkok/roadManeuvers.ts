import type { District, Obstacle, Point } from "../types";
import { distanceToSegment, obstacleDistance, obstacleLocal } from "../world";
import {
  ARRIVAL_MANEUVER_RADIUS,
  VEHICLE_COLLISION_RADIUS,
} from "../vehicleEnvelope";

export type ManeuverSweep = {
  id: string;
  kind: "arrival-reversal" | "junction-turn";
  a: Point;
  b: Point;
  radius: number;
};
/** Exact segment-to-oriented-footprint distance, including segments crossing a
 * rectangle with both endpoints outside. Center-distance tests miss corners. */
export function segmentFootprintDistance(a: Point, b: Point, o: Obstacle) {
  const p = obstacleLocal(a, o),
    q = obstacleLocal(b, o);
  let low = 0,
    high = 1;
  for (const [origin, delta, extent] of [
    [p.x, q.x - p.x, o.w / 2],
    [p.z, q.z - p.z, o.d / 2],
  ]) {
    if (Math.abs(delta!) < 1e-10) {
      if (Math.abs(origin!) > extent!) {
        low = 2;
        break;
      }
    } else {
      const t0 = (-extent! - origin!) / delta!,
        t1 = (extent! - origin!) / delta!;
      low = Math.max(low, Math.min(t0, t1));
      high = Math.min(high, Math.max(t0, t1));
    }
  }
  if (low <= high) return 0;
  const c = Math.cos(o.yaw ?? 0),
    s = Math.sin(o.yaw ?? 0);
  let result = Math.min(obstacleDistance(a, o), obstacleDistance(b, o));
  for (const u of [-o.w / 2, o.w / 2])
    for (const v of [-o.d / 2, o.d / 2])
      result = Math.min(
        result,
        distanceToSegment(
          { x: o.x + c * u + s * v, z: o.z - s * u + c * v },
          a,
          b,
        ).distance,
      );
  return result;
}
const cache = new WeakMap<District, ReturnType<typeof build>>();
function build(d: District) {
  const nodes = new Map(d.nodes.map((n) => [n.id, n])),
    sweeps: ManeuverSweep[] = [];
  const links = new Map<string, typeof d.roads>();
  for (const r of d.roads) {
    for (const id of [r.a, r.b]) {
      const list = links.get(id) ?? [];
      list.push(r);
      links.set(id, list);
    }
    if (!r.oneWay && (r.noTraffic || r.surface === "arrival"))
      sweeps.push({
        id: `reversal:${r.a}:${r.b}`,
        kind: "arrival-reversal",
        a: nodes.get(r.a)!,
        b: nodes.get(r.b)!,
        radius: Math.max(
          ARRIVAL_MANEUVER_RADIUS,
          r.width / 2 + VEHICLE_COLLISION_RADIUS,
        ),
      });
  }
  for (const [id, roads] of links) {
    if (roads.length < 2) continue;
    const center = nodes.get(id)!;
    for (const incoming of roads)
      for (const outgoing of roads) {
        if (
          incoming === outgoing ||
          (incoming.oneWay && incoming.b !== id) ||
          (outgoing.oneWay && outgoing.a !== id)
        )
          continue;
        const before = nodes.get(incoming.a === id ? incoming.b : incoming.a)!,
          after = nodes.get(outgoing.a === id ? outgoing.b : outgoing.a)!;
        const l0 = Math.hypot(before.x - center.x, before.z - center.z),
          l1 = Math.hypot(after.x - center.x, after.z - center.z);
        if (l0 < 1e-4 || l1 < 1e-4) continue;
        const cosine =
          ((before.x - center.x) * (after.x - center.x) +
            (before.z - center.z) * (after.z - center.z)) /
          (l0 * l1);
        if (cosine < -0.94) continue; // A sampled straight road is not a new junction.
        const trim = Math.min(7, l0 * 0.45, l1 * 0.45),
          a = {
            x: center.x + ((before.x - center.x) * trim) / l0,
            z: center.z + ((before.z - center.z) * trim) / l0,
          },
          b = {
            x: center.x + ((after.x - center.x) * trim) / l1,
            z: center.z + ((after.z - center.z) * trim) / l1,
          };
        let previous = a;
        for (let i = 1; i <= 8; i++) {
          const t = i / 8,
            u = 1 - t,
            point = {
              x: u * u * a.x + 2 * u * t * center.x + t * t * b.x,
              z: u * u * a.z + 2 * u * t * center.z + t * t * b.z,
            };
          sweeps.push({
            id: `turn:${incoming.a}:${incoming.b}>${outgoing.a}:${outgoing.b}:${i}`,
            kind: "junction-turn",
            a: previous,
            b: point,
            radius: VEHICLE_COLLISION_RADIUS + 1,
          });
          previous = point;
        }
      }
  }
  const cells = new Map<string, Set<ManeuverSweep>>(),
    visit = (
      minX: number,
      maxX: number,
      minZ: number,
      maxZ: number,
      f: (key: string) => void,
    ) => {
      for (let x = Math.floor(minX / 80); x <= Math.floor(maxX / 80); x++)
        for (let z = Math.floor(minZ / 80); z <= Math.floor(maxZ / 80); z++)
          f(`${x}:${z}`);
    };
  for (const sweep of sweeps)
    visit(
      Math.min(sweep.a.x, sweep.b.x) - sweep.radius,
      Math.max(sweep.a.x, sweep.b.x) + sweep.radius,
      Math.min(sweep.a.z, sweep.b.z) - sweep.radius,
      Math.max(sweep.a.z, sweep.b.z) + sweep.radius,
      (key) => {
        const set = cells.get(key) ?? new Set();
        set.add(sweep);
        cells.set(key, set);
      },
    );
  const conflicts = (o: Obstacle) => {
    const radius = Math.hypot(o.w, o.d) / 2,
      near = new Set<ManeuverSweep>();
    visit(o.x - radius, o.x + radius, o.z - radius, o.z + radius, (key) =>
      cells.get(key)?.forEach((s) => near.add(s)),
    );
    return [...near].filter(
      (s) => segmentFootprintDistance(s.a, s.b, o) < s.radius - 0.001,
    );
  };
  return {
    sweeps,
    conflicts,
    clear: (o: Obstacle) => conflicts(o).length === 0,
  };
}
/** Startup-only spatial index. No per-frame path construction or city scans. */
export function roadManeuvers(d: District) {
  let result = cache.get(d);
  if (!result) {
    result = build(d);
    cache.set(d, result);
  }
  return result;
}
