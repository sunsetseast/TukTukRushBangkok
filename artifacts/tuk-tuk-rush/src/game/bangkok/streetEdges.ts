import {inRiverWater} from './waterGeometry';
import {victoryPublicGround} from './civicRoads';
import {insidePublicPolygon} from './publicSpaces';
import type { District, Obstacle, Point, Road } from "../types";
import { distanceToSegment, obstacleDistance } from "../world";
import { destinationReservation } from "./destinationAccess";

export type EdgeKind =
  | "building"
  | "compound"
  | "park"
  | "water"
  | "junction"
  | "alley"
  | "station"
  | "open";
export type StreetEdge = {
  road: Road;
  roadIndex: number;
  point: Point;
  outward: Point;
  side: number;
  kind: EdgeKind;
  distance: number;
  building?: Obstacle;
  face?: number;
};

/** First ray hit on an oriented parcel. Faces: front, right, rear, left.
 * This catches the actual exposed wall, rather than guessing from its centre. */
export function footprintRay(
  p: Point,
  direction: Point,
  b: Obstacle,
  limit = 65,
) {
  const c = Math.cos(b.yaw ?? 0),
    s = Math.sin(b.yaw ?? 0),
    dx = p.x - b.x,
    dz = p.z - b.z;
  const origin = [c * dx - s * dz, s * dx + c * dz],
    ray = [
      c * direction.x - s * direction.z,
      s * direction.x + c * direction.z,
    ],
    extents = [b.w / 2, b.d / 2];
  let near = 0,
    far = limit,
    face = 0;
  for (let axis = 0; axis < 2; axis++) {
    const o = origin[axis]!,
      v = ray[axis]!,
      e = extents[axis]!;
    if (Math.abs(v) < 1e-8) {
      if (Math.abs(o) > e) return;
      continue;
    }
    const a = (-e - o) / v,
      z = (e - o) / v,
      entry = Math.min(a, z);
    if (entry > near) {
      near = entry;
      face = axis === 0 ? (v > 0 ? 3 : 1) : v > 0 ? 2 : 0;
    }
    far = Math.min(far, Math.max(a, z));
    if (near > far) return;
  }
  return far >= 0 && near <= limit
    ? { distance: Math.max(0, near), face }
    : undefined;
}

