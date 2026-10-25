import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  createGeographicDistrict,
  geographicGraph,
  type GeographicDataset,
} from "../src/game/bangkok/geographic/dataset";
import {
  geographicToMeters,
  metersToGeographic,
  geographicChunk,
} from "../src/game/bangkok/geographic/projection";
import {
  inRiverWater,
  riverClearance,
} from "../src/game/bangkok/waterGeometry";
import { blockedByRiver } from "../src/game/bangkok/world";
import { VehicleController, createVehicle } from "../src/game/vehicle";
import type { District } from "../src/game/types";
const data = JSON.parse(
  gunzipSync(
    fs.readFileSync(
      new URL("../public/assets/geography/runtime.v1.json.gz", import.meta.url),
    ),
  ).toString(),
) as GeographicDataset;
const d = createGeographicDistrict(data);
// Independent PROJ fixture (EPSG:32647), plus inverse over the whole extraction.
const anchors = JSON.parse(
  fs.readFileSync(
    new URL(
      "../../../data/bangkok/real-scale/anchors.v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as { id: string; lon: number; lat: number; x: number; z: number }[];
for (const p of anchors) {
  const q = geographicToMeters(p);
  assert(Math.hypot(q.x - p.x, q.z - p.z) < 0.001, p.id);
  const back = metersToGeographic(q);
  assert(Math.abs(back.lat - p.lat) < 1e-8);
  assert(Math.abs(back.lon - p.lon) < 1e-8);
  const chunk = geographicChunk(q);
  assert.equal(chunk.origin.x + chunk.local.x, q.x);
  assert.equal(chunk.origin.z + chunk.local.z, q.z);
}
assert.throws(() => geographicToMeters({ lon: NaN, lat: 13 }));
assert.throws(() => geographicToMeters({ lon: 0, lat: 0 }));
const center = geographicToMeters({ lon: 100.51, lat: 13.74 }),
  north = geographicToMeters({ lon: 100.51, lat: 13.749 });
assert(
  Math.abs(Math.hypot(center.x - north.x, center.z - north.z) - 995.725) < 1,
  "Nine thousandths latitude retains real distance",
);
// Multipolygon union, holes and overlap; source feature order cannot cancel water.
const ring = (x: number, z: number, s: number) => [
  { x, z },
  { x: x + s, z },
  { x: x + s, z: z + s },
  { x, z: z + s },
  { x, z },
];
const fixture: District = {
  nodes: [],
  roads: [],
  buildings: [],
  obstacles: [],
  landmarks: [],
  river: [],
  riverPolygon: [ring(0, 0, 20), ring(5, 5, 4), ring(15, 0, 20)],
  waterPolygons: [[ring(0, 0, 20), ring(5, 5, 4)], [ring(15, 0, 20)]],
};
assert(inRiverWater(fixture, { x: 17, z: 3 }));
assert(!inRiverWater(fixture, { x: 6, z: 6 }));
assert(inRiverWater(fixture, { x: 2, z: 2 }));
assert(!inRiverWater(d, d.spawn!));
for (const c of anchors.filter((p) => p.id.startsWith("water:")))
  assert(inRiverWater(d, geographicToMeters(c)), c.id);
const player = geographicGraph(data, "player"),
  pedestrian = geographicGraph(data, "pedestrian"),
  traffic = geographicGraph(data, "traffic");
assert(pedestrian.size > player.size, "Narrow pedestrian graph survives");
const narrow = data.roads.filter((r) => r.width < 3);
assert(narrow.length > 200);
for (const r of narrow) assert(r.pedestrianClearance || r.width < 0.6);
const oneway = data.roads.find(
  (r) =>
    r.tags.oneway === "yes" &&
    r.vehicleClearance &&
    !r.tunnel &&
    r.nodes.length > 2,
)!;
assert(
  player.get(oneway.nodes[1]!)?.has(oneway.nodes[0]!),
  "Player can reverse a real one-way",
);
// Source-ID connectivity proves Yaowarat -> Talat Noi -> historic Bang Rak via physical roads.
const visited = new Set<string>(),
  queue = [d.roads.find((r) => /Yaowarat/i.test(r.name))!.a];
for (let i = 0; i < queue.length; i++) {
  const id = queue[i]!;
  if (visited.has(id)) continue;
  visited.add(id);
  for (const next of player.get(id) ?? [])
    if (!visited.has(next)) queue.push(next);
}
for (const name of [
  "Yaowarat",
  "Song Wat",
  "Charoen Krung",
  "Si Phraya",
  "Si Lom",
  "Sathon",
]) {
  const ways = data.roads.filter((r) =>
    (r.tags["name:en"] ?? "").toLowerCase().includes(name.toLowerCase()),
  );
  assert(ways.length, name + " source geometry");
  assert(
    ways.some((r) => r.nodes.some((n) => visited.has(n))),
    name + " connected",
  );
}
// Actual production controller: input moves vehicle; water blocks; source bridge crosses.
const p = createVehicle(d),
  controller = new VehicleController();
const original = { ...p };
for (let i = 0; i < 120; i++)
  controller.update(p, { gas: true, brake: false, steer: 0 }, d, [], 1 / 60);
assert(Math.hypot(p.x - original.x, p.z - original.z) > 20);
assert.equal(p.collision, 0);
const bridge = d.roads.find(
  (r) =>
    r.bridge &&
    r.width >= 6 &&
    (() => {
      const a = d.nodes.find((n) => n.id === r.a)!,
        b = d.nodes.find((n) => n.id === r.b)!;
      return Math.hypot(a.x - b.x, a.z - b.z) > 35;
    })() &&
    (() => {
      const a = d.nodes.find((n) => n.id === r.a)!,
        b = d.nodes.find((n) => n.id === r.b)!;
      return inRiverWater(d, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
    })(),
)!;
assert(bridge, "Source bridge over real water");
const a = d.nodes.find((n) => n.id === bridge.a)!,
  b = d.nodes.find((n) => n.id === bridge.b)!,
  mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
assert(!blockedByRiver(d, mid));
assert(blockedByRiver({ ...d, roads: d.roads.filter((r) => !r.bridge) }, mid));
const v = {
  ...createVehicle(d),
  ...mid,
  heading: Math.atan2(b.x - a.x, b.z - a.z),
};
controller.reset();
for (let i = 0; i < 70; i++)
  controller.update(v, { gas: true, brake: false, steer: 0 }, d, [], 1 / 60);
assert.equal(v.collision, 0);
assert(
  Math.hypot(v.x - mid.x, v.z - mid.z) > 8,
  "Real controller travels along the bridge over water",
);
// Water contact is tested at a clear in-channel point, not hidden by any bridge.
const wet = anchors
  .filter((a) => a.id.startsWith("water:"))
  .map(geographicToMeters)
  .find((p) => blockedByRiver(d, p) && riverClearance(d, p) < -20)!;
assert(wet);
const w = { ...createVehicle(d), ...wet };
controller.reset();
controller.update(w, { gas: true, brake: false, steer: 0 }, d, [], 1 / 60);
assert.equal(w.collision, 1);
assert.equal(w.x, wet.x);
assert.equal(w.z, wet.z);
const shore = { ...createVehicle(d), x: -10, z: 3, heading: Math.PI / 2 };
controller.reset();
for (let i = 0; i < 180; i++)
  controller.update(
    shore,
    { gas: true, brake: false, steer: 0 },
    fixture,
    [],
    1 / 60,
  );
assert(
  shore.x <= -1.5 && shore.x > -3,
  "Controller stops at physical shoreline clearance",
);
const report = {
  pass: true,
  anchors: anchors.length,
  playerNodes: player.size,
  pedestrianNodes: pedestrian.size,
  trafficNodes: traffic.size,
  connectedPlayerNodes: visited.size,
  narrowWays: narrow.length,
  controllerTravelM: Math.hypot(p.x - original.x, p.z - original.z),
  bridge: bridge.corridor,
  waterCollision: true,
};
fs.mkdirSync(new URL("../../../docs/qa/real-scale/", import.meta.url), {
  recursive: true,
});
fs.writeFileSync(
  new URL("../../../docs/qa/real-scale/targeted-tests.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report);
