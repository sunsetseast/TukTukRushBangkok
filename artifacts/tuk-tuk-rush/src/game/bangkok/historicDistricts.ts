import * as T from "three";
import type { Landmark } from "../types";
import { LandmarkBuilder } from "./landmarkBuilder";
import { thaiRoof } from "./templeCraft";

/** Model-local plans are shared with authored-site collision and reservation
 * code. +Z is south for the temple/museum, and the water-facing side for the
 * two river sites. These are compressed interpretations, not surveyed plans. */
export type HistoricMass = {
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  yaw?: number;
};
export const HISTORIC_SITE_PLANS: Record<
  string,
  { width: number; depth: number; masses: HistoricMass[] }
> = {
  swing: {
    width: 86,
    depth: 118,
    masses: [
      {
        name: "Giant Swing west timber",
        x: -5.5,
        z: -43,
        w: 1.4,
        d: 2.4,
        h: 21.2,
      },
      {
        name: "Giant Swing east timber",
        x: 5.5,
        z: -43,
        w: 1.4,
        d: 2.4,
        h: 21.2,
      },
      { name: "Wat Suthat wihan", x: 0, z: 10, w: 36, d: 32, h: 22 },
      { name: "Wat Suthat ordination hall", x: 0, z: 44, w: 46, d: 17, h: 16 },
      { name: "Wat Suthat west cloister", x: -32, z: 19, w: 6, d: 72, h: 6 },
      { name: "Wat Suthat east cloister", x: 32, z: 19, w: 6, d: 72, h: 6 },
      { name: "Wat Suthat rear cloister", x: 0, z: 55, w: 58, d: 5, h: 6 },
    ],
  },
  flowers: {
    width: 104,
    depth: 78,
    masses: [
      { name: "west flower wholesalers", x: -28, z: -8, w: 34, d: 42, h: 9 },
      { name: "east covered market", x: 28, z: -8, w: 34, d: 42, h: 9 },
      { name: "Yodpiman riverside arcade", x: 0, z: 27, w: 94, d: 16, h: 13 },
    ],
  },
  "jim-thompson": {
    width: 68,
    depth: 64,
    masses: [
      { name: "canal living room", x: -11, z: -13, w: 19, d: 17, h: 13 },
      { name: "dining house", x: 11, z: -15, w: 16, d: 19, h: 14 },
      { name: "bedroom house", x: 19, z: 5, w: 13, d: 16, h: 12 },
      { name: "drawing room", x: -16, z: 6, w: 15, d: 15, h: 12 },
      { name: "garden pavilion", x: -14, z: 23, w: 12, d: 10, h: 9 },
      { name: "entry teak house", x: 15, z: 22, w: 13, d: 11, h: 9 },
    ],
  },
  "river-city": {
    width: 98,
    depth: 68,
    masses: [
      { name: "four-storey arts centre", x: 0, z: -7, w: 90, d: 36, h: 23 },
      { name: "riverside terrace west", x: -32, z: 18, w: 23, d: 9, h: 5 },
      { name: "riverside terrace east", x: 32, z: 18, w: 23, d: 9, h: 5 },
    ],
  },
};

/** Ground-level blockers, distinct from the building masses. In particular,
 * the public court is never replaced by a single property-sized collider. */
export function historicBoundaryColliders(id: string): HistoricMass[] {
  if (id === "swing")
    return [
      ...[-1, 1].flatMap((side) => [
        {
          name: "Wat Suthat compound side wall",
          x: side * 41,
          z: 15,
          w: 0.65,
          d: 86,
          h: 3,
        },
        {
          name: "Wat Suthat north gate wall",
          x: side * 23,
          z: -24,
          w: 37,
          d: 0.65,
          h: 3,
        },
        {
          name: "Wat Suthat gate pier",
          x: side * 6,
          z: -24,
          w: 1.8,
          d: 1.8,
          h: 6,
        },
      ]),
      { name: "Wat Suthat rear wall", x: 0, z: 58, w: 82, d: 0.65, h: 3 },
    ];
  if (id === "jim-thompson")
    return [
      ...[-1, 1].flatMap((side) => [
        {
          name: "museum garden side wall",
          x: side * 33.4,
          z: 0,
          w: 0.6,
          d: 64,
          h: 2.5,
        },
        {
          name: "museum entrance wall",
          x: side * 20,
          z: 31.5,
          w: 27,
          d: 0.6,
          h: 2.5,
        },
        {
          name: "museum gate timber",
          x: side * 5.8,
          z: 31.5,
          w: 0.7,
          d: 0.8,
          h: 4.2,
        },
      ]),
      {
        name: "museum canal boundary wall",
        x: 0,
        z: -31.5,
        w: 67,
        d: 0.6,
        h: 2.2,
      },
    ];
  if (id === "river-city")
    return [-1, 1].map((side) => ({
      name: "riverside terrace railing",
      x: side * 32,
      z: 32,
      w: 29,
      d: 0.2,
      h: 1.2,
    }));
  return [];
}

