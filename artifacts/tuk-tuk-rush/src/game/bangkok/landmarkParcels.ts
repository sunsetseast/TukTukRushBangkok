import { CITY_MODEL } from "./cityModel";
import { HUA_PLAN } from "./huaLamphong";
import { PHO_WEST_APPROACH, PHO_PIER_PASSAGE } from "./historicPlan";
import type { District, Landmark, Obstacle, Point } from "../types";
import { principalApproach } from "./landmarkVisibility";
import type { ArtPiece } from "./architecturalBatch";

export type ProtectedParcel = {
  id: string;
  landmarkId: string;
  use: "structure" | "compound" | "forecourt" | "entrance";
  boundary: Point[];
};
export type FacadeApproach = {
  /** Model-local feature, not a guessed building centre. +Z is model front. */
  feature: [number, number, number];
  outward: number;
  width: number;
  depth: number;
  road?: string;
  note: string;
};
/** These are miniature composition controls, NOT survey measurements. The
 * owning landmark's live plot/yaw is the only world transform. Preserve dense
 * neighbours outside a modest entrance apron rather than clearing a vista cone. */
export const FACADE_APPROACHES =
  CITY_MODEL.facadeApproaches as unknown as Record<string, FacadeApproach>;
export function localPoint(
  origin: Point,
  yaw: number,
  x: number,
  z: number,
): Point {
  return {
    x: origin.x + Math.cos(yaw) * x + Math.sin(yaw) * z,
    z: origin.z - Math.sin(yaw) * x + Math.cos(yaw) * z,
  };
}
export function rectangleBoundary(
  o: Pick<Obstacle, "x" | "z" | "w" | "d" | "yaw">,
): Point[] {
  return [
    [-o.w / 2, -o.d / 2],
    [o.w / 2, -o.d / 2],
    [o.w / 2, o.d / 2],
    [-o.w / 2, o.d / 2],
  ].map(([x, z]) => localPoint(o, o.yaw ?? 0, x!, z!));
}
/** Convex polygon SAT, including rotated rectangles. Test edges from BOTH
 * polygons; a long building can cross a forecourt with its centre outside. */
