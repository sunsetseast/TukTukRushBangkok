import type { District, Obstacle, Point, Road } from "../types";
import { distanceToSegment } from "../world";

/** Structural match for world.ts's pre-sampling corridor segments. Civic road
 * surgery happens before junction splitting, so asphalt, navigation, traffic,
 * parcel exclusions and the map all consume the same connected graph. */
export type CivicSegment = { a: Point; b: Point; road: Road; cuts: number[] };
const mapPoint = (x: number, z: number): Point => ({
  x: (x - 500) * 4,
  z: (z - 600) * 4,
});
export const VICTORY_SITE = Object.freeze({
  center: Object.freeze(mapPoint(675, 230)),
  roadRadius: 64,
  roadWidth: 20,
  islandRadius: 42,
  skywalkRadius: 85,
  segments: 40,
});
const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z) < 0.01;
export function victoryRingPoints(): Point[] {
  const { center, roadRadius, segments } = VICTORY_SITE;
  // +Z points south. Increasing atan2(z,x) goes clockwise on the north-up map.
  return Array.from({ length: segments }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / segments;
    return {
      x: center.x + Math.cos(a) * roadRadius,
      z: center.z + Math.sin(a) * roadRadius,
    };
  });
}
export function reconstructCivicRoads(
  segments: CivicSegment[],
  controls: Record<string, Point>,
): void {
  if (segments.some((s) => s.road.corridor === "victory-circle")) return;
  const center = controls.victory;
  if (!center || !near(center, VICTORY_SITE.center))
    throw new Error(
      "Victory geographic anchor changed without updating civic reconstruction",
    );
  const ring = victoryRingPoints();
  const nearest = (p: Point) =>
    ring.reduce((best, q) =>
      Math.hypot(q.x - p.x, q.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z)
        ? q
        : best,
    );
  for (const s of segments)
    for (const key of ["a", "b"] as const) {
      if (near(s[key], center)) s[key] = nearest(s[key === "a" ? "b" : "a"]);
    }
  for (let i = 0; i < ring.length; i++)
    segments.push({
      a: ring[i]!,
      b: ring[(i + 1) % ring.length]!,
      cuts: [0, 1],
      road: {
        a: "",
        b: "",
        width: VICTORY_SITE.roadWidth,
        name: "Victory Monument Roundabout",
        corridor: "victory-circle",
        roundabout: true,
        oneWay: true,
      },
    });
  const add = (
    a: Point,
    b: Point,
    corridor: string,
    name: string,
    width = 20,
  ) =>
    segments.push({
      a,
      b,
      cuts: [0, 1],
      road: { a: "", b: "", width, corridor, name },
    });
  const west = mapPoint(570, 230),
    east = mapPoint(825, 230);
  add(west, nearest(west), "ratchawithi", "Ratchawithi Road");
  add(nearest(east), east, "din-daeng", "Din Daeng Road");
  // These reconnect to the existing Phetchaburi corridor through real named
  // north/south corridors. Their bends/distances are intentionally compressed.
  const lowerA = controls.lan_luang!,
    lowerB = controls.phaya_thai!;
  const t = (west.x - lowerA.x) / (lowerB.x - lowerA.x);
  // Exact interpolation puts this endpoint on the existing skewed corridor;
  // an approximate [570,335] pin would leave a subtle 4.3m disconnected gap.
  const southWest = { x: west.x, z: lowerA.z + (lowerB.z - lowerA.z) * t };
  add(west, southWest, "rama-vi", "Rama VI Road", 16);
  add(east, controls.phetchaburi_e!, "ratchaprarop", "Ratchaprarop Road", 18);
}
export function civicLandmarkPlot(
  id: string,
): (Point & { size: number }) | undefined {
  if (id === "victory") return { ...VICTORY_SITE.center, size: 208 };
  return undefined;
}
/** A union of rectangles approximates the circular protected memorial island.
 * The road annulus stays drivable; no rectangular obstacle covers the junction. */