/** Carts occupy the pedestrian market lane; they must not become traffic
 * waypoints or uncolliding decorations on a public carriageway. */
export function historicFurnitureColliders(id: string): HistoricMass[] {
  return id === "flowers"
    ? [
        [-2, -19],
        [3, 2],
        [-4, 16],
      ].map(([x, z]) => ({
        name: "flower delivery cart",
        x: x!,
        z: z!,
        w: 1.9,
        d: 2.8,
        h: 2.5,
      }))
    : [];
}

const CREAM = "#e6debf",
  RED = "#b63b2e",
  TEAK = "#823d2c",
  GLASS = "#365e68";
type B = LandmarkBuilder;

/** All flowers, tree crowns, pots and chairs are baked into a few material
 * batches by LandmarkBuilder. No per-flower Object3D or point light survives. */
function landscape(b: B) {
  const crown = new T.IcosahedronGeometry(1, 0),
    trunk = new T.CylinderGeometry(0.18, 0.33, 1, 6);
  const pot = new T.CylinderGeometry(0.54, 0.36, 0.9, 7),
    bloom = new T.IcosahedronGeometry(0.31, 0);
  return {
    tree(x: number, z: number, h: number, palm = false) {
      b.sculpt(trunk.clone().scale(1, h * 0.7, 1), x, h * 0.35, z, "#806245");
      if (palm) {
        // Six long swept blades, rather than spherical palm canopies.
        for (let j = 0; j < 6; j++) {
          const a = (j * Math.PI) / 3,
            s = new T.Shape([
              new T.Vector2(0, 0.35),
              new T.Vector2(h * 0.23, 0.6),
              new T.Vector2(h * 0.41, -0.65),
              new T.Vector2(h * 0.17, -0.05),
            ]);
          b.sculpt(
            new T.ExtrudeGeometry(s, {
              depth: 0.07,
              bevelEnabled: false,
            }).rotateY(a),
            x,
            h * 0.83,
            z,
            "#377c54",
          );
        }
      } else {
        b.sculpt(
          crown.clone().scale(h * 0.34, h * 0.3, h * 0.33),
          x,
          h * 0.8,
          z,
          "#4c8d58",
        );
        b.sculpt(
          crown.clone().scale(h * 0.26, h * 0.25, h * 0.28),
          x + h * 0.15,
          h * 0.94,
          z - h * 0.1,
          "#5e9b64",
        );
      }
    },
    bucket(x: number, z: number, color: string, detailed: boolean, y = 0) {
      b.sculpt(pot, x, y + 0.48, z, "#708476");
      if (detailed) {
        for (let j = 0; j < 4; j++) {
          const a = (j * Math.PI) / 2;
          b.box(
            x + Math.sin(a) * 0.2,
            y + 1.15,
            z + Math.cos(a) * 0.2,
            0.045,
            1.2,
            0.045,
            "#497347",
          );
          b.sculpt(
            bloom,
            x + Math.sin(a) * 0.29,
            y + 1.65 + (j % 2) * 0.15,
            z + Math.cos(a) * 0.29,
            color,
          );
        }
      } else
        b.sculpt(crown.clone().scale(0.57, 0.5, 0.57), x, y + 1.3, z, color);
    },
  };
}

function sign(
  b: B,
  text: string,
  x: number,
  y: number,
  z: number,
  width: number,
  color = "#285b62",
  yaw = 0,
) {
  b.box(x, y, z, width, 1.45, 0.22, color);
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = "#ffedbb";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "600 30px sans-serif";
  ctx.fillText(text, 256, 33, 490);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.generateMipmaps = false;
  map.minFilter = T.LinearFilter;
  const material = new T.MeshStandardMaterial({
    map,
    roughness: 0.7,
    emissive: "#ffffff",
    emissiveMap: map,
    emissiveIntensity: 0.5,
  });
  b.painted(
    new T.PlaneGeometry(width, 1.45),
    material,
    x + Math.sin(yaw) * 0.13,
    y,
    z + Math.cos(yaw) * 0.13,
    "#ffffff",
    yaw,
  );
}

