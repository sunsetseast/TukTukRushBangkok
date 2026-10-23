import { isPreservedChinatownExterior } from "./chinatownExterior";
import { proceduralStreetSeeds } from "./proceduralStreetSeeds";
import { CHINATOWN_PLAN, chinatownParcel, inChinatown } from "./chinatownPlan";
import { riverClearance, riverBank, nearestRiverShore } from "./waterGeometry";
import type { District, Obstacle, Point } from "../types";
import { regionAt } from "./world";
import { placementIndex } from "./environmentPlan";
import { stableHash } from "./buildingGrammar";
import { distanceToSegment, orientedFootprintsOverlap } from "../world";
import { inDestinationGrounds } from "./destinationAccess";
import type { ArtPiece } from "./architecturalBatch";
export type CompletenessReport = {
  frontage: number;
  rear: number;
  screened: number;
  rejected: number;
  blockcourt: number;
};
const completed = new WeakMap<District, CompletenessReport>();
/** Fit smaller real parcels first, then rear courts. No scenery is placed inside
 * a road, waterway, public park, landmark plot or its viewing approach. */
export function completeUrbanFabric(d: District): CompletenessReport {
  const prior = completed.get(d);
  if (prior) return prior;
  const index = placementIndex(d),
    seedGraph = proceduralStreetSeeds(d),
    nodes = seedGraph.nodes,
    report = { frontage: 0, rear: 0, screened: 0, rejected: 0, blockcourt: 0 };
  const approaches = d.landmarks
    .filter(
      (l) =>
        l.plot && ["pho", "arun", "icon", "paragon", "paknam"].includes(l.id!),
    )
    .map((l) => {
      const a = nodes.get(l.accessNode!)!,
        p = l.plot!,
        len = Math.hypot(p.x - a.x, p.z - a.z);
      return {
        x: (p.x + a.x) / 2,
        z: (p.z + a.z) / 2,
        w: 22,
        d: Math.max(0, len - l.size! * 0.45),
        yaw: Math.atan2(p.x - a.x, p.z - a.z),
        height: 1,
        color: "#aaa",
      };
    });
  const clear = (b: Obstacle) => {
    const rad = Math.hypot(b.w, b.d) / 2,
      bd = d.bounds!;
    return (
      !chinatownParcel(b) &&
      !inDestinationGrounds(d, b) &&
      b.x > bd.minX + rad &&
      b.x < bd.maxX - rad &&
      b.z > bd.minZ + rad &&
      b.z < bd.maxZ - rad &&
      !approaches.some((a) => a.d > 1 && orientedFootprintsOverlap(a, b, 1)) &&
      index.clear(b)
    );
  };
  const add = (
    p: Point,
    yaw: number,
    w: number,
    depth: number,
    role: "frontage" | "rear" | "screened",
  ) => {
    const region = regionAt(d, p)?.id ?? "connector",
      seed = stableHash(`${Math.round(p.x)}:${Math.round(p.z)}`),
      modern = ["siam", "silom", "sukhumvit", "icon"].includes(region);
    const b: Obstacle = {
      ...p,
      w,
      d: depth,
      yaw,
      height: modern ? 24 + (seed % 6) * 8 : 7 + (seed % 4) * 3.5,
      color: "#b7baa2",
      regionId: region,
      artRole: role === "frontage" ? undefined : "background",
      environmentId: `infill:${role}:${seed}`,
    };
    if (!clear(b)) return false;
    d.buildings.push(b);
    d.obstacles.push(b);
    index.insert(b);
    report[role]++;
    return true;
  };
  for (const r of seedGraph.roads) {
    if (r.destinationId || r.roundabout || r.shortcut) continue;
    const a = nodes.get(r.a)!,
      b = nodes.get(r.b)!,
      len = Math.hypot(b.x - a.x, b.z - a.z),
      ux = (b.x - a.x) / len,
      uz = (b.z - a.z) / len;
    for (const t of [len * 0.25, len * 0.7])
      for (const side of [-1, 1]) {
        const yaw = Math.atan2(-uz * side, ux * side),
          point = (off: number) => ({
            x: a.x + ux * t + uz * side * off,
            z: a.z + uz * t - ux * side * off,
          });
        let fit = false;
        for (const [w, depth] of [
          [12, 14],
          [8, 10],
          [5.8, 7.5],
        ]) {
          if (
            add(
              point(r.width / 2 + 8 + depth! / 2),
              yaw,
              w!,
              depth!,
              "frontage",
            )
          ) {
            fit = true;
            break;
          }
        }
        if (!fit) report.rejected++;
      }
  }
  // Irregular rear silhouettes close the exposed ground beyond shallow rows.
  const frontage = [...d.buildings];
  for (const b of frontage) {
    if (b.chinatown || isPreservedChinatownExterior(b)) continue;
    const seed = stableHash(`${b.x}:${b.z}`);
    if (seed % 3 === 0) continue;
    const yaw = b.yaw ?? 0,
      region = regionAt(d, b)?.id ?? "connector",
      modern = ["siam", "silom", "sukhumvit"].includes(region);
    for (const distance of [36, 70, 115]) {
      const p = {
        x:
          b.x -
          Math.sin(yaw) * (b.d / 2 + distance) +
          Math.cos(yaw) * ((seed % 19) - 9),
        z:
          b.z -
          Math.cos(yaw) * (b.d / 2 + distance) -
          Math.sin(yaw) * ((seed % 19) - 9),
      };
      const w = modern ? 28 + (seed % 3) * 8 : 18 + (seed % 4) * 3,
        depth = modern ? 28 : 16 + (seed % 3) * 4;
      if (add(p, yaw, w, depth, "rear")) break;
    }
  }
  // Sparse screened service plots, kept close to streets rather than random map fill.
  for (const r of seedGraph.roads.filter((r) => !r.roundabout && !r.shortcut)) {
    const a = nodes.get(r.a)!,
      b = nodes.get(r.b)!,
      seed = stableHash(`${r.a}:${r.b}`);
    if (seed % 4) continue;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z),
      side = seed % 2 ? 1 : -1,
      p = {
        x: (a.x + b.x) / 2 + Math.cos(yaw) * 65 * side,
        z: (a.z + b.z) / 2 - Math.sin(yaw) * 65 * side,
      };
    if (riverClearance(d, p) < 20) continue;
    add(p, yaw + (side * Math.PI) / 2, 14, 12, "screened");
  }
  for (const ring of d.riverPolygon ?? []) {
    let station = 0;
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1]!,
        b = ring[i]!,
        len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 0.1) continue;
      for (let t = 70 - station; t < len; t += 70) {
        const p = {
            x: a.x + ((b.x - a.x) * t) / len,
            z: a.z + ((b.z - a.z) * t) / len,
          },
          n = nearestRiverShore(d, p);
        add(
          { x: p.x + n.nx * 23, z: p.z + n.nz * 23 },
          Math.atan2(-n.nx, -n.nz),
          18,
          13,
          "rear",
        );
      }
      station = (station + len) % 70;
    }
  }
  // Canal communities and small temple-edge residences connect the cleared hero
  // precincts to the surrounding city. Reuse real parcels and exact clearance.
  let context = 0;
  for (const canal of d.canals ?? [])
    for (let i = 1; i < canal.points.length; i++) {
      const a = canal.points[i - 1]!,
        b = canal.points[i]!,
        len = Math.hypot(b.x - a.x, b.z - a.z),
        ux = (b.x - a.x) / len,
        uz = (b.z - a.z) / len;
      for (let t = 24; t < len; t += 65)
        for (const side of [-1, 1]) {
          if (context >= 100) break;
          const off = canal.width / 2 + 23,
            p = {
              x: a.x + ux * t + uz * off * side,
              z: a.z + uz * t - ux * off * side,
            };
          if (add(p, Math.atan2(-uz * side, ux * side), 13, 10, "frontage"))
            context++;
        }
    }
  const paknam = d.landmarks.find((l) => l.id === "paknam")!;
  for (const radius of [85, 112, 140])
    for (let i = 0; i < 20; i++) {
      const a = (i * Math.PI) / 10,
        p = {
          x: paknam.plot!.x + Math.sin(a) * radius,
          z: paknam.plot!.z + Math.cos(a) * radius,
        };
      if (context < 120 && add(p, a + Math.PI, 12, 10, "frontage")) context++;
    }
  // Complete the visible gaps behind commercial ribbons with small paired
  // residential/workshop masses. Previously these secondary blocks jumped
  // from a single shallow row to broad green land. They remain physical,
  // bounded parcels and use the district's existing architectural grammar.
  // Cap the added work rather than recursively filling newly generated rows.
  const targetCorridors = new Set([
    "ratchadamri",
    "phaya",
    "sathorn",
    "charoen_s",
    "silom",
    "ramaiv",
    "narathiwas",
    "charoen_nakhon",
    "songwat",
    "old_siam",
  ]);
  const seeds = d.buildings
    .filter(
      (b) =>
        !b.chinatown &&
        !isPreservedChinatownExterior(b) &&
        !b.artRole &&
        b.height < 65,
    )
    .sort(
      (a, b) =>
        stableHash(`court:${a.x}:${a.z}`) - stableHash(`court:${b.x}:${b.z}`),
    );
  const used = new Set<string>();
  const targetRoads = seedGraph.roads
    .filter((r) => targetCorridors.has(r.corridor ?? ""))
    .map((r) => ({ r, a: nodes.get(r.a)!, b: nodes.get(r.b)! }));
  for (const b of seeds) {
    if (report.blockcourt >= 112) break;
    const cell = `${Math.floor(b.x / 95)}:${Math.floor(b.z / 95)}`;
    if (
      used.has(cell) ||
      !targetRoads.some((r) => distanceToSegment(b, r.a, r.b).distance < 45)
    )
      continue;
    const yaw = b.yaw ?? 0,
      c = Math.cos(yaw),
      s = Math.sin(yaw),
      seed = stableHash(cell);
    let placed = false;
    for (const side of [-1, 1]) {
      if (report.blockcourt >= 112) break;
      const back = b.d / 2 + 43,
        lateral = side * (19 + (seed % 7));
      const p = {
        x: b.x - s * back + c * lateral,
        z: b.z - c * back - s * lateral,
      };
      const region = regionAt(d, p)?.id ?? "connector",
        modern = ["siam", "silom", "sukhumvit"].includes(region);
      const o: Obstacle = {
        ...p,
        w: 12 + (seed % 3) * 2,
        d: 12 + (seed % 2) * 4,
        yaw,
        height: modern ? 11 + (seed % 3) * 3.2 : 7.5 + (seed % 3) * 2.7,
        color: modern ? "#c6c9bd" : "#d8c2a5",
        regionId: region,
        artRole: "background",
        environmentId: `infill:blockcourt:${cell}:${side}`,
      };
      if (
        !inChinatown(o, 100) &&
        !CHINATOWN_PLAN.preservedExteriorCourts.includes(o.environmentId!)
      )
        continue;
      if (!clear(o)) continue;
      d.buildings.push(o);
      d.obstacles.push(o);
      index.insert(o);
      report.blockcourt++;
      placed = true;
    }
    if (placed) used.add(cell);
  }
  completed.set(d, report);
  return report;
}

