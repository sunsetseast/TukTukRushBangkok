/** Reproducible BUILD output from committed source chunks, never a browser task.
 * Source polygons remain immutable and independently testable in original files.
 * The runtime carries all facade/edge metadata; duplicate polygon rings stay in
 * the source archive, addressable by stable sourceChunk + source building ID. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import * as T from "three";
import { buildGeographicBuildings } from "./geographic-building-authoring";
import { compiledChunkFile, type CompiledBatch } from "../src/game/bangkok/geographic/compiledBuildings";
import type { GeographicBuilding } from "../src/game/bangkok/geographic/buildings";
const dir = new URL("../public/assets/geography/", import.meta.url);
const out = new URL("compiled/", dir);
fs.mkdirSync(out, { recursive: true });
const sha = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
const policyFile = new URL("../../../data/bangkok/real-scale/clearance-policy.v1.json", import.meta.url);
if (!fs.existsSync(policyFile)) throw Error("Missing audited clearance policy; run scripts/geography/classify_building_conflicts.py");
const policyBytes = fs.readFileSync(policyFile), policy = JSON.parse(policyBytes.toString());
const roadBytes = fs.readFileSync(new URL("../../../data/bangkok/real-scale/clearance-roads.v1.json.gz", import.meta.url));
const roadPolicy = JSON.parse(gunzipSync(roadBytes).toString());
if (roadPolicy.policySha256 !== sha(policyBytes)) throw Error("Stale derived road policy");
const compiler = sha(Buffer.concat([fs.readFileSync(new URL(import.meta.url)), fs.readFileSync(new URL("./geographic-building-authoring.ts", import.meta.url)), policyBytes, roadBytes]));
const data = JSON.parse(gunzipSync(fs.readFileSync(new URL("runtime.v1.json.gz", dir))).toString());
const restore = new Set<string>(policy.restore);
const material = new T.MeshStandardMaterial();
const reports: any[] = [];
const started = performance.now();
for (const ref of data.chunks) {
  const only = process.argv.find(a => a.startsWith("--only="))?.slice(7);
  if (only && ref.id !== only) continue;
  const file = new URL(compiledChunkFile(ref), dir), stamp = new URL(file.pathname + ".stamp.json", "file://");
  const cache = fs.existsSync(stamp) ? JSON.parse(fs.readFileSync(stamp, "utf8")) : null;
  if (!process.argv.includes("--force") && cache?.compiler === compiler && cache?.source === ref.sha256 && fs.existsSync(file)) {
    reports.push(cache.metrics); continue;
  }
  const source = fs.readFileSync(new URL(ref.file, dir));
  if (sha(source) !== ref.sha256) throw Error("Source chunk checksum mismatch: " + ref.id);
  const chunk = JSON.parse(gunzipSync(source).toString()), items = (chunk.buildings ?? []) as GeographicBuilding[],
    root = buildGeographicBuildings(items, material), batches: CompiledBatch[] = [], pieces: Buffer[] = [];
  let restoredEdges = 0;
  for (const b of items) if (restore.has(b.id) && b.minHeight <= 0 && !["roof", "carport"].includes(b.classification))
    for (const e of b.edges) if (!e.collision) { e.collision = true; restoredEdges++; }
  if (roadPolicy.chunks[ref.id]) chunk.roads = roadPolicy.chunks[ref.id];
  let offset = 0, uniqueVertices = 0;
  const append = (arr: Int32Array | Int16Array | Uint8Array | Uint16Array | Uint32Array, stride: number) => {
    if (stride === 3) {
      const source = arr.slice(), count = arr.length / 3;
      for (let axis = 0; axis < 3; axis++)
        for (let i = 0; i < count; i++) arr[axis * count + i] = source[i * 3 + axis]!;
    }
    for (let i = arr.length - 1; i >= 1; i--) arr[i] = arr[i]! - arr[i - 1]!;
    const at = offset, bytes = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
    pieces.push(bytes); offset += bytes.length;
    const pad = (4 - offset % 4) % 4;
    if (pad) { pieces.push(Buffer.alloc(pad)); offset += pad; }
    return at;
  };
  for (const mesh of root.children as T.Mesh[]) {
    const g = mesh.geometry, names = ["position", "normal", "color"], attrs = names.map(n => g.getAttribute(n)),
      columns: number[][] = names.map(() => []), indices: number[] = [], seen = new Map<string, number>();
    for (let i = 0; i < attrs[0]!.count; i++) {
      const values = attrs.flatMap((a, j) => [a.getX(i), a.getY(i), a.getZ(i)]
        .map(v => Math.round(v * (j === 0 ? 1000 : j === 1 ? 32767 : 255))));
      const key = values.join(",");
      let index = seen.get(key);
      if (index === undefined) {
        index = seen.size; seen.set(key, index);
        for (let a = 0; a < attrs.length; a++) columns[a]!.push(values[a * 3]!, values[a * 3 + 1]!, values[a * 3 + 2]!);
      }
      indices.push(index);
    }
    uniqueVertices += seen.size;
    const attributes = columns.map((a, i) => ({ name: names[i]!,
      offset: append(i === 0 ? new Int32Array(a) : i === 1 ? new Int16Array(a) : new Uint8Array(a), 3),
      count: a.length, kind: (i === 0 ? "millimeters" : i === 1 ? "snorm16" : "rgb8") as "millimeters" | "snorm16" | "rgb8" }));
    const ix = seen.size <= 65535 ? new Uint16Array(indices) : new Uint32Array(indices), s = g.boundingSphere!;
    batches.push({ name: mesh.name, detail: mesh.userData.detail, cell: mesh.userData.cell, attributes,
      index: { offset: append(ix, 1), count: ix.length, width: ix.BYTES_PER_ELEMENT as 2 | 4 }, sphere: [...s.center.toArray(), s.radius + .002] });
    g.dispose();
  }
  const body = Buffer.concat(pieces), shuffled = Buffer.alloc(body.length), words = body.length / 4;
  for (let lane = 0; lane < 4; lane++) for (let i = 0; i < words; i++) shuffled[lane * words + i] = body[i * 4 + lane]!;
  const metadata = { schema: 4, source: ref.sha256, sourceChunk: ref.file, buildingCount: items.length,
    vertices: root.userData.vertices, batches, chunk: { ...chunk, sourceChunk: ref.file,
      buildings: items.map(({ polygons, sourceFootprint, ...metadata }) => metadata) } };
  const json = Buffer.from(JSON.stringify(metadata)), padded = Math.ceil(json.length / 4) * 4,
    header = Buffer.alloc(16 + padded);
  header.writeUInt32LE(0x34424754, 0); header.writeUInt32LE(padded, 4);
  header.writeUInt32LE(body.length, 8); header.writeUInt32LE(json.length, 12); json.copy(header, 16);
  const packed = gzipSync(Buffer.concat([header, shuffled]), { level: 9 });
  fs.writeFileSync(file, packed);
  const metrics = { id: ref.id, source: ref.sha256, buildings: items.length, vertices: root.userData.vertices,
    uniqueVertices, originalGPUBytes: root.userData.gpuBytes, gpuBytes: body.length,
    restoredEdges, roadSurfaceCorrected: !!roadPolicy.chunks[ref.id],
    sourceBytes: source.length, compiledBytes: packed.length, decodedBytes: header.length + body.length, sha256: sha(packed) };
  reports.push(metrics);
  fs.writeFileSync(stamp, JSON.stringify({ compiler, source: ref.sha256, metrics }));
}
material.dispose();
// Remove stale generated artifacts, never source chunks.
const keep = new Set(data.chunks.flatMap((r: any) => { const n = path.basename(compiledChunkFile(r)); return [n, n + ".stamp.json"]; }));
for (const f of fs.readdirSync(out)) if (!keep.has(f) && f !== "report.json") fs.unlinkSync(new URL(f, out));
fs.writeFileSync(new URL(process.argv.some(a => a.startsWith("--only=")) ? "report.partial.json" : "report.json", out), JSON.stringify({ schema: 4, compiler, chunks: reports }, null, 2) + "\n");
console.log(JSON.stringify({ compiledChunks: reports.length, buildings: reports.reduce((n, r) => n + r.buildings, 0),
  sourceBytes: reports.reduce((n, r) => n + r.sourceBytes, 0), compiledBytes: reports.reduce((n, r) => n + r.compiledBytes, 0),
  elapsedMs: performance.now() - started }));
