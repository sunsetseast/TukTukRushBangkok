import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import { createBangkokWorld } from '../src/game/bangkok/world';
import { VICTORY_SITE, victoryRingPoints, victoryIslandCollisions, victorySkywalkColumns } from '../src/game/bangkok/civicRoads';
import { victoryMonument } from '../src/game/bangkok/victoryMonument';
import { navigationPath } from '../src/game/navigation';
import { TrafficSystem, lanePoint } from '../src/game/traffic';
import { VehicleController, createVehicle } from '../src/game/vehicle';
import { distanceToSegment, obstacleDistance } from '../src/game/world';
import { disposeObject } from '../src/game/assets';
import type { District, Point } from '../src/game/types';

const d = createBangkokWorld(), c = VICTORY_SITE.center, nodes = new Map(d.nodes.map(n => [n.id, n]));
const circle = d.roads.filter(r => r.corridor === 'victory-circle');
assert(circle.length >= VICTORY_SITE.segments, 'Victory must have an actual sampled road circle');
const ringNodeIds = new Set(circle.flatMap(r => [r.a, r.b]));
const signed = (a: Point, b: Point) => (a.x - c.x) * (b.z - c.z) - (a.z - c.z) * (b.x - c.x);
for (const r of circle) {
  const a = nodes.get(r.a)!, b = nodes.get(r.b)!;
  assert(r.oneWay && r.roundabout && r.width === 20, 'Circulating lanes must be directed multi-lane public roads');
  assert(signed(a, b) > 0, 'Roundabout graph must circulate clockwise in north-up coordinates');
  assert(Math.abs(Math.hypot(a.x - c.x, a.z - c.z) - 64) < .1, 'Circle node remains on intended radius');
  assert.equal(circle.filter(q => q.a === r.a).length, 1, 'Exactly one outgoing circulating edge');
  assert.equal(circle.filter(q => q.b === r.a).length, 1, 'Exactly one incoming circulating edge');
}
for (const id of ringNodeIds) assert(!d.obstacles.some(o => obstacleDistance(nodes.get(id)!, o) < 3), `Live ring lane blocked at ${id}`);
for (const corridor of ['phaya', 'ratchawithi', 'din-daeng', 'rama-vi', 'ratchaprarop']) assert(d.roads.some(r => r.corridor === corridor), `Missing connected ${corridor} leg`);
const victory = d.landmarks.find(l => l.id === 'victory')!;
assert.deepEqual(victory.plot, c, 'Monument belongs inside the road ring');
assert(Math.hypot(nodes.get(victory.accessNode!)!.x - c.x, nodes.get(victory.accessNode!)!.z - c.z) > 65, 'Passenger stop stays outside memorial island');
for (const o of [...victoryIslandCollisions(), ...victorySkywalkColumns()]) {
  for (const r of d.roads.filter(r => !r.shortcut)) {
    const a = nodes.get(r.a)!, b = nodes.get(r.b)!;
    assert(distanceToSegment(o, a, b).distance > r.width / 2 + Math.hypot(o.w, o.d) / 2 + .5, `Memorial/skywalk collision intrudes into ${r.name}`);
  }
}
const nearest = (p: Point) => d.nodes.reduce((best, n) => Math.hypot(n.x - p.x, n.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z) ? n : best);
const south = nearest({ x: c.x + 8, z: c.z + 180 }), north = nearest({ x: c.x + 85, z: c.z - 180 });
const west = nearest({ x: 280, z: -1480 }), east = nearest({ x: 1300, z: -1480 });
for (const [a, b] of [[south, north], [north, south], [west, east], [east, west]]) {
  const path = navigationPath(d, a!, b!);
  assert(path.length > 5, 'Major north/south travel still routes through the reconstructed junction');
  assert(path.some(p => Math.hypot(p.x - c.x, p.z - c.z) < 67), 'Route reaches actual circle');
  assert(path.every(p => Math.hypot(p.x - c.x, p.z - c.z) > 53), 'Navigation never crosses memorial island');
}
const rail = d.transit!.lines.find(l => l.id === 'sukhumvit')!;
assert(rail.stations.find(s => s.id === 'victory-monument')!.z > c.z + 150, 'N3 stays south of roundabout');
assert(rail.samples.every(p => Math.hypot(p.x - c.x, p.z - c.z) > 45), 'BTS guideway must clear the 50m-high memorial');

// Isolate a real TrafficSystem on the directed ring: no exits, no ambient-car
// randomness. One vehicle must complete multiple clockwise laps continuously.
const ringNodes = [...ringNodeIds].map(id => nodes.get(id)!);
const rd: District = { nodes: ringNodes, roads: circle, obstacles: [], buildings: [], landmarks: [] };
const traffic = new TrafficSystem(rd), created = traffic.create(), car = created[0]!, outerCar = created[1]!, far = { ...createVehicle(), x: -10000, z: -10000 };
let angle = 0, last = { x: car.x, z: car.z }, minRadius = Infinity, maxRadius = 0;
for (let i = 0; i < 9000; i++) {
  traffic.update([car, outerCar], far, 1 / 60);
  const delta = Math.atan2(signed(last, car), (last.x - c.x) * (car.x - c.x) + (last.z - c.z) * (car.z - c.z));
  assert(delta > -.0001, `Traffic reverses at frame ${i}, delta=${delta}, edge=${car.from}>${car.to}, previous=${JSON.stringify(last)}, now=${JSON.stringify({x:car.x,z:car.z})}`); angle += delta;
  const radius = Math.hypot(car.x - c.x, car.z - c.z); minRadius = Math.min(minRadius, radius); maxRadius = Math.max(maxRadius, radius);
  assert(radius > 59 && radius < 68, 'Traffic turns stay inside road annulus');
  last = { x: car.x, z: car.z };
}
assert(angle > Math.PI * 4, 'Traffic completes two full clockwise laps without teleporting');
const laneSeparation = Math.hypot(outerCar.x - c.x, outerCar.z - c.z) - Math.hypot(car.x - c.x, car.z - c.z);
assert(laneSeparation > 4.8, 'Both circulating lanes carry actual traffic');

