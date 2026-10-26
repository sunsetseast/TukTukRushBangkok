/** Offline derivative of the pinned source import. Keeps every reference way in v1;
 * packs only implemented player surfaces into the persistent gameplay graph. */
import fs from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import type { GeographicDataset } from "../src/game/bangkok/geographic/dataset";
import { VEHICLE_COLLISION_RADIUS } from "../src/game/vehicleEnvelope";
const dir = new URL("../public/assets/geography/", import.meta.url);
const source = fs.readFileSync(new URL("runtime.v1.json.gz", dir));
const d = JSON.parse(gunzipSync(source).toString()) as GeographicDataset;
const ids = new Map<string, number>(),
  points: number[][] = [],
  edges: number[][] = [],
  ways: { id: string; name: string; thai?: string }[] = [];
for (const w of d.roads) {
  if (
    w.tunnel ||
    w.tags.highway === "steps" ||
    w.tags.area === "yes" ||
    w.width < VEHICLE_COLLISION_RADIUS * 2
  )
    continue;
  const wi = ways.length;
  ways.push({
    id: w.id,
    name: w.tags["name:en"] ?? w.tags.name ?? "Unnamed passage",
    thai: w.tags["name:th"] ?? w.tags.name,
  });
  const node = (id: string, p: number[], h: number) => {
    const key = Math.abs(h) > 1 ? `${id}@${Math.round(h)}` : id;
    let n = ids.get(key);
    if (n === undefined) {
      n = points.length;
      ids.set(key, n);
      points.push([p[0]!, p[1]!, h]);
    }
    return n;
  };
  for (let i = 1; i < w.nodes.length; i++) {
    const profile = w.profiles?.[i - 1];
    const ns = profile
      ? profile.map((p, k) =>
          node(
            k === 0
              ? w.nodes[i - 1]!
              : k === profile.length - 1
                ? w.nodes[i]!
                : `${w.id}:segment:${i}:profile:${k}`,
            p,
            p[2],
          ),
        )
      : [
          node(
            w.nodes[i - 1]!,
            d.nodes[w.nodes[i - 1]!]!,
            w.heights[i - 1] ?? 0,
          ),
          node(w.nodes[i]!, d.nodes[w.nodes[i]!]!, w.heights[i] ?? 0),
        ];
    for (let k = 1; k < ns.length; k++)
      edges.push([ns[k - 1]!, ns[k]!, w.width, wi]);
  }
}
const buffer = new ArrayBuffer(16 + points.length * 12 + edges.length * 16),
  header = new Uint32Array(buffer, 0, 4);
header.set([0x47454f32, points.length, edges.length, 1]);
let offset = 16;
for (let axis = 0; axis < 3; axis++) {
  new Float32Array(buffer, offset, points.length).set(
    points.map((p) => p[axis]!),
  );
  offset += points.length * 4;
}
for (let axis = 0; axis < 4; axis++) {
  const array =
    axis === 2
      ? new Float32Array(buffer, offset, edges.length)
      : new Uint32Array(buffer, offset, edges.length);
  array.set(edges.map((e) => e[axis]!));
  offset += edges.length * 4;
}
fs.writeFileSync(
  new URL("navigation.v2.bin.gz", dir),
  gzipSync(Buffer.from(buffer), { level: 9 }),
);
const meta = {
  schema: 2,
  crs: d.crs,
  origin: d.origin,
  bounds: d.bounds,
  chunks: d.chunks,
  rail: {
    catalog: d.rail.catalog,
    stations: d.rail.stations,
    interchanges: d.rail.interchanges,
    transfers: (d.rail as any).transfers ?? [],
  },
  waterUnion: d.waterUnion,
  ways,
  sourceSha256: createHash("sha256").update(source).digest("hex"),
  nodeCount: points.length,
  edgeCount: edges.length,
  decodedBytes: buffer.byteLength,
};
fs.writeFileSync(
  new URL("gameplay.v2.json.gz", dir),
  gzipSync(JSON.stringify(meta), { level: 9 }),
);
console.log({
  nodes: points.length,
  edges: edges.length,
  decodedBytes: buffer.byteLength,
  metadataBytes: JSON.stringify(meta).length,
});
