import fs from "node:fs";
import { gzipSync } from "node:zlib";
import { createBangkokWorld } from "../src/game/bangkok/world";
import { planChinatownBlocks } from "../src/game/bangkok/chinatownBlocks";
import { buildLandmarkRegistry } from "../src/game/bangkok/landmarkRegistry";
import {
  roadGraphKey,
  cityGraphApprovalKey,
} from "../src/game/bangkok/roadIdentity";
const out = new URL(
    "../../../docs/qa/chinatown-reconstruction/",
    import.meta.url,
  ),
  start = performance.now(),
  cpu = process.cpuUsage(),
  d = createBangkokWorld();
fs.writeFileSync(
  new URL("after-world.json.gz", out),
  gzipSync(JSON.stringify(d)),
);
fs.writeFileSync(new URL("after-world.json", out), JSON.stringify(d));
fs.writeFileSync(
  new URL("blocks.json", out),
  JSON.stringify(planChinatownBlocks(d)),
);
fs.writeFileSync(
  new URL("final-registry.json", out),
  JSON.stringify(buildLandmarkRegistry(d), null, 2),
);
const elapsed = process.cpuUsage(cpu),
  r = {
    roads: d.roads.length,
    nodes: d.nodes.length,
    buildings: d.buildings.length,
    blockCount: planChinatownBlocks(d).length,
    blockParcels: d.buildings.filter((b) => b.chinatown).length,
    key: roadGraphKey(d),
    fullGraphKey: cityGraphApprovalKey(d),
    constructionMs: performance.now() - start,
    constructionCpuMs: (elapsed.user + elapsed.system) / 1000,
  };
fs.writeFileSync(
  new URL("validation/world-summary.json", out),
  JSON.stringify(r, null, 2),
);
console.log(r);
