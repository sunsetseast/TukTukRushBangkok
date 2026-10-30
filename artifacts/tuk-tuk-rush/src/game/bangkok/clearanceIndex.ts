import type { District, Obstacle, Point, Road } from "../types";
import { distanceToSegment, obstacleDistance } from "../world";
const physicsCache = new WeakMap<
  District,
  ReturnType<typeof createPhysicsIndex>
>();
function createPhysicsIndex(obstacles: District["obstacles"], size = 80) {
  const cells = new Map<string, number[]>();
  obstacles.forEach((o, i) => {
    const c = Math.abs(Math.cos(o.yaw ?? 0)),
      s = Math.abs(Math.sin(o.yaw ?? 0)),
      rx = (c * o.w + s * o.d) / 2 + 1.55,
      rz = (s * o.w + c * o.d) / 2 + 1.55;
    for (
      let x = Math.floor((o.x - rx) / size);
      x <= Math.floor((o.x + rx) / size);
      x++
    )
      for (
        let z = Math.floor((o.z - rz) / size);
        z <= Math.floor((o.z + rz) / size);
        z++
      ) {
        const k = `${x}:${z}`;
        if (!cells.has(k)) cells.set(k, []);
        cells.get(k)!.push(i);
      }
  });
  return {
    obstacles,
    query: (p: Point) =>
      cells.get(`${Math.floor(p.x / size)}:${Math.floor(p.z / size)}`) ?? [],
  };
}
/** Preserve original collider order and contact solver; construction is static. */
export function physicsObstacleIndex(d: District) {
  let index = physicsCache.get(d);
  if (!index || index.obstacles !== d.obstacles) {
    index = createPhysicsIndex(d.obstacles);
    physicsCache.set(d, index);
  }
  return index;
}
const streamedIndexes = new WeakMap<District["obstacles"], ReturnType<typeof createPhysicsIndex>>();
/** Reuse immutable chunk grids; never rebuild all resident building edges when
 * one tile arrives. Prefix offsets preserve the contact solver's original order.
 * A replacement creates a fresh query cache, so evicted geometry cannot collide. */
export function setStreamedPhysicsObstacles(d: District, groups: District["obstacles"][]) {
  const obstacles = groups.flat(), parts: { index: ReturnType<typeof createPhysicsIndex>; base: number }[] = [];
  let base = 0;
  for (const group of groups) {
    let index = streamedIndexes.get(group);
    if (!index) { index = createPhysicsIndex(group, 32); streamedIndexes.set(group, index); }
    parts.push({ index, base }); base += group.length;
  }
  const queries = new Map<string, number[]>();
  d.obstacles = obstacles;
  physicsCache.set(d, { obstacles, query(p: Point) {
    const key = `${Math.floor(p.x / 32)}:${Math.floor(p.z / 32)}`;
    let found = queries.get(key);
    if (!found) {
      found = [];
      for (const part of parts) for (const i of part.index.query(p)) found.push(part.base + i);
      queries.set(key, found);
    }
    return found;
  } });
}
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
