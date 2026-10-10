import assert from "node:assert/strict";
import * as T from "three";
import { createDistrict, distanceToSegment, obstacleDistance } from "../src/game/world";
import { buildCity } from "../src/game/cityMesh";
import { ASSETS } from "../src/game/assets";
import { createVehicle, VehicleController } from "../src/game/vehicle";
import type { District, Obstacle, TrafficCar } from "../src/game/types";

const district = createDistrict();
const textures = new Map(Object.values(ASSETS).map(path => [path, new T.Texture()]));
const city = buildCity(district, textures);
const nodes = new Map(district.nodes.map(n => [n.id, n]));
const fixtures = city.group.userData.roadsideFixtures as
  { kind: string; x: number; z: number; clearance: number }[];
assert(Array.isArray(fixtures) && fixtures.length > 0, "Fixture metadata must exist");
for (const f of fixtures) {
  const p = { x: f.x, z: f.z };
  assert(district.roads.every(r =>
    distanceToSegment(p, nodes.get(r.a)!, nodes.get(r.b)!).distance >= r.width / 2 + f.clearance - 0.001
  ), `${f.kind} overlaps the drivable road at (${f.x}, ${f.z})`);
  if (district.roundabout) assert(
    Math.hypot(f.x - district.roundabout.x, f.z - district.roundabout.z) >= district.roundabout.radius + 3,
    "Fixture intrudes on Odeon Circle"
  );
  assert(district.buildings.every(b => obstacleDistance(p, b) >= f.clearance),
    "Fixture overlaps shophouse");
}
for (let i = 0; i < fixtures.length; i++)
  for (let j = i + 1; j < fixtures.length; j++)
    assert(Math.hypot(fixtures[i]!.x - fixtures[j]!.x, fixtures[i]!.z - fixtures[j]!.z) >=
      fixtures[i]!.clearance + fixtures[j]!.clearance + 2.19, "Overlapping fixtures");

// A test-only wall ensures that maintaining contact doesn't erase *all* player
// momentum, that reverse works, and that traffic contact permits escaping.
const wall: Obstacle = { x: 0, z: 0, w: 3, d: 5, height: 4, color: "#bbb" };
const emptyWorld: District = {
  nodes: [], roads: [], buildings: [], obstacles: [wall], landmarks: []
};
const controller = new VehicleController();
const player = { ...createVehicle(), x: 0, z: -4, heading: 0, speed: 0 };
for (let i = 0; i < 70; i++)
  controller.update(player, { gas: true, brake: false, steer: 0 }, emptyWorld, [], 1 / 60);
assert(player.z <= -3.95, "Wall still blocks forward penetration");
const pressedZ = player.z;
for (let i = 0; i < 60; i++)
  controller.update(player, { gas: false, brake: true, steer: 0 }, emptyWorld, [], 1 / 60);
assert(player.z < pressedZ - 0.5 && player.speed < 0, "Can back away after static contact");
controller.reset();
const car: TrafficCar = {
  id: 1, x: 20, z: 0, heading: 0, speed: 0, kind: "taxi",
  color: "#fff", from: "a", to: "b", wait: 0, nearMissCooldown: 0
};
const trafficWorld: District = { ...emptyWorld, obstacles: [] };
const trafficPlayer = { ...createVehicle(), x: 20, z: -3.15, heading: 0, speed: 0 };
for (let i = 0; i < 55; i++)
  controller.update(trafficPlayer, { gas: true, brake: false, steer: 0 }, trafficWorld, [car], 1 / 60);
const trafficContactZ = trafficPlayer.z;
for (let i = 0; i < 65; i++)
  controller.update(trafficPlayer, { gas: false, brake: true, steer: 0 }, trafficWorld, [car], 1 / 60);
assert(trafficPlayer.z < trafficContactZ - 0.5 && trafficPlayer.speed < 0,
  "Car contact must not immobilize reverse");
city.dispose();
console.log(`PASS roadside: ${fixtures.length} furniture placements, wall slide/reverse, traffic escape`);
