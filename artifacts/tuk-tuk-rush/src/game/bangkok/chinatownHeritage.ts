import * as T from "three";
import type { District, Landmark } from "../types";
import { chinatownPoint } from "./chinatownPlan";
import { LandmarkBuilder } from "./landmarkBuilder";
export const CHINATOWN_HERITAGE = [
  {
    id: "wat-mangkon",
    name: "Wat Mangkon Kamalawat",
    kind: "temple" as const,
    design: [487, 480],
    w: 64,
    d: 56,
    yaw: 0,
    source: "https://www.openstreetmap.org/way/301157259",
    character:
      "Chinese courtyard temple, red columns, tiled sweeping roof and ceramic ridge ornaments",
  },
  {
    id: "holy-rosary",
    name: "Holy Rosary Church",
    kind: "church" as const,
    design: [436, 774],
    w: 32,
    d: 46,
    yaw: -Math.PI / 2,
    source: "https://www.openstreetmap.org/way/245676490",
    character:
      "Gothic Revival church, pale nave, pointed arches, rose window and central spire",
  },
];
/** Reserve the actual masses BEFORE every parcel generator. Public courtyards
 * are non-solid reservations in landmarkParcels, never invisible blockers. */
export function registerChinatownHeritage(d: District) {
  for (const h of CHINATOWN_HERITAGE) {
    const p = chinatownPoint(h.design),
      corridor = h.id === "wat-mangkon" ? "charoen_n" : "wanit-2-south",
      ids = new Set(
        d.roads
          .filter((r) => r.corridor === corridor)
          .flatMap((r) => [r.a, r.b]),
      ),
      eligible = d.nodes.filter((n) => ids.has(n.id)),
      target = { x: p.x, z: p.z + (h.id === "wat-mangkon" ? 40 : 0) },
      near = eligible.reduce((a, b) =>
        Math.hypot(a.x - target.x, a.z - target.z) <
        Math.hypot(b.x - target.x, b.z - target.z)
          ? a
          : b,
      );
    d.landmarks.push({
      ...p,
      id: h.id,
      name: h.name,
      kind: h.kind,
      plot: p,
      size: Math.max(h.w, h.d),
      yaw: h.yaw,
      accessNode: near.id,
    });
    if (h.id === "wat-mangkon")
      for (const m of [
        { x: 0, z: -7, w: 44, d: 26, height: 17 },
        { x: -27, z: 0, w: 9, d: 49, height: 11 },
        { x: 27, z: 0, w: 9, d: 49, height: 11 },
        { x: -20, z: 22, w: 20, d: 8, height: 30 },
        { x: 20, z: 22, w: 20, d: 8, height: 30 },
      ])
        d.obstacles.push({
          x: p.x + m.x,
          z: p.z + m.z,
          w: m.w,
          d: m.d,
          height: m.height,
          color: "#ae7656",
          landmarkId: h.id,
          protected: true,
        });
    else
      d.obstacles.push({
        ...p,
        w: h.w,
        d: h.d,
        height: 36,
        yaw: h.yaw,
        color: "#dfd3b5",
        landmarkId: h.id,
        protected: true,
      });
  }
}
function arch(width: number, height: number, depth: number) {
  const shape = new T.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(-width / 2, height * 0.63);
  shape.quadraticCurveTo(-width * 0.35, height * 0.85, 0, height);
  shape.quadraticCurveTo(width * 0.35, height * 0.85, width / 2, height * 0.63);
  shape.lineTo(width / 2, 0);
  shape.closePath();
  return new T.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 4,
  }).translate(0, 0, -depth / 2);
}
function make(l: Landmark, detail: boolean) {
  const b = new LandmarkBuilder();
  if (l.id === "wat-mangkon") {
    b.box(0, 0.3, 0, 63, 0.6, 55, "#b9aa91");
    for (const [x, z, w, d, h] of [
      [0, -7, 44, 26, 10],
      [-27, 0, 9, 49, 7],
      [27, 0, 9, 49, 7],
    ]) {
      b.box(x!, h! / 2, z!, w!, h!, d!, "#d2ad80");
      b.roof(x!, h!, z!, w! + 1.5, d! + 2, 5.5, "#896344");
      b.roof(x!, h! + 3.4, z!, w! * 0.8, d! * 0.86, 4, "#9b764b");
      for (let u = -w! / 2 + 2; u < w! / 2; u += 4.5) {
        b.box(x! + u, 3.5, z! + d! / 2 + 0.12, 0.55, 7, 0.6, "#9d302c");
        b.box(x! + u + 1.6, 4, z! + d! / 2 + 0.1, 2.2, 4, 0.14, "#563c2e");
      }
      if (detail)
        for (let u = -w! / 2; u <= w! / 2; u += 2.3)
          b.sculpt(
            new T.SphereGeometry(0.38, 5, 3),
            x! + u,
            h! + 5.7,
            z!,
            "#bbae79",
            "ceramic",
          );
    }
    // TAT's documented tall Sino-Thai entrance block, with a sheltered central portal.
    for (const x of [-20, 20]) b.box(x, 15, 22, 20, 30, 8, "#c9af84");
    b.box(0, 18, 22, 20, 24, 8, "#d8c39b");
    for (let floor = 0; floor < 8; floor++) {
      const y = 6.3 + floor * 3;
      b.box(0, y - 1.2, 26.35, 60, 0.3, 0.7, "#e7d3a2");
      for (let x = -26; x <= 26; x += 6.5) {
        b.box(x, y, 26.15, 3.6, 1.8, 0.2, "#4a6559");
        b.box(x + 2.3, 17, 26.3, 0.45, 25, 0.5, "#9c4c35");
      }
    }
    b.roof(0, 30.5, 22, 62, 11, 3.5, "#786246");
    b.box(0, 5.8, 26.4, 13, 1.5, 0.45, "#76603c");
    for (const x of [-6, 6]) {
      b.box(x, 0.6, 11, 2.8, 1.2, 3, "#b4a17c");
      b.sculpt(
        new T.CylinderGeometry(1.3, 1, 1.8, 8),
        x,
        2,
        11,
        "#8e7653",
        "bronze",
      );
    }
  } else {
    b.box(0, 7, 0, 25, 14, 43, "#ddd3b8");
    b.roof(0, 14, 0, 28, 45, 8, "#6d6b60");
    b.box(0, 12, 18, 10, 24, 9, "#e4d9bf");
    b.sculpt(
      new T.ConeGeometry(6.3, 17, 4),
      0,
      31,
      18,
      "#626b64",
      "ceramic",
      Math.PI / 4,
    );
    b.box(0, 40.5, 18, 0.45, 4, 0.45, "#b4ac86");
    b.box(0, 41, 18, 2.8, 0.4, 0.4, "#b4ac86");
    b.sculpt(arch(4.5, 7.5, 0.22), 0, 0.6, 22.65, "#53483b", "ceramic");
    b.sculpt(
      new T.CylinderGeometry(2.2, 2.2, 0.25, detail ? 16 : 8).rotateX(
        Math.PI / 2,
      ),
      0,
      14.7,
      22.7,
      "#6b8d9a",
      "glass",
    );
    for (const side of [-1, 1])
      for (let z = -16; z <= 12; z += 7) {
        b.box(side * 12.8, 6.5, z, 0.9, 13, 1.2, "#c9bc9f");
        b.sculpt(
          arch(3.5, 7.5, 0.22).rotateY(Math.PI / 2),
          side * 12.66,
          4,
          z + 3,
          "#658389",
          "glass",
        );
        if (detail) {
          b.box(side * 12.82, 7.6, z + 3, 0.18, 6.3, 0.16, "#cfbd93");
          b.box(side * 12.82, 7.6, z + 3, 0.18, 0.18, 2.6, "#cfbd93");
        }
      }
    for (const side of [-1, 1])
      for (let z = -18; z < 20; z += 9)
        b.sculpt(
          new T.ConeGeometry(0.85, 3.6, 4),
          side * 13,
          16,
          z,
          "#c7bd9e",
          "ceramic",
          Math.PI / 4,
        );
  }
  return b.finish(l.id! + "-chinatown-v1");
}
export function chinatownHeritageArt(l: Landmark) {
  if (!CHINATOWN_HERITAGE.some((h) => h.id === l.id)) return undefined;
  const lod = new T.LOD();
  lod.addLevel(make(l, true), 0);
  lod.addLevel(make(l, false), 170);
  return lod;
}
