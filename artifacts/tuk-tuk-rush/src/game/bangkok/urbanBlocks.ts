import type { District, Obstacle, Point } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import { placementIndex } from "./environmentPlan";
import { inDestinationGrounds } from "./destinationAccess";
import { insidePublicPolygon } from "./publicSpaces";
import { regionAt, riverDistance } from "./world";
import {
  distanceToSegment,
  obstacleDistance,
  orientedFootprintsOverlap,
} from "../world";
import { stableHash } from "./buildingGrammar";

/** Context districts in east/south design coordinates. Park/site reservations
 * remain actual polygons, never these planning rectangles. */
export const BLOCK_DISTRICTS = [
  {
    id: "siam-square",
    box: [704, 468, 766, 539],
    cap: 76,
    h: [9, 13],
    w: 17,
    d: 20,
    palette: ["#d6bbb0", "#e7d8bf", "#9fbdb8"],
    kind: "retail",
  },
  {
    id: "bang-rak",
    box: [420, 760, 565, 985],
    cap: 96,
    h: [10, 20],
    w: 22,
    d: 26,
    palette: ["#d8c3a0", "#adbaae", "#c99c7f"],
    kind: "heritage",
  },
  {
    id: "khlong-san",
    box: [220, 740, 380, 970],
    cap: 96,
    h: [10, 24],
    w: 24,
    d: 28,
    palette: ["#d6c8a9", "#b0c2ba", "#baab9a"],
    kind: "riverside",
  },
  {
    id: "flower-quarter",
    box: [280, 495, 377, 565],
    cap: 50,
    h: [8, 14],
    w: 20,
    d: 23,
    palette: ["#d9c4a6", "#c8a68c", "#b7c1a7"],
    kind: "market",
  },
  {
    id: "victory-quarter",
    box: [665, 175, 780, 315],
    cap: 64,
    h: [15, 32],
    w: 24,
    d: 28,
    palette: ["#c4c8bc", "#d5bda4", "#9cafb6"],
    kind: "mixed",
  },
  {
    id: "old-town-blocks",
    box: [245, 260, 385, 525],
    cap: 64,
    h: [8, 16],
    w: 19,
    d: 24,
    palette: ["#e0cfad", "#c2cbb1", "#d9b291"],
    kind: "heritage",
  },
  {
    id: "yaowarat-blocks",
    box: [330, 470, 620, 700],
    cap: 64,
    h: [11, 21],
    w: 17,
    d: 26,
    palette: ["#d5b895", "#caa29c", "#a3c5b2"],
    kind: "market",
  },
  {
    id: "talat-noi-blocks",
    box: [425, 650, 640, 865],
    cap: 76,
    h: [8, 18],
    w: 24,
    d: 30,
    palette: ["#c4b195", "#a9b8a9", "#bb9678"],
    kind: "heritage",
  },
  {
    id: "thonburi-blocks",
    box: [70, 195, 300, 1000],
    cap: 96,
    h: [8, 17],
    w: 21,
    d: 27,
    palette: ["#d1bb97", "#b1c3ad", "#bda287"],
    kind: "riverside",
  },
  {
    id: "sathorn-blocks",
    box: [465, 625, 885, 1040],
    cap: 80,
    h: [14, 34],
    w: 27,
    d: 31,
    palette: ["#c6c9bd", "#a3b5b8", "#d3c3ad"],
    kind: "mixed",
  },
  {
    id: "asok-blocks",
    box: [855, 400, 980, 795],
    cap: 70,
    h: [17, 38],
    w: 25,
    d: 28,
    palette: ["#a8bdc0", "#d1c9bb", "#bdc6b7"],
    kind: "mixed",
  },
  {
    id: "phaya-thai-blocks",
    box: [610, 10, 875, 375],
    cap: 64,
    h: [13, 27],
    w: 22,
    d: 29,
    palette: ["#b9c4b4", "#cab49a", "#a3b7b5"],
    kind: "mixed",
  },
  {
    id: "southern-blocks",
    box: [375, 1030, 665, 1185],
    cap: 64,
    h: [9, 17],
    w: 23,
    d: 28,
    palette: ["#d4bea0", "#aebcaf", "#c7a383"],
    kind: "riverside",
  },
] as const;
export function blockDistrictAt(p: Point) {
  const x = p.x / 4 + 500,
    y = p.z / 4 + 600;
  return BLOCK_DISTRICTS.find(
    (q) => x > q.box[0] && x < q.box[2] && y > q.box[1] && y < q.box[3],
  );
}
export function inSiamSquare(p: Point) {
  return blockDistrictAt(p)?.id === "siam-square";
}
export type UrbanBlock = {
  id: string;
  district: string;
  origin: Point;
  yaw: number;
  buildings: Obstacle[];
  court?: Obstacle;
};
const plans = new WeakMap<District, UrbanBlock[]>();
const courtCells = new WeakMap<District, Map<string, Obstacle[]>>();
/** Non-solid circulation reservations, indexed to avoid scanning the entire
 * block catalog for every street prop and parcel during startup. */
