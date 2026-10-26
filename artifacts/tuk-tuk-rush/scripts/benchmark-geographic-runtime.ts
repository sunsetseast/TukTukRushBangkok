import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { GeographicNetwork } from "../src/game/bangkok/geographic/network";
import { createGameplayDistrict } from "../src/game/bangkok/geographic/places";
import { createGeographicDistrict } from "../src/game/bangkok/geographic/dataset";
import { GeographicSurface } from "../src/game/bangkok/geographic/surface";
const dir = new URL("../public/assets/geography/", import.meta.url),
  gc = () => {
    (globalThis as any).gc?.();
  },
  memory = () => {
    const m = process.memoryUsage();
    return {
      heap: m.heapUsed,
      arrays: m.arrayBuffers,
      total: m.heapUsed + m.arrayBuffers,
    };
  };
gc();
const before = memory(),
  start = performance.now();
function setup() {
  let held: any, query: (p: { x: number; z: number }) => unknown;
  if (process.argv[2] === "baseline") {
    const data = JSON.parse(
        gunzipSync(
          fs.readFileSync(
            process.env.GEOGRAPHIC_BASELINE ??
              new URL("runtime.v1.json.gz", dir),
          ),
        ).toString(),
      ),
      district = createGeographicDistrict(data),
      surfaces = new GeographicSurface(data);
    held = { data, district, surfaces };
    query = (p) => surfaces.sample(p);
  } else {
    const metadata = JSON.parse(
        gunzipSync(
          fs.readFileSync(new URL("gameplay.v2.json.gz", dir)),
        ).toString(),
      ),
      raw = gunzipSync(fs.readFileSync(new URL("navigation.v2.bin.gz", dir))),
      network = new GeographicNetwork(
        metadata,
        raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
      );
    held = { network, ...createGameplayDistrict(network) };
    query = (p) => network.surface(p);
  }
  return { held, query };
}
const { held, query } = setup();
const initMs = performance.now() - start;
await new Promise((r) => setImmediate(r));
gc();
const after = memory();
const p = { x: 3580.76, z: 841.81 },
  q = performance.now();
for (let i = 0; i < 10000; i++) query({ x: p.x + (i % 30), z: p.z + (i % 5) });
const query10000Ms = performance.now() - q;
const report = {
  variant: process.argv[2] ?? "packed",
  initMs,
  retainedBytes: after.total - before.total,
  heapBytes: after.heap - before.heap,
  arrayBufferBytes: after.arrays - before.arrays,
  query10000Ms,
  nodeVersion: process.version,
};
if (!held) throw Error("retain benchmark state");
console.log(JSON.stringify(report));
