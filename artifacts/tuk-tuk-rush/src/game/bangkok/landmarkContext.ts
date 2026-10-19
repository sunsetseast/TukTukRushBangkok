import type { District, Obstacle, Point } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import { placementIndex } from "./environmentPlan";
import { regionAt } from "./world";
import { stableHash } from "./buildingGrammar";
import { distanceToSegment } from "../world";
export type ContextPocket = {
  id: string;
  landmarkId: string;
  point: Point;
  use:
    | "existing-development"
    | "no-public-street"
    | "protected-or-conflicting"
    | "completed-context";
  buildingIds: string[];
};
const plans = new WeakMap<District, ContextPocket[]>();
const IDS = [
  "hua",
  "golden",
  "traimit",
  "mbk",
  "siam-center",
  "central",
  "terminal",
  "oriental",
  "shangri",
  "peninsula",
  "hilton",
  "four-seasons",
  "capella",
  "anantara",
  "river-city",
  "state",
  "mahanakhon",
  "baiyoke",
];
/** Bounded secondary urban fabric, outside protected grounds. These sampled
 * pockets are not land ownership records: each is tested for actual clearance
 * and nearby public-road access before a real physical building is inserted. */
export function completeLandmarkContext(d: District): ContextPocket[] {
  const prior = plans.get(d);
  if (prior) return prior;
  const index = placementIndex(d),
    nodes = new Map(d.nodes.map((n) => [n.id, n])),
    pockets: ContextPocket[] = [];
  const streets = d.roads
    .filter((r) => !r.destinationId && !r.bridge && !r.shortcut)
    .map((r) => ({ r, a: nodes.get(r.a)!, b: nodes.get(r.b)! }));
  const original = [...d.buildings];
  let total = 0;
  for (const id of IDS) {
    const l = d.landmarks.find((l) => l.id === id);
    if (!l?.plot) continue;
    let count = 0;
    for (const radius of [85, 120, 160, 200])
      for (let i = 0; i < 16; i++) {
        if (count >= 9 || total >= 120) break;
        const angle = (i * Math.PI) / 8,
          p = {
            x: l.plot.x + Math.sin(angle) * radius,
            z: l.plot.z + Math.cos(angle) * radius,
          },
          key = `context:${id}:${radius}:${i}`;
        const pocket: ContextPocket = {
          id: key,
          landmarkId: id,
          point: p,
          use: "protected-or-conflicting",
          buildingIds: [],
        };
        pockets.push(pocket);
        if (
          original.some(
            (b) =>
              Math.hypot(p.x - b.x, p.z - b.z) < Math.hypot(b.w, b.d) / 2 + 13,
          )
        ) {
          pocket.use = "existing-development";
          continue;
        }
        const nearby = streets
          .map((s) => ({ ...s, ...distanceToSegment(p, s.a, s.b) }))
          .sort((a, b) => a.distance - b.distance)[0]!;
        if (
          nearby.distance > 115 ||
          nearby.distance < nearby.r.width / 2 + 13
        ) {
          pocket.use = "no-public-street";
          continue;
        }
        const yaw = Math.atan2(nearby.point.x - p.x, nearby.point.z - p.z),
          hash = stableHash(key),
          historic = [
            "hua",
            "golden",
            "traimit",
            "river-city",
            "oriental",
            "state",
          ].includes(id);
        const o: Obstacle = {
          ...p,
          w: historic ? 12 : 15,
          d: historic ? 15 : 18,
          height: (historic ? 8 : 11) + (hash % 3) * 3.1,
          yaw,
          color: historic
            ? ["#c3b29a", "#d3c4ae", "#b1c4b5"][hash % 3]!
            : ["#bfc5b6", "#d6c5ad", "#b3bdb7"][hash % 3]!,
          regionId: regionAt(d, p)?.id ?? "connector",
          artRole: "background",
          environmentId: key,
        };
        const bounds = d.bounds!,
          r = Math.hypot(o.w, o.d) / 2;
        if (
          p.x < bounds.minX + r ||
          p.x > bounds.maxX - r ||
          p.z < bounds.minZ + r ||
          p.z > bounds.maxZ - r ||
          !index.clear(o)
        )
          continue;
        d.buildings.push(o);
        d.obstacles.push(o);
        index.insert(o);
        pocket.use = "completed-context";
        pocket.buildingIds.push(key);
        count++;
        total++;
      }
  }
  plans.set(d, pockets);
  return pockets;
}
export function emitLandmarkContextGrounds(
  d: District,
  emit: (p: ArtPiece) => void,
) {
  for (const o of d.buildings.filter((o) =>
    o.environmentId?.startsWith("context:"),
  ))
    emit({
      x: o.x,
      z: o.z,
      y: 0.025,
      w: o.w + 1,
      h: 0.04,
      d: o.d + 1,
      yaw: o.yaw ?? 0,
      color: "#beb7a5",
      surface: "concrete",
      siteId: o.environmentId,
    });
}
