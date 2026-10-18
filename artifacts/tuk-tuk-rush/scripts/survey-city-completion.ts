import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { createBangkokWorld } from "../src/game/bangkok/world";
import {
  auditUrbanLand,
  planUrbanBlocks,
} from "../src/game/bangkok/urbanBlocks";
import { auditStreetEdges } from "../src/game/bangkok/streetEdges";
const baseline = process.env.CITY_BASELINE;
const create = baseline
  ? (
      await import(
        pathToFileURL(
          `${baseline}/artifacts/tuk-tuk-rush/src/game/bangkok/world.ts`,
        ).href
      )
    ).createBangkokWorld
  : createBangkokWorld;
const edgeAudit = baseline
  ? (await import(pathToFileURL(`${baseline}/artifacts/tuk-tuk-rush/src/game/bangkok/streetEdges.ts`).href)).auditStreetEdges
  : auditStreetEdges;
const d = create(),
  land = auditUrbanLand(d),
  edges = edgeAudit(d),
  label = baseline ? "before" : "after";
const result = {
  method:
    "36 m fixed grid, within 230 m of public roads in named regions; sample cells not cadastral parcels",
  label,
  buildings: d.buildings.length,
  buildingFootprintM2: d.buildings.reduce((n, b) => n + b.w * b.d, 0),
  roads: d.roads.length,
  nodes: d.nodes.length,
  openRoadside: edges.filter((e) => e.kind === "open").length,
  roadsideSamples: edges.length,
  land,
  blocks: baseline
    ? undefined
    : planUrbanBlocks(d).map((b) => ({
        id: b.id,
        district: b.district,
        buildings: b.buildings.length,
        court: !!b.court,
      })),
};
fs.writeFileSync(
  new URL(
    `../../../docs/qa/city-completion/survey-${label}.json`,
    import.meta.url,
  ),
  JSON.stringify(result) + "\n",
);
console.log(
  JSON.stringify({
    ...result,
    land: { ...land, cells: undefined },
    blocks: result.blocks?.length,
  }),
);
