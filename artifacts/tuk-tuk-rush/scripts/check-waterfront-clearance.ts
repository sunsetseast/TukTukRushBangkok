import { assertBangRakMigration } from "./bang-rak-migration-contract";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { createBangkokWorld } from "../src/game/bangkok/world";
import {
  roadManeuvers,
  segmentFootprintDistance,
} from "../src/game/bangkok/roadManeuvers";
import { completeStreetFabric } from "../src/game/bangkok/streetFabric";
import { planEnvironment } from "../src/game/bangkok/environmentPlan";
import {
  VEHICLE_COLLISION_RADIUS,
  ARRIVAL_MANEUVER_RADIUS,
  steeringYawRate,
} from "../src/game/vehicleEnvelope";
import { VehicleController } from "../src/game/vehicle";
import { assertApprovedManeuverMigration } from "./waterfront-migration-contract";
import { distanceToSegment, obstacleDistance } from "../src/game/world";
import type { District, Obstacle } from "../src/game/types";
import {
  approvedChinatownParcel,
  assertChinatownGraphMigration,
} from "./chinatown-migration-contract";
const root = new URL("../../../", import.meta.url),
  out = new URL("docs/qa/waterfront-certification/", root),
  before = JSON.parse(
    gunzipSync(
      fs.readFileSync(new URL("before-world.json.gz", out)),
    ).toString(),
  );
const d = createBangkokWorld(),
  maneuvers = roadManeuvers(d),
  known = ["street-infill:3445522820", "env:tree:-14844:103535"];
assertApprovedManeuverMigration(d);
assert.equal(VEHICLE_COLLISION_RADIUS, 1.5);
for (const speed of [0, 2, 5, 10, 31, 37])
  assert.equal(
    steeringYawRate(speed),
    1.7 - Math.min(Math.abs(speed) / 45, 0.55),
  );
assert(
  ARRIVAL_MANEUVER_RADIUS > 8 && ARRIVAL_MANEUVER_RADIUS < 10,
  "Limited existing low-speed turning sweep, not wholesale road widening",
);
let segmentCases = 0;
for (let i = 0; i < 40; i++) {
  const yaw = i * 0.29,
    o = { x: 4, z: 6, w: 5, d: 3, yaw, height: 1, color: "#fff" },
    a = { x: Math.sin(i * 0.71) * 12, z: Math.cos(i * 0.43) * 12 },
    b = { x: Math.cos(i * 0.89) * 12, z: Math.sin(i * 0.23) * 12 };
  const exact = segmentFootprintDistance(a, b, o);
  let sampled = Infinity;
  for (let k = 0; k <= 1500; k++)
    sampled = Math.min(
      sampled,
      obstacleDistance(
        {
          x: a.x + ((b.x - a.x) * k) / 1500,
          z: a.z + ((b.z - a.z) * k) / 1500,
        },
        o,
      ),
    );
  assert(
    exact <= sampled + 1e-7 && sampled - exact < 0.02,
    "Exact rotated footprint / independent dense samples",
  );
  segmentCases++;
}
const generated = [
  ...completeStreetFabric(d).infill,
  ...planEnvironment(d).map((s) => s.body),
];
for (const o of generated)
  assert(
    maneuvers.clear(o),
    "Generated roadside object blocks a protected maneuver: " + o.environmentId,
  );
const oldKnown = before.obstacles.filter((o: Obstacle) =>
  known.includes(o.environmentId ?? ""),
);
assert.equal(oldKnown.length, 2);
for (const o of oldKnown)
  assert(
    maneuvers.conflicts(o).length,
    "Original real collider must fail the new general clearance contract",
  );