/** Startup-only broad phase. No whole-city scans during driving/rendering. */
function streetIndex(d: District) {
  const grid = new Map<string, Set<Obstacle>>(),
    roadGrid = new Map<string, Set<number>>(),
    nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const segments = d.roads.map((r) => ({
    r,
    a: nodes.get(r.a)!,
    b: nodes.get(r.b)!,
  }));
  const cells = (p: Point, r: number, visit: (key: string) => void) => {
    for (
      let x = Math.floor((p.x - r) / 80);
      x <= Math.floor((p.x + r) / 80);
      x++
    )
      for (
        let z = Math.floor((p.z - r) / 80);
        z <= Math.floor((p.z + r) / 80);
        z++
      )
        visit(`${x}:${z}`);
  };
  for (const o of d.obstacles.filter((o) => o.height > 0.3))
    cells(o, Math.hypot(o.w, o.d) / 2 + 1, (key) => {
      if (!grid.has(key)) grid.set(key, new Set());
      grid.get(key)!.add(o);
    });
  segments.forEach(({ r, a, b }, i) =>
    cells(
      { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
      Math.hypot(a.x - b.x, a.z - b.z) / 2 + r.width / 2 + 1,
      (key) => {
        if (!roadGrid.has(key)) roadGrid.set(key, new Set());
        roadGrid.get(key)!.add(i);
      },
    ),
  );
  return {
    segments,
    query(p: Point, r: number) {
      const os = new Set<Obstacle>(),
        rs = new Set<number>();
      cells(p, r, (key) => {
        grid.get(key)?.forEach((o) => os.add(o));
        roadGrid.get(key)?.forEach((i) => rs.add(i));
      });
      return { obstacles: [...os], roads: [...rs].map((i) => segments[i]!) };
    },
  };
}

/** Both sides of EVERY drivable edge, including shortcuts, bridges, roundabout
 * and visitor lanes. Open space gets an intentional category only when actual
 * geometry (water/park/court/station/cross street) lies before the first wall. */
export function auditStreetEdges(d: District, spacing = 12): StreetEdge[] {
  const index = streetIndex(d),
    buildings = new Set(d.buildings),
    result: StreetEdge[] = [],
    waters = [
      
      ...(d.canals ?? []),
    ],
    parks = d.obstacles.filter((o) => o.protected),
    courts = (d.destinations ?? []).map(destinationReservation),
    stations =
      d.transit?.lines.flatMap((l) =>
        l.stations.map((s) => ({
          ...s,
          w: s.line === "gold" ? 17 : 24,
          d: s.length + 10,
          height: 26,
          color: "#fff",
        })),
      ) ?? [];
  for (const [roadIndex, { r, a, b }] of index.segments.entries()) {
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 0.1) continue;
    const count = Math.max(1, Math.ceil(length / spacing)),
      ux = (b.x - a.x) / length,
      uz = (b.z - a.z) / length;
    for (let j = 0; j < count; j++)
      for (const side of [-1, 1]) {
        const t = (j + 0.5) / count,
          outward = { x: uz * side, z: -ux * side },
          point = {
            x: a.x + (b.x - a.x) * t + outward.x * (r.width / 2 + 0.5),
            z: a.z + (b.z - a.z) * t + outward.z * (r.width / 2 + 0.5),
          },
          nearby = index.query(point, 75),
          sample: StreetEdge = {
            road: r,
            roadIndex,
            point,
            outward,
            side,
            kind: "open",
            distance: 65,
          };
        let first = 65;
        for (const o of nearby.obstacles) {
          if (!buildings.has(o) && !o.landmarkId && !o.protected) continue;
          const hit = footprintRay(point, outward, o, first);
          if (!hit) continue;
          first = hit.distance;
          sample.distance = first;
          sample.building = undefined;
          sample.face = undefined;
          if (buildings.has(o)) {
            sample.kind = "building";
            sample.building = o;
            sample.face = hit.face;
          } else
            sample.kind = o.protected
              ? "park"
              : o.landmarkId
                ? "compound"
                : "open";
        }
        for (let distance = 0; distance < first; distance += 3) {
          const p = {
            x: point.x + outward.x * distance,
            z: point.z + outward.z * distance,
          };
          if (
            nearby.roads.some(
              (q) =>
                q.r !== r &&
                distanceToSegment(p, q.a, q.b).distance < q.r.width / 2 + 0.2,
            )
          ) {
            sample.kind = "junction";
            sample.distance = distance;
            break;
          }
          if (
            inRiverWater(d,p) || waters.some((w) =>
              w.points
                .slice(1)
                .some(
                  (b, i) =>
                    distanceToSegment(p, w.points[i]!, b).distance <
                    w.width / 2,
                ),
            )
          ) {
            sample.kind = "water";
            sample.distance = distance;
            break;
          }
          if(victoryPublicGround(p)){sample.kind='station';sample.distance=distance;break;}
          if (d.publicSpaces?.some(s=>insidePublicPolygon(p,s.boundary)) || parks.some((o) => obstacleDistance(p, o) < 0.1)) {
            sample.kind = "park";
            sample.distance = distance;
            break;
          }
          if (courts.some((o) => obstacleDistance(p, o) < 0.1)) {
            sample.kind = "compound";
            sample.distance = distance;
            break;
          }
          if (stations.some((o) => obstacleDistance(p, o) < 0.1)) {
            sample.kind = "station";
            sample.distance = distance;
            break;
          }
        }
        if (
          sample.kind === "open" &&
          [-4.5, 4.5].every((offset) =>
            nearby.obstacles.some(
              (o) =>
                buildings.has(o) &&
                footprintRay(
                  { x: point.x + ux * offset, z: point.z + uz * offset },
                  outward,
                  o,
                  36,
                ),
            ),
          )
        )
          sample.kind = "alley";
        result.push(sample);
      }
  }
  return result;
}
export type StreetFace = {
  parcel: Obstacle;
  face: number;
  yaw: number;
  width: number;
  depth: number;
  road: Road;
};
export function streetFaces(d: District, samples = auditStreetEdges(d)) {
  const faces = new Map<Obstacle, Map<number, StreetFace>>();
  for (const s of samples) {
    if (s.kind !== "building" || !s.building || s.distance > 46) continue;
    if (s.face === 0 && (!s.building.artRole || s.distance > 30)) continue;
    const b = s.building,
      face = s.face!,
      yaw = (b.yaw ?? 0) + (face * Math.PI) / 2;
    if (Math.sin(yaw) * s.outward.x + Math.cos(yaw) * s.outward.z > -0.28)
      continue;
    if (!faces.has(b)) faces.set(b, new Map());
    faces
      .get(b)!
      .set(face, {
        parcel: b,
        face,
        yaw,
        width: face % 2 ? b.d : b.w,
        depth: face % 2 ? b.w : b.d,
        road: s.road,
      });
  }
  return [...faces.values()].flatMap((f) => [...f.values()]);
}