function rail(
  b: B,
  x: number,
  z: number,
  length: number,
  alongX: boolean,
  detail: boolean,
  color = "#d5cdb2",
) {
  b.box(x, 1.1, z, alongX ? length : 0.16, 0.13, alongX ? 0.16 : length, color);
  if (detail)
    for (let p = -length / 2; p <= length / 2; p += 2.1)
      b.box(
        x + (alongX ? p : 0),
        0.6,
        z + (alongX ? 0 : p),
        0.13,
        1.2,
        0.13,
        color,
      );
}

function templeHall(
  b: B,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  detail: boolean,
) {
  b.box(x, 0.85, z, w + 4, 1.7, d + 5, "#c8b997");
  b.box(x, h * 0.5 + 1.4, z, w, h, d, CREAM);
  for (const side of [-1, 1]) {
    for (let q = -w / 2 + 2.7; q < w / 2; q += 4.5) {
      b.box(
        x + q,
        h * 0.5 + 1.4,
        z + side * (d / 2 + 0.35),
        0.5,
        h,
        0.5,
        "#e0bc6a",
      );
      b.box(
        x + q + 1.7,
        h * 0.51 + 1.4,
        z + side * (d / 2 + 0.05),
        1.8,
        h * 0.61,
        0.18,
        "#3c4d42",
      );
      if (detail)
        b.box(
          x + q + 1.7,
          h * 0.51 + 1.4,
          z + side * (d / 2 + 0.2),
          1.2,
          h * 0.51,
          0.14,
          "#b7803b",
        );
    }
    for (let q = -d / 2 + 3; q < d / 2; q += 4.4) {
      b.box(
        x + side * (w / 2 + 0.18),
        h * 0.54 + 1.4,
        z + q,
        0.18,
        h * 0.59,
        1.7,
        "#6e4930",
      );
      b.box(
        x + side * (w / 2 + 0.4),
        h * 0.5 + 1.4,
        z + q - 1.4,
        0.5,
        h,
        0.5,
        "#e0bc6a",
      );
    }
  }
  thaiRoof(b, x, h + 1.6, z, w + 5, d + 6, h * 0.54, "#c35c35", detail);
  thaiRoof(b, x, h + 3.6, z, w * 0.76, d * 0.83, h * 0.53, "#a6402a", false);
  for (const side of [-1, 1])
    for (let step = 0; step < 4; step++)
      b.box(
        x,
        0.35 + step * 0.31,
        z + side * (d / 2 + 3 - step * 0.6),
        w * 0.4,
        0.34,
        1.8,
        "#cdbf9e",
      );
}

