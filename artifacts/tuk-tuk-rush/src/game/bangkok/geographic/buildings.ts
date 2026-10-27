import * as T from "three";
import clipping from "polygon-clipping";
import type { RoadPolygons } from "../roadSurfaceGraph";
import type { Obstacle } from "../../types";
export type BuildingEdge = {
  polygon: number;
  ring: number;
  edge: number;
  a: [number, number];
  b: [number, number];
  street: string | null;
  collision: boolean;
};
/** Persistent placement contract for a future Thai facade engine. All X/Z values
 * are owner-chunk local, including complete source outlines across seams. */
export type GeographicBuilding = {
  id: string;
  sourceVersion: number;
  parentId?: string;
  tags: Record<string, string>;
  polygons: RoadPolygons;
  sourceFootprint: RoadPolygons;
  edges: BuildingEdge[];
  /** Radians from world east toward south; local polygon axes remain meters. */
  orientation: number;
  neighborhood: string;
  roofRenderedAs: string;
  seed: number;
  family: string;
  classification: string;
  height: number;
  minHeight: number;
  floors: number;
  heightBasis: string;
  roof: string;
  roofHeight: number;
  roofBasis: string;
  material: string;
  confidence: string;
  provenance: "osm-footprint";
  inferred: false;
};
const palettes: Record<string, string[]> = {
  plaster: ["#d5c9b1", "#c6b59a", "#d9d4c4", "#b9c3b6", "#d8c0ac", "#bab9b1"],
  panel: ["#a8b7ba", "#b4bfc0", "#bdc7c1", "#849caa"],
  metal: ["#a6a7a0", "#969c99", "#a58d7d"],
};
type Bucket = {
  p: number[];
  c: number[];
  detail: boolean;
  x: number;
  z: number;
};
/** Massing is batched in 256m cells; nearby street courses use 128m cells for frustum culling. No per-building Mesh,
 * Material, animation or shader. Roofs retain polygon holes at every distance. */
