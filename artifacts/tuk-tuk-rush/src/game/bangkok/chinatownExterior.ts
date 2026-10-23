import { orientedFootprintsOverlap } from "../world";
import { roadManeuvers } from "./roadManeuvers";
import frozen from "./chinatownExteriorPreservation.v1.json";
import type { District, Obstacle } from "../types";
import { placementIndex } from "./environmentPlan";
import { parcelConflicts } from "./landmarkParcels";
/** Ten original exterior context slots lost their procedural parent when the
 * Chinatown rows were removed. Preserve those exact PR37 bodies; do not let a
 * local reconstruction erase nearby Old Town or Bang Rak background buildings.
 * They still pass the same CURRENT physical and protected-plot clearance. */
export const isPreservedChinatownExterior = (o: Obstacle) =>
  frozen.parcels.some((p) => p.environmentId === o.environmentId);
export function preserveChinatownExterior(d: District) {
  const key = (o: Obstacle) =>
    [o.x, o.z, o.w, o.d, o.yaw ?? 0].map((n) => n.toFixed(4)).join(":");
  const existing = new Set(d.buildings.map(key)),
    index = placementIndex(d);
  for (const p of frozen.parcels) {
    const o = { ...p } as Obstacle;
    if (existing.has(key(o))) continue;
    if (parcelConflicts(d, o).length || !index.clear(o, true))
      throw Error(
        "Preserved exterior context conflicts with new geometry: " +
          JSON.stringify({
            id: o.environmentId,
            parcels: parcelConflicts(d, o).map((p) => p.id),
            maneuvers: roadManeuvers(d).conflicts(o),
            bodies: d.obstacles
              .filter((q) => orientedFootprintsOverlap(o, q, 0.6))
              .map((q) => ({
                id: q.environmentId ?? q.landmarkId,
                x: q.x,
                z: q.z,
                w: q.w,
                d: q.d,
              })),
          }),
      );
    d.buildings.push(o);
    d.obstacles.push(o);
    index.insert(o);
    existing.add(key(o));
  }
}
