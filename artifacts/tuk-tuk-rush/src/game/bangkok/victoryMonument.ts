import * as T from "three";
import type { Landmark } from "../types";
import { LandmarkBuilder } from "./landmarkBuilder";
import { sectionLoft, ribbonPath } from "./sculptureGeometry";
import {
  VICTORY_SITE,
  victorySkywalkColumns,
  victoryShelters,
} from "./civicRoads";

/** Original stylized model from Bangkok district/TAT references: five joined
 * bayonets, a stepped memorial hall and five service figures, not a square pole. */
function bladeGeometry(): T.BufferGeometry {
  const levels = [
    { y: 11.4, r: 3.4 },
    { y: 17, r: 3.6 },
    { y: 44.7, r: 2.1 },
    { y: 49.8, r: 0.03 },
  ];
  const positions: number[] = [],
    indices: number[] = [];
  // Five broad raised blade edges alternating with narrow deep valleys.
  for (const { y, r } of levels)
    for (let j = 0; j < 10; j++) {
      const angle = (j * Math.PI) / 5,
        radius = j % 2 ? r * 0.34 : r;
      positions.push(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
    }
  for (let k = 0; k < levels.length - 1; k++)
    for (let j = 0; j < 10; j++) {
      const a = k * 10 + j,
        b = k * 10 + ((j + 1) % 10);
      indices.push(a, b, a + 10, b, b + 10, a + 10);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function figure(
  b: LandmarkBuilder,
  angle: number,
  index: number,
  detail: boolean,
): void {
  const matrix = new T.Matrix4().makeRotationY(angle);
  matrix.setPosition(Math.sin(angle) * 10.8, 4.8, Math.cos(angle) * 10.8);
  const put = (g: T.BufferGeometry, color = "#526358") =>
    b.sculpt(g.applyMatrix4(matrix), 0, 0, 0, color, "bronze");
  // Double-life-scale silhouettes with individual uniforms/occupations.
  for (const s of [-1, 1]) {
    put(new T.CylinderGeometry(0.25, 0.21, 1.7, 6).translate(s * 0.32, 1, 0));
    put(new T.BoxGeometry(0.52, 0.3, 0.9).translate(s * 0.32, 0.18, 0.2));
  }
  put(
    sectionLoft(
      [
        { p: [0, 1.6, 0], a: 0.46, b: 0.28 },
        { p: [0, 2.5, 0], a: 0.62, b: 0.34 },
        { p: [0, 3.2, 0], a: 0.73, b: 0.34 },
        { p: [0, 3.4, 0], a: 0.28, b: 0.24 },
      ],
      detail ? 10 : 6,
      detail ? 12 : 7,
    ),
  );
  put(
    new T.SphereGeometry(0.38, detail ? 10 : 6, 7)
      .scale(0.85, 1.18, 0.9)
      .translate(0, 3.95, 0),
  );
  if (index < 4)
    put(
      new T.CylinderGeometry(index === 0 ? 0.38 : 0.32, 0.43, 0.2, 8).translate(
        0,
        4.32,
        0,
      ),
    );
  if (index === 1)
    put(new T.BoxGeometry(0.75, 0.1, 0.58).translate(0, 4.23, 0.15));
  for (const side of [-1, 1])
    put(
      ribbonPath(
        [
          [side * 0.58, 3.15, 0],
          [side * 0.77, 2.48, 0.16],
          [side * 0.43, 2.13, 0.35],
        ],
        0.19,
        5,
        detail ? 8 : 4,
      ),
    );
  if (index < 3)
    put(
      new T.CylinderGeometry(0.07, 0.07, 2.5, 5).translate(0.75, 2.1, 0.38),
      "#435248",
    );
  else put(new T.BoxGeometry(0.62, 0.62, 0.15).translate(-0.39, 2.26, 0.48));
}
function build(detail: boolean): T.Group {
  const b = new LandmarkBuilder(),
    stone = "#d8d5c4",
    bronze = "#53695b";
  const apron = new T.Shape();
  apron.absarc(0, 0, 104, 0, Math.PI * 2, false);
  const hole = new T.Path();
  hole.absarc(0, 0, 79, 0, Math.PI * 2, true);
  apron.holes.push(hole);
  b.sculpt(
    new T.ShapeGeometry(apron, detail ? 64 : 32).rotateX(-Math.PI / 2),
    0,
    0.1,
    0,
    "#c1b69a",
  );
  for (const p of victoryShelters()) {
    const x = p.x - VICTORY_SITE.center.x,
      z = p.z - VICTORY_SITE.center.z;
    b.box(x, 3.5, z, 11, 0.35, 4.5, "#60877b", p.yaw);
    b.box(x, 3.28, z, 9, 0.08, 3, "#f2d48b", p.yaw, true);
    for (const side of [-1, 1])
      b.box(
        x + Math.cos(p.yaw) * side * 4,
        1.7,
        z - Math.sin(p.yaw) * side * 4,
        0.45,
        3.4,
        0.45,
        "#7c9b86",
      );
    b.box(x, 0.8, z, 7, 0.3, 1.2, "#a8885d", p.yaw);
  }
  b.sculpt(
    new T.CylinderGeometry(42, 42, 0.32, detail ? 64 : 32),
    0,
    0.18,
    0,
    "#889975",
  );
  b.sculpt(
    new T.CylinderGeometry(38, 38, 0.32, detail ? 64 : 32),
    0,
    0.38,
    0,
    "#d0c5ac",
  );
  b.sculpt(new T.CylinderGeometry(25, 26, 0.8, 32), 0, 0.9, 0, "#aeb3a5");
  for (let i = 0; i < 5; i++)
    b.sculpt(
      new T.CylinderGeometry(23.3 - i * 1.5, 24.6 - i * 1.5, 0.7, 20),
      0,
      1.55 + i * 0.68,
      0,
      stone,
    );
  b.sculpt(new T.CylinderGeometry(13.8, 15.2, 5.1, 10), 0, 6.9, 0, "#b9bcae");
  b.sculpt(new T.CylinderGeometry(13.8, 13.8, 0.6, 10), 0, 9.55, 0, "#ded9c7");
  b.sculpt(new T.CylinderGeometry(6.3, 8.7, 2.1, 10), 0, 10.8, 0, stone);
  b.sculpt(bladeGeometry(), 0, 0, 0, "#e3dfd0");
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    figure(b, a, i, detail);
    b.box(
      Math.sin(a) * 16.9,
      0.66,
      Math.cos(a) * 16.9,
      2.4,
      0.12,
      0.55,
      "#e6be7d",
      a,
      true,
    );
    b.box(
      Math.sin(a) * 13.9,
      6.7,
      Math.cos(a) * 13.9,
      4.4,
      2.6,
      0.15,
      "#43584e",
      a,
    );
    if (detail)
      for (let line = 0; line < 5; line++)
        b.box(
          Math.sin(a) * 14.04,
          5.85 + line * 0.38,
          Math.cos(a) * 14.04,
          3.6,
          0.045,
          0.06,
          "#bba977",
          a,
        );
  }
  for (let i = 0; i < 32; i++) {
    const a = (i * Math.PI * 2) / 32,
      x = Math.sin(a) * 37.4,
      z = Math.cos(a) * 37.4;
    b.box(x, 1.25, z, 0.13, 1.4, 0.13, bronze);
    if (detail) b.box(x, 1.25, z, 7.3, 0.12, 0.12, bronze, a);
  }
  // Mark the two usable circulating lanes. These are batched surface geometry,
  // not a second visual-only road or a second, disconnected navigation graph.
  for (let i = 0; i < 56; i++) {
    const a = (i * Math.PI * 2) / 56;
    b.box(
      Math.sin(a) * VICTORY_SITE.roadRadius,
      0.245,
      Math.cos(a) * VICTORY_SITE.roadRadius,
      3.1,
      0.025,
      0.14,
      "#ded7bb",
      a,
    );
  }
  // A horseshoe pedestrian skywalk outside the moving lanes. The south opening
  // faces the BTS station. Traffic always remains below the 8.4m clear span.
  const R = VICTORY_SITE.skywalkRadius,
    steps = detail ? 46 : 30,
    start = 0.32,
    end = Math.PI * 2 - 0.32;
  for (let i = 0; i < steps; i++) {
    const a = start + ((end - start) * (i + 0.5)) / steps,
      span = ((end - start) / steps) * R + 0.08;
    b.box(Math.sin(a) * R, 8.65, Math.cos(a) * R, span, 0.6, 4.4, "#b3b8ad", a);
    for (const side of [-1, 1])
      b.box(
        Math.sin(a) * (R + side * 1.9),
        9.35,
        Math.cos(a) * (R + side * 1.9),
        span,
        0.9,
        0.13,
        "#d0d0bd",
        a,
      );
    if (detail && i % 3 === 0) {
      b.box(
        Math.sin(a) * (R - 1.6),
        8.91,
        Math.cos(a) * (R - 1.6),
        span,
        0.08,
        0.09,
        "#f6cf86",
        a,
        true,
      );
    }
  }
  for (const p of victorySkywalkColumns())
    b.box(
      p.x - VICTORY_SITE.center.x,
      4.25,
      p.z - VICTORY_SITE.center.z,
      1.1,
      8.4,
      1.1,
      "#aeb3a9",
    );
  return b.finish(
    `victory-five-bayonets-roundabout-${detail ? "near" : "far"}-v1`,
  );
}
export function victoryMonument(l: Landmark): T.LOD | undefined {
  if (l.id !== "victory") return;
  const near = build(true),
    far = build(false),
    lod = new T.LOD();
  lod.addLevel(near, 0);
  lod.addLevel(far, 185);
  lod.userData.authoredAsset = near.userData.authoredAsset;
  lod.userData.nightMaterials = [
    ...near.userData.nightMaterials,
    ...far.userData.nightMaterials,
  ];
  return lod;
}
