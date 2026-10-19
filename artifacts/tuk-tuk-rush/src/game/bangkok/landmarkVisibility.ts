import type { District, Landmark, Obstacle, Point } from "../types";
import { distanceToSegment } from "../world";
import {
  FACADE_APPROACHES,
  facadeFeature,
  localPoint,
} from "./landmarkParcels";
export type ViewPoint = Point & { y: number };
export type Sightline = {
  id: string;
  landmarkId: string;
  from: ViewPoint;
  target: ViewPoint;
  approach: string;
  outwardYaw: number;
};
/** Independently documented cardinal frontage directions in the north-up
 * miniature. These are coarse composition expectations, not exact bearings. */
const EXPECTED_FACADE_DIRECTIONS: Record<string, number> = {
  palace: Math.PI,
  swing: Math.PI,
  hua: 0,
  paragon: 0,
  "siam-center": 0,
  mbk: Math.PI,
  central: Math.PI / 2,
  terminal: 0,
  emporium: Math.PI,
  emquartier: 0,
  emsphere: Math.PI,
  icon: Math.PI / 2,
  "river-city": -Math.PI / 2,
  oriental: -Math.PI / 2,
  shangri: -Math.PI / 2,
  peninsula: Math.PI / 2,
  hilton: Math.PI / 2,
  "four-seasons": -Math.PI / 2,
  capella: -Math.PI / 2,
  anantara: Math.PI / 2,
};
export function validateFacadeOrientation(d: District) {
  return Object.entries(EXPECTED_FACADE_DIRECTIONS).flatMap(
    ([id, expected]) => {
      const l = d.landmarks.find((l) => l.id === id),
        f = l && facadeFeature(l);
      if (!f) return [];
      const error = Math.abs(
        Math.atan2(Math.sin(f.yaw - expected), Math.cos(f.yaw - expected)),
      );
      return [
        {
          id,
          expected,
          actual: f.yaw,
          errorDegrees: (error * 180) / Math.PI,
          pass: error <= Math.PI / 12,
        },
      ];
    },
  );
}
/** Nearest point on the documented corridor IN FRONT of the principal facade.
 * This is intentionally not the existing mission stop (which may be a side
 * entrance). River elevations use a river approach, not an invented driveway. */
export function principalApproach(
  d: District,
  l: Landmark,
): ViewPoint | undefined {
  const spec = FACADE_APPROACHES[l.id!],
    f = facadeFeature(l, spec);
  if (!spec || !f) return;
  const ideal = {
    x: f.x + Math.sin(f.yaw) * 75,
    z: f.z + Math.cos(f.yaw) * 75,
  };
  if (!spec.road) return { ...ideal, y: 3.4 };
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  return d.roads
    .filter((r) => r.corridor === spec.road)
    .map((r) => {
      const p = distanceToSegment(
        ideal,
        nodes.get(r.a)!,
        nodes.get(r.b)!,
      ).point;
      return {
        ...p,
        y: 3.4,
        distance: Math.hypot(p.x - ideal.x, p.z - ideal.z),
        forward: (p.x - f.x) * Math.sin(f.yaw) + (p.z - f.z) * Math.cos(f.yaw),
      };
    })
    .filter((p) => p.forward > 10)
    .sort((a, b) => a.distance - b.distance)[0];
}
export function landmarkSightlines(d: District): Sightline[] {
  return d.landmarks.flatMap((l) => {
    const spec = FACADE_APPROACHES[l.id!],
      f = facadeFeature(l, spec),
      from = principalApproach(d, l);
    if (!spec || !f || !from) return [];
    const features =
      l.id === "hua"
        ? [
            [0, 19.2, 30.5],
            [0, 4, 32.5],
            [-17, 18, 30.2],
            [17, 18, 30.2],
          ]
        : [
            spec.feature,
            [
              spec.feature[0] - Math.min(12, spec.width * 0.2),
              spec.feature[1],
              spec.feature[2],
            ],
            [
              spec.feature[0] + Math.min(12, spec.width * 0.2),
              spec.feature[1],
              spec.feature[2],
            ],
          ];
    return features.map((p, i) => ({
      id: `view:${l.id}:${i}`,
      landmarkId: l.id!,
      from: { x: from.x, y: from.y, z: from.z },
      target: { ...localPoint(l.plot!, l.yaw ?? 0, p[0]!, p[2]!), y: p[1]! },
      approach: spec.road ?? "river",
      outwardYaw: f.yaw,
    }));
  });
}
/** Exact segment vs upright oriented box. Height matters: a low wall is not
 * equivalent to an opaque tower. Independent from parcel exclusion SAT. */
export function segmentBoxHit(
  from: ViewPoint,
  to: ViewPoint,
  o: Obstacle,
): number | undefined {
  const c = Math.cos(o.yaw ?? 0),
    s = Math.sin(o.yaw ?? 0),
    local = (p: ViewPoint) => [
      c * (p.x - o.x) - s * (p.z - o.z),
      p.y,
      s * (p.x - o.x) + c * (p.z - o.z),
    ];
  const a = local(from),
    b = local(to),
    limits = [
      [-o.w / 2, o.w / 2],
      [0, o.height],
      [-o.d / 2, o.d / 2],
    ];
  let enter = 0,
    leave = 1;
  for (let i = 0; i < 3; i++) {
    const delta = b[i]! - a[i]!,
      [lo, hi] = limits[i]!;
    if (Math.abs(delta) < 1e-9) {
      if (a[i]! < lo! || a[i]! > hi!) return;
      continue;
    }
    const x = (lo! - a[i]!) / delta,
      y = (hi! - a[i]!) / delta;
    enter = Math.max(enter, Math.min(x, y));
    leave = Math.min(leave, Math.max(x, y));
    if (enter > leave) return;
  }
  return leave > 0.001 && enter < 0.995 ? Math.max(0, enter) : undefined;
}
export function validateLandmarkVisibility(
  d: District,
  lines = landmarkSightlines(d),
) {
  return lines.map((line) => {
    const blockers = d.obstacles
      .flatMap((o, i) => {
        if (o.landmarkId === line.landmarkId || o.height < 0.4) return [];
        const t = segmentBoxHit(line.from, line.target, o);
        return t === undefined
          ? []
          : [
              {
                objectId:
                  o.environmentId ?? `${o.landmarkId ?? "building"}:${i}`,
                landmarkId: o.landmarkId,
                kind: d.buildings.includes(o)
                  ? "procedural-building"
                  : "authored-or-furniture",
                t,
              },
            ];
      })
      .sort((a, b) => a.t - b.t);
    const dx = line.from.x - line.target.x,
      dz = line.from.z - line.target.z;
    const facing =
      (dx * Math.sin(line.outwardYaw) + dz * Math.cos(line.outwardYaw)) /
      Math.hypot(dx, dz);
    return {
      ...line,
      visible: blockers.length === 0,
      frontFacing: facing > 0.25,
      facingCosine: facing,
      blockers,
    };
  });
}