// Production entry/exit turns must also clear the actual island, columns and
// parcels. Inject start states only; TrafficSystem chooses legal turns itself.
const legs = d.roads.filter(r => !r.roundabout && ringNodeIds.has(r.a) !== ringNodeIds.has(r.b));
assert.equal(legs.length, 4, 'Four real public approach legs meet the circle');
let approachSamples = 0;
for (const [i, r] of legs.entries()) {
  const system = new TrafficSystem(d), base = system.create()[0]!;
  const from = nodes.get(ringNodeIds.has(r.a) ? r.b : r.a)!, to = nodes.get(ringNodeIds.has(r.a) ? r.a : r.b)!;
  for (const parity of [0, 1]) {
    const p = lanePoint(from, to, r, .2), car = { ...base, ...p, from: from.id, to: to.id, id: 100 + i * 2 + parity, heading: Math.atan2(to.x - from.x, to.z - from.z), speed: 6.5 };
    for (let step = 0; step < 12000; step++) {
      system.update([car], far, 1 / 60);
      const radius = Math.hypot(car.x - c.x, car.z - c.z);
      assert(radius > 53, 'Approach turn must not cut through memorial island');
      if (step % 6 === 0) {
        const near = d.roads.reduce((best, q) => {
          const distance = distanceToSegment(car, nodes.get(q.a)!, nodes.get(q.b)!).distance - q.width / 2;
          return Math.min(best, distance);
        }, Infinity);
        assert(near < -.7, 'Traffic entry/exit remains inside live asphalt');
        assert(d.obstacles.every(o => obstacleDistance(car, o) > 1.1), 'Traffic entry/exit avoids actual site obstacles');
        approachSamples++;
      }
      if (radius > 150) break;
    }
  }
}

// Drive the production vehicle controller one whole lap, with production
// collision/water/road data. Only its initial state is set by the test.
const controller = new VehicleController(), player = createVehicle(d), ring = victoryRingPoints(), start = ring[0]!;
Object.assign(player, { ...start, heading: Math.PI / 2, speed: 0, collision: 0 });
let index = 1, metres = 0, hits = 0, frames = 0;
for (; frames < 9000 && index <= ring.length; frames++) {
  const goal = ring[index % ring.length]!, distance = Math.hypot(goal.x - player.x, goal.z - player.z);
  if (distance < 4) { index++; if (index > ring.length) break; }
  const target = ring[index % ring.length]!, a = Math.atan2(target.x - player.x, target.z - player.z) - player.heading, error = Math.atan2(Math.sin(a), Math.cos(a));
  const old = { x: player.x, z: player.z };
  controller.update(player, { steer: Math.max(-1, Math.min(1, -error * 2.3)), gas: player.speed < 8, brake: player.speed > 8.5 }, d, [], 1 / 60);
  metres += Math.hypot(player.x - old.x, player.z - old.z); if (player.collision) hits++;
}
assert(index > ring.length, 'Actual controller completes clockwise lap');
assert.equal(hits, 0, 'Actual controller circle has zero static collision frames');
assert(metres > 380, 'Full physical circumference is driven');

const model = victoryMonument(victory)!; model.updateMatrixWorld(true);
assert(model instanceof T.LOD && model.levels.length === 2);
const counts = model.levels.map(({ object }) => {
  let triangles = 0, meshes = 0;
  object.traverse(o => { if (o instanceof T.Mesh) { meshes++; triangles += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3; } });
  return { triangles, meshes };
});
assert(counts[0]!.triangles < 25000 && counts[0]!.meshes < 12, 'Bounded batched civic asset');
assert(counts[1]!.triangles < counts[0]!.triangles * .85, 'Meaningful far LOD');
const bounds = new T.Box3().setFromObject(model);
assert(bounds.max.y > 49 && bounds.max.y < 51, '50m blade crown proportion');
const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
model.traverse(o => { if (o instanceof T.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } });
let disposed = 0; [...geometries, ...materials].forEach(r => r.addEventListener('dispose', () => disposed++)); disposeObject(model);
assert.equal(disposed, geometries.size + materials.size, 'Civic rendering resources disposed');
const result = { pass: true, ringEdges: circle.length, clockwiseTrafficLaps: Number((angle / Math.PI / 2).toFixed(2)), trafficLaneSeparation: laneSeparation, approachSamples, trafficMinRadius: minRadius, trafficMaxRadius: maxRadius,
  actualControllerLap: { metres: Math.round(metres), seconds: Number((frames / 60).toFixed(2)), collisionFrames: hits, setupOnlyAtStart: true }, asset: counts };
fs.writeFileSync(new URL('../../../docs/qa/geographic-city-reconstruction/victory-validation.json', import.meta.url), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
