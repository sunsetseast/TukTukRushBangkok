import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import * as T from "three";
import clipping from "polygon-clipping";
import {
  buildingObstacles,
  updateBuildingLOD,
  type GeographicBuilding,
} from "../src/game/bangkok/geographic/buildings";
import { buildGeographicBuildings } from "./geographic-building-authoring";
import { disposeGeographicChunk } from "../src/game/bangkok/geographic/rendering";
import { physicsObstacleIndex } from "../src/game/bangkok/clearanceIndex";
import { VehicleController, createVehicle } from "../src/game/vehicle";
import type { District } from "../src/game/types";
const dir = new URL("../public/assets/geography/", import.meta.url);
const read = (p: URL) => JSON.parse(gunzipSync(fs.readFileSync(p)).toString());
const data = read(new URL("runtime.v1.json.gz", dir)),
  seen = new Set<string>();
let buildings = 0,
  vertices = 0;
const ringAreaGlobal = (r: number[][]) =>
  Math.abs(
    r.slice(1).reduce((sum, b, i) => {
      const a = r[i]!;
      return sum + a[0]! * b[1]! - b[0]! * a[1]!;
    }, 0) / 2,
  );
const areaOf = (ps: number[][][][]) =>
  ps.reduce(
    (sum, p) =>
      sum +
      ringAreaGlobal(p[0]!) -
      p.slice(1).reduce((n, r) => n + ringAreaGlobal(r), 0),
    0,
  );
const toWorld = (ps: number[][][][], origin: number[]) =>
  ps.map((p) =>
    p.map((r) =>
      r.map(([x, z]) => [x! + origin[0]!, z! + origin[1]!] as [number, number]),
    ),
  );
const parts: { id: string; polygons: [number, number][][][]; box: number[] }[] =
  [];
const parents: {
  id: string;
  original: [number, number][][][];
  volume: [number, number][][][];
  box: number[];
}[] = [];
const boundsOf = (ps: number[][][][]) => {
  const pts = ps.flat(2);
  return [
    Math.min(...pts.map((p) => p[0]!)),
    Math.min(...pts.map((p) => p[1]!)),
    Math.max(...pts.map((p) => p[0]!)),
    Math.max(...pts.map((p) => p[1]!)),
  ];
};
const material = new T.MeshStandardMaterial({
  vertexColors: true,
  side: T.DoubleSide,
});
let materialDisposed = false;
material.addEventListener("dispose", () => (materialDisposed = true));
for (const ref of data.chunks) {
  const c = read(new URL(ref.file, dir)),
    items: GeographicBuilding[] = c.buildings ?? [];
  for (const b of items) {
    assert(!seen.has(b.id));
    seen.add(b.id);
    assert.equal(b.inferred, false);
    assert(b.edges.length);
    if (b.tags["building:part"] && b.tags["building:part"] !== "no") {
      const polygons = toWorld(b.sourceFootprint, c.origin);
      parts.push({ id: b.id, polygons, box: boundsOf(polygons) });
    } else if (areaOf(b.sourceFootprint) - areaOf(b.polygons) > 0.1) {
      const original = toWorld(b.sourceFootprint, c.origin),
        volume = toWorld(b.polygons, c.origin);
      parents.push({ id: b.id, original, volume, box: boundsOf(original) });
    }
  }
  if (!items.length) continue;
  const root = buildGeographicBuildings(items, material);
  root.position.set(
    ...([c.origin[0], 0, c.origin[1]] as [number, number, number]),
  );
  root.updateMatrixWorld(true);
  buildings += items.length;
  vertices += root.userData.vertices;
  let geometries = 0,
    disposed = 0,
    roofArea = 0;
  root.traverse((o) => {
    if (o instanceof T.Mesh) {
      geometries++;
      o.geometry.addEventListener("dispose", () => disposed++);
      if (!o.userData.detail) {
        const a = o.geometry.getAttribute("position");
        for (let i = 0; i < a.count; i += 3) {
          const area =
            ((a.getX(i + 1) - a.getX(i)) * (a.getZ(i + 2) - a.getZ(i)) -
              (a.getZ(i + 1) - a.getZ(i)) * (a.getX(i + 2) - a.getX(i))) /
            2;
          roofArea += Math.abs(area);
          if (Math.abs(area) > 0.001)
            assert(area < 0, "Roof winding faces upward");
        }
      }
      for (const v of o.geometry.getAttribute("position").array)
        assert(Number.isFinite(v));
    }
  });
  const ringArea = (r: number[][]) =>
    Math.abs(
      r.slice(1).reduce((sum, b, i) => {
        const a = r[i]!;
        return sum + a[0]! * b[1]! - b[0]! * a[1]!;
      }, 0) / 2,
    );
  const expectedArea = items.reduce(
    (sum, b) =>
      sum +
      b.polygons.reduce(
        (sum, p) =>
          sum +
          ringArea(p[0]!) -
          p.slice(1).reduce((n, r) => n + ringArea(r), 0),
        0,
      ),
    0,
  );
  assert(
    Math.abs(roofArea - expectedArea) < Math.max(0.5, expectedArea * 0.0001),
    `${ref.id}: all source roofs triangulate without filling holes (${roofArea} vs ${expectedArea})`,
  );
  const sample = root.children.find((o) => o.userData.detail);
  if (sample) {
    const cell = sample.userData.cell;
    updateBuildingLOD(
      root,
      new T.Vector3(c.origin[0] + cell[0] + 150, 5, c.origin[1] + cell[1]),
      "medium",
    );
    assert(sample.visible);
    updateBuildingLOD(
      root,
      new T.Vector3(c.origin[0] + cell[0] + 150, 5, c.origin[1] + cell[1]),
      "low",
    );
    assert(!sample.visible);
  }
  if (buildings === items.length) {
    const repeat = buildGeographicBuildings(items, material);
    assert.deepEqual(
      (root.children[0] as T.Mesh).geometry.getAttribute("position").array,
      (repeat.children[0] as T.Mesh).geometry.getAttribute("position").array,
    );
    disposeGeographicChunk(repeat);
  }
  disposeGeographicChunk(root);
  assert.equal(disposed, geometries);
  assert(!materialDisposed);
}
let partRelationships = 0;
for (const parent of parents)
  for (const part of parts) {
    if (
      parent.box[2]! < part.box[0]! ||
      parent.box[0]! > part.box[2]! ||
      parent.box[3]! < part.box[1]! ||
      parent.box[1]! > part.box[3]!
    )
      continue;
    if (
      areaOf(clipping.intersection(parent.original, part.polygons)) >
      areaOf(part.polygons) * 0.9
    ) {
      assert(
        areaOf(clipping.intersection(parent.volume, part.polygons)) < 0.03,
        `${parent.id} does not duplicate ${part.id}`,
      );
      partRelationships++;
    }
  }