function reserveCourt(d: District, o: Obstacle) {
  let cells = courtCells.get(d);
  if (!cells) {
    cells = new Map();
    courtCells.set(d, cells);
  }
  const r = Math.hypot(o.w, o.d) / 2 + 1;
  for (let x = Math.floor((o.x - r) / 80); x <= Math.floor((o.x + r) / 80); x++)
    for (
      let z = Math.floor((o.z - r) / 80);
      z <= Math.floor((o.z + r) / 80);
      z++
    ) {
      const k = `${x}:${z}`;
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k)!.push(o);
    }
}
export function urbanCourtReserved(d: District, o: Obstacle) {
  const cells = courtCells.get(d);
  if (!cells) return false;
  const r = Math.hypot(o.w, o.d) / 2 + 0.3,
    seen = new Set<Obstacle>();
  for (let x = Math.floor((o.x - r) / 80); x <= Math.floor((o.x + r) / 80); x++)
    for (
      let z = Math.floor((o.z - r) / 80);
      z <= Math.floor((o.z + r) / 80);
      z++
    )
      for (const court of cells.get(`${x}:${z}`) ?? []) {
        if (seen.has(court)) continue;
        seen.add(court);
        if (orientedFootprintsOverlap(o, court, 0.2)) return true;
      }
  return false;
}
/** Paired asymmetric wings and optional rear wing enclose a narrow service
 * court. Real colliders, road/water/site/transit exclusions, bounded counts.
 * This runs once after railway and authored-site reservations exist. */
export function planUrbanBlocks(d: District): UrbanBlock[] {
  const prior = plans.get(d);
  if (prior) return prior;
  const result: UrbanBlock[] = [],
    index = placementIndex(d),
    nodes = new Map(d.nodes.map((n) => [n.id, n]));
  plans.set(d, result);
  const counts = new Map<string, number>(),
    used = new Set<string>();
  const rail =
    d.transit?.lines.flatMap((l) => l.samples.filter((_, i) => i % 2 === 0)) ??
    [];
  const stations = d.transit?.lines.flatMap((l) => l.stations) ?? [];
  const clear = (o: Obstacle) => {
    const b = d.bounds!,
      r = Math.hypot(o.w, o.d) / 2;
    return (
      o.x > b.minX + r &&
      o.x < b.maxX - r &&
      o.z > b.minZ + r &&
      o.z < b.maxZ - r &&
      !inDestinationGrounds(d, o) &&
      index.clear(o, true) &&
      rail.every((p) => obstacleDistance(p, o) > 9) &&
      stations.every((p) => obstacleDistance(p, o) > p.length / 2 + 12)
    );
  };
  for (const road of d.roads) {
    if (road.bridge || road.shortcut || road.destinationId || road.roundabout)
      continue;
    const a = nodes.get(road.a)!,
      b = nodes.get(road.b)!,
      len = Math.hypot(b.x - a.x, b.z - a.z),
      ux = (b.x - a.x) / len,
      uz = (b.z - a.z) / len;
    for (const side of [-1, 1])
      for (const setback of [68, 110, 156, 205]) {
        const origin = {
            x: (a.x + b.x) / 2 + uz * side * setback,
            z: (a.z + b.z) / 2 - ux * side * setback,
          },
          q = blockDistrictAt(origin);
        if (!q || (counts.get(q.id) ?? 0) >= q.cap) continue;
        const key = `${q.id}:${Math.floor(origin.x / 58)}:${Math.floor(origin.z / 58)}`;
        if (used.has(key)) continue;
        const yaw = Math.atan2(-uz * side, ux * side),
          c = Math.cos(yaw),
          s = Math.sin(yaw);
        const point = (u: number, v: number) => ({
          x: origin.x + c * u + s * v,
          z: origin.z - s * u + c * v,
        });
        const block: UrbanBlock = {
          id: `urban-block:${key}`,
          district: q.id,
          origin,
          yaw,
          buildings: [],
        };
        for (const [u, v, w, depth] of [
          [-q.w * 0.61, 0, q.w, q.d],
          [q.w * 0.61, 2, q.w, q.d - 4],
          [0, -q.d * 0.87, q.w * 1.55, q.d * 0.58],
        ]) {
          if ((counts.get(q.id) ?? 0) >= q.cap) break;
          const id = `${block.id}:${block.buildings.length}`,
            hash = stableHash(id),
            o: Obstacle = {
              ...point(u!, v!),
              w: w!,
              d: depth!,
              yaw,
              height: q.h[0] + (hash % (q.h[1] - q.h[0] + 1)),
              color: q.palette[hash % q.palette.length]!,
              regionId: regionAt(d, origin)?.id ?? "connector",
              artRole: "background",
              environmentId: id,
            };
          if (!clear({ ...o, w: o.w + 2, d: o.d + 2 })) continue;
          d.buildings.push(o);
          d.obstacles.push(o);
          index.insert(o);
          block.buildings.push(o);
          counts.set(q.id, (counts.get(q.id) ?? 0) + 1);
        }
        if (block.buildings.length) {
          used.add(key);
          const court: Obstacle = {
            ...point(0, 2),
            w: Math.min(3.5, q.w * 0.22 - 1.3),
            d: q.d - 4,
            yaw,
            height: 0,
            color: "#b9af9b",
          };
          if (clear(court)) {
            block.court = court;
            index.insert(court);
            reserveCourt(d, court);
          }
          result.push(block);
        }
      }
  }
  plans.set(d, result);
  return result;
}
/** Instanced atlas pieces, finished on all four elevations. No new materials,
 * textures, transparent layers or per-building lights. */
