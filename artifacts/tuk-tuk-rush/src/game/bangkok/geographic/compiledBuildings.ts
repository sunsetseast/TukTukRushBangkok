import * as T from "three";
import type { GeographicChunkData } from "./dataset";
import type { ChunkReference } from "./streaming";
export type CompiledBatch = {
  name: string;
  detail: boolean;
  cell: number[];
  attributes: { name: string; offset: number; count: number; kind: "millimeters" | "snorm16" | "rgb8" }[];
  index: { offset: number; count: number; width: 2 | 4 };
  sphere: number[];
};
export type CompiledBuildings = {
  body: ArrayBuffer;
  batches: CompiledBatch[];
  buildingCount: number;
  vertices: number;
  gpuBytes: number;
};
export const compiledChunkFile = (ref: ChunkReference) =>
  `compiled/${ref.id.replace(":", "_")}.bin.gz`;
/** Millimetre positions, signed-16 normals and RGB8 are byte-shuffled before gzip. This
 * reversible linear pass replaces thousands of polygon booleans/triangulations.
 * All views share a single chunk-owned buffer; no per-vertex JS objects. */
export function decodeCompiledChunk(raw: ArrayBuffer, ref: ChunkReference): GeographicChunkData {
  const h = new DataView(raw);
  if (raw.byteLength < 16 || h.getUint32(0, true) !== 0x34424754)
    throw Error("Unknown compiled geographic geometry; run geography:compile");
  const padded = h.getUint32(4, true), length = h.getUint32(8, true), jsonLength = h.getUint32(12, true);
  if (padded % 4 || length % 4 || jsonLength > padded || 16 + padded + length !== raw.byteLength)
    throw Error("Invalid compiled geographic buffer bounds");
  const parseStarted = performance.now();
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(raw, 16, jsonLength)));
  const parseDone = performance.now();
  if (meta.schema !== 4 || meta.source !== ref.sha256 ||
      meta.chunk.origin[0] !== ref.origin[0] || meta.chunk.origin[1] !== ref.origin[1])
    throw Error("Stale geographic building bake; run geography:compile");
  const encoded = new Uint8Array(raw, 16 + padded, length), body = new ArrayBuffer(length), bytes = new Uint8Array(body), words = length / 4;
  for (let lane = 0; lane < 4; lane++)
    for (let i = 0; i < words; i++) bytes[i * 4 + lane] = encoded[lane * words + i]!;
  for (const batch of meta.batches as CompiledBatch[]) {
    for (const a of batch.attributes) {
      const width = a.kind === "millimeters" ? 4 : a.kind === "snorm16" ? 2 : a.kind === "rgb8" ? 1 : 0;
      if (!width || a.offset % 4 || a.count % 3 || a.offset < 0 || a.offset + a.count * width > length)
        throw Error("Invalid compiled building attribute");
      const src = a.kind === "millimeters" ? new Int32Array(body, a.offset, a.count)
        : a.kind === "snorm16" ? new Int16Array(body, a.offset, a.count) : new Uint8Array(body, a.offset, a.count);
      for (let i = 1; i < src.length; i++) src[i] = src[i]! + src[i - 1]!;
      const planar = src.slice(), count = src.length / 3;
      if (a.kind === "millimeters") {
        const dst = new Float32Array(body, a.offset, a.count);
        for (let axis = 0; axis < 3; axis++) for (let i = 0; i < count; i++) dst[i * 3 + axis] = planar[axis * count + i]! / 1000;
      } else for (let axis = 0; axis < 3; axis++) for (let i = 0; i < count; i++) src[i * 3 + axis] = planar[axis * count + i]!;
    }
    const idx = batch.index;
    if (![2, 4].includes(idx.width) || idx.offset % idx.width || idx.count % 3 ||
        idx.offset < 0 || idx.offset + idx.count * idx.width > length ||
        batch.sphere.length !== 4 || batch.sphere[3]! < 0 || !batch.sphere.every(Number.isFinite))
      throw Error("Invalid compiled building index");
    const indices = idx.width === 2 ? new Uint16Array(body, idx.offset, idx.count) : new Uint32Array(body, idx.offset, idx.count);
    for (let i = 1; i < indices.length; i++) indices[i] = indices[i]! + indices[i - 1]!;
    const vertices = batch.attributes.find(a => a.name === "position")!.count / 3;
    for (const i of indices) if (i >= vertices) throw Error("Compiled triangle index outside vertex buffer");
  }
  const chunk = meta.chunk as GeographicChunkData;
  chunk.buildingGeometry = { body, batches: meta.batches, buildingCount: meta.buildingCount, vertices: meta.vertices, gpuBytes: length };
  chunk.timing = { fetchHeadersMs: 0, decodeAndBodyMs: 0, jsonParseMs: parseDone - parseStarted, geometryDecodeMs: performance.now() - parseDone };
  return chunk;
}
export function buildCompiledBuildings(data: CompiledBuildings, material: T.Material) {
  const root = new T.Group();
  root.name = "SourceBuildings";
  for (const b of data.batches) {
    const g = new T.BufferGeometry();
    for (const a of b.attributes)
      g.setAttribute(a.name, new T.BufferAttribute(a.kind === "millimeters"
        ? new Float32Array(data.body, a.offset, a.count) : a.kind === "snorm16"
          ? new Int16Array(data.body, a.offset, a.count) : new Uint8Array(data.body, a.offset, a.count), 3, a.kind !== "millimeters"));
    const { offset, count, width } = b.index;
    g.setIndex(new T.BufferAttribute(width === 2
      ? new Uint16Array(data.body, offset, count)
      : new Uint32Array(data.body, offset, count), 1));
    g.boundingSphere = new T.Sphere(new T.Vector3(...b.sphere.slice(0, 3) as [number, number, number]), b.sphere[3]!);
    const mesh = new T.Mesh(g, material);
    mesh.name = b.name; mesh.userData = { detail: b.detail, cell: b.cell };
    root.add(mesh);
  }
  root.userData = { buildingCount: data.buildingCount, vertices: data.vertices, gpuBytes: data.gpuBytes };
  return root;
}
