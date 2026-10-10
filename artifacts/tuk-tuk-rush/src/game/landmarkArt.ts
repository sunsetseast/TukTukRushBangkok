import * as T from "three";
import type { Landmark } from "./types";
import { StaticBatch } from "./staticBatch";

/** Original curved tile roof; rising tips rather than stacked rectangular slabs. */
function roof(width: number, depth: number, rise: number) {
  const vertices: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const nx = 20,
    nz = 8;
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const x = (i / nx - 0.5) * width,
        z = (j / nz - 0.5) * depth;
      const ex = Math.abs(x / (width / 2)),
        ez = Math.abs(z / (depth / 2));
      const y =
        rise * (1 - ez) +
        Math.pow(ex, 6) * rise * 0.48 +
        Math.pow(ez, 5) * rise * 0.22;
      vertices.push(x, y, z);
      uv.push(i / nx, j / nz);
    }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i,
        b = a + 1,
        c = a + nx + 1,
        e = c + 1;
      indices.push(a, c, b, b, c, e);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function buildLandmarkArt(l: Landmark) {
  const root = new T.Group();
  root.name = `Landmark:${l.kind}`;
  const batch = new StaticBatch(),
    o = new T.Object3D();
  const matte = new T.MeshStandardMaterial({
    roughness: 0.8,
    side: T.DoubleSide,
  });
  const metal = new T.MeshStandardMaterial({
    roughness: 0.4,
    metalness: 0.55,
    side: T.DoubleSide,
  });
  const box = new T.BoxGeometry(1, 1, 1),
    cylinder = new T.CylinderGeometry(1, 1, 1, 12);
  const add = (
    g: T.BufferGeometry,
    color: string,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    shiny = false,
    rz = 0,
    rx = 0,
  ) => {
    o.position.set(l.x + x, y, l.z + z);
    o.rotation.set(rx, 0, rz);
    o.scale.set(sx, sy, sz);
    o.updateMatrix();
    batch.add(
      g,
      shiny ? metal : matte,
      [o.matrix.clone()],
      [new T.Color(color)],
    );
  };
  const B = (
    color: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    shiny = false,
  ) => add(box, color, x, y, z, w, h, d, shiny);
  const roofLayer = (
    w: number,
    d: number,
    y: number,
    rise: number,
    color: string,
  ) => {
    add(roof(w, d, rise), color, 0, y, 0);
    B("#edbd58", 0, y + rise + 0.13, 0, w * 0.9, 0.18, 0.22, true);
    // Raised tile seams and end brackets retain the roof's curved silhouette.
    for (let x = -w * 0.46; x <= w * 0.46; x += 1.2) {
      const tip = Math.pow(Math.abs(x / (w / 2)), 6) * rise * 0.48;
      for (const side of [-1, 1])
        add(
          cylinder,
          "#c7a254",
          x,
          y + rise * 0.5 + tip,
          side * d * 0.25,
          0.025,
          Math.hypot(d / 2, rise),
          0.025,
          true,
          0,
          -side * Math.atan2(d / 2, rise),
        );
    }
    for (const side of [-1, 1]) {
      B(
        "#e7b955",
        side * w * 0.46,
        y + rise * 0.5,
        0,
        0.22,
        rise * 0.8,
        0.22,
        true,
      );
      add(
        new T.SphereGeometry(0.25, 8, 6),
        "#e7b955",
        side * w * 0.46,
        y + rise * 1.06,
        0,
        1,
        1,
        1,
        true,
      );
    }
  };
  if (l.kind === "gate") {
    for (const x of [-19, 19]) {
      B("#79746c", x, 0.4, 0, 5, 0.8, 7);
      B("#b22e2d", x, 7.6, 0, 4.4, 14.4, 6.4);
      B("#e4b557", x, 1.05, 0, 4.7, 0.22, 6.7, true);
      B("#e4b557", x, 11.9, 0, 4.6, 0.25, 6.6, true);
      for (const front of [-1, 1]) {
        B("#8a2029", x, 7, front * 3.23, 2.8, 9.8, 0.08);
        for (const dx of [-1.55, 1.55])
          B("#dfbc65", x + dx, 7, front * 3.31, 0.14, 10.3, 0.08, true);
        for (let j = 0; j < 7; j++)
          B("#e7bb58", x, 3 + j * 1.1, front * 3.34, 0.7, 0.18, 0.06, true);
      }
    }
    B("#a02b2b", 0, 13, 0, 42, 2.4, 5.7);
    for (const front of [-1, 1]) {
      B("#d6ae57", 0, 12.6, front * 2.92, 15, 2.1, 0.18, true);
      B("#6d2425", 0, 12.6, front * 3.04, 14.3, 1.65, 0.06);
      for (let x = -17; x <= 17; x += 3.4) {
        B("#cd954d", x, 14.2, front * 2.9, 0.35, 0.7, 1);
        B("#b64532", x, 14.7, front * 3.05, 1.3, 0.25, 1.5);
      }
    }
    roofLayer(47, 10, 14.5, 2.1, "#367b69");
    roofLayer(31, 7.5, 17, 1.7, "#438e79");
    roofLayer(18, 5.5, 19, 1.3, "#367b69");
    add(new T.SphereGeometry(0.8, 12, 8), "#e5b758", 0, 21.7, 0, 1, 1, 1, true);
  } else if (l.kind === "temple") {
    // Footprint 40x42; all solid ground-floor art fits the existing 42x44 collider.
    B("#d3b987", 0, 0.5, 0, 40, 1, 42);
    for (let k = 0; k < 4; k++)
      B("#e5d4b3", 0, 1 + k * 0.45, 0, 38 - k * 2, 0.45, 40 - k * 2);
    B("#eadfc9", 0, 7, 0, 29, 9, 30);
    for (const x of [-13, -8.6, -4.3, 0, 4.3, 8.6, 13]) {
      add(cylinder, "#f1e2c4", x, 6.6, 15.4, 0.45, 7.5, 0.45);
      B("#c39c52", x, 3, 15.4, 1.1, 0.35, 1.1, true);
      B("#d9b768", x, 10.2, 15.4, 1, 0.4, 1, true);
      if (x !== 0) {
        B("#914132", x, 6.5, 15.06, 2.2, 4.5, 0.13);
        B("#d6b354", x, 6.5, 15.16, 0.12, 4.6, 0.1, true);
      }
    }
    B("#442b2c", 0, 5.2, 15.06, 2.8, 5, 0.15);
    roofLayer(35, 36, 11.2, 3.2, "#caa553");
    B("#ede0c5", 0, 15.7, 0, 19, 2.3, 20);
    roofLayer(25, 25, 17, 2.8, "#cdaa58");
    B("#e4d3ac", 0, 20.8, 0, 11, 1.5, 12);
    roofLayer(17, 17, 21.6, 2.5, "#d5b465");
    for (let k = 0; k < 5; k++)
      add(
        new T.ConeGeometry(1.4 - k * 0.23, 1.7, 12),
        "#e1bc66",
        0,
        24.6 + k * 1.2,
        0,
        1,
        1,
        1,
        true,
      );
    add(new T.ConeGeometry(0.25, 4, 8), "#edcd78", 0, 31.2, 0, 1, 1, 1, true);
  } else {
    B("#e2cfaa", 0, 6, 0, 84, 12, 46);
    const barrel = new T.CylinderGeometry(
      15,
      15,
      80,
      24,
      1,
      true,
      0,
      Math.PI,
    ).rotateZ(Math.PI / 2);
    add(barrel, "#577e72", 0, 12, 0);
    for (let x = -36; x <= 36; x += 6) {
      B("#eee0bd", x, 7, 23.2, 1.2, 12, 1.5);
      B("#31595e", x + 2.4, 6.4, 23.13, 3.1, 7, 0.12);
      B("#cbb787", x, 12.8, 23.2, 2, 0.7, 2);
    }
    B("#e0c994", 0, 14, 23.4, 83, 0.65, 1.4);
    B("#c5b38b", 0, 2, 23.5, 84, 0.45, 1.7);
    const face = new T.CircleGeometry(2.2, 32);
    add(face, "#eee4c5", 0, 17.1, 23.55);
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6;
      B(
        "#324b4a",
        Math.sin(a) * 1.8,
        17.1 + Math.cos(a) * 1.8,
        23.62,
        0.14,
        0.18,
        0.08,
      );
    }
    B("#263f43", 0.3, 17.45, 23.7, 0.15, 1.4, 0.08);
    B("#263f43", -0.5, 17.1, 23.7, 1.2, 0.14, 0.08);
  }
  batch.finish().forEach((g) => root.add(g));
  return root;
}
