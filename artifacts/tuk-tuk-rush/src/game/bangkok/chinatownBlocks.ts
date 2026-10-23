import type { District, Obstacle, Point, Road } from "../types";
import { CHINATOWN_PLAN, chinatownPoint, inChinatown } from "./chinatownPlan";
import { placementIndex } from "./environmentPlan";
import { rectangleBoundary, parcelConflicts } from "./landmarkParcels";
import { orientedFootprintsOverlap } from "../world";
import { stableHash } from "./stableHash";
import baked from "./chinatownBlocks.generated.json";
import { distanceToSegment } from "../world";
import { roadGraphKey } from "./roadIdentity";
export type ChinatownBlock = {
  id: string;
  boundary: Point[];
  edges: { a: Point; b: Point; road: Road }[];
  parcels: Obstacle[];
  area: number;
  holes: Point[][];
};
const cache = new WeakMap<District, ChinatownBlock[]>();
export function polygonContains(p: Point, ring: Point[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!,
      b = ring[j]!;
    if (
      a.z > p.z !== b.z > p.z &&
      p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function pedestrianPassages() {
  return CHINATOWN_PLAN.pedestrianPassages.flatMap((p) =>
    p.points
      .slice(1)
      .map((b, i) => ({
        a: chinatownPoint(p.points[i]!),
        b: chinatownPoint(b),
        width: p.width,
        id: p.id,
      })),
  );
}
export function clearsPedestrianPassages(o: Obstacle) {
  return pedestrianPassages().every(
    (p) =>
      !orientedFootprintsOverlap(o, {
        x: (p.a.x + p.b.x) / 2,
        z: (p.a.z + p.b.z) / 2,
        w: p.width + 1,
        d: Math.hypot(p.b.x - p.a.x, p.b.z - p.a.z) + 1,
        yaw: Math.atan2(p.b.x - p.a.x, p.b.z - p.a.z),
        height: 1,
        color: "#fff",
      }),
  );
}
/** Versioned polygon difference uses the FINAL physically split road graph.
 * Road ribbons, protected plots and authoritative water are removed offline;
 * actual street-facing edges then receive parcels once during world creation. */
export function planChinatownBlocks(d: District, allowStale = false) {
  const prior = cache.get(d);
  if (prior) return prior;
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  if (baked.roadKey !== roadGraphKey(d)) {
    if (allowStale) return [];
    throw Error(
      "Chinatown blocks are stale. Regenerate the approved block polygons.",
    );
  }
  const streets = d.roads.map((road) => ({
    road,
    a: nodes.get(road.a)!,
    b: nodes.get(road.b)!,
  }));
  const blocks: ChinatownBlock[] = [];
  for (const [index, polygon] of baked.polygons.entries()) {
    const ring = polygon[0]!.slice(0, -1).map((p) => ({ x: p[0]!, z: p[1]! }));
    const area = ring.reduce((n, p, i) => {
      const q = ring[(i + 1) % ring.length]!;
      return n + (p.x * q.z - q.x * p.z) / 2;
    }, 0);
    if (Math.abs(area) < 500) continue;
    if (area < 0) ring.reverse();
    const edges: ChinatownBlock["edges"] = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!,
        b = ring[(i + 1) % ring.length]!,
        mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      const near = streets
        .map((r) => ({
          ...r,
          distance: distanceToSegment(mid, r.a, r.b).distance,
        }))
        .sort((a, b) => a.distance - b.distance)[0]!;
      if (
        near.distance > near.road.width / 2 + 7 ||
        near.road.destinationId ||
        near.road.roundabout ||
        near.road.bridge
      )
        continue;
      const prev = edges.at(-1),
        dx = b.x - a.x,
        dz = b.z - a.z;
      if (
        prev &&
        prev.road.corridor === near.road.corridor &&
        Math.hypot(prev.b.x - a.x, prev.b.z - a.z) < 0.01 &&
        Math.abs((prev.b.x - prev.a.x) * dz - (prev.b.z - prev.a.z) * dx) < 0.07
      )
        prev.b = b;
      else edges.push({ a, b, road: near.road });
    }
    blocks.push({
      id: "ctblock:" + index,
      boundary: ring,
      holes: polygon
        .slice(1)
        .map((r) => r.map((p) => ({ x: p[0]!, z: p[1]! }))),
      edges,
      parcels: [],
      area: Math.abs(area),
    });
  }
  cache.set(d, blocks);
  const index = placementIndex(d);
  for (const block of blocks)
    for (const [edgeNumber, e] of block.edges.entries()) {
      if (e.road.roundabout) continue;
      const dx = e.b.x - e.a.x,
        dz = e.b.z - e.a.z,
        len = Math.hypot(dx, dz),
        ux = dx / len,
        uz = dz / len;
      const corridor = e.road.corridor ?? "",
        song = corridor.startsWith("songwat"),
        talat = ["wanit-2", "wanit-2-south", "yotha"].includes(corridor),
        yao = corridor === "yaowarat";
      const count = Math.floor((len - 1) / (song ? 16 : 12));
      if (count < 1) continue;
      const step = (len - 1) / count;
      for (let i = 0; i < count; i++) {
        const seed = stableHash(`${block.id}:${edgeNumber}:${i}`),
          t = 0.5 + (i + 0.5) * step;
        for (const depth of [song ? 38 : 30, 22, 14, 10]) {
          const off = 0.6 + depth / 2;
          const o: Obstacle = {
            x: e.a.x + ux * t - uz * off,
            z: e.a.z + uz * t + ux * off,
            w: step - 0.72,
            d: depth,
            yaw: Math.atan2(uz, -ux),
            height: yao
              ? 14 + (seed % 4) * 3.2
              : song
                ? 9 + (seed % 3) * 3.1
                : talat
                  ? 7.8 + (seed % 3) * 2.4
                  : 11 + (seed % 4) * 3.1,
            color: (song
              ? ["#d8cbb1", "#b6b8a3", "#e0d1b1"]
              : talat
                ? ["#c7b49a", "#a0b4a0", "#caab8e"]
                : ["#dfc395", "#b7c6b3", "#d7a18a"])[seed % 3]!,
            regionId: talat ? "talatnoi" : "chinatown",
            environmentId: `ctparcel:${block.id}:${edgeNumber}:${i}`,
            chinatown: {
              block: block.id,
              corridor,
              character: yao
                ? "yaowarat"
                : song
                  ? "songwat"
                  : talat
                    ? "talatnoi"
                    : "commercial",
            },
          };
          if (
            !rectangleBoundary(o).every(
              (p) =>
                polygonContains(p, block.boundary) &&
                !block.holes.some((h) => polygonContains(p, h)),
            ) ||
            !inChinatown(o) ||
            !clearsPedestrianPassages(o) ||
            parcelConflicts(d, o).length ||
            !index.clear(o, true)
          )
            continue;
          d.buildings.push(o);
          d.obstacles.push(o);
          index.insert(o);
          block.parcels.push(o);
          break;
        }
      }
    }
  // Brand/heritage identities are limited to source-checked positions, selected
  // from approved physical street parcels rather than floating label markers.
  const used = new Set<Obstacle>();
  for (const [identity, corridor, target] of [
    ["scala-yaowarat", "yaowarat", [507, 559]],
    ["hua-seng-heng", "yaowarat", [490, 550]],
    ["tang-to-kang", "mangkon", [450, 590]],
  ] as const) {
    const q = chinatownPoint(target),
      candidates = blocks
        .flatMap((b) => b.parcels)
        .filter((p) => p.chinatown?.corridor === corridor && !used.has(p));
    candidates.sort(
      (a, b) =>
        Math.hypot(a.x - q.x, a.z - q.z) - Math.hypot(b.x - q.x, b.z - q.z),
    );
    const p = candidates[0];
    if (p) {
      p.chinatown!.identity = identity;
      used.add(p);
      if (identity === "tang-to-kang") p.height = 29;
    }
  }
  return blocks;
}
