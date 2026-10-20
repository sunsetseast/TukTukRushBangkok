import assert from "node:assert/strict";
import fs from "node:fs";
import { createBangkokWorld, toMap } from "../src/game/bangkok/world";
import { buildLandmarkRegistry } from "../src/game/bangkok/landmarkRegistry";
import {
  landmarkParcels,
  parcelConflicts,
  rectangleBoundary,
  polygonsOverlap,
} from "../src/game/bangkok/landmarkParcels";
import {
  validateFacadeOrientation,
  validateLandmarkVisibility,
  segmentBoxHit,
} from "../src/game/bangkok/landmarkVisibility";
import { navigationPath } from "../src/game/navigation";
import { REAL_PLACES } from "../src/game/bangkok/realPlaces";
import { distanceToSegment } from "../src/game/world";
import { trainSample } from "../src/game/bangkok/transit/service";
import { completeLandmarkContext } from "../src/game/bangkok/landmarkContext";
import { emitHuaGrounds } from "../src/game/bangkok/huaLamphong";
import {
  pieceVolume,
  validateSpatialVolumes,
} from "../src/game/bangkok/spatialValidation";
const d = createBangkokWorld(),
  registry = buildLandmarkRegistry(d),
  parcels = landmarkParcels(d),
  nodes = new Map(d.nodes.map((n) => [n.id, n]));
assert.equal(
  new Set(registry.map((r) => r.id)).size,
  registry.length,
  "Unique named IDs, including shared BTS interchanges",
);
assert.equal(registry.filter((r) => r.id === "hua").length, 1);
assert(
  registry.some((r) => r.id === "hua-lamphong-mrt"),
  "Mainline station and underground BL28 have separate identities",
);
for (const l of d.landmarks) {
  const entry = registry.find((r) => r.id === l.id)!;
  assert(entry);
  assert.deepEqual(entry.map, toMap(l.id==='swing'?{x:l.plot!.x,z:l.plot!.z-58}:l.plot??l));
  assert.deepEqual(entry.modelOrigin,l.plot??l);
  assert.equal(entry.rotation, l.yaw ?? 0);
  assert(entry.vehicleAccess, `Public passenger stop for ${l.id}`);
  assert(
    navigationPath(d, d.nodes[0]!, nodes.get(entry.vehicleAccess!.nodeId)!)
      .length > 1,
    `Mission can reach ${l.id}`,
  );
}
const occupancy = d.buildings.flatMap((b, i) =>
  parcelConflicts(d, b).map((p) => ({
    objectId: b.environmentId ?? `building:${i}`,
    parcel: p.id,
  })),
);
assert.deepEqual(
  occupancy,
  [],
  "Every generation pass respects protected structures, forecourts and entrances",
);
const orientation = validateFacadeOrientation(d);
assert(
  orientation.every((v) => v.pass),
  JSON.stringify(orientation.filter((v) => !v.pass)),
);
const visibility = validateLandmarkVisibility(d),
  hua = visibility.filter((v) => v.landmarkId === "hua");
assert.equal(hua.length, 4);
assert(
  hua.every((v) => v.visible && v.frontFacing),
  "Clock, entrance and both arch shoulders visible from Rama IV",
);
const fixture = {
  x: 400,
  z: -226,
  w: 10,
  d: 10,
  height: 16,
  color: "#aaa",
  environmentId: "regression:shop-on-forecourt",
};
assert(
  parcelConflicts(d, fixture).some((p) => p.landmarkId === "hua"),
  "Reject the original late-infill obstruction",
);
d.obstacles.push(fixture);
assert(
  validateLandmarkVisibility(d, hua).some(
    (v) =>
      !v.visible &&
      v.blockers.some((b) => b.objectId === fixture.environmentId),
  ),
  "Visibility must fail if a blocking shop returns",
);
d.obstacles.pop();
const station = d.landmarks.find((l) => l.id === "hua")!;
const yaw = station.yaw;
station.yaw = Math.PI;
assert(
  !validateFacadeOrientation(d).find((v) => v.id === "hua")!.pass,
  "Independent compass expectation catches backwards facade",
);
station.yaw = yaw;
// Rotated long wing crosses a polygon although its centre lies outside.
const square = rectangleBoundary({ x: 0, z: 0, w: 10, d: 10, yaw: 0 });
assert(
  polygonsOverlap(
    square,
    rectangleBoundary({ x: 12, z: 0, w: 2, d: 24, yaw: Math.PI / 2 }),
  ),
);
assert(
  !polygonsOverlap(
    square,
    rectangleBoundary({ x: 25, z: 0, w: 2, d: 24, yaw: 0 }),
  ),
);
const ray = { x: 0, y: 6, z: -20 },
  target = { x: 0, y: 6, z: 20 };
assert.equal(
  segmentBoxHit(ray, target, {
    x: 0,
    z: 0,
    w: 8,
    d: 8,
    height: 2,
    color: "#fff",
  }),
  undefined,
);
assert.notEqual(
  segmentBoxHit(ray, target, {
    x: 0,
    z: 0,
    w: 8,
    d: 8,
    height: 12,
    color: "#fff",
    yaw: Math.PI / 4,
  }),
  undefined,
);
for (const real of REAL_PLACES.filter((p) => p.bank)) {
  const entry = registry.find((r) => r.id === real.id)!;
  const near = d
    .river!.slice(1)
    .map((b, i) => distanceToSegment(entry.world, d.river![i]!, b))
    .sort((a, b) => a.distance - b.distance)[0]!.point;
  assert.equal(
    entry.world.x > near.x ? "east" : "west",
    real.bank,
    `Riverbank: ${real.id}`,
  );
}
for (const line of d.transit!.lines) {
  assert(line.stations[0]!.distance > 50, `${line.id} start run-out`);
  assert(
    line.length - line.stations.at(-1)!.distance > 50,
    `${line.id} end run-out`,
  );
  for (const s of line.stations.filter((s) => s.id !== "siam"))
    for (const direction of [-1, 1])
      for (const offset of [-s.length / 2, 0, s.length / 2]) {
        const p = { ...line.samples[0]! };
        trainSample(line, s.distance + offset, direction, p);
        assert(
          Math.abs(p.y - (line.id === "gold" ? 12 : 13)) < 0.001,
          `Ordinary station platform level: ${line.id}/${s.id}`,
        );
      }
}
const grounds: ReturnType<typeof pieceVolume>[] = [];
emitHuaGrounds(d, (p) => grounds.push(pieceVolume(p, `hua:${grounds.length}`)));
assert.equal(
  validateSpatialVolumes(d, grounds).length,
  0,
  "Station furnishings clear live lanes",
);
const pockets = completeLandmarkContext(d);
assert(pockets.some((p) => p.use === "completed-context"));
assert(
  pockets.filter((p) => p.use === "completed-context").length <= 120,
  "Bounded mobile scene additions",
);
const summary = {
  pass: true,
  registryEntries: registry.length,
  landmarks: d.landmarks.length,
  protectedParcels: parcels.length,
  facadeOrientations: orientation.length,
  sightlines: visibility.length,
  clearSightlines: visibility.filter((v) => v.visible).length,
  huaFeatures: hua.length,
  parcelConflicts: occupancy.length,
  contextPockets: pockets.length,
  improvedPockets: pockets.filter((p) => p.use === "completed-context").length,
  physicalIPhone: false,
};
const output = new URL(
  "../../../docs/qa/landmark-accuracy/validation.json",
  import.meta.url,
);
fs.mkdirSync(new URL(".", output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(summary, null, 2));
console.log(summary);
