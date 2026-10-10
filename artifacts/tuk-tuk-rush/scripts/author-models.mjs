/** Original game art. Metres, Y up, +Z forward; no downloaded geometry. */
import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import fs from "node:fs/promises";
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((r) => {
      this.result = r;
      this.onloadend?.();
    });
  }
};
const mat = (name, color, roughness = 0.6, metalness = 0) => {
  const m = new T.MeshStandardMaterial({ color, roughness, metalness });
  m.name = name;
  return m;
};
const jade = mat("enamel-jade", "#087c76", 0.28, 0.3),
  gold = mat("warm-brass", "#dcb345", 0.27, 0.78),
  chrome = mat("polished-chrome", "#d4e3e6", 0.23, 0.88),
  tire = mat("rubber", "#202932", 0.92),
  red = mat("stitched-vermilion-vinyl", "#a63230", 0.7),
  dark = mat("chassis", "#253641", 0.63, 0.25),
  cream = mat("warm-ivory", "#f1dfb6", 0.55),
  glass = mat("blue-glass", "#70abb5", 0.16, 0.25),
  skin = mat("skin", "#b87e58", 0.9),
  cloth = mat("shirt", "#edc476", 0.94);
const light = mat("lamp-lens", "#ffdda2", 0.3);
light.emissive.set("#ffd6a0");
light.emissiveIntensity = 0.6;
const tail = mat("tail-lens", "#df4337", 0.3);
tail.emissive.set("#9f2117");
tail.emissiveIntensity = 0.5;
const add = (g, geo, m, x = 0, y = 0, z = 0) => {
  const o = new T.Mesh(geo, m);
  o.position.set(x, y, z);
  g.add(o);
  return o;
};
const rb = (g, w, h, d, x, y, z, m, r = 0.07) =>
  add(g, new RoundedBoxGeometry(w, h, d, 1, r), m, x, y, z);
