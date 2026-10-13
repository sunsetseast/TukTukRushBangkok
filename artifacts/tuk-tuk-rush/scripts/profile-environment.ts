/** Node construction/memory profile, separate from browser/GPU measurements. */
import { performance } from "node:perf_hooks";
import { createBangkokWorld } from "../src/game/bangkok/world";
import { buildBangkokGraybox } from "../src/game/bangkok/mesh";
const start = performance.now(),
  d = createBangkokWorld(),
  worldMs = performance.now() - start;
const artStart = performance.now(),
  city = buildBangkokGraybox(d),
  meshMs = performance.now() - artStart;
(globalThis as typeof globalThis & { gc?: () => void }).gc?.();
const memory = process.memoryUsage();
console.log(
  JSON.stringify({
    worldMs,
    meshMs,
    buildings: d.buildings.length,
    obstacles: d.obstacles.length,
    memory,
    environment:
      "Node 24, fresh process, forced GC after build; no DOM signs or WebGL upload",
  }),
);
city.dispose();
