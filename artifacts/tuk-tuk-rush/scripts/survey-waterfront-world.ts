import fs from "node:fs";
import { gzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
const checkout =
  process.env.CITY_CHECKOUT ?? new URL("../../../", import.meta.url).pathname;
const { createBangkokWorld } = await import(
  pathToFileURL(checkout + "/artifacts/tuk-tuk-rush/src/game/bangkok/world.ts")
    .href
);
const d = createBangkokWorld();
const out = new URL(
    "../../../docs/qa/waterfront-certification/",
    import.meta.url,
  ),
  label = process.env.WATERFRONT_LABEL ?? "after";
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  new URL(label + "-world.json.gz", out),
  gzipSync(
    JSON.stringify({
      buildings: d.buildings,
      obstacles: d.obstacles,
      nodes: d.nodes,
      roads: d.roads,
      landmarks: d.landmarks,
      destinations: d.destinations,
      authoredSites: d.authoredSites,
      river: d.river,
      riverPolygon: d.riverPolygon,
      riverStructures: d.riverStructures,
      bounds: d.bounds,
      spawn: d.spawn,
      transit: d.transit,
    }),
  ),
);
console.log(
  JSON.stringify({
    label,
    buildings: d.buildings.length,
    obstacles: d.obstacles.length,
  }),
);
