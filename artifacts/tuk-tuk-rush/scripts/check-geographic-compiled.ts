import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import * as T from "three";
import { compiledChunkFile, decodeCompiledChunk, buildCompiledBuildings } from "../src/game/bangkok/geographic/compiledBuildings";
import { buildGeographicBuildings } from "./geographic-building-authoring";
import { buildingObstacles } from "../src/game/bangkok/geographic/buildings";
import { disposeGeographicChunk } from "../src/game/bangkok/geographic/rendering";
import { physicsObstacleIndex, setStreamedPhysicsObstacles } from "../src/game/bangkok/clearanceIndex";
import { obstacleDistance } from "../src/game/world";
import type { District } from "../src/game/types";
const dir = new URL("../public/assets/geography/", import.meta.url);
const read = (file: string) => JSON.parse(gunzipSync(fs.readFileSync(new URL(file, dir))).toString());
const data = read("runtime.v1.json.gz"), report = JSON.parse(fs.readFileSync(new URL("compiled/report.json", dir), "utf8")),
  policy = JSON.parse(fs.readFileSync(new URL("../../../data/bangkok/real-scale/clearance-policy.v1.json", import.meta.url), "utf8")),
  safe = new Set(policy.restore), material = new T.MeshStandardMaterial();
let buildings = 0, vertices = 0, originalGPU = 0, gpu = 0, restoredEdges = 0, comparedChunks = 0, maxPositionError = 0;
let disposed = false;
material.addEventListener("dispose", () => disposed = true);
const rows: object[] = [], groups: ReturnType<typeof buildingObstacles>[] = [];
for (let ri = 0; ri < data.chunks.length; ri++) {
  const ref = data.chunks[ri], source = read(ref.file), packed = gunzipSync(fs.readFileSync(new URL(compiledChunkFile(ref), dir))),
    raw = packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength) as ArrayBuffer,
    start = performance.now(), chunk = decodeCompiledChunk(raw, ref), decodeMs = performance.now() - start;
  assert.equal(chunk.buildings!.length, source.buildings.length);
  for (let i = 0; i < source.buildings.length; i++) {
    const before = source.buildings[i], after = chunk.buildings![i]!;
    for (const key of ["id", "sourceVersion", "parentId", "family", "seed", "height", "floors", "roof", "orientation", "tags"] as const)
      assert.deepEqual(after[key], before[key]);
    after.edges.forEach((edge, j) => {
      const old = before.edges[j];
      assert.deepEqual(edge.a, old.a); assert.deepEqual(edge.b, old.b);
      if (edge.collision !== old.collision) { assert.equal(edge.collision, true); assert(safe.has(before.id)); restoredEdges++; }
    });
  }
  const t = performance.now(), root = buildCompiledBuildings(chunk.buildingGeometry!, material), buildMs = performance.now() - t;
  buildings += chunk.buildings!.length; vertices += root.userData.vertices; gpu += root.userData.gpuBytes;
  const r = report.chunks.find((r: any) => r.id === ref.id);
  assert(r); originalGPU += r.originalGPUBytes;
  // Distributed geometry plus every corrected chunk: same triangle ordering,
  // shapes, roofs, courtyards and LOD batches. Only documented codec precision.
  if (ri % 41 === 0 || r.restoredEdges > 0) {
    const original = buildGeographicBuildings(source.buildings, material);
    assert.equal(original.children.length, root.children.length);
    for (let m = 0; m < root.children.length; m++) {
      const a = original.children[m] as T.Mesh, b = root.children[m] as T.Mesh;
      assert.equal(a.name, b.name); assert.deepEqual(a.userData, b.userData);
      assert.equal(b.geometry.index!.count, a.geometry.getAttribute("position").count);
      for (let i = 0; i < b.geometry.index!.count; i++) {
        const index = b.geometry.index!.getX(i);
        for (const name of ["position", "normal", "color"]) {
          const x = a.geometry.getAttribute(name), y = b.geometry.getAttribute(name);
          for (const component of ["getX", "getY", "getZ"] as const) {
            const error = Math.abs(x[component](i) - y[component](index));
            if (name === "position") maxPositionError = Math.max(maxPositionError, error);
            assert(error <= (name === "position" ? .0015 : name === "normal" ? .00004 : 1 / 510 + .000001), `${name} exceeds codec precision`);
          }
        }
      }
    }
    comparedChunks++; disposeGeographicChunk(original);
  }
  if (groups.length < 9 && chunk.buildings!.length > 100) groups.push(buildingObstacles(chunk.buildings!, chunk.origin));
  let releases = 0;
  root.traverse(o => { if (o instanceof T.Mesh) o.geometry.addEventListener("dispose", () => releases++); });
  const expectedReleases = root.children.length;
  disposeGeographicChunk(root);
  assert.equal(releases, expectedReleases);
  assert.equal(disposed, false);
  rows.push({ id: ref.id, buildings: chunk.buildings!.length, decodeMs, buildMs, ...chunk.timing });
  if (ri === 0) {
    assert.throws(() => decodeCompiledChunk(new ArrayBuffer(5), ref));
    assert.throws(() => decodeCompiledChunk(raw, { ...ref, sha256: "stale" }));
  }
}
assert.equal(buildings, 222123); assert.equal(data.chunks.length, 471); assert(restoredEdges > 0);
const d = { nodes: [], roads: [], obstacles: [], buildings: [], landmarks: [] } as unknown as District;
const started = performance.now();
setStreamedPhysicsObstacles(d, groups);
const indexBuildMs = performance.now() - started, queryMs: number[] = [];
for (const o of d.obstacles.filter((_, i) => i % 11 === 0).slice(0, 1000)) {
  const p = { x: o.x, z: o.z }, t = performance.now(), candidates = physicsObstacleIndex(d).query(p);
  queryMs.push(performance.now() - t);
  assert(candidates.some(i => d.obstacles[i] === o));
  assert.deepEqual(candidates, [...new Set(candidates)].sort((a, b) => a - b));
  for (const j of [0, Math.floor(d.obstacles.length / 2), d.obstacles.length - 1])
    if (obstacleDistance(p, d.obstacles[j]!) < 1.55) assert(candidates.includes(j));
}
const kept = groups[0]!;
setStreamedPhysicsObstacles(d, [kept]);
assert(physicsObstacleIndex(d).query(kept[0]!).every(i => d.obstacles[i] && kept.includes(d.obstacles[i]!)));
d.obstacles = [];
assert.equal(physicsObstacleIndex(d).query({ x: 0, z: 0 }).length, 0);
queryMs.sort((a, b) => a - b);
material.dispose();
const result = { buildings, chunks: data.chunks.length, vertices, originalGPU, gpu, restoredEdges, comparedChunks, maxPositionError,
  indexBuildMs, queryMs: { samples: queryMs.length, mean: queryMs.reduce((n, x) => n + x, 0) / queryMs.length,
    p95: queryMs[Math.floor(queryMs.length * .95)], max: queryMs.at(-1) }, rows };
fs.mkdirSync(new URL("../../../docs/qa/geographic-stabilization/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../../../docs/qa/geographic-stabilization/compiled-tests.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ ...result, rows: undefined }));
