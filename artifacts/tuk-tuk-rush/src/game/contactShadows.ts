import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { District } from "./types";
/** Static architectural sun shadows, baked from gameplay footprints. Zero shadow-map passes. */
export function architectureShadows(d: District) {
  const geos: T.BufferGeometry[] = [];
  for (const b of d.buildings) {
    // Convex hull of footprint and its projection away from the warm key light.
    const sx = b.height * 1.2,
      sz = -b.height * 0.6;
    const pts = [
      [-b.w / 2, -b.d / 2],
      [b.w / 2, -b.d / 2],
      [b.w / 2, b.d / 2],
      [-b.w / 2, b.d / 2],
    ]
      .flatMap(([lx, lz]) => {
        const cy = Math.cos(b.yaw ?? 0), sy = Math.sin(b.yaw ?? 0);
        const x = cy * lx! + sy * lz!, z = -sy * lx! + cy * lz!;
        return [
          [x + b.x, z + b.z],
          [x + b.x + sx, z + b.z + sz],
        ];
      })
      .sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
    const cross = (a: number[], b: number[], c: number[]) =>
      (b[0]! - a[0]!) * (c[1]! - a[1]!) - (b[1]! - a[1]!) * (c[0]! - a[0]!);
    const lo: number[][] = [],
      hi: number[][] = [];
    for (const p of pts) {
      while (
        lo.length > 1 &&
        cross(lo[lo.length - 2]!, lo[lo.length - 1]!, p) <= 0
      )
        lo.pop();
      lo.push(p);
    }
    for (const p of [...pts].reverse()) {
      while (
        hi.length > 1 &&
        cross(hi[hi.length - 2]!, hi[hi.length - 1]!, p) <= 0
      )
        hi.pop();
      hi.push(p);
    }
    lo.pop();
    hi.pop();
    const hull = [...lo, ...hi];
    const shape = new T.Shape(hull.map((p) => new T.Vector2(p[0], -p[1]!)));
    const geo = new T.ShapeGeometry(shape)
      .rotateX(-Math.PI / 2)
      .translate(0, 0.185, 0);
    geos.push(geo);
  }
  const mesh = new T.Mesh(
    mergeGeometries(geos)!,
    new T.MeshBasicMaterial({
      color: "#40545c",
      transparent: true,
      opacity: 0.19,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  geos.forEach((g) => g.dispose());
  return mesh;
}
export function vehicleShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(32, 32, 7, 32, 32, 31);
  grad.addColorStop(0, "rgba(16,28,36,.55)");
  grad.addColorStop(1, "rgba(16,28,36,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new T.CanvasTexture(canvas);
  const mesh = new T.Mesh(
    new T.PlaneGeometry(3.1, 4.5).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.position.y = 0.2;
  return mesh;
}
