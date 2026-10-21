import {curtain,entrance,planter as gardenBox,palm as gardenPalm} from './heroCraft';
import * as T from "three";
import { LandmarkBuilder } from "./landmarkBuilder";
import { siteMasses, type SiteMass } from "./authoredSites";
import type { RealPlace } from "./realPlaces";
import { thaiRoof } from "./templeCraft";

type B = LandmarkBuilder;
const IVORY = "#e9e3cf",
  GLASS = "#466c7c",
  STONE = "#b9ad91",
  GOLD = "#cbaa61";
const box = (b: B, m: SiteMass, c: string) =>
  b.box(m.x, m.h / 2, m.z, m.w, m.h, m.d, c, m.yaw ?? 0);
function plant(b: B, x: number, z: number, h = 5, y = 0) {
  b.sculpt(
    new T.CylinderGeometry(0.14, 0.25, h * 0.72, 5),
    x,
    y + h * 0.36,
    z,
    "#8d6946",
  );
  for (const [dx, dz, scale, c] of [
    [0, 0, 1, "#46996a"],
    [1, 0.3, 0.7, "#67aa67"],
    [-0.7, -0.8, 0.65, "#34865d"],
  ] as const)
    b.sculpt(
      new T.IcosahedronGeometry(h * 0.36 * scale, 0).scale(1, 1.1, 1),
      x + dx,
      y + h * 0.8,
      z + dz,
      c,
    );
}
function palm(b: B, x: number, z: number, h = 7) {
  b.sculpt(new T.CylinderGeometry(0.15, 0.3, h, 5), x, h / 2, z, "#967b51");
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3,
      g = new T.ConeGeometry(0.8, 4.8, 3)
        .rotateZ(-Math.PI / 2 + 0.22)
        .rotateY(a);
    b.sculpt(
      g,
      x + Math.cos(a) * 1.5,
      h - 0.3,
      z - Math.sin(a) * 1.5,
      i % 2 ? "#479764" : "#77ae68",
    );
  }
}
function pool(b: B, x: number, z: number, w: number, d: number) {
  b.box(x, 0.22, z, w + 2, 0.35, d + 2, "#d3c8a7");
  b.box(x, 0.42, z, w, 0.08, d, "#459caa");
  for (const side of [-1, 1])
    b.box(x + side * (w / 2 + 0.6), 0.52, z, 0.4, 0.12, d + 1, "#f1dfb7");
}
function terrace(
  b: B,
  x: number,
  z: number,
  w: number,
  d: number,
  detail: boolean,
) {
  b.box(x, 0.12, z, w, 0.2, d, "#c6b99a");
  if (detail) {
    for (let u = x - w / 2 + 3; u < x + w / 2; u += 7) {
      b.box(u, 0.28, z, 2, 0.25, 2, "#dfd3b5");
      b.roof(u, 3.6, z, 4, 4, 1, "#e9d6a7");
      for (const dx of [-1, 1])
        b.box(u + dx, 0.65, z + 0.9, 0.9, 0.45, 0.9, "#9b7559");
    }
  }
}
function wing(
  b: B,
  m: SiteMass,
  detail: boolean,
  c = IVORY,
  balconies = false,
) {
  box(b, m, c);
  const floors = Math.max(2, Math.round(m.h / 3.2)),
    step = detail ? 1 : 2;
  for (const side of [-1, 1]) {
    b.box(
      m.x,
      m.h * 0.51,
      m.z + side * (m.d / 2 + 0.03),
      m.w - 1,
      m.h - 2,
      0.15,
      GLASS,
    );
    for (let f = 1; f < floors; f += step) {
      const y = (f * m.h) / floors;
      b.box(
        m.x,
        y,
        m.z + side * (m.d / 2 + 0.2),
        m.w + 0.4,
        0.25,
        balconies ? 1.8 : 0.5,
        c,
      );
      if (balconies)
        b.box(
          m.x,
          y + 0.75,
          m.z + side * (m.d / 2 + 1),
          m.w,
          0.12,
          0.15,
          "#d0d4c8",
        );
      if (detail)
        for (let x = m.x - m.w / 2 + 2; x < m.x + m.w / 2 - 1; x += 3.8) {
          b.box(x, y + 1.3, m.z + side * (m.d / 2 + 0.2), 0.18, 2.5, 0.4, c);
          if ((Math.round(x * 7) + f * 3) % 11 === 0)
            b.box(
              x + 1.1,
              y + 1.2,
              m.z + side * (m.d / 2 + 0.14),
              1.2,
              1.2,
              0.06,
              "#edc887",
              0,
              true,
            );
        }
    }
    b.box(
      m.x + side * (m.w / 2 + 0.03),
      m.h / 2,
      m.z,
      0.14,
      m.h - 2,
      m.d - 1,
      GLASS,
    );
    if (detail)
      for (let f = 1; f < floors; f++)
        b.box(
          m.x + side * (m.w / 2 + 0.2),
          (f * m.h) / floors,
          m.z,
          0.45,
          0.2,
          m.d + 0.3,
          c,
        );
  }
  b.box(m.x, m.h + 0.25, m.z, m.w + 0.6, 0.5, m.d + 0.6, c);
}
function canopy(b: B, w: number, z: number, detail: boolean) {
  b.box(0, 5.6, z, w, 0.5, 8, IVORY);
  b.box(0, 5.3, z, w - 1, 0.07, 7, "#efc991", 0, true);
  for (const x of [-w * 0.42, w * 0.42])
    b.sculpt(new T.CylinderGeometry(0.32, 0.42, 5.4, 8), x, 2.7, z - 1, STONE);
  if (detail) for (const x of [-w * 0.55, w * 0.55]) plant(b, x, z, 4);
}
/** Closed-plan extrusion with genuine court/light-well voids. */
function roundPlan(w: number, d: number, r: number) {
  const s = new T.Shape();
  s.moveTo(-w / 2 + r, -d / 2);
  s.lineTo(w / 2 - r, -d / 2);
  s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  s.lineTo(w / 2, d / 2 - r);
  s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  s.lineTo(-w / 2 + r, d / 2);
  s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  s.lineTo(-w / 2, -d / 2 + r);
  s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  return s;
}
function extrusion(
  b: B,
  s: T.Shape,
  x: number,
  y: number,
  z: number,
  h: number,
  color: string,
  detail: boolean,
  finish: "glass" | "ceramic" = "ceramic",
) {
  b.sculpt(
    new T.ExtrudeGeometry(s, {
      depth: h,
      bevelEnabled: false,
      curveSegments: detail ? 10 : 4,
    }).rotateX(-Math.PI / 2),
    x,
    y,
    z,
    color,
    finish,
  );
}
/** A continuous curved architectural band, with thickness and capped ends.
 * Avoids dozens of visibly independent rectangular slices at every floor. */
