import baked from "./roadSurfaces.generated.json";
import { stableHash } from "./buildingGrammar";
import * as T from "three";
import type { District } from "../types";
import { asphaltMaterial, pavingMaterial } from "./streetSurfaces";

// Runtime consumes committed geometry; polygon boolean operations belong to art:roads.
export type RoadPolygons = [number, number][][][];

/** Boolean road ribbons: one topological surface, including holes around islands.
 * Sidewalks are the DIFFERENCE of road envelopes, never independent crossing slabs. */
export function roadGraphKey(d: District) {
  return String(
    stableHash(
      JSON.stringify({
        nodes: d.nodes.map((n) => [n.x, n.z]),
        roads: d.roads.map((r) => [r.a, r.b, r.width]),
      }),
    ),
  );
}
export function surfaceGeometry(polygons: RoadPolygons, y: number) {
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [];
  for (const polygon of polygons) {
    const rings = polygon.map((r) =>
      r
        .slice(0, -1)
        .map((p) => new T.Vector2(Math.fround(p[0]), Math.fround(p[1]))),
    );
    const vertices = rings.flat(),
      faces = T.ShapeUtils.triangulateShape(rings[0]!, rings.slice(1));
    for (const f of faces) {
      // X/Z mapping reverses normal; explicitly use upward winding.
      const a = vertices[f[0]!]!,
        b = vertices[f[1]!]!,
        c = vertices[f[2]!]!;
      const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      if (Math.abs(cross) < 1e-6) continue;
      for (const p of cross > 0 ? [a, c, b] : [a, b, c]) {
        positions.push(p.x, y, p.y);
        normals.push(0, 1, 0);
        uvs.push(p.x * 0.12, p.y * 0.12);
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
export function buildRoadSurfaces(d: District) {
  if (baked.key !== roadGraphKey(d))
    throw new Error(
      "Bangkok road geometry is stale. Run pnpm --filter @workspace/tuk-tuk-rush art:roads and commit the generated file.",
    );
  const road = baked.road as RoadPolygons,
    curb = baked.curb as RoadPolygons,
    sidewalk = baked.sidewalk as RoadPolygons;
  const root = new T.Group();
  root.name = "BangkokRoadGraph";
  const surfaces = [
    [road, 0.14, asphaltMaterial(), "asphalt"],
    [
      curb,
      0.205,
      new T.MeshStandardMaterial({ color: "#dbd0b5", roughness: 1 }),
      "curb",
    ],
    [sidewalk, 0.22, pavingMaterial(), "sidewalk"],
  ] as const;
  for (const [p, y, m, name] of surfaces) {
    const mesh = new T.Mesh(surfaceGeometry(p, y), m);
    mesh.name = `RoadSurface:${name}`;
    root.add(mesh);
  }
  root.userData.roadPolygons = road;
  root.userData.sidewalkPolygons = sidewalk;
  return root;
}