export function polygonsOverlap(
  a: readonly Point[],
  b: readonly Point[],
  padding = 0,
): boolean {
  for (const p of [a, b])
    for (let i = 0; i < p.length; i++) {
      const first = p[i]!,
        second = p[(i + 1) % p.length]!,
        nx = second.z - first.z,
        nz = first.x - second.x,
        len = Math.hypot(nx, nz);
      if (!len) continue;
      const project = (q: readonly Point[]) =>
        q.map((v) => (v.x * nx + v.z * nz) / len);
      const aa = project(a),
        bb = project(b);
      if (
        Math.max(...aa) + padding <= Math.min(...bb) ||
        Math.max(...bb) + padding <= Math.min(...aa)
      )
        return false;
    }
  return true;
}
type Plan = {
  parcels: ProtectedParcel[];
  cells: Map<string, ProtectedParcel[]>;
};
const plans = new WeakMap<District, Plan>();
function cellKeys(points: readonly Point[], padding = 0): string[] {
  const xs = points.map((p) => p.x),
    zs = points.map((p) => p.z),
    keys: string[] = [];
  for (
    let x = Math.floor((Math.min(...xs) - padding) / 80);
    x <= Math.floor((Math.max(...xs) + padding) / 80);
    x++
  )
    for (
      let z = Math.floor((Math.min(...zs) - padding) / 80);
      z <= Math.floor((Math.max(...zs) + padding) / 80);
      z++
    )
      keys.push(`${x}:${z}`);
  return keys;
}
export function facadeFeature(l: Landmark, spec = FACADE_APPROACHES[l.id!]) {
  if (!spec || !l.plot) return;
  return {
    ...localPoint(l.plot, l.yaw ?? 0, spec.feature[0], spec.feature[2]),
    y: spec.feature[1],
    yaw: (l.yaw ?? 0) + spec.outward,
  };
}
export function prepareLandmarkParcels(
  d: District,
  includeHistoricApproaches = true,
): ProtectedParcel[] {
  const parcels: ProtectedParcel[] = [],
    cells = new Map<string, ProtectedParcel[]>();
  const add = (
    landmarkId: string,
    use: ProtectedParcel["use"],
    boundary: Point[],
  ) => {
    const p = {
      id: `parcel:${landmarkId}:${use}:${parcels.length}`,
      landmarkId,
      use,
      boundary,
    };
    parcels.push(p);
    for (const key of cellKeys(boundary)) {
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key)!.push(p);
    }
  };
  for (const l of d.landmarks) {
    if (!l.plot) continue;
    if (l.id === "pho" && includeHistoricApproaches) {
      add(l.id, "forecourt", PHO_WEST_APPROACH);
      const { from: a, to: b, width } = PHO_PIER_PASSAGE;
      add(
        l.id,
        "entrance",
        rectangleBoundary({
          x: (a.x + b.x) / 2,
          z: (a.z + b.z) / 2,
          w: width,
          d: Math.hypot(a.x - b.x, a.z - b.z),
          yaw: Math.atan2(b.x - a.x, b.z - a.z),
        }),
      );
    }
    const site = d.authoredSites?.find((s) => s.id === l.id);
    for (const o of site?.reservations ??
      d.obstacles.filter((o) => o.landmarkId === l.id && !o.artRole))
      add(l.id!, "structure", rectangleBoundary(o));
    const grounds: Record<string, [number, number, number, number]> = {
      "wat-mangkon": [0, 0, 64, 56],
      "holy-rosary": [0, 0, 38, 52],
      golden: [0, 12, 106, 132],
      traimit: [0, 4, 64, 66],
      hua: [0, HUA_PLAN.yard.centerZ, HUA_PLAN.yard.width, HUA_PLAN.yard.depth],
      palace: [0, 0, 202.5, 202.5],
      pho: [7.5, 18, 119, 104],
      swing: [0, 0, 86, 150],
    };
    if (l.id === "democracy")
      add(
        l.id,
        "compound",
        Array.from({ length: 32 }, (_, i) =>
          localPoint(
            l.plot!,
            0,
            Math.cos((i * Math.PI) / 16) * 28,
            Math.sin((i * Math.PI) / 16) * 28,
          ),
        ),
      );
    const ground = grounds[l.id!];
    if (ground)
      add(
        l.id!,
        "compound",
        rectangleBoundary({
          ...localPoint(l.plot!, l.yaw ?? 0, ground[0], ground[1]),
          w: ground[2],
          d: ground[3],
          yaw: l.yaw ?? 0,
        }),
      );
    const spec = FACADE_APPROACHES[l.id!],
      f = facadeFeature(l, spec);
    if (!spec || !f) continue;
    if (l.id === "hua") {
      // Trapezoid follows the compressed Charoen Krung/Rama IV approach.
      // Western corner stops short of the diagonal street. No arbitrary plaza.
      add(
        l.id,
        "forecourt",
        [
          [-43, 32],
          [43, 32],
          [43, 70],
          [11, 76],
          [-43, 48],
        ].map(([x, z]) => localPoint(l.plot!, l.yaw ?? 0, x!, z!)),
      );
    } else {
      const origin = {
        x: f.x + (Math.sin(f.yaw) * spec.depth) / 2,
        z: f.z + (Math.cos(f.yaw) * spec.depth) / 2,
      };
      add(
        l.id!,
        "forecourt",
        rectangleBoundary({
          ...origin,
          w: spec.width,
          d: spec.depth,
          yaw: f.yaw,
        }),
      );
    }
    const approach = spec.road && principalApproach(d, l);
    if (approach) {
      const length = Math.hypot(approach.x - f.x, approach.z - f.z);
      // Preserve a narrow real-inspired entrance connection through the
      // compressed frontage setback, not a whole empty view cone.
      if (length > spec.depth && length < 180) {
        const end = {
          x: approach.x + ((f.x - approach.x) * 10) / length,
          z: approach.z + ((f.z - approach.z) * 10) / length,
        };
        add(
          l.id!,
          "entrance",
          rectangleBoundary({
            x: (end.x + f.x) / 2,
            z: (end.z + f.z) / 2,
            w: 18,
            d: length - 10,
            yaw: Math.atan2(end.x - f.x, end.z - f.z),
          }),
        );
      }
    }
    // Narrow pedestrian/vehicle access reservation follows existing authored
    // entrance geometry. It does not move public streets or add solid walls.
    if (site) {
      const a = site.entrance,
        b = d.nodes.find((n) => n.id === site.accessNode);
      if (a && b && Math.hypot(a.x - b.x, a.z - b.z) > 1)
        add(
          l.id!,
          "entrance",
          rectangleBoundary({
            x: (a.x + b.x) / 2,
            z: (a.z + b.z) / 2,
            w: 9,
            d: Math.hypot(a.x - b.x, a.z - b.z),
            yaw: Math.atan2(a.x - b.x, a.z - b.z),
          }),
        );
    }
  }
  // Append after all existing parcels, and only after legacy base-row enumeration.
  if (includeHistoricApproaches)
    for (const a of CITY_MODEL.architecturalAprons) {
      const l = d.landmarks.find((l) => l.id === a.landmarkId)!;
      add(
        a.landmarkId,
        "forecourt",
        rectangleBoundary({
          ...localPoint(l.plot!, l.yaw ?? 0, a.center[0]!, a.center[1]!),
          w: a.width,
          d: a.depth,
          yaw: l.yaw ?? 0,
        }),
      );
    }
  plans.set(d, { parcels, cells });
  return parcels;
}
export const landmarkParcels = (d: District) => plans.get(d)?.parcels ?? [];
export function parcelConflicts(
  d: District,
  o: Obstacle,
  padding = 0,
): ProtectedParcel[] {
  const plan = plans.get(d);
  if (!plan) return [];
  const boundary = rectangleBoundary(o),
    candidates = new Set<ProtectedParcel>();
  for (const key of cellKeys(boundary, padding))
    plan.cells.get(key)?.forEach((p) => candidates.add(p));
  return [...candidates].filter((p) =>
    polygonsOverlap(boundary, p.boundary, padding),
  );
}
export const inLandmarkParcel = (d: District, o: Obstacle) =>
  parcelConflicts(d, o, 0.6).length > 0;

