import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { createBangkokWorld } from "../src/game/bangkok/world";
import {
  CHINATOWN_PLAN,
  inChinatownMigration,
} from "../src/game/bangkok/chinatownPlan";
import {
  planChinatownBlocks,
  polygonContains,
  clearsPedestrianPassages,
} from "../src/game/bangkok/chinatownBlocks";
import {
  rectangleBoundary,
  parcelConflicts,
} from "../src/game/bangkok/landmarkParcels";
import { roadManeuvers } from "../src/game/bangkok/roadManeuvers";
import {
  distanceToSegment,
  orientedFootprintsOverlap,
} from "../src/game/world";
import { designBuildings } from "../src/game/bangkok/buildingGrammar";
import { districtSigns } from "../src/game/bangkok/districtSigns";
import { emitChinatownArchitecture } from "../src/game/bangkok/chinatownArchitecture";
import {
  validateSpatialVolumes,
  pieceVolume,
} from "../src/game/bangkok/spatialValidation";
import { CurrentStreetTracker } from "../src/game/currentStreet";
import {
  assertChinatownGraphMigration,
  chinatownFootprintKey,
  approvedChinatownParcel,
} from "./chinatown-migration-contract";
import type { District, Obstacle } from "../src/game/types";
const out = new URL(
    "../../../docs/qa/chinatown-reconstruction/",
    import.meta.url,
  ),
  before = JSON.parse(
    gunzipSync(
      fs.readFileSync(new URL("before-world.json.gz", out)),
    ).toString(),
  ) as District,
  d = createBangkokWorld();
assertChinatownGraphMigration(d, before);
assert.deepEqual(d.riverPolygon, before.riverPolygon);
assert.deepEqual(d.river, before.river);
assert.equal(d.waterVersion, before.waterVersion);
const blocks = planChinatownBlocks(d),
  parcels = d.buildings.filter((b) => b.chinatown),
  maneuvers = roadManeuvers(d),
  nodes = new Map(d.nodes.map((n) => [n.id, n]));
assert(
  blocks.length >= 20 && parcels.length >= 400,
  "Street-derived blocks must cover both core and waterfront strips",
);
for (const p of parcels) {
  const block = blocks.find((b) => b.id === p.chinatown!.block)!;
  assert(block);
  assert(
    rectangleBoundary(p).every(
      (q) =>
        polygonContains(q, block.boundary) &&
        !block.holes.some((h) => polygonContains(q, h)),
    ),
    "Whole parcel stays in its street-defined block",
  );
  assert(clearsPedestrianPassages(p));
  assert.equal(parcelConflicts(d, p).length, 0);
  assert(maneuvers.clear(p), "PR37 maneuver envelope preserved");
  const front = {
    x: p.x + Math.sin(p.yaw ?? 0) * (p.d / 2 + 6.8),
    z: p.z + Math.cos(p.yaw ?? 0) * (p.d / 2 + 6.8),
  };
  assert(
    d.roads.some(
      (r) =>
        r.corridor === p.chinatown!.corridor &&
        distanceToSegment(front, nodes.get(r.a)!, nodes.get(r.b)!).distance <
          r.width / 2 + 2,
    ),
    "Shopfront points toward its actual assigned street",
  );
  for (const q of d.buildings)
    if (
      q !== p &&
      Math.hypot(q.x - p.x, q.z - p.z) <
        Math.hypot(p.w, p.d) + Math.hypot(q.w, q.d)
    )
      assert(
        !orientedFootprintsOverlap(p, q, -0.02),
        "No intersecting building massing",
      );
}
for (const s of CHINATOWN_PLAN.streets) {
  assert(
    s.sourceWays.length,
    "Every curated street needs retained source geometry",
  );
  const roads = d.roads.filter(
    (r) =>
      r.corridor === s.corridor &&
      (s.corridor !== "charoen_s" ||
        Math.max(nodes.get(r.a)!.z, nodes.get(r.b)!.z) <= 360.0001),
  );
  assert(roads.length, s.corridor);
  assert(
    roads.every((r) => r.name === s.name && !!r.oneWay === s.oneWay),
    "Street name and segment direction " + s.corridor,
  );
}
assert(
  !d.roads.some((r) => r.corridor === "shortcut_1"),
  "Invented workshop shortcut replaced by real street hierarchy",
);
const oldKeys = new Set(before.buildings.map(chinatownFootprintKey)),
  newKeys = new Set(d.buildings.map(chinatownFootprintKey));