export function buildGeographicBuildings(
  items: GeographicBuilding[],
  material: T.Material,
) {
  const root = new T.Group();
  root.name = "SourceBuildings";
  const buckets = new Map<string, Bucket>();
  let vertices = 0;
  const put = (b: Bucket, points: number[][], color: T.Color) => {
    for (const p of points) {
      b.p.push(...p);
      b.c.push(color.r, color.g, color.b);
    }
    vertices += points.length;
  };
  for (const building of items) {
    const outer = building.polygons[0]?.[0];
    if (!outer?.length) continue;
    const cx = outer.reduce((s, p) => s + p[0], 0) / outer.length,
      cz = outer.reduce((s, p) => s + p[1], 0) / outer.length;
    const bucket = (detail: boolean) => {
      const size = detail ? 128 : 256;
      const cellX = Math.floor(cx / size),
        cellZ = Math.floor(cz / size);
      const key = `${cellX}:${cellZ}:${detail}`;
      let b = buckets.get(key);
      if (!b) {
        b = {
          p: [],
          c: [],
          detail,
          x: (cellX + 0.5) * size,
          z: (cellZ + 0.5) * size,
        };
        buckets.set(key, b);
      }
      return b;
    };
    const shell = bucket(false),
      near = bucket(true);
    const colors = palettes[building.material] ?? palettes.plaster!,
      wall = new T.Color(colors[building.seed % colors.length]);
    const roofColor = new T.Color(
      building.material === "metal"
        ? "#807d73"
        : building.roof === "flat"
          ? "#99998e"
          : building.seed % 2
            ? "#9a6450"
            : "#807566",
    );
    // Ground-level foundations meet the existing -0.25m land surface.
    const base = building.minHeight > 0 ? building.minHeight : -0.25,
      top = building.height;
    for (const poly of building.polygons) {
      // Longest source edge defines the roof ridge and local facade orientation.
      let length = 0,
        angle = 0;
      const ring = poly[0]!;
      for (let i = 1; i < ring.length; i++) {
        const a = ring[i - 1]!,
          b = ring[i]!,
          l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (l > length) {
          length = l;
          angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
        }
      }
      const c = Math.cos(angle),
        s = Math.sin(angle),
        uv = (p: number[]) =>
          [c * p[0]! + s * p[1]!, -s * p[0]! + c * p[1]!] as [number, number];
      const rotated = poly.map((r) => r.map(uv)),
        all = rotated.flat(),
        us = all.map((p) => p[0]),
        vs = all.map((p) => p[1]);
      const minU = Math.min(...us),
        maxU = Math.max(...us),
        minV = Math.min(...vs),
        maxV = Math.max(...vs),
        mid = (minV + maxV) / 2,
        span = Math.max(0.01, (maxV - minV) / 2);
      const rh = building.roof === "flat" ? 0 : building.roofHeight;
      const roofY = (v: number) =>
        building.roof === "skillion"
          ? top - rh + (rh * (v - minV)) / Math.max(0.01, maxV - minV)
          : top - rh + rh * Math.max(0, 1 - Math.abs(v - mid) / span);
      // Split arbitrary polygons and courtyards along the ridge before triangulation.
      // Both halves are planar; no fan across concave notches or courtyard voids.
      const halves =
        rh > 0
          ? [
              clipping.intersection(
                [rotated],
                [
                  [
                    [
                      [minU - 1, minV - 1],
                      [maxU + 1, minV - 1],
                      [maxU + 1, mid],
                      [minU - 1, mid],
                      [minU - 1, minV - 1],
                    ],
                  ],
                ],
              ),
              clipping.intersection(
                [rotated],
                [
                  [
                    [
                      [minU - 1, mid],
                      [maxU + 1, mid],
                      [maxU + 1, maxV + 1],
                      [minU - 1, maxV + 1],
                      [minU - 1, mid],
                    ],
                  ],
                ],
              ),
            ]
          : [[rotated]];
      for (const half of halves)
        for (const part of half) {
          const rings = part.map((r) =>
              r.slice(0, -1).map((p) => new T.Vector2(p[0], p[1])),
            ),
            points = rings.flat();
          for (const tri of T.ShapeUtils.triangulateShape(
            rings[0]!,
            rings.slice(1),
          )) {
            const verts = tri.map((i) => {
              const p = points[i]!;
              return [c * p.x - s * p.y, roofY(p.y), s * p.x + c * p.y];
            });
            // ShapeUtils returns +Z 2D faces; X/Y -> X/Z reverses the roof normal.
            put(shell, [verts[0]!, verts[2]!, verts[1]!], roofColor);
          }
        }
      if (["roof", "carport"].includes(building.classification)) continue;
      for (const r of poly)
        for (let i = 1; i < r.length; i++) {
          const start = r[i - 1]!,
            end = r[i]!,
            av = uv(start)[1],
            bv = uv(end)[1],
            points = [start];
          if (rh > 0 && (av - mid) * (bv - mid) < 0) {
            const t = (mid - av) / (bv - av);
            points.push([
              start[0] + (end[0] - start[0]) * t,
              start[1] + (end[1] - start[1]) * t,
            ]);
          }
          points.push(end);
          for (let k = 1; k < points.length; k++) {
            const a = points[k - 1]!,
              b = points[k]!,
              ay = roofY(uv(a)[1]),
              by = roofY(uv(b)[1]);
            // Source rings canonicalized clockwise exterior/counterclockwise holes.
            put(
              shell,
              [
                [a[0], base, a[1]],
                [b[0], base, b[1]],
                [a[0], ay, a[1]],
                [a[0], ay, a[1]],
                [b[0], base, b[1]],
                [b[0], by, b[1]],
              ],
              wall,
            );
          }
        }
    }
    // Modest floor/string-course articulation on candidate street edges only.
    // Advanced windows/storefronts deliberately remain a later facade pass.
    if (["roof", "carport"].includes(building.classification)) continue;
    for (const edge of building.edges) {
      if (!edge.street || edge.ring !== 0) continue;
      const [a, b] = [edge.a, edge.b],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz);
      if (len < 2) continue;
      const nx = (-dz / len) * 0.025,
        nz = (dx / len) * 0.025,
        trim = wall.clone().multiplyScalar(0.72);
      for (let floor = 1; floor < Math.min(24, building.floors); floor++) {
        const y =
            base +
            ((top - building.roofHeight - base) * floor) / building.floors,
          h = 0.16;
        put(
          near,
          [
            [a[0] + nx, y, a[1] + nz],
            [b[0] + nx, y, b[1] + nz],
            [a[0] + nx, y + h, a[1] + nz],
            [a[0] + nx, y + h, a[1] + nz],
            [b[0] + nx, y, b[1] + nz],
            [b[0] + nx, y + h, b[1] + nz],
          ],
          trim,
        );
      }
    }
  }
  for (const b of buckets.values()) {
    if (!b.p.length) continue;
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(b.p, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(b.c, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const mesh = new T.Mesh(g, material);
    mesh.name = b.detail ? "BuildingStreetCourses" : "BuildingMassing";
    mesh.userData = { detail: b.detail, cell: [b.x, b.z] };
    root.add(mesh);
  }
  root.userData = {
    buildingCount: items.length,
    vertices,
    gpuBytes: vertices * 36,
  };
  return root;
}
export const buildingFogFar = (quality: "low" | "medium") =>
  quality === "low" ? 950 : 1350;
const lodPosition = new T.Vector3();
export function updateBuildingLOD(
  root: T.Group,
  camera: T.Vector3,
  quality: "low" | "medium",
  forward?: T.Vector3,
) {
  root.traverse((o) => {
    if (o instanceof T.Mesh && o.userData.detail) {
      const p = o.getWorldPosition(lodPosition),
        cell = o.userData.cell as number[];
      o.visible =
        Math.hypot(camera.x - p.x - cell[0]!, camera.z - p.z - cell[1]!) <
        (quality === "low" ? 110 : 210);
    } else if (o instanceof T.Mesh && o.name === "BuildingMassing" && forward) {
      const sphere = o.geometry.boundingSphere!;
      const p = o.getWorldPosition(lodPosition).add(sphere.center).sub(camera);
      // Fog uses camera-space depth, not radial distance. Cull only when the
      // complete owned batch is beyond fully opaque fog; preserve skylines.
      o.visible = p.dot(forward) - sphere.radius <= buildingFogFar(quality);
    }
  });
}
/** Thin oriented wall segments follow concavities/courtyards. Never the enclosing
 * rectangle, which would seal valid sois and courtyards. Importer withholds wall
 * colliders inside estimated road ribbons, water and above-ground building parts. */
export function buildingObstacles(
  items: GeographicBuilding[],
  origin: number[],
): Obstacle[] {
  return items.flatMap((b) =>
    b.edges
      .filter((e) => e.collision)
      .map((e) => ({
        x: origin[0]! + (e.a[0] + e.b[0]) / 2,
        z: origin[1]! + (e.a[1] + e.b[1]) / 2,
        w: 0.12,
        d: Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]),
        height: b.height,
        color: "#bca",
        yaw: Math.atan2(e.b[0] - e.a[0], e.b[1] - e.a[1]),
        sourceId: b.id,
      })),
  );
}
