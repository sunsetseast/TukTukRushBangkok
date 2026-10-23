import fs from "node:fs";
import type * as clipping from "polygon-clipping";
import { integerBoolean } from "./integer-road-clipping";
import type { District } from "../src/game/types";
import {
  CHINATOWN_PLAN,
  chinatownPoint,
} from "../src/game/bangkok/chinatownPlan";
import { roadGraphKey } from "../src/game/bangkok/roadIdentity";
import { prepareLandmarkParcels } from "../src/game/bangkok/landmarkParcels";
const root = new URL(
  "../../../docs/qa/chinatown-reconstruction/",
  import.meta.url,
);
const d = JSON.parse(
  fs.readFileSync(new URL("after-world.json", root), "utf8"),
) as District;
const nodes = new Map(d.nodes.map((n) => [n.id, n]));
const ring = CHINATOWN_PLAN.boundary.map((p) => {
  const q = chinatownPoint(p);
  return [q.x, q.z] as [number, number];
});
ring.push(ring[0]!);
const ribbons: clipping.Polygon[] = [];
for (const r of d.roads) {
  const a = nodes.get(r.a)!,
    b = nodes.get(r.b)!;
  if (
    Math.max(a.x, b.x) < -570 ||
    Math.min(a.x, b.x) > 600 ||
    Math.max(a.z, b.z) < -530 ||
    Math.min(a.z, b.z) > 900
  )
    continue;
  const yaw = Math.atan2(b.z - a.z, b.x - a.x),
    radius = r.width / 2 + 6.2,
    pts: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const angle = yaw - Math.PI / 2 + (i * Math.PI) / 8;
    pts.push([b.x + Math.cos(angle) * radius, b.z + Math.sin(angle) * radius]);
  }
  for (let i = 0; i <= 8; i++) {
    const angle = yaw + Math.PI / 2 + (i * Math.PI) / 8;
    pts.push([a.x + Math.cos(angle) * radius, a.z + Math.sin(angle) * radius]);
  }
  pts.push(pts[0]!);
  ribbons.push([pts]);
}
for (const p of prepareLandmarkParcels(d)) {
  const ps = p.boundary.map((p) => [p.x, p.z] as [number, number]);
  ps.push(ps[0]!);
  ribbons.push([ps]);
}
const barriers = integerBoolean(ribbons),
  water = [
    d.riverPolygon!.map((r) => {
      const p = r.map((p) => [p.x, p.z] as [number, number]);
      if (p[0]![0] !== p.at(-1)![0] || p[0]![1] !== p.at(-1)![1]) p.push(p[0]!);
      return p;
    }),
  ];
const polygons = integerBoolean(
  integerBoolean([[ring]], barriers, true),
  water,
  true,
);
const data = {
  version: CHINATOWN_PLAN.version,
  roadKey: roadGraphKey(d),
  method:
    "approved district polygon minus final road+sidewalk ribbons, protected plots and authoritative river; ODbL derived control plan",
  polygons,
};
fs.writeFileSync(
  new URL(
    "../src/game/bangkok/chinatownBlocks.generated.json",
    import.meta.url,
  ),
  JSON.stringify(data) + "\n",
);
console.log({ roadKey: data.roadKey, polygons: polygons.length });
