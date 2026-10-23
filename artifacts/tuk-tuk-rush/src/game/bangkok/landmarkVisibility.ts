import { nearestRiverShore } from "./waterGeometry";
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
  feature?:
    "landmark" | "entrance" | "roof-or-tower" | "principal-architecture";
  viewpoint?: "public-street" | "river" | "elevated";
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

/** Feature-labelled rays complement, rather than replace, the original 24
 * views. An entrance and a skyline are independently reported by the browser. */
export function historicFeatureSightlines(d: District): Sightline[] {
  const original = historicSightlines(d).map((v) => ({
    ...v,
    feature: "roof-or-tower" as const,
    viewpoint: "public-street" as const,
  }));
  const features: {
    id: string;
    local: [number, number, number];
    road: string;
    offset: [number, number];
    feature: Sightline["feature"];
  }[] = [
    {
      id: "palace",
      local: [0, 6, -100.65],
      road: "palace_n",
      offset: [0, -135],
      feature: "entrance",
    },
    {
      id: "pho",
      local: [-50, 4, -13],
      road: "old_w",
      offset: [-90, -8],
      feature: "entrance",
    },
    {
      id: "swing",
      local: [-5.5, 17, -58.65],
      road: "sao-chingcha",
      offset: [0, -110],
      feature: "principal-architecture",
    },
    {
      id: "golden",
      local: [0, 49, 0],
      road: "boripat",
      offset: [110, 0],
      feature: "roof-or-tower",
    },
    {
      id: "golden",
      local: [0, 3, 66],
      road: "old_siam",
      offset: [0, 140],
      feature: "entrance",
    },
    {
      id: "traimit",
      local: [0, 14, 12.3],
      road: "mittraphap",
      offset: [0, 90],
      feature: "entrance",
    },
    {
      id: "hua",
      local: [2.25, 3.5, 28.1],
      road: "ramaiv",
      offset: [5, 85],
      feature: "entrance",
    },
    {
      id: "democracy",
      local: [7.07, 15, 7.07],
      road: "north_old",
      offset: [120, 70],
      feature: "principal-architecture",
    },
    {
      id: "gate",
      local: [0, 13, 4.3],
      road: "odeon",
      offset: [0, 32],
      feature: "principal-architecture",
    },
  ];
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const extra: Sightline[] = features.map((v, i) => {
    const l = d.landmarks.find((l) => l.id === v.id)!,
      ideal = { x: l.plot!.x + v.offset[0], z: l.plot!.z + v.offset[1] },
      from = d.roads
        .filter((r) => r.corridor === v.road)
        .map((r) => distanceToSegment(ideal, nodes.get(r.a)!, nodes.get(r.b)!))
        .sort((a, b) => a.distance - b.distance)[0]!.point,
      target = {
        ...localPoint(l.plot!, l.yaw ?? 0, v.local[0], v.local[2]),
        y: v.local[1],
      };
    return {
      id: `feature:${v.id}:${i}`,
      landmarkId: v.id,
      from: { ...from, y: 3.4 },
      target,
      approach: v.road,
      outwardYaw: Math.atan2(from.x - target.x, from.z - target.z),
      feature: v.feature,
      viewpoint: "public-street" as const,
    };
  });
  for (const id of ["palace", "pho"]) {
    const l = d.landmarks.find((l) => l.id === id)!,
      center = l.plot!,
      target = { x: center.x, y: id === "palace" ? 32 : 18, z: center.z };
    const shore = nearestRiverShore(d, center);
    for (const viewpoint of ["river", "elevated"] as const) {
      const from =
        viewpoint === "river"
          ? {
              x: shore.point.x - shore.nx * 8,
              z: shore.point.z - shore.nz * 8,
              y: 3.4,
            }
          : { x: center.x + 180, z: center.z + 210, y: 160 };
      extra.push({
        id: `feature:${id}:${viewpoint}`,
        landmarkId: id,
        from,
        target,
        approach: viewpoint,
        outwardYaw: Math.atan2(from.x - target.x, from.z - target.z),
        feature: "landmark",
        viewpoint,
      });
    }
  }
  return [...original, ...extra];
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

/** Distinct, legal public approaches in the reconstructed historic core.
 * A blocked perpendicular view is reported, never 'fixed' by deleting an
 * authentic neighboring building or moving the observer off the road. */
export function historicSightlines(d: District): Sightline[] {
  const approaches: Record<
    string,
    {
      road: string;
      offset: [number, number];
      target: [number, number, number];
    }[]
  > = {
    palace: [
      { road: "palace_n", offset: [0, -140], target: [0, 6, -100.65] },
      { road: "old_e", offset: [200, -50], target: [33, 40, -55] },
      { road: "old_w", offset: [-180, -30], target: [-40, 39, -67.5] },
    ],
    pho: [
      { road: "old_w", offset: [-170, 0], target: [0, 22, 2] },
      { road: "thai-wang", offset: [0, -160], target: [-18, 18, -18] },
      { road: "old_e", offset: [240, 20], target: [28, 23, 43] },
    ],
    swing: [
      { road: "sao-chingcha", offset: [0, -110], target: [-5.5, 17, -58] },
      { road: "old_siam", offset: [-90, -35], target: [-5.5, 17, -58] },
      { road: "ti-thong", offset: [-100, -55], target: [-5.5, 17, -58] },
    ],
    golden: [
      { road: "boripat", offset: [110, 0], target: [0, 54, 0] },
      { road: "maha-chai", offset: [-120, 0], target: [0, 54, 0] },
      { road: "old_siam", offset: [0, 140], target: [0, 54, 0] },
    ],
    democracy: [
      { road: "north_old", offset: [-120, -30], target: [0, 20, 0] },
      { road: "north_old", offset: [120, 70], target: [0, 20, 0] },
      { road: "dinso", offset: [-25, 100], target: [0, 20, 0] },
    ],
    hua: [
      { road: "ramaiv", offset: [5, 85], target: [0, 19.2, 30.5] },
      { road: "charoen_n", offset: [-100, 20], target: [-17, 18, 30.2] },
      { road: "tri-mit", offset: [40, 150], target: [17, 18, 30.2] },
    ],
    traimit: [
      { road: "tri-mit", offset: [0, 90], target: [0, 32, 0] },
      { road: "tri-mit", offset: [100, 30], target: [0, 32, 0] },
      { road: "charoen_n", offset: [0, -100], target: [0, 40, 0] },
    ],
    gate: [
      { road: "odeon", offset: [0, 32], target: [0, 13, 4.3] },
      { road: "tri-mit", offset: [90, 20], target: [0, 17, 0] },
      { road: "yaowarat", offset: [-100, -40], target: [0, 17, 0] },
    ],
  };
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  return Object.entries(approaches).flatMap(([id, views]) => {
    const l = d.landmarks.find((l) => l.id === id);
    if (!l?.plot) return [];
    return views.map((v, i) => {
      const preferred = {
        x: l.plot!.x + v.offset[0],
        z: l.plot!.z + v.offset[1],
      };
      const candidates = d.roads
        .filter((r) => r.corridor === v.road)
        .map((r) =>
          distanceToSegment(preferred, nodes.get(r.a)!, nodes.get(r.b)!),
        );
      if (!candidates.length)
        throw Error(`Missing public historic approach ${id}:${v.road}`);
      const from = candidates.reduce((a, b) =>
        a.distance < b.distance ? a : b,
      ).point;
      const target = localPoint(l.plot!, l.yaw ?? 0, v.target[0], v.target[2]);
      return {
        id: `historic:${id}:${i}`,
        landmarkId: id,
        from: { ...from, y: 3.4 },
        target: { ...target, y: v.target[1] },
        approach: v.road,
        outwardYaw: Math.atan2(from.x - target.x, from.z - target.z),
      };
    });
  });
}