const removed = before.buildings.filter(
    (p) => !newKeys.has(chinatownFootprintKey(p)),
  ),
  added = d.buildings.filter((p) => !oldKeys.has(chinatownFootprintKey(p)));
const outside = [...removed, ...added].filter(
  (p) => !approvedChinatownParcel(p),
);
fs.writeFileSync(
  new URL("parcel-migration.json", out),
  JSON.stringify(
    { version: CHINATOWN_PLAN.version, removed, added, outside },
    null,
    2,
  ),
);
assert.equal(
  outside.length,
  0,
  "No exterior building shuffle: " + JSON.stringify(outside.slice(0, 6)),
);
const designs = designBuildings(d).filter((p) => p.parcel.chinatown),
  pieces: Parameters<typeof pieceVolume>[0][] = [];
for (const p of designs) emitChinatownArchitecture(p, (q) => pieces.push(q));
const volumes = pieces.map((p, i) => pieceVolume(p, "chinatown:" + i));
assert.equal(
  validateSpatialVolumes({ ...d, transit: undefined }, volumes).length,
  0,
  "Actual facade, roof and prop volumes clear live road surfaces",
);
const signs = districtSigns(designs);
for (const s of signs) {
  assert(
    s.y + s.height / 2 <= s.p.parcel.height,
    "Major sign is mounted below owner roof",
  );
  assert(
    s.v > s.p.parcel.d / 2 && s.v - s.p.parcel.d / 2 < 4,
    "Bracket reaches its owner facade",
  );
  assert(Math.abs(s.u) < s.p.parcel.w / 2, "Sign anchor is on its own parcel");
}
for (const identity of ["scala-yaowarat", "hua-seng-heng", "tang-to-kang"])
  assert(parcels.some((p) => p.chinatown!.identity === identity));
// Independent tiny parallel-road/intersection fixture tests hysteresis and the
// omission of unnamed service access without scanning the production graph.
const fixture: District = {
  nodes: [
    { id: "a", x: 0, z: 0 },
    { id: "b", x: 100, z: 0 },
    { id: "c", x: 0, z: 9 },
    { id: "e", x: 100, z: 9 },
    { id: "f", x: 100, z: 60 },
  ],
  roads: [
    { a: "a", b: "b", width: 10, name: "Yaowarat Road", corridor: "yaowarat" },
    { a: "c", b: "e", width: 8, name: "Song Wat Road", corridor: "songwat" },
    {
      a: "b",
      b: "f",
      width: 10,
      name: "Ratchawong Road",
      corridor: "ratchawong",
    },
  ],
  buildings: [],
  obstacles: [],
  landmarks: [],
};
const tracker = new CurrentStreetTracker(fixture);
assert.equal(
  tracker.update({ x: 30, z: 0 }, Math.PI / 2, 0)?.english,
  "Yaowarat Road",
);
for (let i = 1; i < 8; i++)
  assert.equal(
    tracker.update({ x: 35, z: 3.8 + (i % 2) * 0.2 }, Math.PI / 2, i * 210)
      ?.english,
    "Yaowarat Road",
    "Parallel-road jitter must not flicker",
  );
tracker.update({ x: 100, z: 28 }, 0, 2000);
assert.equal(
  tracker.update({ x: 100, z: 30 }, 0, 2210)?.english,
  "Ratchawong Road",
);
assert.equal(
  tracker.update({ x: 200, z: 200 }, 0, 2500)?.english,
  "Ratchawong Road",
  "Short off-road absence preserves reliable name",
);
const queries = tracker.queries;
for (let i = 0; i < 100; i++) tracker.update({ x: 200, z: 200 }, 0, 2501 + i);
assert.equal(tracker.queries, queries);
assert.equal(
  tracker.update({ x: 30, z: 0 }, Math.PI / 2, 0)?.english,
  "Yaowarat Road",
  "Restarted session clock resolves its new street immediately",
);
const report = {
  pass: true,
  blocks: blocks.length,
  parcels: parcels.length,
  frontagePieces: pieces.length,
  majorSigns: signs.length,
  footprints: {
    removed: removed.length,
    added: added.length,
    exteriorChanges: outside.length,
  },
  riverUnchanged: true,
  graphOutsideScopeUnchanged: true,
  currentStreet: { hysteresis: true, spatialIndex: true, rateLimited: true },
};
fs.writeFileSync(
  new URL("validation/chinatown.json", out),
  JSON.stringify(report, null, 2),
);
console.log(report);