function ribbon(
  b: B,
  points: number[][],
  width: number,
  depth: number,
  c: string,
  detail: boolean,
) {
  const curve = new T.CatmullRomCurve3(
      points.map((p) => new T.Vector3(...(p as [number, number, number]))),
    ),
    count = detail ? 64 : 24,
    vertices: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= count; i++) {
    const p = curve.getPoint(i / count),
      t = curve.getTangent(i / count),
      normal = new T.Vector3(-t.y, t.x, 0)
        .normalize()
        .multiplyScalar(width / 2);
    for (const [a, z] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ])
      vertices.push(
        p.x + normal.x * a!,
        p.y + normal.y * a!,
        p.z + (z! * depth) / 2,
      );
    if (i < count)
      for (let j = 0; j < 4; j++) {
        const a = i * 4 + j,
          q = i * 4 + ((j + 1) % 4);
        indices.push(a, q, a + 4, q, q + 4, a + 4);
      }
  }
  indices.push(
    0,
    2,
    1,
    0,
    3,
    2,
    count * 4,
    count * 4 + 1,
    count * 4 + 2,
    count * 4,
    count * 4 + 2,
    count * 4 + 3,
  );
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  b.sculpt(g, 0, 0, 0, c);
}

function oriental(b: B, detail: boolean, p: RealPlace) {
  const [river, garden, authors, restaurant] = siteMasses(p);
  // Faceted bay glazing: a repeated shallow saw-tooth elevation, cream vertical
  // frames and a quiet slab crown, rather than a flat generic glass office wall.
  box(b, river!, "#ddd9c9");
  for (let i = 0; i < 10; i++) {
    const x = -48.6 + i * 6.8;
    const plan = new T.Shape([
      new T.Vector2(-3.35, 0),
      new T.Vector2(0, -2),
      new T.Vector2(3.35, 0),
      new T.Vector2(3.35, 2),
      new T.Vector2(-3.35, 2),
    ]);
    extrusion(b, plan, x, 1, 2, 47, "#547c88", detail, "glass");
    b.box(x - 3.3, 24.5, 2.35, 0.45, 49, 0.8, IVORY);
    b.box(x, 24.5, 4.15, 0.18, 47, 0.2, IVORY);
    for (let f = 1; f < 15; f += detail ? 1 : 2)
      extrusion(b, plan, x, 1 + f * 3.2, 2.2, 0.22, IVORY, detail);
    if (detail)
      for (const f of [3, 7, 11])
        if ((i + f) % 3 === 0)
          b.box(x, 2 + f * 3.2, 4.2, 1.2, 1, 0.05, "#edca91", 0, true);
  }
  // Both rear and ends receive a physical facade; the road approach matters.
  b.box(-18, 25, -25.56, 67, 47, 0.12, GLASS);
  if (detail)
    for (let x = -49; x < 16; x += 4)
      b.box(x, 25, -25.75, 0.2, 47, 0.25, IVORY);
  for (const side of [-1, 1])
    for (let f = 1; f < 15; f += detail ? 1 : 2)
      b.box(-18, 1 + f * 3.2, -25.6, 67, 0.2, 0.3, STONE);
  for (const x of [-51.8, 15.8]) {
    b.box(x, 25, -12, 0.3, 47, 25, GLASS);
    if (detail)
      for (let f = 1; f < 15; f++)
        b.box(x, 1 + f * 3.2, -12, 0.5, 0.2, 26, IVORY);
  }
  b.box(-18, 49.5, -12, 69, 1, 28, IVORY);
  wing(b, garden!, detail, "#ebe1c7", true);
  box(b, authors!, "#f0e6d0");
  b.roof(30, 12, 23, 42, 27, 5, "#69776d");
  const pediment = new T.Shape([
    new T.Vector2(-7, 0),
    new T.Vector2(-7, 2),
    new T.Vector2(-5, 2),
    new T.Vector2(-5, 4),
    new T.Vector2(-2, 4),
    new T.Vector2(-2, 6),
    new T.Vector2(2, 6),
    new T.Vector2(2, 4),
    new T.Vector2(5, 4),
    new T.Vector2(5, 2),
    new T.Vector2(7, 2),
    new T.Vector2(7, 0),
  ]);
  b.sculpt(
    new T.ExtrudeGeometry(pediment, { depth: 0.5, bevelEnabled: false }),
    30,
    10,
    35.8,
    IVORY,
  );
  for (let x = 12; x < 49; x += 4.8) {
    const arch = new T.Shape();
    arch.moveTo(-1.4, 0);
    arch.lineTo(-1.4, 2.2);
    arch.absarc(0, 2.2, 1.4, Math.PI, 0, true);
    arch.lineTo(1.4, 0);
    arch.closePath();
    b.sculpt(
      new T.ExtrudeGeometry(arch, {
        depth: 0.2,
        bevelEnabled: false,
        curveSegments: detail ? 8 : 3,
      }),
      x,
      5.5,
      35.65,
      "#62978d",
      "glass",
    );
    b.sculpt(
      new T.ExtrudeGeometry(arch, {
        depth: 0.18,
        bevelEnabled: false,
        curveSegments: detail ? 8 : 3,
      }),
      x,
      0.6,
      35.65,
      "#829b83",
      "glass",
    );
    if (detail)
      for (const side of [-1, 1])
        b.box(x + side * 1.75, 7, 35.8, 0.55, 3, 0.25, "#889878");
    b.sculpt(new T.CylinderGeometry(0.24, 0.32, 5.2, 8), x, 2.6, 36.3, IVORY);
  }
  for (const y of [5.1, 9.8]) b.box(30, y, 35.9, 40, 0.3, 0.5, IVORY);
  for (const x of [13, 47]) plant(b, x, 10, 5);
  wing(b, restaurant!, detail, "#d9cbb0");
  b.roof(-25, 6, 29, 46, 17, 3, "#6b7b70");
  terrace(b, -25, 44, 48, 10, detail);
  pool(b, 9, 20, 10, 18);
  entrance(b,20,-34.6,detail);
  curtain(b,-18,25,-25.8,66,46,detail,Math.PI,20,14);
  for(const x of [-13,13])gardenBox(b,x,-35,4,4,detail);
  for(const x of [-43,-28,-13]){gardenBox(b,x,46,5,4,detail);gardenPalm(b,x,46,5,detail);}
  if(detail)for(const x of [15,25,35,45])for(const y of [7,11]){b.box(x-1.2,y,36.05,.8,2,.15,'#597361');b.box(x+1.2,y,36.05,.8,2,.15,'#597361');}
}
function shangri(b: B, detail: boolean, p: RealPlace) {
  const [main, krung, pav1, pav2] = siteMasses(p);
  // A round-ended, continuous hotel elevation contrasts with the deeply
  // balconied rectilinear Krungthep wing. The outer bands project beyond glass.
  extrusion(
    b,
    roundPlan(69, 26, 5),
    -24,
    0,
    -10,
    77,
    "#557986",
    detail,
    "glass",
  );
  for (let y = 3; y < 77; y += detail ? 3.25 : 6.5) {
    extrusion(b, roundPlan(70, 27, 5), -24, y, -10, 0.3, "#e2d5bb", detail);
    if (detail)
      for (const x of [-49, -33, -17, -1])
        if ((Math.round(y) + x) % 3 === 0)
          b.box(x, y + 1.1, 3.1, 2.4, 1.6, 0.12, "#edc78e", 0, true);
  }
  wing(b, siteMasses(p)[4]!, detail, "#c9b99c");
  // Chamfered ends and upper setbacks distinguish the broad main hotel from
  // the much lower, deep-balconied Krungthep Wing beside Saphan Taksin.
  for (let i = 0; i < 4; i++)
    b.box(-24, 77.5 + i * 0.7, -10, 70 - i * 4, 0.7, 27 - i * 1.8, IVORY);
  for (const x of [-55, -47, -39, -31, -23, -15, -7, 1, 9])
    b.box(x, 39, 3.4, 0.65, 74, 1.2, "#e7dcc2");
  wing(b, krung!, detail, "#e4d6bd", true);
  b.box(43, 48, -3, 24.5, 0.7, 34.5, IVORY);
  for (const m of [pav1!, pav2!]) {
    box(b, { ...m, h: 4 }, "#af7b53");
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        b.box(
          m.x + x * (m.w / 2 - 1),
          3.8,
          m.z + z * (m.d / 2 - 1),
          0.3,
          7,
          0.3,
          IVORY,
        );
    thaiRoof(b, m.x, 6, m.z, m.w + 1, m.d + 1, 3.4, "#9a5942", detail);
  }
  pool(b, -8, 18, 20, 12);
  terrace(b, -26, 39, 54, 5, detail);
  for (const x of [-52, 22, 53]) palm(b, x, 25, 7);
  canopy(b, 26, -35, detail);
}
function fourSeasons(b: B, detail: boolean, p: RealPlace) {
  for (const m of siteMasses(p)) {
    wing(
      b,
      m,
      detail,
      m.name === "Palm Courtyard" ? "#c8bca1" : "#bfb4a0",
      true,
    );
    b.box(m.x, m.h + 0.55, m.z, m.w, 0.4, m.d, "#6d9875");
    if (detail && m.name.includes("terrace"))
      for (const z of [-4, 4]) plant(b, m.x, m.z + z, 3, m.h + 0.7);
  }
  // Cascade terraces step towards the water; each court is physically open.
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const x = side * 75,
        z = 11 + i * 6,
        y = 28 - i * 5;
      b.box(x, y, z, 21, 0.45, 8, IVORY);
      b.box(x, y + 0.35, z, 17, 0.25, 6, "#67916d");
    }
  pool(b, -17, 7, 20, 20);
  pool(b, 17, 7, 20, 20);
  b.box(0, 0.3, 9, 6, 0.5, 33, "#d8c9a7");
  for (const x of [-32, 0, 32]) palm(b, x, 18, 7);
  terrace(b, 0, 40, 162, 5, detail);
  canopy(b, 27, -36, detail);
}
function capella(b: B, detail: boolean, p: RealPlace) {
  for (const m of siteMasses(p)) {
    wing(b, m, detail, "#d7d1be", true);
    if (m.name.startsWith("villa")) {
      b.box(m.x, 6.7, m.z, m.w + 1, 0.6, m.d + 1, IVORY);
      pool(b, m.x, m.z + 9, 11, 3.5);
    }
  }
  pool(b, -17, 7, 23, 12);
  b.box(15, 0.4, 7, 22, 0.6, 15, "#6a986a");
  for (const x of [-29, 8, 29]) palm(b, x, 9, 6);
  canopy(b, 27, -30, detail);
}
function embassy(b: B, detail: boolean) {
  const plan = roundPlan(95, 65, 18),
    well = new T.Path();
  well.absellipse(-8, 0, 18, 11, 0, Math.PI * 2, true);
  plan.holes.push(well);
  extrusion(b, plan, 0, 0, 0, 22, "#d8ded6", detail);
  // Continuous podium skin: long smooth silver curves around real open atrium.
  for (const y of [5, 12, 19])
    extrusion(b, roundPlan(95.5, 65.5, 18), 0, y, 0, 0.35, "#eef0e2", detail);
  // Upper hotel is a rounded, tapering volume. Glass bands wrap the complete
  // plan rather than appearing only as a front billboard.
  for (let i = 0; i < 23; i++) {
    const t = i / 22,
      w = 34 - 4 * t,
      d = 43 - 9 * t;
    extrusion(
      b,
      roundPlan(w, d, Math.min(w, d) * 0.4),
      25,
      23 + i * 3.4,
      -4,
      3.35,
      i % 4 === 0 ? "#557b85" : "#345c6b",
      detail,
      "glass",
    );
    extrusion(
      b,
      roundPlan(w + 0.5, d + 0.5, Math.min(w, d) * 0.4),
      25,
      26.3 + i * 3.4,
      -4,
      0.2,
      IVORY,
      detail,
    );
  }
  // The white loop climbs from the retail plinth, over the tower and down its
  // opposite side. A central crown opening remains clear against the skyline.
  ribbon(
    b,
    [
      [-45, 20, 19],
      [-28, 22, 28],
      [-8, 25, 27],
      [7, 42, 23],
      [19, 76, 20],
      [32, 112, 13],
      [39, 115, -2],
    ],
    8,
    1.5,
    "#e5e7dc",
    detail,
  );
  ribbon(
    b,
    [
      [39, 115, -2],
      [40, 102, -20],
      [37, 73, -25],
      [33, 45, -27],
      [18, 24, -28],
      [-10, 22, -30],
    ],
    6,
    1.4,
    "#d6ded7",
    detail,
  );
  // Tall crown light well is framed, not filled with another solid glass box.
  b.box(25, 103, -4, 26, 0.8, 27, "#697d73");
  plant(b, 25, -4, 3, 103.5);
  for (const z of [-1, 8]) {
    b.box(-8, 22.3, z, 25, 0.4, 2, "#798d75");
    if (detail) for (const x of [-18, -2]) plant(b, x, z, 2.6, 22.5);
  }
  // Street-level retail openings and curved entrance canopy.
  b.box(-18, 7, 32.6, 33, 11, 0.2, GLASS);
  b.box(25, 7, 29.7, 24, 10, 0.2, GLASS);
  canopy(b, 25, -32, detail);
  if (detail)
    for (let x = -42; x < 43; x += 4)
      b.box(x, 3, -32.6, 2.2, 4, 0.18, "#d3af6e", 0, true);
}
function dusit(b: B, detail: boolean, p: RealPlace) {
  const [hotel, office, retail] = siteMasses(p);
  wing(b, hotel!, detail, "#bba579");
  wing(b, office!, detail, "#77999b");
  box(b, retail!, "#c6c4ae");
  // Rebuilt hotel: projecting park-facing bays and the restored golden spire.
  for (let i = 0; i < 6; i++) {
    const x = -38 + i * 5.5;
    const profile = new T.Shape([
      new T.Vector2(-2.6, -1.6),
      new T.Vector2(0, 0),
      new T.Vector2(2.6, -1.6),
      new T.Vector2(2.6, -3),
      new T.Vector2(-2.6, -3),
    ]);
    extrusion(b, profile, x, 12, -17, 96, "#527e86", detail, "glass");
    b.box(x - 2.6, 61, -17.6, 0.3, 97, 0.5, GOLD);
  }
  for (let i = 0; i < 4; i++)
    b.box(-24, 111 + i * 1.2, 0, 35 - i * 5, 1.2, 34 - i * 5, GOLD);
  b.sculpt(
    new T.CylinderGeometry(0.08, 1.9, 26, 8),
    -24,
    128,
    0,
    "#e9c76c",
    "gilded",
  );
  for (let i = 0; i < 3; i++) {
    b.box(4, 15 + i * 2, 23, 81 - i * 12, 1, 23 - i * 3, IVORY);
    b.box(4, 15.7 + i * 2, 23, 78 - i * 12, 0.3, 20 - i * 3, "#679b70");
  }
  if (detail) for (const x of [-28, 0, 28]) plant(b, x, 24, 4, 19.5);
  canopy(b, 25, -29, detail);
}
function oneBangkok(b: B, detail: boolean, p: RealPlace) {
  for (const [i, m] of siteMasses(p).entries()) {
    if (i === 0) {
      wing(b, m, detail, "#bfc9c0", true);
      for (const x of [-1, 1])
        b.box(m.x + x * 13, m.h / 2, m.z, 1.2, m.h, 33, "#dee3d4");
      b.box(m.x, 127, m.z, 28, 2, 32, IVORY);
    } else if (i < 3) {
      extrusion(
        b,
        roundPlan(m.w, m.d, 7),
        m.x,
        0,
        m.z,
        m.h,
        i === 1 ? "#416d7c" : "#6c9399",
        detail,
        "glass",
      );
      for (let y = 5; y < m.h; y += detail ? 3.3 : 6.6)
        extrusion(
          b,
          roundPlan(m.w + 0.2, m.d + 0.2, 7),
          m.x,
          y,
          m.z,
          0.18,
          "#9aafb0",
          detail,
        );
      for (const x of [-1, 1])
        b.box(m.x + x * m.w * 0.42, m.h / 2, m.z, 1.2, m.h, m.d, "#c6d2c8");
    } else {
      wing(b, m, detail, "#c4ad89");
      b.box(m.x, m.h + 0.4, m.z, m.w, 0.5, m.d, "#68946a");
    }
  }
  b.box(0, 0.18, 1, 24, 0.3, 18, "#b4bca9");
  pool(b, 2, -1, 10, 4);
  for (const x of [-16, 17]) {
    for (const z of [-1, 10]) plant(b, x, z, 5);
    b.box(x, 4, 7, 1, 8, 1, IVORY);
    b.box(x, 8, 7, 7, 0.35, 12, IVORY);
  }
  // Wireless House context: small gabled pavilion, not a copied artwork.
  b.box(25, 2, -32, 10, 4, 9, "#e0d3b5");
  b.roof(25, 4, -32, 12, 11, 3, "#7b674f");
  canopy(b, 22, -43, detail);
}
function okura(b: B, detail: boolean, p: RealPlace) {
  const plan = new T.Shape([
    new T.Vector2(-19, -12),
    new T.Vector2(-13, -16),
    new T.Vector2(14, -16),
    new T.Vector2(19, -10),
    new T.Vector2(19, 10),
    new T.Vector2(12, 16),
    new T.Vector2(-14, 16),
    new T.Vector2(-19, 10),
  ]);
  extrusion(b, plan, 0, 0, -4, 110, "#497b86", detail, "glass");
  for (let y = 4; y < 110; y += detail ? 3.1 : 6.2)
    extrusion(b, plan, 0, y, -4, 0.24, "#a6bbb6", detail);
  for (const x of [-18, -9, 0, 9, 18])
    b.box(x, 55, 12.2, 0.55, 110, 0.4, IVORY);
  extrusion(b, roundPlan(37, 25, 11), 0, 74, 25, 2.8, "#d6d9cb", detail);
  b.box(0, 77, 24, 30, 0.2, 13, "#57a7b0");
  for (const side of [-1, 1])
    ribbon(
      b,
      [
        [side * 17, 4, 12.4],
        [side * -17, 108, 12.4],
      ],
      0.35,
      0.2,
      "#bfcac0",
      detail,
    );
  b.sculpt(
    new T.ConeGeometry(3.5, 5, 4).scale(1, 1, 3),
    -11,
    112,
    -4,
    "#d8ded0",
  ); // Elevated hotel infinity pool
  b.box(0, 76.8, 18, 30, 0.1, 4, "#61b0b8");
  b.box(0, 112, -4, 36, 2, 30, IVORY);
  const podium = siteMasses(p)[1]!;
  wing(b, podium, detail, "#d9d2b8");
  canopy(b, 23, 24, detail);
  for (const x of [-22, 22]) plant(b, x, 18, 5);
}
function anantara(b: B, detail: boolean, p: RealPlace) {
  for (const m of siteMasses(p)) {
    wing(b, m, detail, "#cbb595", true);
    thaiRoof(b, m.x, m.h + 0.2, m.z, m.w + 2, m.d + 2, 4.5, "#815540", detail);
  }
  pool(b, 0, 3, 37, 25);
  b.box(0, 0.2, 19, 30, 0.3, 6, "#d8bc8b");
  for (const x of [-25, 25]) for (const z of [-16, 8, 23]) palm(b, x, z, 7.5);
  terrace(b, 0, 37, 40, 8, detail);
  canopy(b, 24, -37, detail);
}
const builders: Record<string, (b: B, detail: boolean, p: RealPlace) => void> =
  {
    oriental,
    shangri,
    "four-seasons": fourSeasons,
    capella,
    embassy,
    dusit,
    "one-bangkok": oneBangkok,
    okura,
    anantara,
  };
export function buildHeroArchitecture(p: RealPlace, detail: boolean) {
  const make = builders[p.id];
  if (!make) return;
  const b = new LandmarkBuilder();
  make(b, detail, p);
  return b.finish(`real-${p.id}-reconstructed-v2-${detail ? "near" : "far"}`);
}