export function emitBlockArchitecture(
  b: Obstacle,
  emit: (p: ArtPiece) => void,
): boolean {
  if (!b.environmentId?.startsWith("urban-block:")) return false;
  const q = blockDistrictAt(b) ?? BLOCK_DISTRICTS[1],
    seed = stableHash(b.environmentId),
    c = Math.cos(b.yaw ?? 0),
    s = Math.sin(b.yaw ?? 0),
    H = b.height;
  const put = (
    u: number,
    y: number,
    v: number,
    w: number,
    h: number,
    depth: number,
    color: string,
    layer: ArtPiece["layer"] = "core",
    shape: ArtPiece["shape"] = "box",
  ) =>
    emit({
      x: b.x + c * u + s * v,
      z: b.z - s * u + c * v,
      y,
      w,
      h,
      d: depth,
      yaw: b.yaw ?? 0,
      color,
      layer,
      shape,
      surface: shape === "gable" ? "tile" : "plaster",
      siteId: b.environmentId,
    });
  put(0, H / 2, 0, b.w, H, b.d, b.color);
  put(0, H + 0.2, 0, b.w + 0.3, 0.4, b.d + 0.3, "#8f9589");
  const floors = Math.max(2, Math.floor(H / 4));
  for (const side of [-1, 1]) {
    for (let f = 0; f < floors; f++) {
      const y = 2.1 + (f * (H - 3)) / floors;
      put(
        0,
        y,
        side * (b.d / 2 + 0.035),
        b.w * 0.8,
        f === 0 ? 2.8 : 1.65,
        0.08,
        f === 0 ? "#3b605b" : "#54706b",
      );
      put(side * (b.w / 2 + 0.035), y, 0, 0.08, 1.65, b.d * 0.66, "#50645c");
      if (f > 0 && seed % 3 === 0) {
        put(
          0,
          y - 0.9,
          side * (b.d / 2 + 0.36),
          b.w * 0.84,
          0.2,
          0.7,
          "#d3c6ac",
          "near",
        );
        put(
          0,
          y - 0.5,
          side * (b.d / 2 + 0.65),
          b.w * 0.84,
          0.65,
          0.09,
          "#72877a",
          "detail",
        );
      }
      if ((f + seed) % 3 === 0)
        put(
          0,
          y,
          side * (b.d / 2 + 0.09),
          b.w * 0.31,
          1.1,
          0.04,
          "#e9bd78",
          "night",
        );
    }
    put(
      0,
      3.7,
      side * (b.d / 2 + 0.4),
      b.w * 0.91,
      0.25,
      0.9,
      q.kind === "retail"
        ? ["#b46d87", "#4e9c99", "#bd905d"][seed % 3]!
        : "#9b765b",
      "near",
    );
    put(
      side * (b.w / 2 + 0.28),
      H * 0.55,
      -b.d * 0.2,
      0.5,
      0.8,
      1.2,
      "#b4b8aa",
      "detail",
    );
  }
  if (
    q.kind === "heritage" ||
    q.kind === "market" ||
    (q.kind === "riverside" && seed % 2)
  )
    put(0, H + 0.45, 0, b.w, 2.1, b.d, "#9a7357", "core", "gable");
  else {
    put(-b.w * 0.18, H + 0.8, -b.d * 0.1, 3.5, 1.2, 3.5, "#84938a", "near");
    put(
      b.w * 0.2,
      H + 1.2,
      -b.d * 0.15,
      1.6,
      2,
      1.6,
      "#829997",
      "detail",
      "cylinder",
    );
  }
  return true;
}
export function emitBlockCourts(d: District, emit: (p: ArtPiece) => void) {
  for (const block of planUrbanBlocks(d))
    if (block.court) {
      const o = block.court;
      emit({
        ...o,
        y: 0.05,
        h: 0.06,
        yaw: o.yaw ?? 0,
        color: o.color,
        layer: "core",
        surface: "concrete",
      });
      emit({
        ...o,
        w: 0.22,
        y: 0.09,
        h: 0.025,
        yaw: o.yaw ?? 0,
        color: "#707b70",
        layer: "near",
        surface: "metal",
      });
    }
}
/** Fixed-grid area sample complements roadside rays. Counts are sample cells,
 * not cadastral parcels. Genuine open uses are separately reported; ground
 * color and tree scatter never turn an empty cell into developed land. */