/** Finish the narrow new pedestrian connections in the same spatial/material
 * batch as city paving. They remain walkways, not phantom navigable roads. */
export function emitLandmarkApproaches(
  d: District,
  emit: (p: ArtPiece) => void,
) {
  for (const a of CITY_MODEL.architecturalAprons) {
    const l = d.landmarks.find((l) => l.id === a.landmarkId)!,
      yaw = l.yaw ?? 0;
    const put = (
      u: number,
      y: number,
      v: number,
      w: number,
      h: number,
      depth: number,
      color: string,
    ) =>
      emit({
        ...localPoint(l.plot!, yaw, a.center[0]! + u, a.center[1]! + v),
        y,
        w,
        h,
        d: depth,
        yaw,
        color,
        surface: "concrete",
        siteId: a.id,
      });
    put(0, 0.06, 0, a.width, 0.12, a.depth, "#b5b7ab");
    put(a.width / 2 - 0.25, 0.18, 0, 0.5, 0.24, a.depth, "#d1d0be");
    for (const side of [-1, 1])
      put(0, 0.18, side * (a.depth / 2 - 0.25), a.width, 0.24, 0.5, "#d1d0be");
    for (let u = -a.width / 2 + 5; u < a.width / 2; u += 5)
      put(u, 0.13, 0, 0.07, 0.025, a.depth - 1, "#939e97");
    // Authored mall-side planters and seats keep the central pedestrian axis clear.
    for (const side of [-1, 1]) {
      const u = -a.width / 2 + 3,
        v = side * (a.depth / 2 - 5);
      put(u, 0.5, v, 3, 0.9, 5, "#b2aa95");
      put(u, 0.99, v, 2.6, 0.12, 4.6, "#496c4e");
      for (const dz of [-1.3, 1.3])
        for (const dx of [-0.65, 0.65])
          emit({
            ...localPoint(
              l.plot!,
              yaw,
              a.center[0]! + u + dx,
              a.center[1]! + v + dz,
            ),
            y: 1.35,
            w: 0.7,
            h: 0.8,
            d: 1.1,
            yaw: yaw + side * 0.7,
            pitch: 0.4,
            color: "#60804f",
            surface: "plaster",
            shape: "leaf",
            siteId: a.id,
          });
      for (const dz of [-0.3, 0, 0.3])
        put(
          -5,
          0.56,
          side * (a.depth / 2 - 7) + dz,
          2.8,
          0.14,
          0.22,
          "#8f856e",
        );
      for (const dx of [-1, 1])
        put(-5 + dx, 0.29, side * (a.depth / 2 - 7), 0.15, 0.5, 0.8, "#757d76");
      put(9, 0.64, side * (a.depth / 2 - 6), 0.3, 1.2, 0.3, "#787e72");
      emit({
        ...localPoint(
          l.plot!,
          yaw,
          a.center[0]! + 9,
          a.center[1]! + side * (a.depth / 2 - 6),
        ),
        y: 1.26,
        w: 0.28,
        h: 0.08,
        d: 0.28,
        yaw,
        color: "#dcc49a",
        layer: "night",
        siteId: a.id,
      });
    }
  }
  // Public pavement belongs to the city ground batch, outside the sacred
  // landmark's physical model/collider envelope. Narrow strips follow the
  // same protected polygon without paving across Maha Rat's asphalt.
  for (let z = -776; z < -626; z += 2) {
    const west = z < -703 ? -930 + ((z + 777) * 66) / 74 : -864,
      east = -851;
    emit({
      x: (west + east) / 2,
      z,
      y: 0.07,
      w: east - west - 0.6,
      h: 0.06,
      d: 2,
      yaw: 0,
      color: "#c9bd9f",
      surface: "concrete",
      siteId: "pho-west-pavement",
    });
  }
  for (const p of landmarkParcels(d).filter((p) => p.use === "entrance")) {
    const [a, b, c] = p.boundary;
    if (!a || !b || !c) continue;
    const w = Math.hypot(b.x - a.x, b.z - a.z),
      depth = Math.hypot(c.x - b.x, c.z - b.z),
      center = { x: (a.x + c.x) / 2, z: (a.z + c.z) / 2 };
    if (w < 12 || depth < 20) continue;
    emit({
      ...center,
      y: 0.025,
      w: w - 0.4,
      h: 0.04,
      d: depth,
      yaw: Math.atan2(c.x - b.x, c.z - b.z),
      color: "#c3bfad",
      surface: "concrete",
      siteId: p.id,
    });
  }
}
