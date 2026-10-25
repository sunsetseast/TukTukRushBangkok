import { approvedCompletionRetirement } from "./bang-rak-completion-migration-contract";
import { retiredBangRakIds } from "../src/game/bangkok/bangRakSeam";
import { beforeBangRak, assertBangRakMigration } from "./bang-rak-migration-contract";
import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { createBangkokWorld } from "../src/game/bangkok/world";
import {
  planChinatownBlocks,
  clearsPedestrianPassages,
} from "../src/game/bangkok/chinatownBlocks";
import { footprintInBlock } from "../src/game/bangkok/blockContainment";
import {
  rectangleBoundary,
  parcelConflicts,
} from "../src/game/bangkok/landmarkParcels";
import { orientedFootprintsOverlap } from "../src/game/world";
import { roadManeuvers } from "../src/game/bangkok/roadManeuvers";
import { designBuildings } from "../src/game/bangkok/buildingGrammar";
import { emitChinatownArchitecture } from "../src/game/bangkok/chinatownArchitecture";
import { TrafficSystem, lanePoint } from "../src/game/traffic";
import { createVehicle } from "../src/game/vehicle";
import type { District, Obstacle, TrafficCar } from "../src/game/types";
const out = new URL("../../../docs/qa/chinatown-completion/", import.meta.url);
const before = JSON.parse(
  gunzipSync(
    fs.readFileSync(
      new URL("../chinatown-reconstruction/after-world.json.gz", out),
    ),
  ).toString(),
) as District;
const d = createBangkokWorld(),
  blocks = planChinatownBlocks(d),
  rear = d.buildings.filter((b) => b.chinatown?.role === "rear");
const inherited=beforeBangRak(d);
assert.deepEqual(inherited.nodes, before.nodes);
assert.deepEqual(inherited.roads, before.roads);
assert.deepEqual(inherited.landmarks, before.landmarks);
assert.deepEqual(d.riverPolygon, before.riverPolygon);
const key = (b: Obstacle) =>
  JSON.stringify([b.environmentId, b.x, b.z, b.w, b.d, b.yaw ?? 0, b.height]);
assert.deepEqual(
  inherited.buildings
    .filter((b) => !b.chinatown)
    .map(key)
    .sort(),
  before.buildings
    .filter((b) => !b.chinatown)
    .map(key)
    .sort(),
  "Exact exterior preservation",
);
const newKeys = new Set(d.buildings.map(key));
for (const b of before.buildings.filter((b) => b.chinatown))
  assert(newKeys.has(key(b)) || retiredBangRakIds.has(b.environmentId??"") || approvedCompletionRetirement(b,d), "Every original frontage is retained or explicitly migrated by the exact PR43/44 ledgers");
assert(rear.length >= 60, "A substantial completion of deep blocks");
const maneuvers = roadManeuvers(d);
for (const p of rear) {
  const block = blocks.find((b) => b.id === p.chinatown!.block)!;
  assert(footprintInBlock(p, block));
  assert(clearsPedestrianPassages(p));
  assert(!parcelConflicts(d, p).length);
  assert(maneuvers.clear(p));
  assert(
    d.obstacles.includes(p),
    "Rendered rear building uses the physical body",
  );
  const owner = block.parcels.find(
    (b) => b.environmentId === p.chinatown!.owner,
  );
  assert(
    owner && !owner.chinatown?.role,
    "Rear wing belongs to an original street property in the same block",
  );
  for (const q of d.buildings)
    if (q !== p)
      assert(
        !orientedFootprintsOverlap(p, q, -0.02),
        "Nonoverlapping complete building footprints",
      );
}
for (const block of blocks)
  for (const court of block.courts) {
    assert(footprintInBlock(court.body, block));
    assert(clearsPedestrianPassages(court.body));
    assert(maneuvers.clear(court.body));
    for (const p of d.buildings)
      assert(
        !orientedFootprintsOverlap(court.body, p, -0.02),
        "Service court remains open",
      );
    for (const f of court.fixtures)
      assert(d.obstacles.includes(f) && footprintInBlock(f, block));
  }