assert(
  partRelationships > 0,
  "Actual source parent/part volume relationships checked across owner chunks",
);
// L-shaped footprint and open courtyard: no enclosing box collider.
const fixture: GeographicBuilding = {
  id: "fixture",
  sourceVersion: 1,
  tags: {},
  polygons: [
    [
      [
        [0, 0],
        [0, 20],
        [20, 20],
        [20, 0],
        [0, 0],
      ],
      [
        [5, 5],
        [15, 5],
        [15, 15],
        [5, 15],
        [5, 5],
      ],
    ],
  ],
  sourceFootprint: [],
  edges: [
    {
      polygon: 0,
      ring: 0,
      edge: 0,
      a: [0, 0],
      b: [0, 20],
      street: "road",
      collision: true,
    },
  ],
  orientation: 0,
  neighborhood: "fixture",
  roofRenderedAs: "gabled",
  seed: 1,
  family: "shophouse",
  classification: "retail",
  height: 12,
  minHeight: 0,
  floors: 3,
  heightBasis: "fixture",
  roof: "gabled",
  roofHeight: 2,
  roofBasis: "fixture",
  material: "plaster",
  confidence: "fixture",
  provenance: "osm-footprint",
  inferred: false,
};
const mesh = buildGeographicBuildings([fixture], material);
const shell = mesh.children.find((o) => o.name === "BuildingMassing")!;
updateBuildingLOD(
  mesh,
  new T.Vector3(0, 0, -1100),
  "low",
  new T.Vector3(0, 0, 1),
);
assert(!shell.visible, "Fast mode culls fully fogged architecture");
updateBuildingLOD(
  mesh,
  new T.Vector3(0, 0, -1100),
  "medium",
  new T.Vector3(0, 0, 1),
);
assert(shell.visible, "Medium mode retains its farther skyline");

let roofArea = 0;
mesh.traverse((o) => {
  if (!(o instanceof T.Mesh) || o.userData.detail) return;
  const p = o.geometry.getAttribute("position");
  for (let i = 0; i < p.count; i += 3) {
    const a = new T.Vector3().fromBufferAttribute(p, i),
      b = new T.Vector3().fromBufferAttribute(p, i + 1),
      c = new T.Vector3().fromBufferAttribute(p, i + 2);
    if (Math.min(a.y, b.y, c.y) > 9)
      roofArea +=
        Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)) / 2;
  }
});
assert.equal(roofArea, 300, "Roof triangulation preserves 100m2 courtyard");
disposeGeographicChunk(mesh);
const obstacles = buildingObstacles([fixture], [0, 0]),
  district: District = {
    nodes: [],
    roads: [],
    buildings: [],
    obstacles,
    landmarks: [],
    spawn: { x: -4, z: 10, heading: Math.PI / 2 },
  };
const oldIndex = physicsObstacleIndex(district);
assert(oldIndex.query({ x: 0, z: 10 }).length);
district.obstacles = [];
assert.equal(physicsObstacleIndex(district).query({ x: 0, z: 10 }).length, 0);
district.obstacles = obstacles;
const p = createVehicle(district),
  controller = new VehicleController();
for (let i = 0; i < 180; i++)
  controller.update(
    p,
    { gas: true, brake: false, steer: 0 },
    district,
    [],
    1 / 90,
  );
assert(p.x < -0.5, "Production controller stops at footprint wall");
assert(buildings > 1000);
material.dispose();
console.log(
  JSON.stringify({
    pass: true,
    buildings,
    vertices,
    roofArea,
    resourceDisposal: true,
    lod: true,
    productionCollision: true,
    partRelationships,
  }),
);