export function auditUrbanLand(d: District, step = 36) {
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const roads = d.roads
    .filter((r) => !r.shortcut)
    .map((r) => ({ r, a: nodes.get(r.a)!, b: nodes.get(r.b)! }));
  const cells: { x: number; z: number; district: string; use: string }[] = [],
    grid = new Map<string, Obstacle[]>();
  for (const b of d.buildings) {
    const r = Math.hypot(b.w, b.d) / 2 + 24;
    for (
      let x = Math.floor((b.x - r) / 80);
      x <= Math.floor((b.x + r) / 80);
      x++
    )
      for (
        let z = Math.floor((b.z - r) / 80);
        z <= Math.floor((b.z + r) / 80);
        z++
      ) {
        const k = `${x}:${z}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k)!.push(b);
      }
  }
  const bounds = d.bounds!;
  for (let x = bounds.minX + step / 2; x < bounds.maxX; x += step)
    for (let z = bounds.minZ + step / 2; z < bounds.maxZ; z += step) {
      const p = { x, z },
        q = blockDistrictAt(p),
        region = regionAt(d, p);
      if (!region) continue;
      const nearest = roads.reduce(
        (best, r) =>
          Math.min(
            best,
            distanceToSegment(p, r.a, r.b).distance - r.r.width / 2,
          ),
        Infinity,
      );
      if (nearest > 230) continue;
      let use = "vacant";
      if (
        riverDistance(d, p) < d.riverWidth! / 2 ||
        d.canals?.some((c) =>
          c.points
            .slice(1)
            .some(
              (b, i) =>
                distanceToSegment(p, c.points[i]!, b).distance < c.width / 2,
            ),
        )
      )
        use = "water";
      else if (d.publicSpaces?.some((s) => insidePublicPolygon(p, s.boundary)))
        use = "public-space";
      else if (nearest < 3) use = "road";
      else if (
        inDestinationGrounds(d, { ...p, w: 1, d: 1, height: 0, color: "#fff" })
      )
        use = "authored-reservation";
      else if (
        (grid.get(`${Math.floor(x / 80)}:${Math.floor(z / 80)}`) ?? []).some(
          (b) => obstacleDistance(p, b) < step * 0.55,
        )
      )
        use = "developed";
      cells.push({ ...p, district: q?.id ?? region.id, use });
    }
  const byDistrict = Object.fromEntries(
    [...new Set(cells.map((c) => c.district))]
      .sort()
      .map((id) => [
        id,
        Object.fromEntries(
          [
            "vacant",
            "developed",
            "water",
            "road",
            "public-space",
            "authored-reservation",
          ].map((use) => [
            use,
            cells.filter((c) => c.district === id && c.use === use).length,
          ]),
        ),
      ]),
  );
  return {
    step,
    cellAreaM2: step * step,
    samples: cells.length,
    vacant: cells.filter((c) => c.use === "vacant").length,
    developed: cells.filter((c) => c.use === "developed").length,
    byDistrict,
    cells,
  };
}
