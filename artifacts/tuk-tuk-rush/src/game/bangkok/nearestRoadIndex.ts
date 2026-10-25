import type { Point } from "../types";
import { distanceToSegment } from "../world";

/** Exact startup broad phase. A segment occupies every cell its bounding box
 * touches. Search stops only when the nearest possible unvisited cell is
 * farther than the current winner. Original ordering resolves equal distances. */
export function nearestRoadIndex<E extends { a: Point; b: Point }>(edges: E[]) {
  const size = 128, cells = new Map<string, number[]>();
  for (const [i, e] of edges.entries())
    for (let x = Math.floor(Math.min(e.a.x, e.b.x) / size); x <= Math.floor(Math.max(e.a.x, e.b.x) / size); x++)
      for (let z = Math.floor(Math.min(e.a.z, e.b.z) / size); z <= Math.floor(Math.max(e.a.z, e.b.z) / size); z++) {
        const key = `${x}:${z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key)!.push(i);
      }
  return (p: Point): E => {
    if (!edges.length) throw Error("Nearest road requires a nonempty graph");
    const cx = Math.floor(p.x / size), cz = Math.floor(p.z / size), seen = new Set<number>();
    let best = 0, distance = Infinity;
    const visit = (x: number, z: number) => {
      for (const i of cells.get(`${x}:${z}`) ?? []) {
        if (seen.has(i)) continue;
        seen.add(i);
        const e = edges[i]!, d = distanceToSegment(p, e.a, e.b).distance;
        if (d < distance || (d === distance && i < best)) { best = i; distance = d; }
      }
    };
    for (let ring = 0; ; ring++) {
      for (let x = cx - ring; x <= cx + ring; x++) {
        visit(x, cz - ring);
        if (ring) visit(x, cz + ring);
      }
      for (let z = cz - ring + 1; z < cz + ring; z++) { visit(cx - ring, z); visit(cx + ring, z); }
      const outside = Math.min(p.x - (cx - ring) * size, (cx + ring + 1) * size - p.x,
        p.z - (cz - ring) * size, (cz + ring + 1) * size - p.z);
      if (distance < outside || seen.size === edges.length) return edges[best]!;
    }
  };
}
