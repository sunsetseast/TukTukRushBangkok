import { riverClearance } from "./waterGeometry";
import { footprintInBlock } from "./blockContainment";
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
  courts: {
    fixtures: Obstacle[];
    id: string;
    body: Obstacle;
    owner: string;
    use: "merchant-yard" | "workshop-court";
  }[];
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
    p.points.slice(1).map((b, i) => ({
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
      courts: [],
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
            !footprintInBlock(o, block) ||
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
  planRearProperties(d, blocks, index);
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

/** Rear wings belong to a real street parcel and its block, never a second
 * district scatter. A reserved court separates every wing from its owner.
 * The large bank block is composed first; existing pier/site holes remain void. */
function planRearProperties(
  d: District,
  blocks: ChinatownBlock[],
  index: ReturnType<typeof placementIndex>,
) {
  const selected = new Set([
    "ctblock:1",
    "ctblock:2",
    "ctblock:3",
    "ctblock:6",
    "ctblock:9",
    "ctblock:10",
    "ctblock:23",
    "ctblock:24",
    "ctblock:25",
  ]);
  for (const block of blocks.filter((b) => selected.has(b.id))) {
    const fronts = [...block.parcels];
    const courts: Obstacle[] = [];
    const valid = (o: Obstacle) =>
      footprintInBlock(o, block) &&
      inChinatown(o) &&
      clearsPedestrianPassages(o) &&
      !parcelConflicts(d, o).length &&
      index.clear(o, true) &&
      courts.every((c) => !orientedFootprintsOverlap(o, c, 1));
    for (let i = 0; i < fronts.length; i += 2) {
      const owner = fronts[i]!,
        yaw = owner.yaw ?? 0,
        s = Math.sin(yaw),
        c = Math.cos(yaw),
        seed = stableHash(owner.environmentId!);
      const talat = owner.chinatown!.character === "talatnoi",
        waterfront = block.id === "ctblock:2";
      for (const reach of waterfront ? [46, 90, 134, 178, 222] : [26, 48]) {
        // Keep actual rear circulation separate from massing. The smallest
        // dimensions fit narrow remnants; broad bays occupy deep bank properties.
        for (const [w, depth] of waterfront
          ? [
              [38, 34],
              [28, 26],
              [20, 18],
            ]
          : [
              [26, 22],
              [18, 16],
              [12, 12],
            ]) {
          const distance = owner.d / 2 + reach + depth! / 2;
          const o: Obstacle = {
            x: owner.x - s * distance,
            z: owner.z - c * distance,
            w: w!,
            d: depth!,
            height: talat ? 7.4 + (seed % 3) * 1.3 : 9.4 + (seed % 4) * 1.6,
            yaw,
            color: owner.color,
            regionId: owner.regionId,
            environmentId: `ctrear:${owner.environmentId}:${reach}`,
            chinatown: {
              ...owner.chinatown!,
              role: "rear",
              owner: owner.environmentId,
              identity: undefined,
            },
          };
          const court: Obstacle = {
            ...o,
            x: o.x + s * (depth! / 2 + 5),
            z: o.z + c * (depth! / 2 + 5),
            w: w!,
            d: 8,
            height: 0,
            color: talat ? "#a9a38d" : "#b3a48a",
          };
          if (!valid(o) || !valid(court)) continue;
          d.buildings.push(o);
          d.obstacles.push(o);
          index.insert(o);
          block.parcels.push(o);
          courts.push(court);
          const fixtures: Obstacle[] = [];
          for (const side of [-1, 1]) {
            const u = side * (court.w / 2 - 0.3),
              v = talat ? -1.4 : 0;
            const f: Obstacle = {
              ...court,
              x: court.x + Math.cos(yaw) * u + Math.sin(yaw) * v,
              z: court.z - Math.sin(yaw) * u + Math.cos(yaw) * v,
              w: talat ? 1.5 : 0.45,
              d: talat ? 2.4 : 7,
              height: talat ? 1.2 : 1.65,
              color: talat ? "#718072" : "#b8b298",
              artRole: "furniture",
              chinatown: undefined,
              environmentId: o.environmentId + ":yard:" + side,
            };
            if (!footprintInBlock(f, block) || !index.clear(f, true)) continue;
            fixtures.push(f);
            d.obstacles.push(f);
            index.insert(f);
          }
          block.courts.push({
            fixtures,
            id: o.environmentId + ":court",
            body: court,
            owner: owner.environmentId!,
            use: talat ? "workshop-court" : "merchant-yard",
          });
          break;
        }
      }
    }
  }
  // Working waterfront properties follow the block's actual bank edge.
  // Pier/compound holes remain open; every accepted body joins this same plan.
  for (const block of blocks.filter((b) => b.id === "ctblock:2")) {
    const fronts = block.parcels.filter((p) => !p.chinatown!.role);
    for (let edge = 0; edge < block.boundary.length; edge++) {
      const a = block.boundary[edge]!,
        b = block.boundary[(edge + 1) % block.boundary.length]!,
        dx = b.x - a.x,
        dz = b.z - a.z,
        len = Math.hypot(dx, dz);
      if (
        len < 35 ||
        riverClearance(d, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }) > 35
      )
        continue;
      const ux = dx / len,
        uz = dz / len,
        count = Math.floor(len / 36),
        step = len / count,
        yaw = Math.atan2(uz, -ux);
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) * step,
          depth = 26,
          off = depth / 2 + 32;
        const owner = [...fronts].sort(
          (p, q) =>
            Math.hypot(p.x - a.x - ux * t, p.z - a.z - uz * t) -
            Math.hypot(q.x - a.x - ux * t, q.z - a.z - uz * t),
        )[0]!;
        const o: Obstacle = {
          x: a.x + ux * t - uz * off,
          z: a.z + uz * t + ux * off,
          w: step - 1.1,
          d: depth,
          yaw,
          height: 10.2 + (i % 3) * 1.2,
          color: "#c8b99a",
          regionId: "chinatown",
          environmentId: `ctbank:${block.id}:${edge}:${i}`,
          chinatown: {
            block: block.id,
            corridor: owner.chinatown!.corridor,
            character: "songwat",
            role: "rear",
            owner: owner.environmentId,
          },
        };
        const court: Obstacle = {
          ...o,
          x: o.x + uz * (depth / 2 + 6),
          z: o.z - ux * (depth / 2 + 6),
          d: 9,
          height: 0,
          color: "#ad9f87",
        };
        const clear = (q: Obstacle) =>
          footprintInBlock(q, block) &&
          clearsPedestrianPassages(q) &&
          !parcelConflicts(d, q).length &&
          index.clear(q, true) &&
          block.courts.every((c) => !orientedFootprintsOverlap(q, c.body, 1));
        if (!clear(o) || !clear(court)) continue;
        d.buildings.push(o);
        d.obstacles.push(o);
        index.insert(o);
        block.parcels.push(o);
        const fixtures: Obstacle[] = [];
        // Broken boundary walls frame individual working properties. A wide
        // central opening and the protected pier holes retain bank access.
        for (const side of [-1, 1]) {
          const u = t + (side * (step + 8)) / 4;
          const wall: Obstacle = {
            x: a.x + ux * u - uz * 18,
            z: a.z + uz * u + ux * 18,
            w: (step - 8) / 2,
            d: 0.5,
            yaw: Math.atan2(-uz, ux),
            height: 1.7,
            color: "#b4aa90",
            artRole: "furniture",
            environmentId: o.environmentId + ":bank-wall:" + side,
          };
          if (!clear(wall)) continue;
          fixtures.push(wall);
          d.obstacles.push(wall);
          index.insert(wall);
        }
        block.courts.push({
          id: o.environmentId + ":court",
          body: court,
          owner: owner.environmentId!,
          use: "merchant-yard",
          fixtures,
        });
      }
    }
  }
  // Side elevations are selected by physical exposure, including acute end
  // parcels, rather than the nearest road's coarse junction flag.
  const grid = new Map<string, Obstacle[]>();
  for (const p of d.buildings) {
    const k = `${Math.floor(p.x / 40)}:${Math.floor(p.z / 40)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(p);
  }
  for (const b of blocks)
    for (const p of b.parcels) {
      const yaw = p.yaw ?? 0,
        c = Math.cos(yaw),
        s = Math.sin(yaw),
        near: Obstacle[] = [];
      for (let x = Math.floor(p.x / 40) - 2; x <= Math.floor(p.x / 40) + 2; x++)
        for (
          let z = Math.floor(p.z / 40) - 2;
          z <= Math.floor(p.z / 40) + 2;
          z++
        )
          near.push(...(grid.get(`${x}:${z}`) ?? []));
      p.chinatown!.exposedSides = [-1, 1].filter((side) => {
        const probe = {
          ...p,
          x: p.x + c * side * (p.w / 2 + 1.5),
          z: p.z - s * side * (p.w / 2 + 1.5),
          w: 2,
          d: Math.min(p.d - 1, 12),
        };
        return near.every(
          (q) => q === p || !orientedFootprintsOverlap(probe, q),
        );
      });
    }
}