/** Actual developed-parcel bases, not a replacement for the vacancy survey.
 * A narrow mineral apron ties each physical rear/service building to the city.
 * These patches neither create colliders nor reclassify empty land as a park.
 * All edges lie within the clearance already reserved around the real parcel. */
export function emitUrbanCompletenessGrounds(
  d: District,
  emit: (p: ArtPiece) => void,
) {
  for (const b of d.buildings) {
    if (!b.environmentId?.startsWith("infill:")) continue;
    const seed = stableHash(b.environmentId);
    emit({
      x: b.x,
      z: b.z,
      y: -0.075,
      w: b.w + 1.2,
      d: b.d + 1.2,
      h: 0.06,
      color:
        seed % 3 === 0 ? "#c2b7a2" : seed % 3 === 1 ? "#b4b1a1" : "#c9bea9",
      yaw: b.yaw ?? 0,
      surface: "concrete",
      siteId: `ground:${b.environmentId}`,
    });
    if (b.environmentId.startsWith("infill:blockcourt:")) {
      // Low masonry footing and an inset concrete threshold ground the small
      // workshop/apartment masses without adding obstacles on the street.
      emit({
        x: b.x,
        z: b.z,
        y: 0.12,
        w: b.w + 0.16,
        d: b.d + 0.16,
        h: 0.24,
        color: "#a59d8e",
        yaw: b.yaw ?? 0,
        surface: "concrete",
        siteId: b.environmentId,
      });
    }
  }
}
