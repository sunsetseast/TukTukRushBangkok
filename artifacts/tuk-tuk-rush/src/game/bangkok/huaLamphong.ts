import * as T from "three";
import type { District, Obstacle } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import { LandmarkBuilder } from "./landmarkBuilder";
import { localPoint } from "./landmarkParcels";
/** Operator/TAT photographs establish a south-facing arched curtain wall and
 * a colonnade, with the train shed behind. Dimensions below are game metres,
 * an original miniature interpretation, never a measured survey. */
export const HUA_PLAN = {
  map: [600, 528] as [number, number],
  yaw: 0,
  width: 84,
  depth: 180,
  front: 30,
  height: 27,
  yard: { centerZ: -110, width: 91, depth: 302 },
};
export function placeHuaLamphong(d: District) {
  const l = d.landmarks.find((l) => l.id === "hua")!,
    origin = l.plot!;
  l.x = origin.x;
  l.z = origin.z;
  l.yaw = HUA_PLAN.yaw;
  l.size = HUA_PLAN.width;
  d.obstacles = d.obstacles.filter((o) => o.landmarkId !== "hua");
  const mass = (
    x: number,
    z: number,
    w: number,
    depth: number,
    height: number,
  ): Obstacle => ({
    ...localPoint(origin, l.yaw!, x, z),
    w,
    d: depth,
    height,
    yaw: l.yaw,
    color: "#eee4cf",
    landmarkId: l.id,
  });
  d.obstacles.push(
    mass(0, -54, 58, 166, 27),
    mass(-35, -4, 13, 67, 12.5),
    mass(35, -4, 13, 67, 12.5),
    mass(-44.5,-110,.8,300,2), mass(44.5,-110,.8,300,2),
    mass(0,-260,90,.8,2),
  );
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const access = d.roads
    .filter((r) => r.corridor === "ramaiv")
    .flatMap((r) => [nodes.get(r.a)!, nodes.get(r.b)!])
    .sort(
      (a, b) =>
        Math.hypot(a.x - origin.x, a.z - origin.z) -
        Math.hypot(b.x - origin.x, b.z - origin.z),
    )[0]!;
  l.accessNode = access.id;
}
function ellipse(radius: number, rise: number, segments: number) {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = Math.PI - (i * Math.PI) / segments;
    return [Math.cos(a) * radius, 9 + Math.sin(a) * rise] as const;
  });
}
export function buildHuaLamphong(b: LandmarkBuilder, detail: boolean) {
  const CREAM = "#eee7d7",
    IVORY = "#faf4e6",
    DARK = "#193e47",
    BASE = "#765a4d",
    n = detail ? 40 : 20;
  b.box(0, 0.3, -53, 84, 0.6, 178, "#c6bda6");
  // Long train shed and low classical side wings; no roof pretending to be a tower.
  b.box(0, 4, -54, 58, 8, 160, "#d4c9ae");
  for (const side of [-1, 1]) {
    b.box(side * 35, 5.3, -4, 13, 10.6, 67, CREAM);
    b.box(side * 35, 11, -4, 14, 0.7, 68, IVORY);
    b.box(side * 35, 12, -4, 13, 0.7, 67, "#c5bcaa");
    for (let z = -30; z < 30; z += 8) {
      b.box(side * 41.55, 5, z, 0.16, 5.5, 3.8, DARK);
      b.box(side * 41.7, 8.1, z, 0.25, 0.35, 4.3, IVORY);
    }
    b.box(side * 35, 6, 29, 13, 12, 4, CREAM);
    b.box(side * 35, 12.5, 29, 14, 0.8, 5, IVORY);
    b.box(side * 35, 13.1, 29, 12, 0.5, 4, CREAM);
    for (const x of [-4, 0, 4])
      b.box(side * 35 + x, 6, 31.1, 2, 5.6, 0.2, DARK);
  }
  const outline = ellipse(30, 18, n),
    inside = ellipse(28, 16, n),
    outerShape = new T.Shape();
  outerShape.moveTo(-30, 8);
  for (const [x, y] of outline) outerShape.lineTo(x, y);
  outerShape.lineTo(30, 8);
  outerShape.closePath();
  b.sculpt(
    new T.ExtrudeGeometry(outerShape, { depth: 1.7, bevelEnabled: false }),
    0,
    0,
    28.1,
    CREAM,
  );
  const glass = new T.Shape();
  glass.moveTo(-28, 8.8);
  for (const [x, y] of inside) glass.lineTo(x, y);
  glass.lineTo(28, 8.8);
  glass.closePath();
  b.sculpt(new T.ShapeGeometry(glass), 0, 0, 29.87, DARK, "glass");
  // Parallel rectangular glazing bars match the historic curtain wall. The
  // former radial fan was a different architectural composition.
  for (let x = -26; x <= 26; x += detail ? 2.6 : 5.2) {
    const top = 9 + 16 * Math.sqrt(1 - (x * x) / (28 * 28));
    b.box(x, (top + 9) / 2, 29.99, 0.11, top - 9, 0.13, "#c5c3ac");
  }
  for (const y of [10.8, 14, 17.2, 20.4, 23.6]) {
    const half = 28 * Math.sqrt(1 - ((y - 9) / 16) ** 2);
    b.box(0, y, 30, half * 2, 0.11, 0.14, "#b5b9a7");
  }
  // Cream arch rim and repeated inset panels, efficiently merged by LandmarkBuilder.
  for (let i = 0; i < n; i++) {
    const [x1, y1] = outline[i]!,
      [x2, y2] = outline[i + 1]!,
      dx = x2 - x1,
      dy = y2 - y1;
    b.sculpt(
      new T.BoxGeometry(Math.hypot(dx, dy) + 0.12, 1.65, 0.4).rotateZ(
        Math.atan2(dy, dx),
      ),
      (x1 + x2) / 2,
      (y1 + y2) / 2,
      30.02,
      IVORY,
    );
    if (detail && i % 2 === 0) {
      const [ix, iy] = inside[i]!,
        [jx, jy] = inside[i + 1]!;
      b.sculpt(
        new T.BoxGeometry(
          Math.hypot(jx - ix, jy - iy) * 0.8,
          0.55,
          0.1,
        ).rotateZ(Math.atan2(dy, dx)),
        (x1 + x2) / 2,
        (y1 + y2) / 2,
        30.25,
        "#c5bca5",
      );
    }
  }
  // Barrel vault: same ellipse behind the front, not a competing circular dome.
  const verts: number[] = [],
    indices: number[] = [];
  for (const z of [-137, 28])
    for (const [x, y] of ellipse(29, 17, n)) verts.push(x, y, z);
  for (let i = 0; i < n; i++) {
    const j = i + n + 1;
    indices.push(i, j, i + 1, i + 1, j, j + 1);
  }
  const roof = new T.BufferGeometry();
  roof.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
  roof.setIndex(indices);
  roof.computeVertexNormals();
  b.sculpt(roof, 0, 0, 0, "#879991", "ceramic");
  if (detail)
    for (const z of [-134,-112,-90,-68,-46,-24,-1,21])
      for (let i = 0; i < n; i++) {
        const [x1, y1] = outline[i]!,
          [x2, y2] = outline[i + 1]!;
        b.sculpt(
          new T.BoxGeometry(0.13, Math.hypot(x2 - x1, y2 - y1), 0.17).rotateZ(
            -Math.atan2(x2 - x1, y2 - y1),
          ),
          (x1 + x2) / 2,
          (y1 + y2) / 2 - 0.9,
          z,
          "#bdc2ad",
        );
      }
  // Mainline tracks remain ground-level north of the shed. This is a compact
  // station reservation, distinct from underground MRT BL28 southeast.
  b.box(0,.08,-198,88,.12,124,'#898a78');
  for(const x of [-22,-11,0,11,22]) {
    for(const side of [-1,1])b.box(x+side*.8,.2,-195,.1,.18,116,'#5e6762');
    if(detail)for(let z=-248;z<-137;z+=3.5)b.box(x,.15,z,2.7,.15,.27,'#6e5e4e');
    b.box(x,.5,-247,2.4,.7,.6,'#935a43');
  }
  for(const x of [-44.5,44.5]) {
    b.box(x,1,-110,.8,2,300,'#b7b49f');
    if(detail)for(let z=-255;z<35;z+=10)b.box(x,1.6,z,.22,3.2,.22,'#6b776a');
  }
  b.box(0,1,-260,90,2,.8,'#b7b49f');
  // Recessed entrance wall, columned portico and continuous balustrade.
  b.box(0, 3.8, 27.7, 60, 7.6, 0.5, "#cbbd9e");
  for (let x = -27; x <= 27; x += 4.5) {
    b.box(x, 3.5, 28.1, 2.7, 5.3, 0.2, DARK);
    if (detail) b.box(x, 3.5, 28.25, 0.08, 5.3, 0.1, "#c3b99e");
  }
  for (let x = -30; x <= 30; x += 5) {
    b.sculpt(
      new T.CylinderGeometry(0.34, 0.44, 6.5, detail ? 10 : 6),
      x,
      3.75,
      32.1,
      IVORY,
    );
    b.box(x, 0.7, 32.1, 1.05, 1.2, 1.05, BASE);
    b.box(x, 7.1, 32.1, 1.1, 0.45, 1.1, IVORY);
  }
  b.box(0, 7.8, 31.6, 63, 1, 4.5, IVORY);
  b.box(0, 8.5, 33.4, 63, 0.25, 0.4, "#d0c5ad");
  b.box(0, 10, 33.4, 63, 0.3, 0.45, IVORY);
  for (let x = -30; x <= 30; x += detail ? 1 : 2)
    b.sculpt(new T.CylinderGeometry(0.1, 0.15, 1.3, 5), x, 9.3, 33.4, IVORY);
  for (const x of [-30, -15, 15, 30]) {
    b.box(x, 9.2, 33.4, 0.7, 1.8, 0.7, IVORY);
    b.sculpt(new T.SphereGeometry(0.4, 6, 4), x, 10.5, 33.4, IVORY);
  }
  // Clock centred in the glazing, readable at the same acceptance viewpoint.
  b.sculpt(new T.CircleGeometry(1.65, 32), 0, 19.2, 30.18, "#b8dad0");
  b.sculpt(new T.TorusGeometry(1.7, 0.18, 5, 32), 0, 19.2, 30.3, IVORY);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    b.box(
      Math.sin(a) * 1.32,
      19.2 + Math.cos(a) * 1.32,
      30.4,
      0.11,
      0.2,
      0.08,
      DARK,
    );
  }
  b.box(0, 19.7, 30.48, 0.18, 1.2, 0.1, DARK);
  b.box(0.47, 19.2, 30.48, 1, 0.18, 0.1, DARK);
  b.box(0, 0.2, 34.7, 80, 0.4, 2.4, "#d6cdb9");
  // Warm concealed portico strips reuse the existing day/night material.
  b.box(0, 7.25, 32.3, 59, 0.08, 1.6, "#ffd89a", 0, true);
}
export function emitHuaGrounds(d: District, emit: (p: ArtPiece) => void) {
  const l = d.landmarks.find((l) => l.id === "hua")!;
  const put = (
    x: number,
    z: number,
    y: number,
    w: number,
    h: number,
    depth: number,
    color: string,
    layer: ArtPiece["layer"] = "core",
  ) =>
    emit({
      ...localPoint(l.plot!, l.yaw ?? 0, x, z),
      y,
      w,
      h,
      d: depth,
      color,
      yaw: l.yaw ?? 0,
      surface: "concrete",
      siteId: "hua-forecourt",
      layer,
    });
  // Tiled forecourt fits the actual reserved trapezoid, with a narrow drop-off
  // apron joining the shared road. No full-property grey rectangle.
  for (let x = -40; x <= 40; x += 4)
    for (let z = 36; z <= 68; z += 4) {
      if (z > 48 && x < ((z - 48) * 54) / 28 - 43 + 3) continue;
      put(
        x,
        z,
        0.035,
        3.9,
        0.06,
        3.9,
        (Math.round(x / 4) + Math.round(z / 4)) % 2 ? "#c9c3ad" : "#d5cdb8",
      );
    }
  for (const side of [-1, 1])
    for (let z = 37; z < 48; z += 2)
      put(
        side * 42,
        z,
        0.14,
        0.45,
        0.28,
        1.9,
        Math.round(z) % 4 ? "#f3e5cd" : "#a95c53",
      );
  // Crossing at the east side of the real drivable Rama IV approach. Flat
  // paint is allowed on asphalt; it never becomes a collider.
  for (let z = 80; z <= 98; z += 2) put(2, z, 0.04, 7, 0.025, 1, "#e6e6d8");
  for (const x of [-34, 34]) {
    put(x, 39, 1.2, 0.16, 2.4, 0.16, "#586064");
    put(x, 39, 2.4, 2, 0.2, 0.5, "#e6d1a7");
    put(x, 39, 0.2, 3.8, 0.4, 2.4, "#b4a38a");
    put(x, 39, 0.45, 3.4, 0.1, 2, "#6f9973");
  }
}
