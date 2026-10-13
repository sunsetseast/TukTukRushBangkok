import type { District, Obstacle, Point, Road } from "../types";
import { distanceToSegment, obstacleDistance } from "../world";
/** Conservative broad phase for citywide presentation agents. Includes rotated
 * collider bounds and complete road segment extents; exact tests remain shared. */
export function cityClearance(d: District) {
  const cell = 80,
    nodes = new Map(d.nodes.map((n) => [n.id, n]));
  type Segment = { road: Road; a: Point; b: Point };
  const grid = new Map<string, { obstacles: Obstacle[]; roads: Segment[] }>();
  const add = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    o?: Obstacle,
    r?: Segment,
  ) => {
    for (let x = Math.floor(minX / cell); x <= Math.floor(maxX / cell); x++)
      for (let z = Math.floor(minZ / cell); z <= Math.floor(maxZ / cell); z++) {
        const key = `${x}:${z}`;
        let bucket = grid.get(key);
        if (!bucket) {
          bucket = { obstacles: [], roads: [] };
          grid.set(key, bucket);
        }
        if (o) bucket.obstacles.push(o);
        if (r) bucket.roads.push(r);
      }
  };
  for (const o of d.obstacles) {
    const c = Math.abs(Math.cos(o.yaw ?? 0)),
      s = Math.abs(Math.sin(o.yaw ?? 0)),
      x = (c * o.w) / 2 + (s * o.d) / 2 + 0.6,
      z = (s * o.w) / 2 + (c * o.d) / 2 + 0.6;
    add(o.x - x, o.x + x, o.z - z, o.z + z, o);
  }
  for (const road of d.roads) {
    const a = nodes.get(road.a)!,
      b = nodes.get(road.b)!,
      pad = road.width / 2 + 0.6;
    add(
      Math.min(a.x, b.x) - pad,
      Math.max(a.x, b.x) + pad,
      Math.min(a.z, b.z) - pad,
      Math.max(a.z, b.z) + pad,
      undefined,
      { road, a, b },
    );
  }
  return (p: Point) => {
    const b = grid.get(`${Math.floor(p.x / cell)}:${Math.floor(p.z / cell)}`);
    return (
      !b ||
      (!b.obstacles.some((o) => obstacleDistance(p, o) < 0.5) &&
        b.roads.every(
          (r) =>
            distanceToSegment(p, r.a, r.b).distance >= r.road.width / 2 + 0.5,
        ))
    );
  };
}
