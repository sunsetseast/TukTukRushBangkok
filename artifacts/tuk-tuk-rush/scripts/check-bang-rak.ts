import { planUrbanBlocks } from "../src/game/bangkok/urbanBlocks";
import { TrafficSystem, lanePoint } from "../src/game/traffic";
import { createVehicle } from "../src/game/vehicle";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createBangkokWorld } from "../src/game/bangkok/world";
import { BANG_RAK_PLAN, bangRakState } from "../src/game/bangkok/bangRakPlan";
import { assertBangRakMigration } from "./bang-rak-migration-contract";
import { designBuildings } from "../src/game/bangkok/buildingGrammar";
import {
  emitBangRakGrounds,
  emitBangRakParcel,
} from "../src/game/bangkok/bangRakArt";
import { bangRakPeople } from "../src/game/bangkok/bangRakActivity";
import { placementIndex } from "../src/game/bangkok/environmentPlan";
import {
  validateSpatialVolumes,
  pieceVolume,
  obstacleVolume,
} from "../src/game/bangkok/spatialValidation";
import { obstacleDistance, distanceToSegment } from "../src/game/world";
import { navigationPath } from "../src/game/navigation";
import {
  parcelConflicts,
  landmarkParcels,
} from "../src/game/bangkok/landmarkParcels";
import { buildLandmarkRegistry } from "../src/game/bangkok/landmarkRegistry";
import { CurrentStreetTracker } from "../src/game/currentStreet";
import type { ArtPiece } from "../src/game/bangkok/architecturalBatch";
const d = createBangkokWorld(),
  s = bangRakState(d)!,
  old = assertBangRakMigration(d),
  pieces: ArtPiece[] = [];
