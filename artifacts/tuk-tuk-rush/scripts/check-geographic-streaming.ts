import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { GeographicStream } from "../src/game/bangkok/geographic/streaming";
import {
  createGeographicDistrict,
  geographicGraph,
  type GeographicDataset,
} from "../src/game/bangkok/geographic/dataset";
import { GeographicSurface } from "../src/game/bangkok/geographic/surface";
import { VehicleController, createVehicle } from "../src/game/vehicle";
import { geographicToMeters } from "../src/game/bangkok/geographic/projection";
const data = JSON.parse(
  gunzipSync(
    fs.readFileSync(
      new URL("../public/assets/geography/runtime.v1.json.gz", import.meta.url),
    ),
  ).toString(),
) as GeographicDataset;
// A shared X/Z crossing cannot turn into a ground-to-overpass intersection.
const way = data.roads.find((r) => r.vehicleClearance)!;
const levels = {
  ...data,
  nodes: { a: [-10, 0], b: [0, 0], c: [10, 0], d: [0, -10], e: [0, 10] },
  roads: [
    {
      ...way,
      id: "ground",
      nodes: ["a", "b", "c"],
      heights: [0, 0, 0],
      width: 8,
      tunnel: false,
      bridge: false,
      tags: { highway: "residential" },
    },
    {
      ...way,
      id: "overpass",
      nodes: ["d", "b", "e"],
      heights: [10, 10, 10],
      width: 8,
      tunnel: false,
      bridge: true,
      tags: { highway: "primary", layer: "1", bridge: "yes" },
    },
  ],
} as GeographicDataset;
const levelGraph = geographicGraph(levels, "player");
assert(levelGraph.get("b")?.has("a"));
assert(!levelGraph.get("b")?.has("d"));
assert(levelGraph.get("b@10")?.has("d@10"));
const levelSurface = new GeographicSurface(levels);
assert.equal(levelSurface.sample({ x: 0, z: 0 }, 0)?.height, 0);
assert.equal(levelSurface.sample({ x: 0, z: 0 }, 10)?.height, 10);
const live = new Set<string>(),
  disposed: string[] = [];
const stream = new GeographicStream(
  data.chunks,
  async (c) => ({ id: c.id }),
  (v) => {
    assert(!live.has(v.id), "No duplicate resident geometry");
    live.add(v.id);
  },
  (v) => {
    live.delete(v.id);
    disposed.push(v.id);
  },
);
async function settle(p: { x: number; z: number }) {
  for (let i = 0; i < 100; i++) {
    stream.update(p);
    await new Promise((r) => setImmediate(r));
    if (stream.settled) return;
  }
  assert.fail("Stream did not settle");
}
const a = geographicToMeters({ lon: 100.514, lat: 13.736 }),
  b = geographicToMeters({ lon: 100.5538, lat: 13.8025 });
await settle(a);
assert(stream.active.size >= 9 && stream.active.size <= 16);
const first = [...stream.active.keys()];
await settle(b);
assert(first.every((id) => !stream.active.has(id)));
assert(disposed.length >= 9);
assert(stream.active.size <= 16);
const requests = stream.stats.requests;
await settle(b);
assert.equal(
  stream.stats.requests,
  requests,
  "Stationary player does not reload chunks",
);
stream.close();
assert.equal(live.size, 0);
assert.equal(stream.active.size, 0);
// A late result from an aborted fetch cannot re-install evicted geometry.
let resolve: ((v: { id: string }) => void) | undefined,
  lateDisposed = false;
const late = new GeographicStream(
  [data.chunks[0]!],
  () => new Promise((r) => (resolve = r)),
  () => assert.fail("Stale result installed"),
  () => (lateDisposed = true),
);
const origin = data.chunks[0]!.origin;
late.update({ x: origin[0] + 100, z: origin[1] + 100 });
late.close();
resolve!({ id: "late" });
await new Promise((r) => setImmediate(r));
assert(lateDisposed);
// An actual production-controller step crosses three independent real chunk seams.
const d = createGeographicDistrict(data),
  surface = new GeographicSurface(data),
  crossings = [];
for (const r of data.roads) {
  if (crossings.length >= 3) break;
  if (r.tunnel || r.bridge || r.width < 10 || r.tags.area === "yes") continue;
  for (let i = 1; i < r.nodes.length && crossings.length < 3; i++) {
    const a = data.nodes[r.nodes[i - 1]!]!,
      b = data.nodes[r.nodes[i]!]!,
      length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 45) continue;
    const fns = [
      (p: number[]) => Math.floor(p[0]! / 1024),
      (p: number[]) => Math.floor(p[1]! / 1024),
    ];
    for (let axis = 0; axis < 2; axis++)
      if (fns[axis]!(a) !== fns[axis]!(b)) {
        const boundary =
          (Math.floor(Math.min(a[axis]!, b[axis]!) / 1024) + 1) * 1024;
        const t = (boundary - a[axis]!) / (b[axis]! - a[axis]!);
        if (t * length < 12 || (1 - t) * length < 25) continue;
        const start = t - 8 / length,
          p = {
            ...createVehicle(d),
            x: a[0] + (b[0] - a[0]) * start,
            z: a[1] + (b[1] - a[1]) * start,
            heading: Math.atan2(b[0] - a[0], b[1] - a[1]),
          },
          controller = new VehicleController(),
          before = { x: p.x, z: p.z };
        const height = surface.sample(p);
        if (!height || height.height !== 0) continue;
        for (let k = 0; k < 95; k++)
          controller.update(
            p,
            { gas: true, brake: false, steer: 0 },
            d,
            [],
            1 / 60,
          );
        if (
          p.collision ||
          Math.floor(before[axis === 0 ? "x" : "z"] / 1024) ===
            Math.floor(p[axis === 0 ? "x" : "z"] / 1024)
        )
          continue;
        assert(p.speed > 0, "Crossing does not reset velocity");
        crossings.push({
          way: r.id,
          axis,
          from: before,
          to: { x: p.x, z: p.z },
          speed: p.speed,
        });
        break;
      }
  }
}
assert.equal(crossings.length, 3, "Three genuine source-road chunk crossings");
const graph = geographicGraph(data, "player"),
  components: number[] = [],
  visited = new Set<string>();
for (const start of graph.keys()) {
  if (visited.has(start)) continue;
  const q = [start];
  visited.add(start);
  for (let i = 0; i < q.length; i++)
    for (const next of graph.get(q[i]!) ?? [])
      if (!visited.has(next)) {
        visited.add(next);
        q.push(next);
      }
  components.push(q.length);
}
components.sort((a, b) => b - a);
const report = {
  pass: true,
  streamRequests: requests,
  evicted: disposed.length,
  roadChunkCrossings: crossings,
  components: components.length,
  largestComponents: components.slice(0, 12),
  note: "Disconnected source compounds, grade-separated identities and narrow routes remain separate. No fabricated graph links.",
};
fs.writeFileSync(
  new URL(
    "../../../docs/qa/expanded-geography/streaming-tests.json",
    import.meta.url,
  ),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report);
