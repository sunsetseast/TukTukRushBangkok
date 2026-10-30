/** Offline only. No browser module imports this authoring implementation. */
import * as T from "three";
import clipping from "polygon-clipping";
import type { GeographicBuilding } from "../src/game/bangkok/geographic/buildings";
type Bucket = { p: number[]; c: number[]; detail: boolean; x: number; z: number };
const palettes: Record<string, string[]> = {
  plaster: ["#d5c9b1", "#c6b59a", "#d9d4c4", "#b9c3b6", "#d8c0ac", "#bab9b1"],
  panel: ["#a8b7ba", "#b4bfc0", "#bdc7c1", "#849caa"],
  metal: ["#a6a7a0", "#969c99", "#a58d7d"],
};
export function buildGeographicBuildings(items: GeographicBuilding[], material: T.Material) {
  const root = new T.Group(), buckets = new Map<string, Bucket>();
  root.name = "SourceBuildings";
  let vertices = 0;
  const put = (b: Bucket, points: number[][], color: T.Color) => {
    for (const p of points) { b.p.push(...p); b.c.push(color.r, color.g, color.b); }
    vertices += points.length;
  };
  for (const building of items) {
    const outer = building.polygons[0]?.[0];
    if (!outer?.length) continue;
    const cx = outer.reduce((s, p) => s + p[0], 0) / outer.length,
      cz = outer.reduce((s, p) => s + p[1], 0) / outer.length;
    const bucket = (detail: boolean) => {
      const size = detail ? 128 : 256, cellX = Math.floor(cx / size), cellZ = Math.floor(cz / size);
      const key = `${cellX}:${cellZ}:${detail}`;
      let b = buckets.get(key);
      if (!b) { b = { p: [], c: [], detail, x: (cellX + .5) * size, z: (cellZ + .5) * size }; buckets.set(key, b); }
      return b;
    };
    const shell = bucket(false), near = bucket(true), colors = palettes[building.material] ?? palettes.plaster!,
      wall = new T.Color(colors[building.seed % colors.length]),
      roofColor = new T.Color(building.material === "metal" ? "#807d73" : building.roof === "flat" ? "#99998e" : building.seed % 2 ? "#9a6450" : "#807566"),
      base = building.minHeight > 0 ? building.minHeight : -.25, top = building.height;
    for (const poly of building.polygons) {
      let length = 0, angle = 0;
      const ring = poly[0]!;
      for (let i = 1; i < ring.length; i++) {
        const a = ring[i - 1]!, b = ring[i]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (l > length) { length = l; angle = Math.atan2(b[1] - a[1], b[0] - a[0]); }
      }
      const c = Math.cos(angle), s = Math.sin(angle),
        uv = (p: number[]) => [c * p[0]! + s * p[1]!, -s * p[0]! + c * p[1]!] as [number, number],
        rotated = poly.map(r => r.map(uv)), all = rotated.flat(), us = all.map(p => p[0]), vs = all.map(p => p[1]),
        minU = Math.min(...us), maxU = Math.max(...us), minV = Math.min(...vs), maxV = Math.max(...vs),
        mid = (minV + maxV) / 2, span = Math.max(.01, (maxV - minV) / 2),
        rh = building.roof === "flat" ? 0 : building.roofHeight,
        roofY = (v: number) => building.roof === "skillion"
          ? top - rh + rh * (v - minV) / Math.max(.01, maxV - minV)
          : top - rh + rh * Math.max(0, 1 - Math.abs(v - mid) / span);
      const halves = rh > 0 ? [
        clipping.intersection([rotated], [[[[minU - 1, minV - 1], [maxU + 1, minV - 1], [maxU + 1, mid], [minU - 1, mid], [minU - 1, minV - 1]]]]),
        clipping.intersection([rotated], [[[[minU - 1, mid], [maxU + 1, mid], [maxU + 1, maxV + 1], [minU - 1, maxV + 1], [minU - 1, mid]]]]),
      ] : [[rotated]];
      for (const half of halves) for (const part of half) {
        const rings = part.map(r => r.slice(0, -1).map(p => new T.Vector2(p[0], p[1]))), points = rings.flat();
        for (const tri of T.ShapeUtils.triangulateShape(rings[0]!, rings.slice(1))) {
          const verts = tri.map(i => { const p = points[i]!; return [c * p.x - s * p.y, roofY(p.y), s * p.x + c * p.y]; });
          put(shell, [verts[0]!, verts[2]!, verts[1]!], roofColor);
        }
      }
      if (["roof", "carport"].includes(building.classification)) continue;
      for (const r of poly) for (let i = 1; i < r.length; i++) {
        const start = r[i - 1]!, end = r[i]!, av = uv(start)[1], bv = uv(end)[1], points = [start];
        if (rh > 0 && (av - mid) * (bv - mid) < 0) {
          const t = (mid - av) / (bv - av);
          points.push([start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t]);
        }
        points.push(end);
        for (let k = 1; k < points.length; k++) {
          const a = points[k - 1]!, b = points[k]!, ay = roofY(uv(a)[1]), by = roofY(uv(b)[1]);
          put(shell, [[a[0], base, a[1]], [b[0], base, b[1]], [a[0], ay, a[1]],
            [a[0], ay, a[1]], [b[0], base, b[1]], [b[0], by, b[1]]], wall);
        }
      }
    }
    if (["roof", "carport"].includes(building.classification)) continue;
    for (const edge of building.edges) {
      if (!edge.street || edge.ring !== 0) continue;
      const [a, b] = [edge.a, edge.b], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len < 2) continue;
      const nx = -dz / len * .025, nz = dx / len * .025, trim = wall.clone().multiplyScalar(.72);
      for (let floor = 1; floor < Math.min(24, building.floors); floor++) {
        const y = base + (top - building.roofHeight - base) * floor / building.floors, h = .16;
        put(near, [[a[0] + nx, y, a[1] + nz], [b[0] + nx, y, b[1] + nz], [a[0] + nx, y + h, a[1] + nz],
          [a[0] + nx, y + h, a[1] + nz], [b[0] + nx, y, b[1] + nz], [b[0] + nx, y + h, b[1] + nz]], trim);
      }
    }
  }
  for (const b of buckets.values()) {
    if (!b.p.length) continue;
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(b.p, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(b.c, 3));
    g.computeVertexNormals(); g.computeBoundingSphere();
    const mesh = new T.Mesh(g, material);
    mesh.name = b.detail ? "BuildingStreetCourses" : "BuildingMassing";
    mesh.userData = { detail: b.detail, cell: [b.x, b.z] };
    root.add(mesh);
  }
  root.userData = { buildingCount: items.length, vertices, gpuBytes: vertices * 36 };
  return root;
}