export function victoryIslandCollisions(): Obstacle[] {
  const c = VICTORY_SITE.center;
  return [
    {
      ...c,
      w: 64,
      d: 50,
      height: 1.25,
      color: "#a7b38c",
      landmarkId: "victory",
      protected: true,
    },
    {
      ...c,
      w: 50,
      d: 64,
      height: 1.25,
      color: "#a7b38c",
      landmarkId: "victory",
      protected: true,
    },
    {
      ...c,
      w: 35,
      d: 73,
      height: 1.25,
      color: "#a7b38c",
      landmarkId: "victory",
      protected: true,
    },
    {
      ...c,
      w: 73,
      d: 35,
      height: 1.25,
      color: "#a7b38c",
      landmarkId: "victory",
      protected: true,
    },
    { ...c, w: 23, d: 23, height: 12, color: "#c8c8b7", landmarkId: "victory" },
    { ...c, w: 7, d: 7, height: 50, color: "#e3dfce", landmarkId: "victory" },
  ];
}
/** Monument visit is registered at the public perimeter, never on the isolated
 * central island. Keeping 'victory' preserves discovery/save identity. */
export function connectVictoryApproach(d: District): void {
  const l = d.landmarks.find((l) => l.id === "victory");
  if (!l) return;
  const target = {
    x: VICTORY_SITE.center.x - 85,
    z: VICTORY_SITE.center.z + 32,
  };
  const eligible = d.nodes.filter(
    (n) =>
      Math.hypot(n.x - VICTORY_SITE.center.x, n.z - VICTORY_SITE.center.z) >
      VICTORY_SITE.roadRadius + 1,
  );
  if (!eligible.length)
    throw new Error("Victory Monument has no public road approach");
  l.accessNode = eligible.reduce((best, n) =>
    Math.hypot(n.x - target.x, n.z - target.z) <
    Math.hypot(best.x - target.x, best.z - target.z)
      ? n
      : best,
  ).id;
}

/** The walk carries pedestrians above the roads. Its columns deliberately skip
 * all four road approaches; these solids are shared with the rendered model. */
export function victorySkywalkColumns(): Obstacle[] {
  const start = 0.32,
    end = Math.PI * 2 - 0.32,
    columns: Obstacle[] = [];
  const ring = victoryRingPoints(),
    nearest = (p: Point) =>
      ring.reduce((best, q) =>
        Math.hypot(q.x - p.x, q.z - p.z) <
        Math.hypot(best.x - p.x, best.z - p.z)
          ? q
          : best,
      );
  const outer = [
    mapPoint(725, 145),
    mapPoint(680, 340),
    mapPoint(570, 230),
    mapPoint(825, 230),
  ];
  const legs = outer.map((p) => ({ a: p, b: nearest(p) }));
  for (let i = 0; i < 46; i += 3) {
    const a = start + ((end - start) * (i + 0.5)) / 46;
    const p = {
      x: VICTORY_SITE.center.x + Math.sin(a) * VICTORY_SITE.skywalkRadius,
      z: VICTORY_SITE.center.z + Math.cos(a) * VICTORY_SITE.skywalkRadius,
    };
    if (legs.some((l) => distanceToSegment(p, l.a, l.b).distance < 13))
      continue;
    columns.push({
      ...p,
      w: 1.1,
      d: 1.1,
      height: 8.4,
      color: "#aeb3a9",
      environmentId: `victory-skywalk:${i}`,
    });
  }
  return columns;
}

/** Authored, paved bus interchange apron outside the live traffic ring. */
export function victoryPublicGround(p: Point) {
  const r = Math.hypot(
    p.x - VICTORY_SITE.center.x,
    p.z - VICTORY_SITE.center.z,
  );
  return r >= 79 && r <= 104;
}
export function victoryShelters() {
  const ring = victoryRingPoints(),
    nearest = (p: Point) =>
      ring.reduce((a, b) =>
        Math.hypot(a.x - p.x, a.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z)
          ? a
          : b,
      );
  const outer = [
    mapPoint(725, 145),
    mapPoint(680, 340),
    mapPoint(570, 230),
    mapPoint(825, 230),
  ];
  return Array.from({ length: 8 }, (_, i) => {
    const yaw = 0.25 + (i * Math.PI) / 4;
    return {
      x: VICTORY_SITE.center.x + Math.sin(yaw) * 95,
      z: VICTORY_SITE.center.z + Math.cos(yaw) * 95,
      yaw,
    };
  }).filter((p) =>
    outer.every((a) => distanceToSegment(p, a, nearest(a)).distance > 20),
  );
}
export function victoryShelterCollisions(): Obstacle[] {
  return victoryShelters().flatMap((p, i) =>
    [-1, 1].map((side) => ({
      x: p.x + Math.cos(p.yaw) * side * 4,
      z: p.z - Math.sin(p.yaw) * side * 4,
      w: 0.45,
      d: 0.45,
      height: 3.4,
      color: "#7c9b86",
      environmentId: `victory-bus-stop:${i}:${side}`,
    })),
  );
}