function giantSwing(b: B, detail: boolean) {
  b.box(0, 0.09, 0, 86, 0.18, 118, "#c5bda7");
  // Distinct paved civic forecourt, a low circular island, then the gated temple.
  b.box(0, 0.2, -40, 78, 0.12, 34, "#d8c5a6");
  b.sculpt(
    new T.CylinderGeometry(11, 11.3, 0.35, detail ? 40 : 20),
    0,
    0.42,
    -43,
    "#e8d5af",
  );
  for (const x of [-5.5, 5.5]) {
    b.box(x, 0.8, -43, 2.3, 0.8, 3.8, "#c6b18b");
    for (const z of [-43.65, -42.35])
      b.sculpt(new T.CylinderGeometry(0.26, 0.46, 19.9, 8), x, 10.95, z, RED);
    b.box(x, 20.5, -43, 1.1, 1.6, 2.1, "#c54b36");
  }
  const beam = new T.Shape([
    new T.Vector2(-8.4, 1.25),
    new T.Vector2(-7.6, 0.15),
    new T.Vector2(0, -0.1),
    new T.Vector2(7.6, 0.15),
    new T.Vector2(8.4, 1.25),
    new T.Vector2(5.4, 0.7),
    new T.Vector2(0, 0.49),
    new T.Vector2(-5.4, 0.7),
  ]);
  b.sculpt(
    new T.ExtrudeGeometry(beam, { depth: 1.15, bevelEnabled: false }).translate(
      0,
      0,
      -0.575,
    ),
    0,
    21,
    -43,
    "#c54832",
  );
  b.box(0, 20.2, -43, 13.4, 0.48, 1.4, "#a72f27");
  // The temple is south of the swing, separated by its gate and forecourt.
  templeHall(b, 0, 10, 36, 32, 12.4, detail);
  templeHall(b, 0, 44, 46, 17, 8.3, detail);
  for (const side of [-1, 1]) {
    b.box(side * 32, 2.8, 19, 6, 4.4, 72, "#d0bda0");
    b.roof(side * 32, 5.3, 19, 7.2, 73, 2, "#b15d38");
    if (detail)
      for (let z = -14; z <= 50; z += 4) {
        b.box(side * 28.8, 2.8, z, 0.23, 3.7, 2.5, "#655b43");
        b.box(side * 28.6, 2.8, z + 1.5, 0.5, 4.6, 0.5, "#e6d5af");
      }
    b.box(side * 41, 1.5, 15, 0.65, 3, 86, "#ede2c5");
    b.box(side * 23, 1.5, -24, 37, 3, 0.65, "#ede2c5");
    b.box(side * 6, 3, -24, 1.8, 6, 1.8, "#f1e3bd");
    b.roof(side * 6, 5.8, -24, 3.8, 3.6, 1.6, "#c9643b");
  }
  b.box(0, 2.8, 55, 58, 4.4, 5, "#cbb99d");
  b.roof(0, 5.3, 55, 59, 6.2, 2, "#b15d38");
  b.box(0, 1.5, 58, 82, 3, 0.65, "#ede2c5");
  const plants = landscape(b);
  for (const x of [-24, 24])
    for (const z of [-12, 30, 47]) {
      b.box(x, 0.35, z, 4.5, 0.5, 4.5, "#79915d");
      plants.tree(x, z, 7.4);
    }
  if (detail)
    for (const x of [-22, 22])
      for (const z of [-47, -35]) {
        b.box(x, 0.5, z, 4, 0.5, 1.1, "#9c8566");
        b.box(x, 0.95, z - 0.45, 4, 0.8, 0.18, "#b49b74");
        b.box(x + 2.8, 2.5, z, 0.15, 5, 0.15, "#5c6555");
        b.box(x + 2.8, 5.2, z, 0.9, 0.35, 0.9, "#f8da9c", 0, true);
      }
}