function tube(g, points, r, m) {
  return add(
    g,
    new T.TubeGeometry(
      new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
      Math.max(4, points.length * 5),
      r,
      6,
      false,
    ),
    m,
  );
}
function canopy(g) {
  const v = [],
    uv = [],
    idx = [],
    nx = 24,
    nz = 10;
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      let x = (i / nx - 0.5) * 2.04,
        z = (j / nz - 0.5) * 2.62 - 0.32;
      v.push(
        x,
        2.18 +
          0.22 * Math.cos(((x / 1.02) * Math.PI) / 2) +
          0.04 * Math.sin((j / nz) * Math.PI),
        z,
      );
      uv.push(i / nx, j / nz);
    }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      let a = j * (nx + 1) + i,
        b = a + nx + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  let geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(v, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = jade.clone();
  m.side = T.DoubleSide;
  add(g, geo, m);
  for (let z of [-1.63, 0.99]) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const x = -1.02 + (i / 12) * 2.04;
      pts.push([x, 2.18 + 0.22 * Math.cos(((x / 1.02) * Math.PI) / 2), z]);
    }
    tube(g, pts, 0.045, gold);
  }
  for (let x of [-1.02, 1.02])
    tube(
      g,
      [
        [x, 2.18, -1.63],
        [x, 2.18, 0.99],
      ],
      0.045,
      gold,
    );
}
function wheel(parent, name, x, y, z) {
  const pivot = new T.Group();
  pivot.name = name;
  parent.add(pivot);
  pivot.position.set(x, y, z);
  const spin = new T.Group();
  spin.name = name + "Spin";
  pivot.add(spin);
  const tr = new T.TorusGeometry(0.27, 0.105, 8, 28).rotateY(Math.PI / 2);
  add(spin, tr, tire);
  add(
    spin,
    new T.CylinderGeometry(0.235, 0.235, 0.16, 24).rotateZ(Math.PI / 2),
    chrome,
  );
  add(
    spin,
    new T.CylinderGeometry(0.09, 0.09, 0.23, 16).rotateZ(Math.PI / 2),
    gold,
  );
  for (let i = 0; i < 8; i++) {
    let a = (i * Math.PI) / 4;
    const o = rb(
      spin,
      0.19,
      0.026,
      0.34,
      0,
      Math.sin(a) * 0.09,
      Math.cos(a) * 0.09,
      dark,
      0.01,
    );
    o.rotation.x = -a;
  }
  for (let i = 0; i < 24; i++) {
    let a = (i / 24) * Math.PI * 2;
    const o = rb(
      spin,
      0.2,
      0.013,
      0.045,
      0,
      Math.sin(a) * 0.369,
      Math.cos(a) * 0.369,
      tire,
      0.004,
    );
    o.rotation.x = -a;
  }
  return pivot;
}
function person(g, name, x, z, shirt) {
  const p = new T.Group();
  p.name = name;
  p.position.set(x, 0, z);
  g.add(p);
  add(p, new T.CapsuleGeometry(0.18, 0.27, 4, 10), shirt, 0, 1.36, 0);
  add(p, new T.SphereGeometry(0.17, 14, 10), skin, 0, 1.78, 0.02);
  add(
    p,
    new T.SphereGeometry(0.176, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    dark,
    0,
    1.81,
    0.02,
  );
  for (let side of [-1, 1]) {
    tube(
      p,
      [
        [side * 0.16, 1.49, 0.08],
        [side * 0.22, 1.32, 0.24],
        [side * 0.24, 1.27, 0.45],
      ],
      0.055,
      skin,
    );
    tube(
      p,
      [
        [side * 0.11, 1.12, 0.05],
        [side * 0.14, 0.95, 0.33],
        [side * 0.14, 0.66, 0.35],
      ],
      0.075,
      dark,
    );
    rb(p, 0.16, 0.08, 0.26, side * 0.14, 0.59, 0.4, dark, 0.04);
  }
  return p;
}
function hero() {
  const root = new T.Group();
  root.name = "TukTuk";
  const body = new T.Group();
  body.name = "Body";
  root.add(body);
  rb(body, 1.72, 0.18, 2.7, 0, 0.52, -0.25, dark);
  rb(body, 1.68, 0.12, 2.62, 0, 0.65, -0.28, jade);
  rb(body, 1.8, 0.07, 2.68, 0, 0.6, -0.3, chrome, 0.025);
  // Curved rear tub and wheel pods.
  rb(body, 1.83, 0.63, 0.18, 0, 0.96, -1.57, jade, 0.08);
  rb(body, 1.8, 0.09, 0.19, 0, 1.26, -1.57, gold, 0.025);
  for (let s of [-1, 1]) {
    rb(body, 0.16, 0.47, 1.34, s * 0.85, 0.86, -0.91, jade, 0.08);
    rb(body, 0.19, 0.07, 1.42, s * 0.86, 1.09, -0.89, gold, 0.025);
    rb(body, 0.28, 0.35, 0.95, s * 0.87, 0.66, -0.96, jade, 0.12);
    tube(
      body,
      [
        [s * 0.89, 0.56, -1.55],
        [s * 0.96, 0.66, -1.2],
        [s * 0.96, 0.66, -0.54],
      ],
      0.026,
      chrome,
    );
    tube(
      body,
      [
        [s * 0.87, 0.79, -1.55],
        [s * 0.89, 1.02, -1.33],
        [s * 0.89, 1.88, -1.51],
        [s * 0.93, 2.18, -1.53],
      ],
      0.033,
      chrome,
    );
    tube(
      body,
      [
        [s * 0.92, 0.66, 0.45],
        [s * 0.92, 1.77, 0.56],
        [s * 0.98, 2.18, 0.87],
      ],
      0.034,
      chrome,
    );
    rb(body, 0.28, 0.065, 0.7, s * 0.85, 0.46, 0.02, chrome, 0.025);
    for (let k = 0; k < 5; k++)
      rb(
        body,
        0.285,
        0.007,
        0.017,
        s * 0.85,
        0.497,
        -0.25 + k * 0.12,
        dark,
        0.002,
      );
  }
  // Sculpted cowl: tapered rounded extrusion, motorcycle nose rather than a cube.
  const shape = new T.Shape();
  shape.moveTo(-0.38, 0);
  shape.quadraticCurveTo(-0.57, 0.1, -0.5, 0.39);
  shape.quadraticCurveTo(-0.42, 0.73, 0, 0.76);
  shape.quadraticCurveTo(0.42, 0.73, 0.5, 0.39);
  shape.quadraticCurveTo(0.57, 0.1, 0.38, 0);
  shape.closePath();
  const cowl = new T.ExtrudeGeometry(shape, {
    depth: 0.46,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.065,
    bevelSegments: 3,
    steps: 1,
    curveSegments: 18,
  });
  add(body, cowl, jade, 0, 0.65, 0.81);
  rb(body, 0.92, 0.075, 0.16, 0, 0.86, 1.35, gold, 0.025);
  for (let i = 0; i < 7; i++)
    rb(body, 0.36, 0.014, 0.025, 0, 0.74 + i * 0.045, 1.37, chrome, 0.005);
  const steer = wheel(body, "Steering", 0, 0.38, 1.23);
  for (let s of [-1, 1])
    tube(
      steer,
      [
        [s * 0.14, 0, 0],
        [s * 0.15, 0.53, -0.14],
        [s * 0.11, 0.77, -0.24],
      ],
      0.033,
      chrome,
    );
  const fender = new T.TorusGeometry(0.43, 0.07, 6, 24, Math.PI).rotateY(
    Math.PI / 2,
  );
  add(steer, fender, jade, 0, 0, 0);
  for (let s of [-1, 1]) {
    rb(body, 0.14, 0.12, 0.08, s * 0.44, 1.08, 1.38, light, 0.035);
    const lamp = add(
      body,
      new T.CylinderGeometry(0.095, 0.095, 0.075, 20).rotateX(Math.PI / 2),
      chrome,
      s * 0.2,
      1.15,
      1.38,
    );
    add(body, new T.SphereGeometry(0.075, 16, 10), light, s * 0.2, 1.15, 1.43);
    void lamp;
  }
  wheel(body, "RearLeft", -0.88, 0.38, -1.03);
  wheel(body, "RearRight", 0.88, 0.38, -1.03);
  rb(body, 1.45, 0.2, 0.71, 0, 0.96, -1.07, red, 0.09);
  rb(body, 1.46, 0.56, 0.18, 0, 1.26, -1.42, red, 0.08);
  for (let s of [-1, 1])
    rb(body, 0.14, 0.13, 0.7, s * 0.74, 1.2, -1.02, red, 0.05);
  for (let i = 0; i < 9; i++)
    tube(
      body,
      [
        [-0.64 + i * 0.16, 1.07, -1.32],
        [-0.64 + i * 0.16, 1.07, -0.83],
      ],
      0.006,
      gold,
    );
  rb(body, 0.53, 0.17, 0.48, 0, 1.05, 0.1, red, 0.065);
  rb(body, 0.5, 0.4, 0.1, 0, 1.24, -0.12, red, 0.045);
  canopy(body);
  // Windshield, frame, mirrors and handlebar.
  rb(body, 1.19, 0.57, 0.027, 0, 1.82, 0.79, glass, 0.03);
  for (let s of [-1, 1])
    tube(
      body,
      [
        [s * 0.61, 1.52, 0.76],
        [s * 0.63, 2.11, 0.83],
      ],
      0.021,
      chrome,
    );
  tube(
    body,
    [
      [-0.61, 1.52, 0.76],
      [0, 1.51, 0.78],
      [0.61, 1.52, 0.76],
    ],
    0.026,
    chrome,
  );
  tube(
    body,
    [
      [-0.61, 2.1, 0.83],
      [0, 2.13, 0.83],
      [0.61, 2.1, 0.83],
    ],
    0.026,
    chrome,
  );
  const bars = new T.Group();
  bars.name = "Handlebars";
  bars.position.set(0, 1.32, 0.63);
  body.add(bars);
  tube(
    bars,
    [
      [-0.38, 0, 0],
      [-0.2, -0.05, 0],
      [0, -0.1, 0],
      [0.2, -0.05, 0],
      [0.38, 0, 0],
    ],
    0.025,
    chrome,
  );
  for (let s of [-1, 1]) {
    tube(
      body,
      [
        [s * 0.51, 1.49, 0.81],
        [s * 0.85, 1.62, 0.83],
      ],
      0.018,
      chrome,
    );
    rb(body, 0.22, 0.14, 0.055, s * 0.87, 1.65, 0.83, chrome, 0.05);
    rb(body, 0.18, 0.1, 0.012, s * 0.87, 1.65, 0.797, glass, 0.035);
    rb(bars, 0.16, 0.05, 0.05, s * 0.37, 0, 0, dark, 0.02);
    rb(body, 0.15, 0.23, 0.075, s * 0.68, 0.92, -1.7, tail, 0.035);
  }
  rb(body, 0.44, 0.22, 0.027, 0, 0.78, -1.7, cream, 0.025);
  tube(
    body,
    [
      [0.55, 0.43, -1.5],
      [0.55, 0.38, -1.7],
      [0.69, 0.38, -1.73],
    ],
    0.035,
    chrome,
  );
  person(body, "Driver", 0, 0.16, cloth);
  const passenger = person(body, "Passenger", 0, -0.95, cloth);
  passenger.visible = true;
  return root;
}
// Bake each articulated group by material: curves retain normals, wheels retain pivots.
function bake(group) {
  for (const c of [...group.children]) if (c instanceof T.Group) bake(c);
  const buckets = new Map();
  for (const o of [...group.children])
    if (o instanceof T.Mesh) {
      o.updateMatrix();
      const g = o.geometry.index
        ? o.geometry.toNonIndexed()
        : o.geometry.clone();
      g.applyMatrix4(o.matrix);
      g.deleteAttribute("uv");
      const key = o.material.uuid;
      if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [] });
      buckets.get(key).geos.push(g);
      group.remove(o);
      o.geometry.dispose();
    }
  for (const { mat, geos } of buckets.values()) {
    const raw = mergeGeometries(geos);
    const g = mergeVertices(raw);
    raw.dispose();
    add(group, g, mat);
    geos.forEach((g) => g.dispose());
  }
}
const model = hero();
bake(model);
const out = await new GLTFExporter().parseAsync(model, {
  binary: true,
  onlyVisible: false,
});
await fs.writeFile(
  new URL("../public/assets/models/hero-tuktuk.glb", import.meta.url),
  Buffer.from(out),
);
let tris = 0,
  meshes = 0;
model.traverse((o) => {
  if (o.isMesh) {
    meshes++;
    tris +=
      (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  }
});
console.log({ bytes: out.byteLength, triangles: tris, meshes });
