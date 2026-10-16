import * as T from "three";
import type { District } from "../types";
/** Spatially batched contact and feathered sun projections, without shadow maps. */
export function cityShadows(d: District) {
  const root = new T.Group(),
    cells = new Map<string, { p: number[]; c: number[] }>();
  root.name = "BangkokGroundShadows";
  const material = new T.MeshBasicMaterial({
    color: "#263848",
    vertexColors: true,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  for (const b of d.buildings) {
    const key = `${Math.floor(b.x / 120)}:${Math.floor(b.z / 120)}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = { p: [], c: [] };
      cells.set(key, cell);
    }
    const c = Math.cos(b.yaw ?? 0),
      s = Math.sin(b.yaw ?? 0),
      length = Math.min(28, b.height * 0.58),
      dx = length,
      dz = -length * 0.5;
    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([x, z]) => ({
      x: b.x + (c * x! * b.w) / 2 + (s * z! * b.d) / 2,
      z: b.z - (s * x! * b.w) / 2 + (c * z! * b.d) / 2,
    }));
    for (let i = 0; i < 4; i++) {
      const a = corners[i]!,
        q = corners[(i + 1) % 4]!,
        nx = q.z - a.z,
        nz = a.x - q.x;
      if (nx * dx + nz * dz <= 0) continue;
      const verts = [
        [a.x, a.z, 0.6],
        [q.x, q.z, 0.6],
        [q.x + dx, q.z + dz, 0],
        [a.x + dx, a.z + dz, 0],
      ];
      for (const j of [0, 2, 1, 0, 3, 2]) {
        const v = verts[j]!;
        cell.p.push(v[0]!, 0.232, v[1]!);
        cell.c.push(1, 1, 1, v[2]!);
      }
    }
    const grown = corners.map((q) => ({
      x: b.x + (q.x - b.x) * 1.035,
      z: b.z + (q.z - b.z) * 1.035,
    }));
    for (const j of [0, 2, 1, 0, 3, 2]) {
      cell.p.push(grown[j]!.x, 0.233, grown[j]!.z);
      cell.c.push(1, 1, 1, 0.22);
    }
  }
  for (const [key, b] of cells) {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(b.p, 3));
    g.setAttribute(
      "color",
      new T.Uint8BufferAttribute(
        b.c.map((v) => Math.round(v * 255)),
        4,
        true,
      ),
    );
    g.computeBoundingSphere();
    const m = new T.Mesh(g, material),
      group = new T.Group();
    group.name = "BangkokSector";
    group.userData.shadow = true;
    group.userData.cell = key;
    group.add(m);
    root.add(group);
  }
  return {
    root,
    material,
    setNight: (night: number) => {
      material.opacity = 0.34 - night * 0.22;
    },
  };
}