function flowerMarket(b: B, detail: boolean) {
  b.box(0, 0.1, 0, 104, 0.2, 78, "#b2aea0");
  const plants = landscape(b),
    colors = ["#f8bd3f", "#dc6488", "#e9dace", "#ad85c8", "#e87750"];
  // Paired masonry market blocks frame an open 18m pedestrian/loading alley.
  // Unlike the old six sheds, these have long roofed halls and occupied frontage.
  for (const side of [-1, 1]) {
    const x = side * 28;
    b.box(x, 3.8, -8, 34, 7, 42, "#c9bd9f");
    b.box(x, 5.4, -8, 33.6, 1.4, 41.6, "#a2b4a0");
    b.roof(x, 7.5, -8, 35, 43, 2.6, "#6e8c7b");
    // Skylights run along each covered hall roof, a low commercial silhouette.
    b.box(x, 9.2, -8, 5, 1, 37, "#8db9af");
    for (let k = 0; k < 6; k++) {
      const z = -25 + k * 6.8;
      b.box(side * 10.7, 3.4, z, 0.18, 5.3, 5.7, "#5e7563");
      b.box(side * 10.5, 5.4, z, 0.3, 0.5, 6.6, "#e3c186");
      // Angled awnings point into the central alley, never the carriageway.
      b.sculpt(
        new T.BoxGeometry(3.7, 0.18, 5.9).rotateZ(side * 0.12),
        side * 8.9,
        4.3,
        z,
        k % 2 ? "#d4a550" : "#779d8b",
      );
      b.box(side * 8.5, 0.9, z, 1.3, 1.3, 5.1, "#93734a");
      for (let j = 0; j < (detail ? 4 : 2); j++) {
        const zz = z - 2 + j * (detail ? 1.2 : 3.3);
        plants.bucket(
          side * 7.45,
          zz,
          colors[(k + j) % colors.length]!,
          detail,
          0.1,
        );
        if (detail)
          plants.bucket(
            side * 8.4,
            zz,
            colors[(k + j + 1) % colors.length]!,
            false,
            0.9,
          );
      }
      if (detail) {
        // Draped jasmine loops and dense golden marigold chains.
        for (let j = 0; j < 5; j++) {
          const yy = 3.45 - Math.sin((j * Math.PI) / 4) * 0.65;
          b.sculpt(
            new T.TorusGeometry(0.19, 0.095, 4, 8).rotateY(Math.PI / 2),
            side * 9.5,
            yy,
            z - 1.8 + j * 0.8,
            k % 2 ? "#f0dfaa" : "#f2ba35",
          );
        }
        b.box(side * 9.7, 4.5, z, 0.13, 0.18, 5.4, "#ffd8a0", 0, true);
        for (const u of [-1, 1])
          b.box(x + u * 11, 5, z, 3, 1.8, 0.12, "#647d70");
      }
    }
    // Shop-house backs have shutter bays, roof tanks and AC units rather than
    // the old exposed featureless market slab.
    for (let k = 0; k < 5; k++) {
      const z = -24 + k * 8;
      b.box(
        side * 45.15,
        3.6,
        z,
        0.24,
        5.5,
        5.9,
        k % 2 ? "#b4ad92" : "#607e77",
      );
      b.box(side * 45.4, 6, z, 0.4, 0.25, 6.8, "#e7d7ae");
      if (detail) b.box(side * 45.6, 6.1, z + 2.8, 0.65, 1, 1.6, "#c7cbc0");
    }
    for (const z of [-21, 7])
      b.sculpt(
        new T.CylinderGeometry(1.1, 1.1, 1.6, 10),
        x + side * 10,
        9.5,
        z,
        "#a3aaa2",
      );
  }
  // The yellow riverside commercial arcade gives the market its Yodpiman
  // relationship. Deliberately low, with a continuous first-floor colonnade.
  b.box(0, 6.2, 27, 94, 11.6, 16, "#d9c488");
  b.box(0, 1.7, 35.15, 90, 2.7, 0.2, "#4f706d");
  b.box(0, 8.5, 35.2, 91, 3.7, 0.2, "#537e7c");
  for (let x = -43; x <= 43; x += 6.6) {
    b.box(x, 6.8, 35.7, 0.7, 11.8, 0.9, "#efe3bb");
    b.box(x, 7.2, 35.9, 5.6, 0.3, 0.6, "#e5d2a5");
    b.box(x, 11.5, 35.9, 6.7, 0.4, 0.8, "#f1e3bc");
    if (detail) b.box(x + 3.1, 8.6, 35.6, 0.12, 3.7, 0.2, "#c4b587");
  }
  b.box(0, 12.3, 27, 96, 0.7, 17.8, "#ecd9a8");
  for (const x of [-32, 0, 32]) {
    b.box(x, 12.9, 27, 24, 0.8, 13, "#c5ad79");
    b.box(x, 13.4, 27, 19, 0.3, 9, "#e6d4a6");
  }
  sign(b, "YODPIMAN RIVER WALK", 0, 10.4, 36.1, 28, "#aa8e57");
  sign(b, "ปากคลองตลาด · FLOWER MARKET", 0, 4.5, -29.3, 17, "#4d857e", Math.PI);
  // Portable delivery carts, planted promenade ends and explicit clear centre.
  if (detail)
    for (const [x, z] of [
      [-2, -19],
      [3, 2],
      [-4, 16],
    ]) {
      b.box(x!, 0.9, z!, 1.7, 0.3, 2.6, "#977448");
      for (const s of [-1, 1])
        for (const t of [-1, 1])
          b.sculpt(
            new T.CylinderGeometry(0.23, 0.23, 0.15, 7).rotateZ(Math.PI / 2),
            x! + s * 0.85,
            0.3,
            z! + t * 0.9,
            "#454f47",
          );
      for (const q of [-0.45, 0.45])
        plants.bucket(x! + q, z!, "#f0b83e", false, 1);
    }
  for (const x of [-49, 49])
    for (const z of [-27, 30]) plants.tree(x, z, 7.5, true);
}

