import plan from "./chinatownPlan.v1.json";
import type { Point, Obstacle } from "../types";
import type { CivicSegment } from "./civicRoads";
export const CHINATOWN_PLAN = plan;
export const chinatownPoint = (p: readonly number[]): Point => ({
  x: (p[0]! - 500) * 4,
  z: (p[1]! - 600) * 4,
});
export function inChinatown(p: Point, margin = 0) {
  const x = p.x / 4 + 500,
    y = p.z / 4 + 600,
    poly = plan.boundary;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!,
      b = poly[j]!;
    if (
      a[1]! > y !== b[1]! > y &&
      x < ((b[0]! - a[0]!) * (y - a[1]!)) / (b[1]! - a[1]!) + a[0]!
    )
      inside = !inside;
    if (margin) {
      const dx = b[0]! - a[0]!,
        dy = b[1]! - a[1]!,
        t = Math.max(
          0,
          Math.min(
            1,
            ((x - a[0]!) * dx + (y - a[1]!) * dy) / (dx * dx + dy * dy),
          ),
        );
      if (Math.hypot(x - a[0]! - dx * t, y - a[1]! - dy * t) < margin / 4)
        return true;
    }
  }
  return inside;
}
export const chinatownParcel = (b: Obstacle) =>
  inChinatown(b, Math.hypot(b.w, b.d) / 2);
/** Migration also covers the removed street ribbons and the two adjacent
 * source chords whose common graph sampling changes at a new junction. */
export function inChinatownMigration(p: Point, radius = 0) {
  if (inChinatown(p, 40 + radius)) return true;
  return plan.migrationBands.some((b) =>
    b.points.slice(1).some((v, i) => {
      const a = chinatownPoint(b.points[i]!),
        q = chinatownPoint(v),
        dx = q.x - a.x,
        dz = q.z - a.z,
        t = Math.max(
          0,
          Math.min(
            1,
            ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz),
          ),
        );
      return (
        Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t) <= b.radius + radius
      );
    }),
  );
}
/** Local versioned migration before common intersection splitting. No second
 * renderer, coordinate system, river, vehicle controller or routing graph. */
export function reconstructChinatownRoads(segments: CivicSegment[]) {
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = segments[i]!,
      id = s.road.corridor ?? "";
    if (
      plan.replacedCorridors.includes(id) ||
      (id === "charoen_s" && Math.min(s.a.z, s.b.z) < 360)
    )
      segments.splice(i, 1);
  }
  for (const r of plan.streets)
    for (let i = 1; i < r.points.length; i++)
      segments.push({
        a: chinatownPoint(r.points[i - 1]!),
        b: chinatownPoint(r.points[i]!),
        cuts: [0, 1],
        road: {
          a: "",
          b: "",
          name: r.name,
          corridor: r.corridor,
          width: r.width,
          oneWay: r.oneWay,
          noTraffic: "noTraffic" in r ? !!r.noTraffic : false,
        },
      });
}
export function chinatownStreetName(corridor: string) {
  return plan.streets.find((r) => r.corridor === corridor);
}
