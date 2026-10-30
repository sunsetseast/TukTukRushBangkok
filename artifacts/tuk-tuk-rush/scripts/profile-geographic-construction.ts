/** Read-only matched authoring profile. Never modifies imported source geometry. */
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import * as T from "three";
import clipping from "polygon-clipping";
import { buildGeographicBuildings } from "./geographic-building-authoring";
const dir = new URL("../public/assets/geography/", import.meta.url);
const read = (file: string) => JSON.parse(gunzipSync(fs.readFileSync(new URL(file, dir))).toString());
const data = read("runtime.v1.json.gz");
const candidates = data.chunks.map((ref: any) => ({ ref, chunk: read(ref.file) }))
  .filter((v: any) => v.chunk.buildings?.length > 400)
  .sort((a: any, b: any) => b.chunk.buildings.length - a.chunk.buildings.length);
const records: object[] = [];
const material = new T.MeshStandardMaterial();
for (const { ref, chunk } of [candidates[0], candidates[Math.floor(candidates.length / 2)], candidates.at(-1)]) {
  let clippingMs = 0, triangulationMs = 0, normalsMs = 0, clips = 0;
  const oldClip = clipping.intersection, oldTri = T.ShapeUtils.triangulateShape, oldNormals = T.BufferGeometry.prototype.computeVertexNormals;
  clipping.intersection = (...args) => { const t = performance.now(); try { return oldClip(...args); } finally { clippingMs += performance.now() - t; clips++; } };
  T.ShapeUtils.triangulateShape = (...args) => { const t = performance.now(); try { return oldTri(...args); } finally { triangulationMs += performance.now() - t; } };
  T.BufferGeometry.prototype.computeVertexNormals = function() { const t = performance.now(); try { return oldNormals.call(this); } finally { normalsMs += performance.now() - t; } };
  const started = performance.now(), root = buildGeographicBuildings(chunk.buildings, material), totalMs = performance.now() - started;
  clipping.intersection = oldClip; T.ShapeUtils.triangulateShape = oldTri; T.BufferGeometry.prototype.computeVertexNormals = oldNormals;
  records.push({ id: ref.id, buildings: chunk.buildings.length, bytesGzip: fs.statSync(new URL(ref.file, dir)).size, totalMs, clippingMs, triangulationMs, normalsMs, clips, ...root.userData });
  root.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose(); });
}
material.dispose();
console.log(JSON.stringify({ environment: "Node CPU instrumentation; not Safari", records }, null, 2));