function teakHouse(b: B, m: HistoricMass, detail: boolean) {
  const { x, z, w, d } = m,
    level = m.h > 11 ? 3.2 : 2.1,
    wallH = m.h > 11 ? 5.2 : 3.7;
  // Open elevated undercroft remains visible; collision is the house footprint.
  for (const u of [-1, 1])
    for (let v = -d / 2 + 1; v <= d / 2; v += d / 3)
      b.box(
        x + u * (w / 2 - 1),
        level / 2,
        z + v,
        0.46,
        level,
        0.46,
        "#674331",
      );
  b.box(x, level, z, w + 0.4, 0.4, d + 0.4, "#925b37");
  b.box(x, level + wallH / 2, z, w, wallH, d, TEAK);
  for (const side of [-1, 1]) {
    for (let u = -w / 2 + 2.1; u < w / 2; u += 3.6) {
      b.box(
        x + u,
        level + wallH * 0.56,
        z + side * (d / 2 + 0.08),
        1.6,
        wallH * 0.62,
        0.17,
        "#3d3c2d",
      );
      b.box(
        x + u,
        level + wallH * 0.56,
        z + side * (d / 2 + 0.2),
        0.12,
        wallH * 0.64,
        0.16,
        "#bc7848",
      );
    }
    b.box(
      x + side * (w / 2 - 0.3),
      level + wallH / 2,
      z,
      0.26,
      wallH,
      d,
      "#a7623b",
    );
    if (detail)
      for (let v = -d / 2 + 2; v < d / 2; v += 3.1)
        b.box(
          x + side * (w / 2 + 0.08),
          level + wallH * 0.58,
          z + v,
          0.16,
          wallH * 0.55,
          1.4,
          "#48412f",
        );
  }
  // The residence has restrained teak gables and clay roofs. Temple-style
  // gilded chofa would give these domestic houses the wrong architectural type.
  const roofW = w + 3,
    roofD = d + 3,
    roofH = m.h - wallH - level;
  const profile = [
    new T.Vector2(-roofW / 2, 0.2),
    new T.Vector2(-roofW * 0.43, 0),
    new T.Vector2(0, roofH),
    new T.Vector2(roofW * 0.43, 0),
    new T.Vector2(roofW / 2, 0.2),
  ];
  const shell = new T.Shape([
    ...profile,
    ...[...profile].reverse().map((p) => new T.Vector2(p.x, p.y - 0.2)),
  ]);
  b.sculpt(
    new T.ExtrudeGeometry(shell, {
      depth: roofD,
      bevelEnabled: false,
    }).translate(0, 0, -roofD / 2),
    x,
    level + wallH,
    z,
    "#985332",
  );
  for (const side of [-1, 1]) {
    const gable = new T.Shape([
      new T.Vector2(-w * 0.42, 0.1),
      new T.Vector2(0, roofH * 0.94),
      new T.Vector2(w * 0.42, 0.1),
    ]);
    b.sculpt(
      new T.ExtrudeGeometry(gable, { depth: 0.13, bevelEnabled: false }),
      x,
      level + wallH,
      z + side * (d / 2 + 0.05),
      "#813e2b",
    );
    if (detail)
      for (let u = -w * 0.34; u < w * 0.35; u += 1.3) {
        const h = roofH * (1 - Math.abs(u) / (w * 0.42));
        b.box(
          x + u,
          level + wallH + h * 0.45,
          z + side * (d / 2 + 0.21),
          0.09,
          h * 0.9,
          0.1,
          "#b47144",
        );
      }
  }
  b.box(x, m.h + 0.05, z, 0.3, 0.25, roofD + 0.35, "#683b2a");
  b.box(x, level + wallH - 0.15, z, w + 3.4, 0.16, d + 3.2, "#633c2b");
  if (detail)
    for (let q = -w / 2 + 1; q < w / 2; q += 1.8)
      b.box(
        x + q,
        level + wallH / 2,
        z + d / 2 + 0.2,
        0.06,
        wallH,
        0.07,
        "#ae6940",
      );
}

