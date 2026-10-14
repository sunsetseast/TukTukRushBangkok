import type { District, Obstacle } from "../types";
import { orientedFootprintsOverlap } from "../world";
import { degreeMap } from "../roadGeometry";

/** One footprint list for bridge rail art and physics. Connected side roads and
 * their vehicle clearance are authoritative, including angled bank junctions. */
export function bridgeBarriers(d: District): Obstacle[] {
  const nodes = new Map(d.nodes.map((n) => [n.id, n])),
    degrees = degreeMap(d);
  const runs = d.roads.map((road) => {
    const a = nodes.get(road.a)!,
      b = nodes.get(road.b)!,
      len = Math.hypot(b.x - a.x, b.z - a.z),
      yaw = Math.atan2(b.x - a.x, b.z - a.z);
    return {
      road,
      a,
      b,
      len,
      yaw,
      buffer: {
        x: (a.x + b.x) / 2,
        z: (a.z + b.z) / 2,
        w: road.width + 3,
        d: len + 3,
        yaw,
        height: 1,
        color: "#000000",
      } as Obstacle,
    };
  });
  const result: Obstacle[] = [];
  for (const { road: r, a, len, yaw } of runs.filter((r) => r.road.bridge)) {
    const from =
        (degrees.get(r.a) ?? 0) >= 3 ? Math.min(len / 2, r.width / 2 + 3) : 0,
      to =
        len -
        ((degrees.get(r.b) ?? 0) >= 3 ? Math.min(len / 2, r.width / 2 + 3) : 0);
    if (to - from < 1) continue;
    const t = (from + to) / 2;
    for (const side of [-1, 1]) {
      const barrier: Obstacle = {
        x: a.x + Math.sin(yaw) * t + Math.cos(yaw) * side * (r.width / 2 + 1.7),
        z: a.z + Math.cos(yaw) * t - Math.sin(yaw) * side * (r.width / 2 + 1.7),
        w: 0.4,
        d: to - from,
        height: 1.7,
        yaw,
        color: "#728f85",
        artRole: "furniture",
        environmentId: `bridge-rail:${r.a}:${r.b}:${side}`,
      };
      if (
        runs.some(
          (other) =>
            other.road.corridor !== r.corridor &&
            orientedFootprintsOverlap(barrier, other.buffer),
        )
      )
        continue;
      result.push(barrier);
    }
  }
  return result;
}