assert(
  planUrbanBlocks(d)
    .flatMap((b) => b.buildings)
    .every((b) => d.buildings.includes(b) && d.obstacles.includes(b)),
  "Every cached block references live physical parcels",
);
assert.equal(s.parcels.filter((p) => p.family === "warehouse").length, 8);
assert.equal(new Set(s.parcels.map((p) => p.family)).size, 6);
for (const seed of [982, 41, 67]) {
  const now = new TrafficSystem(d, seed).create(createVehicle(d));
  const prior = new TrafficSystem(old, seed).create(createVehicle(old));
  assert.equal(now.length, 38);
  assert.deepEqual(
    now,
    prior,
    `Preserve seeded 38-car initial population ${seed}`,
  );
}
const designs = designBuildings(d).filter((p) => p.parcel.bangRak);
for (const p of designs) {
  const nodes=new Map(d.nodes.map(n=>[n.id,n]));
  const edge=d.roads.filter(r=>r.corridor===p.parcel.bangRak!.road).map(r=>distanceToSegment(p.parcel,nodes.get(r.a)!,nodes.get(r.b)!)).sort((a,b)=>a.distance-b.distance)[0]!;
  const dx=edge.point.x-p.parcel.x,dz=edge.point.z-p.parcel.z;
  const dot=(dx*Math.sin(p.parcel.yaw??0)+dz*Math.cos(p.parcel.yaw??0))/Math.hypot(dx,dz);
  assert(dot>.7,`Actual frontage normal faces its named road: ${p.parcel.environmentId}`);
  emitBangRakParcel(p, (q) => pieces.push(q));
  assert.equal(p.corridor, p.parcel.bangRak!.road, "Frontage street ownership");
}
emitBangRakGrounds(d, (q) => pieces.push(q));
const conflicts = validateSpatialVolumes(d, [
  ...pieces.map((p, i) => pieceVolume(p, `br-art-${i}`)),
  ...d.obstacles
    .filter((o) => o.environmentId?.startsWith("br:"))
    .map(obstacleVolume),
]);
assert.equal(conflicts.length, 0, JSON.stringify(conflicts.slice(0, 10)));
assert(
  parcelConflicts(d, { ...s.parcels[0]!.body, landmarkId: "foreign-property" })
    .length > 0,
  "Foreign ownership must still be rejected",
);
const propertyConflicts = s.parcels.flatMap((p) => parcelConflicts(d, p.body));
assert.equal(propertyConflicts.length, 0, JSON.stringify(propertyConflicts));
for (const lane of BANG_RAK_PLAN.lanes) {
  const roads = d.roads.filter((r) => r.corridor === lane.id);
  assert.equal(roads.length, 13);
  assert(roads.every((r) => !r.oneWay && !r.noTraffic));
  const ns = new Map(d.nodes.map((n) => [n.id, n]));
  for (const r of roads) {
    const a = ns.get(r.a)!,
      b = ns.get(r.b)!;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8,
        p = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      assert(
        d.obstacles.every((o) => obstacleDistance(p, o) > lane.width / 2 - 0.1),
        "Real road has physical clearance",
      );
    }
  }
  const first = ns.get(roads[0]!.a)!,
    last = ns.get(roads.at(-1)!.b)!;
  assert(navigationPath(d, first, last).length > 1);
  assert(navigationPath(d, last, first).length > 1);
  const traffic = new TrafficSystem(d, 41),
    edge = roads[3]!,
    u = ns.get(edge.a)!,
    v = ns.get(edge.b)!,
    origin = lanePoint(u, v, edge, 0.2);
  const car = {
    ...origin,
    id: 999,
    heading: Math.atan2(v.x - u.x, v.z - u.z),
    speed: 5,
    kind: "car" as const,
    color: "#aaa",
    from: u.id,
    to: v.id,
    wait: 0,
    nearMissCooldown: 0,
  };
  let travel = 0;
  for (let i = 0; i < 900; i++) {
    const prev = { x: car.x, z: car.z };
    traffic.update([car], createVehicle(d), 1 / 60);
    const step = Math.hypot(car.x - prev.x, car.z - prev.z);
    assert(step < 0.25, "NPC continuous movement");
    travel += step;
    assert(
      d.obstacles.every((o) => obstacleDistance(car, o) > 1.1),
      "NPC clears walls",
    );
  }
  assert(travel > 30, "NPC uses the public lane graph");
  const tracker = new CurrentStreetTracker(d),
    r = roads[5]!,
    a = ns.get(r.a)!,
    b = ns.get(r.b)!;
  for (let tick = 0; tick < 5; tick++)
    tracker.update(
      { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
      Math.atan2(b.x - a.x, b.z - a.z),
      tick * 250,
    );
  assert.equal(tracker.current?.corridor, lane.id);
  assert(tracker.current?.thai);
}
const people = bangRakPeople(d, placementIndex(d).person);
assert(people.length >= 12, "Purposeful gallery/forecourt activity");
const registry = buildLandmarkRegistry(d);
for (const id of ["grand-postal", "warehouse-30"]) {
  const l = d.landmarks.find((l) => l.id === id)!,
    node = d.nodes.find((n) => n.id === l.accessNode)!;
  assert(navigationPath(d, old.spawn!, node).length > 2);
  assert(d.obstacles.every((o) => obstacleDistance(node, o) > 2));
  const r = registry.find((r) => r.id === id)!;
  assert(r.references.length >= 4);
  assert(r.footprints.length >= 4);
  assert(r.protectedParcels.length > 0);
}
const out = {
  pass: true,
  buildings: s.parcels.length,
  warehouseSheds: 8,
  distinctFamilies: 6,
  artPieces: pieces.length,
  newRoadEdges: 26,
  retainedOldRoadEdges: old.roads.length,
  retainedChinatownBuildings: d.buildings.filter((o) => o.chinatown).length,
  people: people.length,
  conflicts,
  protectedParcels: landmarkParcels(d).filter((p) =>
    ["grand-postal", "warehouse-30"].includes(p.landmarkId),
  ),
  remaining: s.rejected,
};
fs.mkdirSync(
  new URL("../../../docs/qa/bang-rak/validation/", import.meta.url),
  { recursive: true },
);
fs.writeFileSync(
  new URL(
    "../../../docs/qa/bang-rak/validation/district.json",
    import.meta.url,
  ),
  JSON.stringify(out, null, 2) + "\n",
);
console.log(
  JSON.stringify({ ...out, protectedParcels: out.protectedParcels.length }),
);