function jimThompson(b: B, detail: boolean) {
  b.box(0, 0.08, 0, 68, 0.16, 64, "#5e8458");
  b.box(0, 0.18, 14, 10, 0.16, 33, "#b9a27c");
  b.box(0, 0.2, -1, 20, 0.17, 14, "#bfaa85");
  const plants = landscape(b);
  for (const m of HISTORIC_SITE_PLANS["jim-thompson"]!.masses)
    teakHouse(b, m, detail);
  // Raised terraces link the six houses; the court and garden remain open.
  for (const [x, z, w, d] of [
    [0, -4, 15, 5],
    [8, 6, 5, 17],
    [-4, 6, 5, 17],
  ]) {
    b.box(x!, 3.15, z!, w!, 0.35, d!, "#a56b43");
    rail(b, x!, z! + d! / 2, w!, true, detail, "#8e5739");
  }
  for (let step = 0; step < 7; step++)
    b.box(0, 0.25 + step * 0.43, 12 - step * 0.8, 4, 0.4, 1.3, "#a97448");
  // A restrained lily pond is garden water, not a fake isolated section of the
  // Saen Saep canal; the real canal itself is supplied by the district map.
  b.sculpt(
    new T.CylinderGeometry(4.5, 4.5, 0.12, 18).scale(1, 1, 0.65),
    -27,
    0.27,
    -4,
    "#4d8b7b",
  );
  for (const [x, z] of [
    [-29, -4],
    [-26, -2],
    [-26, -5],
  ])
    b.sculpt(
      new T.CylinderGeometry(0.45, 0.45, 0.035, 7),
      x!,
      0.36,
      z!,
      "#7eae68",
    );
  for (const side of [-1, 1]) {
    b.box(side * 33.4, 1.25, 0, 0.6, 2.5, 64, "#b9ad8b");
    b.box(side * 20, 1.25, 31.5, 27, 2.5, 0.6, "#b9ad8b");
    b.box(side * 5.8, 2.1, 31.5, 0.7, 4.2, 0.8, "#8d6442");
  }
  b.box(0, 1.1, -31.5, 67, 2.2, 0.6, "#a69876");
  b.roof(0, 4, 31.5, 12.8, 3.5, 2.4, "#8b4c32");
  sign(b, "JIM THOMPSON HOUSE", 0, 3.4, 31.9, 10, "#6f4633");
  const trees: [number, number, number, boolean?][] = [
    [-29, -24, 13],
    [-2, -28, 12, true],
    [27, -25, 14],
    [29, -10, 12, true],
    [-29, 12, 11],
    [-29, 25, 13, true],
    [28, 25, 13],
    [4, 26, 8, true],
    [29, 8, 10],
  ];
  for (const [x, z, h, palm] of trees) plants.tree(x, z, h, palm);
  if (detail) {
    for (const [x, z] of [
      [-5, 2],
      [5, 2],
      [-26, 2],
      [28, 15],
    ])
      plants.bucket(x!, z!, "#b96246", false);
    for (const side of [-1, 1])
      for (const z of [-27, -7, 12, 27]) {
        b.box(side * 30.3, 0.55, z, 3.8, 1, 3, "#3e754b");
        b.sculpt(
          new T.IcosahedronGeometry(1.5, 0).scale(1.3, 0.7, 1),
          side * 29.9,
          1.4,
          z,
          "#5f9557",
        );
      }
  }
}

