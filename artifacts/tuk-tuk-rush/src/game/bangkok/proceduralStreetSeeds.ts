import frozen from "./chinatownExteriorStreets.v1.json";
import type { District, Point, Road } from "../types";
const cache = new WeakMap<
  District,
  { roads: Road[]; nodes: Map<string, Point & { id: string }> }
>();
/** A new junction must not reseed buildings along an otherwise unchanged road.
 * These four PR37 sample chains are ART candidate seeds only. Navigation,
 * asphalt, traffic and collision always consume d.roads and the new junctions.
 * Placement still validates every candidate against the CURRENT physical graph. */
export function proceduralStreetSeeds(d: District) {
  const old = cache.get(d);
  if (old) return old;
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const on = (p: Point, a: number[], b: number[]) => {
    const dx = b[0]! - a[0]!,
      dz = b[1]! - a[1]!,
      t = ((p.x - a[0]!) * dx + (p.z - a[1]!) * dz) / (dx * dx + dz * dz);
    return (
      t >= -1e-7 &&
      t <= 1 + 1e-7 &&
      Math.abs((p.x - a[0]!) * dz - (p.z - a[1]!) * dx) / Math.hypot(dx, dz) <
        0.001
    );
  };
  const roads: Road[] = [],
    seen = new Set<string>();
  for (const r of d.roads) {
    const group = frozen.chains.find(
      (g) =>
        r.corridor === g.corridor &&
        (("replaceEntire" in g && g.replaceEntire) ||
          (on(nodes.get(r.a)!, g.a, g.b) && on(nodes.get(r.b)!, g.a, g.b))),
    );
    if (!group) {
      roads.push(r);
      continue;
    }
    if (seen.has(group.id)) continue;
    seen.add(group.id);
    for (const n of group.nodes) nodes.set(n.id, n);
    roads.push(...(group.roads as Road[]));
  }
  const result = { nodes, roads };
  cache.set(d, result);
  return result;
}
