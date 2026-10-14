import assert from 'node:assert/strict';
import { createDistrict, distanceToSegment, obstacleDistance, routeBetween } from '../src/game/world';
import { createMissions } from '../src/game/missions';
import { TrafficSystem } from '../src/game/traffic';
import { createVehicle, VehicleController } from '../src/game/vehicle';
import type { Point } from '../src/game/types';

const district = createDistrict(), nodes = new Map(district.nodes.map(n => [n.id, n]));
assert(district.buildings.length >= 50);
assert(district.buildings.filter(b => b.showcase).length >= 20);
assert(new Set(district.buildings.map(b => b.style)).size >= 5);
assert(district.roundabout);
const rb = district.roundabout;
const lanesClear = (p: Point, margin = 1.5) => district.obstacles.every(b => obstacleDistance(p, b) > margin);
for (const road of district.roads) {
  const a = nodes.get(road.a)!, b = nodes.get(road.b)!;
  assert(Math.hypot(b.x - a.x, b.z - a.z) > 0.1, 'No zero-length segments');
  for (let i = 0; i <= 100; i++) {
    const t = i / 100, p = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    assert(lanesClear(p), `Blocked ${road.name} ${road.a}>${road.b} t${t}`);
  }
  if (road.roundabout) {
    assert(road.oneWay);
    const ax = a.x - rb.x, az = a.z - rb.z, bx = b.x - rb.x, bz = b.z - rb.z;
    assert(ax * bz - az * bx > 0, 'Left-driving roundabout must run clockwise in X/south-Z');
    assert(Math.abs(Math.hypot(ax, az) - rb.radius) < 0.01);
  }
}
const yaowarat = district.roads.filter(r => r.name === 'Yaowarat Road');
const headings = yaowarat.map(r => {
  const a = nodes.get(r.a)!, b = nodes.get(r.b)!;
  return Math.atan2(b.x - a.x, b.z - a.z);
});
assert(Math.max(...headings) - Math.min(...headings) > 0.45, 'Yaowarat must curve, not retain the grid');
for (const m of createMissions(district)) {
  assert(routeBetween(district, m.pickup.id, m.destination.id).length);
  assert(lanesClear(m.pickup)); assert(lanesClear(m.destination));
}
// Inspect left-lane sign away from junction blending, then long graph traversal.
const ts = new TrafficSystem(district), cars = ts.create(), player = createVehicle();
for (const c of cars) {
  const a = nodes.get(c.from)!, b = nodes.get(c.to)!, len = Math.hypot(b.x - a.x, b.z - a.z);
  const signedLeft = ((b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z)) / len;
  const r=district.roads.find(r=>r.a===c.from&&r.b===c.to||!r.oneWay&&r.b===c.from&&r.a===c.to)!;
  assert(r.roundabout || signedLeft > Math.min(3,r.width/4)-.01, 'Traffic spawned on right side');
}
let circleFrames = 0, changedEdges = 0;
for (let i = 0; i < 18000; i++) {
  const before = cars.map(c => c.from + '>' + c.to);
  ts.update(cars, { ...player, x: -340, z: 330 }, 1 / 60);
  cars.forEach((c, j) => {
    assert(Number.isFinite(c.x) && Number.isFinite(c.heading));
    assert(district.roads.some(r => r.a === c.from && r.b === c.to || !r.oneWay && r.a === c.to && r.b === c.from), 'AI violated one-way graph');
    if (c.from.startsWith('odeon:') && c.to.startsWith('odeon:')) circleFrames++;
    if (before[j] !== c.from + '>' + c.to) changedEdges++;
    assert(lanesClear(c, 0.8), `Traffic clipped geometry: ${c.from}>${c.to}`);
    assert(distanceToSegment(c, nodes.get(c.from)!, nodes.get(c.to)!).distance <= 14, 'AI departed junction envelope');
  });
}
assert(circleFrames > 50 && changedEdges > 100, 'Traffic must navigate the full graph and circle');
const controller = new VehicleController(), v = createVehicle();
for (let i = 0; i < 150; i++) controller.update(v, { gas: true, brake: false, steer: 0 }, district, [], 1 / 60);
assert(v.speed > 10, 'Throttle regression');
controller.recover(v, district);
assert.equal(v.speed, 0);
for (let i = 0; i < 120; i++) controller.update(v, { gas: true, brake: false, steer: .5 }, district, [], 1 / 60);
assert(v.steer > .4);
for (let i = 0; i < 180; i++) controller.update(v, { gas: false, brake: true, steer: 0 }, district, [], 1 / 60);
assert(v.speed < 0, 'Reverse regression');
console.log(JSON.stringify({ pass: true, nodes: nodes.size, roads: district.roads.length, buildings: district.buildings.length, curvedRoad: true, clockwiseCircle: true, leftTraffic: true, fiveMinuteTrafficEdges: changedEdges, circleFrames }));