// Corners inside a concave ring are insufficient: the top edge crosses a notch.
const ring = (a: number[][]) => a.map(([x, z]) => ({ x: x!, z: z! }));
const fixture = {
  boundary: ring([
    [0, 0],
    [10, 0],
    [10, 10],
    [6, 10],
    [6, 4],
    [4, 4],
    [4, 10],
    [0, 10],
  ]),
  holes: [],
};
assert(!footprintInBlock({ x: 5, z: 5, w: 8, d: 8 }, fixture));
assert(
  !footprintInBlock(
    { x: 5, z: 5, w: 8, d: 8 },
    {
      boundary: ring([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]),
      holes: [
        ring([
          [4, 4],
          [6, 4],
          [6, 6],
          [4, 6],
        ]),
      ],
    },
  ),
  "Enclosed holes cannot disappear under a building",
);
let rendered = 0;
for (const p of designBuildings(d).filter((p) => p.parcel.chinatown?.role)) {
  const pieces: any[] = [];
  emitChinatownArchitecture(p, (q) => pieces.push(q));
  assert(
    pieces.some(
      (q) =>
        q.w === p.parcel.w &&
        q.h === p.parcel.height &&
        q.d === p.parcel.d &&
        q.x === p.parcel.x &&
        q.z === p.parcel.z,
    ),
    "Warehouse mesh and collision dimensions agree",
  );
  rendered += pieces.length;
}
// Shared traffic fixtures retain legal edges and make progress after yielding.
const td: District = {
  nodes: [
    { id: "a", x: 0, z: -80 },
    { id: "j", x: 0, z: 0 },
    { id: "b", x: 0, z: 80 },
    { id: "c", x: -80, z: 0 },
    { id: "e", x: 80, z: 0 },
  ],
  roads: [
    { a: "a", b: "j", width: 12 },
    { a: "j", b: "b", width: 12 },
    { a: "c", b: "j", width: 12 },
    { a: "j", b: "e", width: 12 },
  ],
  buildings: [],
  obstacles: [],
  landmarks: [],
};
const far = { ...createVehicle(), x: 9999, z: 9999 };
const system = new TrafficSystem(td, 26),
  ambient = system.create(far);
assert.equal(ambient.length, 16);
for (let i = 0; i < ambient.length; i++)
  for (let j = 0; j < i; j++)
    assert(
      Math.hypot(ambient[i]!.x - ambient[j]!.x, ambient[i]!.z - ambient[j]!.z) >
        6,
      "Spawn separation",
    );
const mk = (id: number, from: string, to: string, t: number): TrafficCar => {
  const a = td.nodes.find((n) => n.id === from)!,
    b = td.nodes.find((n) => n.id === to)!,
    r = td.roads.find((r) => r.a === from && r.b === to)!;
  return {
    ...ambient[0]!,
    ...lanePoint(a, b, r, t),
    id,
    from,
    to,
    heading: Math.atan2(b.x - a.x, b.z - a.z),
    speed: 8,
    wait: 0,
  };
};
const cars = [mk(100, "a", "j", 0.45), mk(101, "c", "j", 0.45)];
let minSeparation = Infinity,
  transitions = 0;
for (let step = 0; step < 1800; step++) {
  const old = cars.map((c) => c.to);
  system.update(cars, far, 1 / 60);
  minSeparation = Math.min(
    minSeparation,
    Math.hypot(cars[0]!.x - cars[1]!.x, cars[0]!.z - cars[1]!.z),
  );
  cars.forEach((c, i) => {
    if (c.to !== old[i]) transitions++;
    assert(
      td.roads.some(
        (r) =>
          (r.a === c.from && r.b === c.to) ||
          (!r.oneWay && r.b === c.from && r.a === c.to),
      ),
    );
  });
}
assert(minSeparation > 3.2, "Crossing junction traffic yields before overlap");
assert(
  transitions >= 2,
  "Junction must release both approaches without deadlock",
);
const report = {
  pass: true,
  blocks: blocks
    .filter((b) => b.courts.length)
    .map((b) => ({
      id: b.id,
      courts: b.courts.length,
      rear: b.parcels.filter((p) => p.chinatown?.role).length,
      area: b.area,
      addedFootprint: b.parcels
        .filter((p) => p.chinatown?.role)
        .reduce((s, p) => s + p.w * p.d, 0),
    })),
  rear: rear.length,
  renderedPieces: rendered,
  exteriorChanges: 0,
  originalFrontagesPreserved: true,
  fullContainment: true,
  trafficFixture: { minSeparation, transitions },
};
fs.writeFileSync(
  new URL("validation/completion.json", out),
  JSON.stringify(report, null, 2),
);
console.log(report);
