import * as T from "three";
import { LandmarkBuilder } from "./landmarkBuilder";

/** Local +Z is the public shopping frontage. Authored-site collision and parcel
 * reservations use these same conservative extents; distances are compressed. */
export const COMMERCIAL_DISTRICT_BOUNDS: Record<
  string,
  { w: number; d: number; height: number }
> = {
  mbk: { w: 120, d: 65, height: 35 },
  paragon: { w: 130, d: 90, height: 33 },
  central: { w: 140, d: 95, height: 45 },
  terminal: { w: 90, d: 80, height: 134 },
  "siam-center": { w: 150, d: 60, height: 32 },
};
type B = LandmarkBuilder;
const IVORY = "#e6e4db",
  DARK = "#344b50",
  GLASS = "#56868d",
  SILVER = "#b8c7c4";
function glass(
  b: B,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  c = GLASS,
  yaw = 0,
) {
  b.sculpt(new T.BoxGeometry(w, h, d), x, y, z, c, "glass", yaw);
}
function rounded(
  b: B,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  r: number,
  color: string,
  detail: boolean,
  finish: "ceramic" | "glass" = "ceramic",
  yaw = 0,
) {
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
  s.closePath();
  b.sculpt(
    new T.ExtrudeGeometry(s, {
      depth: h,
      bevelEnabled: false,
      curveSegments: detail ? 8 : 3,
    }).rotateX(-Math.PI / 2),
    x,
    y,
    z,
    color,
    finish,
    yaw,
  );
}
function bar(
  b: B,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  z: number,
  thickness: number,
  depth: number,
  color: string,
) {
  const dx = x2 - x1,
    dy = y2 - y1;
  const g = new T.BoxGeometry(thickness, Math.hypot(dx, dy), depth).rotateZ(
    -Math.atan2(dx, dy),
  );
  b.sculpt(g, (x1 + x2) / 2, (y1 + y2) / 2, z, color);
}
function arch(
  b: B,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  thickness: number,
  depth: number,
  color: string,
  detail: boolean,
) {
  const s = new T.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, Math.PI, 0, true);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2 - thickness, 0);
  s.lineTo(w / 2 - thickness, h - w / 2);
  s.absarc(0, h - w / 2, w / 2 - thickness, 0, Math.PI, false);
  s.lineTo(-w / 2 + thickness, 0);
  s.closePath();
  b.sculpt(
    new T.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: false,
      curveSegments: detail ? 10 : 4,
    }),
    x,
    y,
    z,
    color,
  );
}
const FONT: Record<string, string[]> = {
  A: ["01110", "11011", "11011", "11111", "11011", "11011", "11011"],
  B: ["11110", "11011", "11011", "11110", "11011", "11011", "11110"],
  C: ["01111", "11000", "11000", "11000", "11000", "11000", "01111"],
  D: ["11110", "11011", "11011", "11011", "11011", "11011", "11110"],
  E: ["11111", "11000", "11000", "11110", "11000", "11000", "11111"],
  G: ["01111", "11000", "11000", "11011", "11011", "11011", "01110"],
  I: ["111", "010", "010", "010", "010", "010", "111"],
  K: ["11011", "11010", "11100", "11100", "11010", "11011", "11011"],
  L: ["11000", "11000", "11000", "11000", "11000", "11000", "11111"],
  M: ["10001", "11011", "11111", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "11101", "10111", "10011", "10001", "10001"],
  O: ["01110", "11011", "11011", "11011", "11011", "11011", "01110"],
  P: ["11110", "11011", "11011", "11110", "11000", "11000", "11000"],
  R: ["11110", "11011", "11011", "11110", "11100", "11010", "11011"],
  S: ["01111", "11000", "11000", "01110", "00011", "00011", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "11111", "11011", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  "1": ["010", "110", "010", "010", "010", "010", "111"],
  "2": ["01110", "11011", "00011", "00110", "01100", "11000", "11111"],
};
/** Original small geometric lettering, batched with facade illumination. No
 * downloaded logo artwork, runtime fonts, texture request or new draw call. */
function lettering(
  b: B,
  name: string,
  x: number,
  y: number,
  z: number,
  width: number,
  color = IVORY,
) {
  const cells =
      name.split("").reduce((n, c) => n + (FONT[c]?.[0]?.length ?? 3) + 1, 0) -
      1,
    unit = width / cells;
  let cursor = x - width / 2;
  for (const c of name) {
    const glyph = FONT[c];
    if (glyph)
      for (let row = 0; row < 7; row++) {
        const line = glyph[row]!;
        for (let col = 0; col < line.length; ) {
          if (line[col] !== "1") {
            col++;
            continue;
          }
          let end = col + 1;
          while (line[end] === "1") end++;
          b.box(
            cursor + ((col + end) * unit) / 2,
            y + (3 - row) * unit,
            z,
            (end - col) * unit * 0.92,
            unit * 0.85,
            0.16,
            color,
            0,
            true,
          );
          col = end;
        }
      }
    cursor += ((glyph?.[0]?.length ?? 3) + 1) * unit;
  }
}
function planter(b: B, x: number, z: number, w: number, d: number, y = 0.4) {
  b.box(x, y, z, w, 0.8, d, "#8f9c87");
  b.box(x, y + 0.48, z, w - 0.4, 0.25, d - 0.4, "#4f8863");
}
function display(
  b: B,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  color: string,
) {
  b.box(x, y, z, w + 0.5, h + 0.5, 0.4, DARK);
  b.box(x, y, z + 0.25, w, h, 0.08, color, 0, true);
}

function mbk(b: B, detail: boolean) {
  // Long north/east commercial wing, sculpted rounded end caps and broad modern
  // horizontal aluminium ribbons replace the previous nearly square green box.
  rounded(b, 0, 0, -4, 118, 55, 31, 9, "#91aaa5", detail);
  for (const y of [4, 8, 12, 16, 20, 24, 28, 31])
    rounded(
      b,
      0,
      y,
      -4,
      119,
      56,
      0.42,
      9,
      y === 31 ? "#e3d8bb" : "#b9cbc1",
      detail,
    );
  glass(b, 0, 13.5, 23.8, 91, 20, 0.3, "#607f7e");
  for (const x of [-47, 47])
    rounded(b, x, 0, 12, 24, 30, 31, 9, "#b8cbc0", detail);
  // Southeast activity frontage: billboard frames set against fine metal fins.
  for (const [x, c] of [
    [-40, "#d68f3e"],
    [-13, "#c56089"],
    [14, "#527dba"],
    [41, "#af477b"],
  ] as const)
    display(b, x, 18, 28.1, 22, 15, c);
  for (let x = -53; x <= 53; x += detail ? 2 : 4)
    b.box(x, 29.3, 28.8, 0.14, 3.2, 0.28, IVORY);
  b.box(0, 31.5, 18, 82, 1.5, 17, "#d6dccb");
  b.box(0, 26, 29, 36, 4.6, 0.45, "#385d65");
  lettering(b, "MBK CENTER", 0, 26, 29.4, 31);
  glass(b, 0, 4, 28.6, 20, 7, 0.3, "#2c626a");
  b.box(0, 8, 30, 27, 0.5, 5, IVORY);
  for (const x of [-43, 43]) {
    glass(b, x, 4, 28.6, 18, 6, 0.3, "#305962");
    planter(b, x, 30, 14, 3);
  }
  // Pedestrian concourse remains above vehicle height; root authors road links.
  b.box(-40, 6.1, 30, 28, 0.5, 4, "#b5bfaf");
  for (const x of [-52, -28]) b.box(x, 7, 30, 1.1, 1.5, 4, IVORY);
  if (detail)
    for (const side of [-1, 1])
      for (let z = -24; z < 13; z += 5) {
        glass(b, side * 59.1, 14, z, 0.2, 21, 3.6, "#6d8f8a");
      }
}
function paragon(b: B, detail: boolean) {
  rounded(b, 0, 0, -10, 128, 65, 27, 8, "#bfb9a4", detail);
  for (const side of [-1, 1]) {
    b.box(side * 47, 18, -9, 32, 20, 62, "#c9c3ad");
    b.box(side * 45, 28, -15, 36, 2, 51, "#e0d9c0");
    b.box(side * 44, 31, -20, 31, 3, 42, "#b7b5a2");
    glass(b, side * 46, 12, 22.8, 31, 19, 0.3, "#567d7e");
  }
  // The entrance is a half-elliptical glass drum with gold slanting ribs. The
  // roof is a visible low dome, not an opaque boxed portico.
  const drum = new T.CylinderGeometry(
    27,
    27,
    24,
    detail ? 48 : 20,
    1,
    false,
    -Math.PI / 2,
    Math.PI,
  ).scale(1, 1, 0.57);
  b.sculpt(drum, 0, 12.2, 18, "#5a9198", "glass");
  const cap = new T.SphereGeometry(
    27,
    detail ? 40 : 18,
    detail ? 12 : 6,
    0,
    Math.PI,
    0,
    Math.PI / 2,
  ).scale(1, 0.15, 0.57);
  b.sculpt(cap, 0, 24.2, 18, "#759da0", "glass");
  for (const y of [3, 7.5, 12, 16.5, 21, 24])
    b.sculpt(
      new T.TorusGeometry(27, 0.19, 4, detail ? 40 : 18, Math.PI)
        .rotateX(Math.PI / 2)
        .scale(1, 1, 0.57),
      0,
      y,
      18,
      "#d5b575",
    );
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 12,
      x = Math.sin(a) * 27,
      z = 18 + Math.cos(a) * 15.5;
    bar(b, x * 0.94, 1, x, 24, z, 0.25, 0.3, "#ddc392");
  }
  b.box(0, 6.2, 32, 25, 0.6, 4, "#cbb88b");
  glass(b, 0, 3, 32, 20, 5, 0.2, "#2f5d67");
  b.box(0, 25.4, 34, 37, 3, 0.6, "#6f7770");
  lettering(b, "SIAM PARAGON", 0, 25.4, 34.4, 34, "#f3dfaf");
  for (const side of [-1, 1]) {
    glass(b, side * 64.05, 13, -10, 0.18, 22, 47, "#608585");
    for (const y of [4, 10, 16, 22])
      b.box(side * 64.2, y, -10, 0.3, 0.25, 49, IVORY);
    for (let u = 0; u < 5; u++)
      b.box(side * (32 + u * 6), 12, 23, 0.25, 20, 0.4, "#d4c399");
  }
  // Forecourt fountain and lowered entrance apron stay clear of the road.
  b.box(0, 0.1, 37, 76, 0.2, 14, "#b5b9a9");
  rounded(b, 0, 0.25, 38, 28, 7, 0.5, 3, "#898e7d", detail);
  rounded(b, 0, 0.8, 38, 26, 5, 0.08, 2, "#63b4b4", detail, "glass");
  for (const x of [-48, 48]) planter(b, x, 35, 17, 8);
}
function central(b: B, detail: boolean) {
  // The long Ratchadamri frontage has a department-store shoulder, a broad
  // recessed glazed center, and a second independently stepped retail block.
  b.box(-43, 18, -11, 49, 36, 64, "#ddded4");
  b.box(9, 16, -13, 55, 32, 62, "#b9c6c1");
  b.box(52, 22, -14, 34, 44, 60, "#c8cfc6");
  b.box(-42, 37, -18, 47, 2, 53, IVORY);
  b.box(12, 34, -23, 52, 3, 40, "#d4d8ca");
  b.box(51, 44, -20, 34, 2, 48, IVORY);
  glass(b, -4, 17, 19.2, 63, 29, 0.4, "#56858e");
  glass(b, 52, 18, 16.1, 32, 31, 0.3, "#60868d");
  for (const y of [5, 12, 19, 26, 32]) b.box(-4, y, 19.8, 64, 0.38, 1.1, IVORY);
  for (let x = -34; x <= 27; x += detail ? 4.2 : 8.4)
    b.box(x, 17, 20, 0.24, 29, 0.8, "#d8e0d7");
  // Linehouse's 2023 department store renovation has overlapping tall arches,
  // shaded terraces and planting; it is not represented as a glass office cube.
  for (const [x, y, w, h] of [
    [-58, 0, 17, 15],
    [-42, 0, 13, 14],
    [-25, 0, 17, 17],
    [-60, 14, 13, 13],
    [-43, 14, 17, 15],
    [-25, 16, 15, 13],
    [-59, 27, 15, 8],
    [-42, 28, 13, 7],
    [-25, 29, 17, 6],
  ]) {
    const shape = new T.Shape();
    shape.moveTo(-w! / 2, 0);
    shape.lineTo(-w! / 2, h! - w! / 2);
    shape.absarc(0, h! - w! / 2, w! / 2, Math.PI, 0, true);
    shape.lineTo(w! / 2, 0);
    shape.closePath();
    b.sculpt(
      new T.ExtrudeGeometry(shape, {
        depth: 0.15,
        bevelEnabled: false,
        curveSegments: detail ? 10 : 4,
      }),
      x!,
      y!,
      21.5,
      "#526964",
      "glass",
    );
    arch(b, x!, y!, 21.7, w!, h!, 0.45, 0.3, "#b8c1b6", detail);
  }
  for (const [x, y] of [
    [-58, 11],
    [-43, 24],
    [-25, 12],
  ])
    planter(b, x!, 23.2, 10, 2.5, y!);
  for (const x of [38, 46, 54, 62]) {
    b.box(x, 23, 17.4, 1, 41, 2, "#dedfd4");
    b.box(x + 2.2, 40, 17.6, 3, 4, 0.5, "#6d8b85");
  }
  b.box(8, 35, 20, 58, 4.5, 1.2, "#61766f");
  lettering(b, "CENTRALWORLD", 8, 35, 20.7, 53);
  for (const side of [-1, 1]) {
    glass(b, side < 0 ? -67.65 : 69.15, 18, -12, 0.2, 31, 50, "#5e7e7e");
    for (const y of [6, 13, 20, 27, 33])
      b.box(side < 0 ? -67.85 : 69.35, y, -12, 0.3, 0.35, 53, "#e0e2d7");
  }
  // Slender red cantilever and deep entrance portico face a paved event square.
  b.box(5, 7, 26, 45, 0.7, 12, "#be5547");
  for (const x of [-15, 25]) b.box(x, 3.2, 24, 0.6, 6.5, 0.6, "#dedcca");
  glass(b, 5, 3.4, 24, 31, 6, 0.3, "#315860");
  b.box(0, 0.12, 36, 138, 0.2, 20, "#b9beb0");
  for (const x of [-59, -36, 37, 61]) planter(b, x, 36, 12, 5);
  if (detail)
    for (let i = 0; i < 5; i++)
      display(
        b,
        40 + i * 6,
        28,
        18.4,
        4.8,
        10,
        ["#9c709b", "#77aebe", "#dda551"][i % 3]!,
      );
}
export function buildSiamCenterDiscovery(b: B, detail: boolean) {
  // Kept one discovery identifier for old saves, rendered as distinct malls.
  // Local -X is geographic west; +Z faces Rama I to the south.
  // Positions are authored directly, with positive geometry scales and readable text.
  b.box(36, 11, -2, 73, 22, 52, "#334b51");
  glass(b, 36, 12, 24.1, 69, 18, 0.3, "#435f64");
  b.box(36, 23.4, -7, 73, 2.8, 42, "#42636a");
  for (const x of [62, 45, 28, 11]) {
    b.box(x, 12, 25, 1.3, 21, 1.9, "#1b363f");
    glass(b, x - 6.5, 12, 25.1, 11, 17, 0.2, "#5d7778");
  }
  b.box(36, 21, 25.6, 63, 4, 0.5, "#30464a");
  lettering(b, "SIAM CENTER", 36, 21, 26, 56, "#ecddd1");
  for (const [x, c] of [
    [59, "#c4514f"],
    [36, "#8b5f8b"],
    [13, "#ab7e54"],
  ] as const)
    display(b, x, 10, 25.7, 16, 10, c);
  // Discovery's transparent second skin has irregular frame widths/heights and
  // offsets, rather than the repeated square checkerboard from PR26.
  b.box(-39, 13, -2, 69, 26, 54, "#b9c8c2");
  glass(b, -39, 14, 25.1, 67, 23, 0.3, "#405f63");
  const frames = [
    [-1, 2, 16, 10],
    [17, 2, 21, 9],
    [40, 2, 19, 14],
    [61, 2, 11, 10],
    [0, 13, 12, 13],
    [14, 12, 22, 14],
    [38, 17, 15, 11],
    [55, 13, 17, 15],
    [3, 27, 24, 3],
    [30, 27, 16, 3],
    [50, 29, 22, 2],
  ];
  for (const [u, y, w, h] of frames) {
    const x = -4 - u!,
      Y = y! + h! / 2,
      z = 26 + (Math.round(u!) % 3) * 0.2;
    for (const side of [-1, 1]) {
      b.box(x + (side * w!) / 2, Y, z, 0.8, h!, 0.8, IVORY);
      b.box(x, Y + (side * h!) / 2, z, w! + 0.8, 0.8, 0.8, IVORY);
    }
  }
  // Small irregular white outline boxes float over the main mullion frames,
  // with a thinner echo on the west side, matching Nendo's layered skin.
  for (let i = 0; i < (detail ? 56 : 22); i++) {
    const x = -7 - ((i * 17.31) % 62),
      y = 2.5 + ((i * 7.73) % 19),
      w = 2.5 + ((i * 3.17) % 6),
      h = 1.7 + ((i * 1.33) % 3.8),
      z = 27.15 + (i % 3) * 0.08;
    for (const side of [-1, 1]) {
      b.box(x + (side * w) / 2, y, z, 0.12, h, 0.16, IVORY);
      b.box(x, y + (side * h) / 2, z, w, 0.12, 0.16, IVORY);
    }
  }
  if (detail)
    for (let i = 0; i < 24; i++) {
      const z = -23 + ((i * 7.33) % 43),
        y = 3 + ((i * 5.79) % 20),
        w = 2 + (i % 5),
        h = 2 + (i % 3);
      for (const side of [-1, 1]) {
        b.box(-73.2, y + (side * h) / 2, z, 0.18, 0.12, w, IVORY);
        b.box(-73.2, y, z + (side * w) / 2, 0.18, h, 0.12, IVORY);
      }
    }
  b.box(-39, 29.5, -9, 70, 2.2, 42, "#d5dad0");
  lettering(b, "SIAM DISCOVERY", -39, 25, 27.6, 57);
  if (detail)
    for (const x of [-10, -68])
      for (const y of [6, 15, 23])
        b.box(x, y, 27.4, 5, 3, 0.2, "#c8e4d0", 0, true);
  // Broad middle gap reads as an exterior connection between separate malls.
  glass(b, -2, 8, 22.5, 5, 13, 0.2, "#568f94");
  b.box(-2, 15, 24, 9, 0.6, 8, IVORY);
  b.box(0, 0.1, 28, 148, 0.2, 3, "#aeb7a5");
}
function terminal(b: B, detail: boolean) {
  rounded(b, 0, 0, -3, 88, 70, 29, 8, "#c0c4ba", detail);
  // Rounded corner glazing and horizontally lined silver shopping podium.
  rounded(b, -29, 0, 18, 29, 29, 29, 11, "#557f87", detail, "glass");
  for (const y of [4, 9, 14, 19, 24, 29]) {
    rounded(b, -29, y, 18, 29.5, 29.5, 0.45, 11.2, IVORY, detail);
    b.box(10, y, 31, 64, 0.3, 0.5, "#d7d9cb");
  }
  for (let y = 2; y < 29; y += detail ? 1 : 2) {
    b.box(13, y, 31.2, 59, 0.13, 0.3, "#e3e0d3");
    for (const side of [-1, 1])
      b.box(side * 44.12, y, -3, 0.15, 0.13, 50, "#e3e0d3");
  }
  for (const z of [-18, -4, 10]) b.box(44.2, 15, z, 0.5, 25, 1.3, "#b0a16f");
  for (const x of [-13, -4, 5, 14]) b.box(x, 15, 32.2, 2.1, 29, 2.2, "#b0a16f");
  b.box(20, 29, 31.6, 39, 5, 0.7, "#d9dbcd");
  lettering(b, "TERMINAL21", 20, 29, 32.1, 34, "#7196a0");
  glass(b, -27, 4, 32, 21, 7, 0.2, "#31535f");
  b.box(-27, 8, 34, 25, 0.5, 6, IVORY);
  // Documented 60-degree Y hotel plan: three differently visible slabs and
  // round-ended vertical glass bays; central Thai-inspired gold crown.
  const cx = 0,
    cz = -10,
    base = 30,
    height = 86;
  for (let wing = 0; wing < 3; wing++) {
    const yaw = (wing * Math.PI * 2) / 3,
      x = cx + Math.sin(yaw) * 9,
      z = cz + Math.cos(yaw) * 9;
    rounded(
      b,
      x,
      base,
      z,
      15,
      31,
      height,
      3,
      "#b9bba9",
      detail,
      "ceramic",
      yaw,
    );
    for (const side of [-1, 1]) {
      const u = side * 7.62,
        xx = cx + Math.cos(yaw) * u + Math.sin(yaw) * 9,
        zz = cz - Math.sin(yaw) * u + Math.cos(yaw) * 9;
      glass(b, xx, base + height / 2, zz, 0.2, height - 1, 27, "#527e8f", yaw);
    }
    for (let f = 0; f < (detail ? 28 : 14); f++) {
      const Y = base + 1.5 + f * (detail ? 3 : 6);
      b.box(x, Y, z, 15.6, 0.55, 30.4, "#d7c9a5", yaw);
    }
    const endX = cx + Math.sin(yaw) * 24,
      endZ = cz + Math.cos(yaw) * 24;
    rounded(
      b,
      endX,
      base,
      endZ,
      12,
      9,
      height + 2,
      4,
      "#487990",
      detail,
      "glass",
      yaw,
    );
    for (const side of [-1, 1])
      b.box(
        endX + Math.cos(yaw) * side * 5.5,
        74,
        endZ - Math.sin(yaw) * side * 5.5,
        0.6,
        88,
        0.6,
        "#b6b8aa",
        yaw,
      );
    rounded(
      b,
      endX,
      117,
      endZ,
      12.6,
      9.5,
      0.7,
      4,
      "#d1bd8b",
      detail,
      "ceramic",
      yaw,
    );
  }
  for (let wing = 0; wing < 3; wing++) {
    const yaw = (wing * Math.PI * 2) / 3,
      shape = new T.Shape([
        new T.Vector2(-4, 0),
        new T.Vector2(-4, 5),
        new T.Vector2(0, 12),
        new T.Vector2(4, 5),
        new T.Vector2(4, 0),
      ]);
    shape.closePath();
    b.sculpt(
      new T.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false }).translate(
        0,
        0,
        -1,
      ),
      Math.sin(yaw) * 10,
      114,
      -10 + Math.cos(yaw) * 10,
      "#d2ad61",
      "gilded",
      yaw,
    );
  }
  b.sculpt(
    new T.CylinderGeometry(1, 4, 14, 3).rotateY(Math.PI),
    0,
    117,
    -10,
    "#d2ad61",
    "gilded",
  );
  b.sculpt(new T.ConeGeometry(0.75, 11, 6), 0, 128, -10, "#d2ad61", "gilded");
  // Roof recreation includes a visible pool and planted terraces. No new lamps.
  rounded(b, -27, 30, -10, 17, 27, 0.4, 4, "#8d9b89", detail);
  rounded(b, -27, 30.5, -10, 13, 23, 0.1, 3, "#54a6b1", detail, "glass");
  for (const x of [-35, 35]) planter(b, x, -24, 12, 13, 30);
  b.box(27, 29.5, -25, 19, 0.2, 13, "#809c7b");
  if (detail) {
    for (let i = 0; i < 3; i++)
      display(
        b,
        22 + i * 8,
        18,
        32,
        6,
        9,
        ["#c89a4c", "#a85673", "#557d9e"][i]!,
      );
  }
  b.box(0, 0.1, 37, 88, 0.2, 5, "#acb6a6");
}
export function buildCommercialDistrictModel(
  id: string,
  b: B,
  detail: boolean,
): boolean {
  const builders: Record<string, (b: B, detail: boolean) => void> = {
    mbk,
    paragon,
    central,
    terminal,
    "siam-center": buildSiamCenterDiscovery,
  };
  const build = builders[id];
  if (!build) return false;
  build(b, detail);
  return true;
}