function riverCity(b: B, detail: boolean) {
  b.box(0, 0.12, 0, 98, 0.24, 68, "#b6b3a2");
  b.box(0, 11.8, -7, 90, 23, 36, "#a4ada1");
  // Direct inspection of the current VCON project photograph invalidated the
  // old arched-glass interpretation. The river facade is a very broad dark
  // screen with staggered horizontal metallic strips and tall stone piers.
  b.box(0, 13.7, 11.28, 89.5, 18.4, 0.35, "#253f55");
  const rows = detail ? 31 : 17,
    columns = detail ? 27 : 14;
  for (let row = 0; row < rows; row++) {
    const y = 5.1 + (row * 17.6) / (rows - 1),
      lower = 1 - row / (rows - 1);
    const color = new T.Color("#4e6b80").lerp(
      new T.Color("#d1ba83"),
      lower * lower,
    );
    for (let col = 0; col < columns; col++) {
      const unit = 88 / columns,
        x = -44 + (col + 0.5) * unit;
      const shift = ((row % 2) * 0.5 - 0.25) * unit;
      b.box(
        x + shift,
        y,
        11.58,
        unit * (0.86 + ((row + col * 3) % 5) * 0.023),
        detail ? 0.22 : 0.34,
        0.16,
        `#${color.getHexString()}`,
      );
    }
  }
  for (const x of [-44.6, -26, -20.5, 13.5, 20.5, 44.6])
    b.box(x, 13.8, 11.9, x === 13.5 ? 1.1 : 0.55, 19.3, 0.65, "#c3bd9f");
  b.sculpt(new T.BoxGeometry(87, 3.8, 0.3), 0, 2.5, 11.8, "#345d63", "glass");
  b.box(0, 23.8, 11.8, 91, 0.5, 1, "#f4ce7b", 0, true);
  for (const side of [-1, 1]) {
    b.box(side * 45.2, 13.7, -7, 0.25, 18.4, 34.5, "#294559");
    for (let row = 0; row < (detail ? 25 : 12); row++) {
      const t = row / (detail ? 24 : 11),
        y = 5.1 + t * 17.5;
      const color = new T.Color("#d0bc91").lerp(new T.Color("#4d657a"), t);
      b.box(
        side * 45.4,
        y,
        -7,
        0.15,
        detail ? 0.2 : 0.3,
        34,
        `#${color.getHexString()}`,
      );
    }
    b.box(side * 45.4, 23.8, -7, 0.8, 0.5, 36, "#f4ce7b", 0, true);
    // Low riverside restaurant pavilions and broad public promenade.
    b.box(side * 32, 2.7, 18, 23, 5, 9, "#8b9a85");
    b.sculpt(
      new T.BoxGeometry(22, 3.9, 0.3),
      side * 32,
      2.7,
      22.7,
      "#3e6c6f",
      "glass",
    );
    b.box(side * 32, 5.5, 18, 24, 0.6, 10, "#cfcbb2");
    b.box(side * 32, 5.1, 22.5, 21, 0.12, 0.3, "#f3cf8a", 0, true);
  }
  for (const y of [6, 11, 16, 21]) {
    b.box(0, y, -25.3, 89, 0.35, 0.65, "#bdc1ae");
  }
  b.box(0, 23.7, -7, 92, 0.7, 37.5, "#e0ddc4");
  for (const x of [-29, 5, 31]) {
    b.box(x, 24.8, -16, 7, 1.5, 8, "#b6beb0");
    if (detail)
      for (const dx of [-2, 0, 2])
        b.box(x + dx, 25.6, -16, 1.4, 0.2, 6.5, "#6c7e76");
  }
  sign(b, "RIVER CITY BANGKOK", 29, 15, 12.3, 24, "#314b60");
  // Vehicle arrival is the rear street frontage; central riverfront stays on foot.
  b.sculpt(new T.BoxGeometry(86, 4.8, 0.25), 0, 3.5, -25.25, GLASS, "glass");
  b.box(0, 6.2, -27.5, 32, 0.5, 6, "#dbd4b3");
  for (const x of [-13, 13]) b.box(x, 3, -29, 0.4, 6, 0.4, "#d2ceb1");
  for (const side of [-1, 1])
    rail(b, side * 32, 32, 29, true, detail, "#777f6d");
  const plants = landscape(b);
  for (const x of [-46, 46])
    for (const z of [16, 28]) {
      b.box(x, 0.5, z, 3, 0.8, 3, "#b8ad8b");
      plants.tree(x, z, 7.2, true);
    }
  if (detail)
    for (const x of [-39, -31, -23, 23, 31, 39]) {
      b.sculpt(
        new T.CylinderGeometry(1.25, 1.25, 0.18, 10),
        x,
        1.1,
        27,
        "#bd9e70",
      );
      b.box(x, 0.6, 27, 0.16, 1.2, 0.16, "#6a6c53");
      for (const dz of [-1.6, 1.6])
        b.box(x, 0.5, 27 + dz, 1.2, 0.8, 0.65, "#997d56");
    }
}

const BUILDERS: Record<string, (b: B, detail: boolean) => void> = {
  swing: giantSwing,
  flowers: flowerMarket,
  "jim-thompson": jimThompson,
  "river-city": riverCity,
};

export function buildHistoricDistrict(id: string, detail: boolean) {
  const make = BUILDERS[id];
  if (!make) return;
  const b = new LandmarkBuilder();
  make(b, detail);
  return b.finish(`historic-${id}-v1-${detail ? "near" : "far"}`);
}

export function historicDistrictLandmark(l: Landmark) {
  if (!BUILDERS[l.id!]) return;
  const root = new T.LOD();
  for (const detail of [true, false])
    root.addLevel(
      buildHistoricDistrict(l.id!, detail)!,
      detail ? 0 : 210,
      0.12,
    );
  root.userData.authoredAsset = `historic-${l.id}-v1`;
  root.userData.nightMaterials = root.levels.flatMap(
    (level) => level.object.userData.nightMaterials ?? [],
  );
  return root;
}
