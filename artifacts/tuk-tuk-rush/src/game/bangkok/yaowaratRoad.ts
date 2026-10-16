import * as T from "three";
import type { District } from "../types";
/** Thin washed gutter bands, ordinary dry asphalt stays on most of the carriageway.
 * Same-origin aggregate is shared with the road. No SSR, reflection pass or collider. */
export function yaowaratRoad(d: District, asphalt: T.MeshStandardMaterial) {
  const positions: number[] = [],
    uv: number[] = [],
    marks: number[] = [];
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  for (const r of d.roads.filter((r) => r.corridor === "yaowarat")) {
    const a = nodes.get(r.a)!,
      b = nodes.get(r.b)!;
    if (a.x < -145 || a.x > 110) continue;
    const dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz),
      tx = dx / len,
      tz = dz / len;
    const quad = (
      u: number,
      v: number,
      w: number,
      L: number,
      y: number,
      out: number[],
    ) => {
      for (const [x, z] of [
        [-0.5, -0.5],
        [0.5, 0.5],
        [0.5, -0.5],
        [-0.5, -0.5],
        [-0.5, 0.5],
        [0.5, 0.5],
      ]) {
        const X = a.x + tx * (v + z! * L) + tz * (u + x! * w),
          Z = a.z + tz * (v + z! * L) - tx * (u + x! * w);
        out.push(X, y, Z);
        if (out === positions) uv.push(X * 0.24, Z * 0.24);
      }
    };
    for (const side of [-1, 1])
      quad(side * (r.width / 2 - 0.46), len / 2, 0.7, len, 0.147, positions);
    for (let t = 7; t < len - 3; t += 10) quad(0, t, 0.105, 2.8, 0.16, marks);
  }
  const root = new T.Group();
  root.name = "YaowaratRoadFinish";
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const band = new T.Mesh(
    geo,
    new T.MeshStandardMaterial({
      map: asphalt.map,
      color: "#a8a3bb",
      roughness: 0.62,
      metalness: 0.08,
    }),
  );
  root.add(band);
  const markGeo = new T.BufferGeometry();
  markGeo.setAttribute("position", new T.Float32BufferAttribute(marks, 3));
  markGeo.computeVertexNormals();
  const m = new T.Mesh(
    markGeo,
    new T.MeshStandardMaterial({ color: "#f2e5c8", roughness: 0.89 }),
  );
  root.add(m);
  return root;
}
