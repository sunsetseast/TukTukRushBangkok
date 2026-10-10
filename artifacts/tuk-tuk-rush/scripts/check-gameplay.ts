import assert from "node:assert/strict";
import { createDistrict, routeBetween } from "../src/game/world";
import { createMissions } from "../src/game/missions";
import { createVehicle, VehicleController } from "../src/game/vehicle";
import { TrafficSystem } from "../src/game/traffic";
const district = createDistrict();
const nodes = new Map(district.nodes.map((n) => [n.id, n]));
const blocked = (x: number, z: number) =>
  district.obstacles.some(
    (b) =>
      Math.abs(x - b.x) < b.w / 2 + 1.5 && Math.abs(z - b.z) < b.d / 2 + 1.5,
  );
for (const road of district.roads) {
  const a = nodes.get(road.a)!,
    b = nodes.get(road.b)!;
  for (let i = 0; i <= 100; i++) {
    const f = i / 100;
    assert(
      !blocked(a.x + (b.x - a.x) * f, a.z + (b.z - a.z) * f),
      `Blocked route ${road.name} ${road.a}:${road.b} t=${f}`,
    );
  }
}
for (const mission of createMissions(district)) {
  assert(
    routeBetween(district, mission.pickup.id, mission.destination.id).length,
  );
  assert(!blocked(mission.pickup.x, mission.pickup.z));
  assert(!blocked(mission.destination.x, mission.destination.z));
}
const trafficSystem = new TrafficSystem(district),
  traffic = trafficSystem.create();
const vehicle = createVehicle(),
  controller = new VehicleController();
let hits = 0;
for (let frame = 0; frame < 1400; frame++) {
  trafficSystem.update(traffic, vehicle, 1 / 60);
  controller.update(
    vehicle,
    { gas: true, brake: false, steer: 0 },
    district,
    traffic,
    1 / 60,
  );
  if (vehicle.collision) hits++;
  if (vehicle.x > 325) break;
}
assert(vehicle.x > 325, "Continuous Yaowarat traversal failed");
assert(hits === 0, "Unexpected collision on the boulevard centreline");
assert(
  traffic.every(
    (c) =>
      Number.isFinite(c.x) &&
      Number.isFinite(c.z) &&
      nodes.has(c.from) &&
      nodes.has(c.to),
  ),
);
controller.recover(vehicle, district, traffic);
assert(vehicle.speed === 0);
for (let i = 0; i < 90; i++)
  controller.update(
    vehicle,
    { gas: true, brake: false, steer: 0.6 },
    district,
    [],
    1 / 60,
  );
assert(Math.abs(vehicle.steer) > 0.5);
for (let i = 0; i < 180; i++)
  controller.update(
    vehicle,
    { gas: false, brake: true, steer: 0 },
    district,
    [],
    1 / 60,
  );
assert(vehicle.speed < 0, "Braking/reversing failed");
console.log(
  "PASS connected road/shortcut envelopes, mission reachability, 595m+ drive, traffic stability, recovery, steering, braking/reverse",
);