const replacements = oldKnown.map((old: Obstacle) => {
  const exact = d.obstacles.find((o) => o.environmentId === old.environmentId);
  const nearby =
    exact ??
    d.buildings
      .filter((o) => o.environmentId?.startsWith("street-infill:"))
      .sort(
        (a, b) =>
          Math.hypot(a.x - old.x, a.z - old.z) -
          Math.hypot(b.x - old.x, b.z - old.z),
      )[0]!;
  assert(
    nearby && Math.hypot(nearby.x - old.x, nearby.z - old.z) < 6,
    "Retain local scenery at each encounter",
  );
  assert(maneuvers.clear(nearby));
  return {
    before: old,
    after: nearby,
    translation: Math.hypot(nearby.x - old.x, nearby.z - old.z),
    sameIdentity: exact !== undefined,
  };
});
assert(
  d.buildings.filter((b) => !approvedChinatownParcel(b)).length >=
    before.buildings.filter((b: Obstacle) => !approvedChinatownParcel(b))
      .length *
      0.995,
  "Keep city frontage density outside explicitly reconstructed Chinatown; its parcel containment and exact exterior delta are independently certified",
);
// The approved successor migrates Chinatown only; compare its exterior to
// merged PR37, while preserving the original water/bounds/transit equality.
const pr37 = JSON.parse(
  gunzipSync(
    fs.readFileSync(
      new URL("docs/qa/chinatown-reconstruction/before-world.json.gz", root),
    ),
  ).toString(),
) as District;
assertChinatownGraphMigration(d, pr37);
for (const old of pr37.destinations ?? []) {
  const now = d.destinations!.find((a) => a.id === old.id)!;
  assert(now, "Destination identity retained");
  for (const key of ["origin", "yaw", "entrance"] as const)
    assert.deepEqual(
      now[key],
      old[key],
      "Preserve authored arrival architecture " + old.id,
    );
}
for (const key of [
  "river",
  "riverPolygon",
  "riverStructures",
  "bounds",
  "transit",
] as const)
  assert.deepEqual(
    JSON.parse(JSON.stringify(d[key])),
    before[key],
    key + " must remain exactly PR36",
  );
const preservation = JSON.parse(
  fs.readFileSync(new URL("preservation-contract.json", out), "utf8"),
);
const successor = JSON.parse(
  fs.readFileSync(
    new URL(
      "docs/qa/chinatown-reconstruction/references/source-approval.json",
      root,
    ),
    "utf8",
  ),
);
for (const item of preservation.files) {
  const bytes = fs.readFileSync(new URL(item.path, root));
  if(item.path === "artifacts/tuk-tuk-rush/src/game/bangkok/cityData.v1.json") {
    const priorBytes=gunzipSync(fs.readFileSync(new URL("docs/qa/bang-rak/validation/pr41-city-data.json.gz",root)));
    assert.equal(createHash("sha256").update(priorBytes).digest("hex"),successor.files[item.path]??item.sha256,"Original approved city data fixture");
    const prior=JSON.parse(priorBytes.toString()),current=JSON.parse(bytes.toString());
    const {roadBaseline:oldRoads,...oldData}=prior,{roadBaseline:newRoads,...newData}=current;
    assert.deepEqual(newData,oldData,"Only the explicitly approved additive road ledger changes");
    assert.equal(newRoads.version,4);assert.equal(newRoads.roads,oldRoads.roads+26);assert.equal(newRoads.nodes,oldRoads.nodes+26);
    assert.deepEqual(newRoads.sourceStages,[...oldRoads.sourceStages,"bang-rak-v1"]);
    assertBangRakMigration(d);
    continue;
  }
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    successor.files[item.path] ?? item.sha256,
    "Preserved approved source: " + item.path,
  );
}
// Keep the actual collider active: drive a standard-size circle into each old
// solid in a minimal road district. No object-ID exemption or disabled physics.
let resolved = 0;
for (const obstacle of oldKnown) {
  const contacts: any[] = [],
    controller = new VehicleController((c) => contacts.push(c)),
    p = {
      x: obstacle.x,
      z: obstacle.z - 12,
      heading: 0,
      speed: 0,
      steer: 0,
      lean: 0,
      wheelSpin: 0,
      collision: 0,
    },
    test = {
      ...d,
      worldId: "fixture",
      river: undefined,
      riverPolygon: undefined,
      canals: [],
      obstacles: [obstacle],
      bounds: { minX: -5000, maxX: 5000, minZ: -5000, maxZ: 5000 },
    } as District;
  for (let i = 0; i < 180; i++)
    controller.update(
      p,
      { gas: true, brake: false, steer: 0 },
      test,
      [],
      1 / 60,
    );
  assert(contacts.some((c) => c.kind === "static"));
  assert(obstacleDistance(p, obstacle) >= 1.5 - 1e-6);
  resolved++;
}
const report = {
  pass: true,
  generatedChecked: generated.length,
  segmentCases,
  realColliderChecks: resolved,
  maneuverSweeps: maneuvers.sweeps.length,
  arrivalRadius: ARRIVAL_MANEUVER_RADIUS,
  buildings: { before: before.buildings.length, after: d.buildings.length },
  replacements,
  preserved: preservation.files.length,
  exteriorRoadGeometryIdenticalToPR37: true,
  riverGeometryIdentical: true,
};
fs.mkdirSync(new URL("validation/", out), { recursive: true });
fs.writeFileSync(
  new URL("validation/clearance.json", out),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
