import type { District, Road } from "./types";

/** Road-graph helpers shared by every scenery module so sidewalks, props and people agree. */
export function degreeMap(d: District) {
  const deg = new Map<string, number>();
  for (const r of d.roads)
    for (const id of [r.a, r.b]) deg.set(id, (deg.get(id) ?? 0) + 1);
  return deg;
}
/** Usable sidewalk range along a sampled segment: open to degree-2 nodes, cut back at real junctions. */
export function sidewalkRange(
  r: Road,
  len: number,
  degA: number,
  degB: number,
) {
  const mouth = 7;
  const t0 = degA >= 3 ? mouth : -0.8,
    t1 = len - (degB >= 3 ? mouth : -0.8);
  return t1 - t0 > 1 && !r.shortcut && !r.roundabout ? [t0, t1] : null;
}
