import assert from 'node:assert/strict';
import { createBangkokWorld, blockedByRiver, toMap, toWorld, routeFromPoint, SHIFT_SECONDS } from '../src/game/bangkok/world';
import { discover, readDiscovery } from '../src/game/bangkok/discovery';
import { createMissions } from '../src/game/missions';
import { distanceToSegment, obstacleDistance, routeBetween } from '../src/game/world';
import { TrafficSystem } from '../src/game/traffic';
import { VehicleController, createVehicle } from '../src/game/vehicle';
import { buildBangkokGraybox, shiftLighting } from '../src/game/bangkok/mesh';
import { Vector3, Box3 } from 'three';
import type { Point } from '../src/game/types';

const d = createBangkokWorld(), nodes = new Map(d.nodes.map(n => [n.id, n]));
const connected = new Set([d.nodes[0]!.id]);
for (const id of connected) for (const r of d.roads) { if (r.a === id) connected.add(r.b); if (r.b === id) connected.add(r.a); }
assert.equal(connected.size, nodes.size, 'Every road node must be connected');
const directed = new Map(d.nodes.map(n => [n.id, [] as string[]]));
for (const r of d.roads) { directed.get(r.a)!.push(r.b); if (!r.oneWay) directed.get(r.b)!.push(r.a); }
for (const root of [d.nodes[0]!.id, d.landmarks.find(l => l.id === 'gate')!.accessNode!]) {
  const seen = new Set([root]); for (const id of seen) for (const next of directed.get(id)!) seen.add(next);
  assert.equal(seen.size, nodes.size, 'NPC directions must not strand a neighborhood');
}
assert.equal(new Set(d.roads.filter(r => r.bridge).map(r => r.corridor)).size, 3);
assert.equal(new Set(d.roads.filter(r => r.shortcut).map(r => r.corridor)).size, 2);
let roadSamples = 0, bridgeSamples = 0;
for (const r of d.roads) {
  const a = nodes.get(r.a)!, b = nodes.get(r.b)!;
  assert(Math.hypot(b.x - a.x, b.z - a.z) > .01, 'No degenerate segments');
  for (let i = 0; i <= 8; i++) {
    const p = { x: a.x + (b.x - a.x) * i / 8, z: a.z + (b.z - a.z) * i / 8 };
    assert(!blockedByRiver(d, p), `Road submerged: ${r.corridor}`);
    assert(d.obstacles.every(o => obstacleDistance(p, o) > 1.5), `Blocked lane: ${r.corridor}`);
    roadSamples++; if (r.bridge) bridgeSamples++;
  }
}
for (const xy of [[10, 10], [535, 590], [325, 820], [950, 535]]) { const p = toMap(toWorld(xy)); assert.equal(p.x, xy[0]); assert.equal(p.y, xy[1]); }
const find = (id: string) => d.landmarks.find(l => l.id === id)!;
assert(find('arun').x < find('pho').x); assert(find('arun').z > find('pho').z);
assert(find('icon').z < nodes.get(d.roads.find(r => r.corridor === 'taksin')!.a)!.z);
assert(find('chatuchak').z < find('victory').z); assert(find('terminal').x > find('paragon').x);
assert(find('mahanakhon').x < find('park').x);
const gate = find('gate'); assert(d.obstacles.some(o => o.landmarkId === 'gate'), 'Gate parcel must be solid');
for (const r of d.roads.filter(r => r.roundabout)) assert(r.oneWay);
const vehicle = createVehicle(d), controller = new VehicleController();
const bank = { ...vehicle, ...toWorld([250, 430]), heading: -Math.PI / 2 };
for (let i = 0; i < 300; i++) controller.update(bank, { gas: true, brake: false, steer: 0 }, d, [], 1 / 60);
assert(!blockedByRiver(d, bank), 'Vehicle must not enter water');
controller.recover(bank, d); assert.equal(bank.speed, 0); assert(!blockedByRiver(d, bank));
for (const mission of createMissions(d)) {
  assert(routeBetween(d, mission.pickup.id, mission.destination.id).length > 0);
  for (const p of [mission.pickup, mission.destination]) { assert(!blockedByRiver(d, p)); assert(d.obstacles.every(o => obstacleDistance(p, o) > 1.5)); }
}
const crossing = routeBetween(d, find('pho').accessNode!, find('arun').accessNode!);
assert(crossing.some((n, i) => i && d.roads.some(r => r.bridge && ((r.a === crossing[i - 1]!.id && r.b === n.id) || (r.b === crossing[i - 1]!.id && r.a === n.id)))), 'Cross-bank fare must use a bridge');
assert(routeFromPoint(d, find('arun'), createMissions(d)[0]!.destination).length > 2, 'Map route must attach to a real road');
let stored = '', writes = 0;
const storage = { getItem: () => stored || null, setItem(_key: string, value: string) { stored = value; writes++; } };
const discovered = readDiscovery(storage); discover(d, d.spawn!, discovered, storage);
assert(discovered.regions.includes('chinatown')); const initialWrites = writes;
discover(d, d.spawn!, discovered, storage); assert.equal(writes, initialWrites, 'No duplicate discovery writes');
for (const l of d.landmarks) discover(d, nodes.get(l.accessNode!)!, discovered, storage);
assert.equal(discovered.landmarks.length, d.landmarks.length, 'Each landmark can be found from a drivable approach');
assert.deepEqual(readDiscovery(storage), discovered); assert.deepEqual(readDiscovery({ getItem: () => 'invalid', setItem() {} }), { regions: [], landmarks: [], shortcuts: [] });
const traffic = new TrafficSystem(d), cars = traffic.create(); let changes = 0;
for (let i = 0; i < 2400; i++) {
  const before = cars.map(c => c.to); traffic.update(cars, { ...vehicle, x: 1950, z: 2350 }, 1 / 60);
  cars.forEach((c, j) => { assert(Number.isFinite(c.x) && Number.isFinite(c.heading)); assert(d.roads.some(r => r.a === c.from && r.b === c.to || !r.oneWay && r.a === c.to && r.b === c.from)); assert(!blockedByRiver(d, c, 1)); if (c.to !== before[j]) changes++; });
}
assert(changes > 50);
const city = buildBangkokGraybox(d); city.group.updateMatrixWorld(true);
const landmarkObject = city.group.getObjectByName('BangkokLandmark:palace')!;
const bounds = new Box3().setFromObject(landmarkObject); assert(bounds.containsPoint(new Vector3(find('palace').plot!.x, 3, find('palace').plot!.z)), 'Landmark art must be positioned once');
for (const l of d.landmarks.filter(l => l.kind !== 'park')) { assert(l.plot && l.size! >= 25); assert(d.obstacles.some(o => o.landmarkId === l.id)); assert(Math.hypot(l.plot.x - l.x, l.plot.z - l.z) <= 181); }
const towerSize = new Box3().setFromObject(city.group.getObjectByName('BangkokLandmark:mahanakhon')!).getSize(new Vector3());
const mallSize = new Box3().setFromObject(city.group.getObjectByName('BangkokLandmark:icon')!).getSize(new Vector3());
assert(towerSize.x >= 30 && towerSize.z >= 30 && towerSize.y >= 80, 'Tower massing must not collapse into a roadside pole');
assert(mallSize.x >= 50 && mallSize.z >= 50, 'Mall must have a meaningful blockout footprint');
const sectors = city.group.children.filter(c => c.name === 'BangkokSector').map(chunk => ({ chunk, bounds: new Box3().setFromObject(chunk) }));
let bridgeViewChecks = 0;
for (const quality of ['low', 'medium'] as const) {
  const radius = quality === 'low' ? 420 : 650;
  for (const road of d.roads.filter(r => r.bridge)) {
    const a = nodes.get(road.a)!, b = nodes.get(road.b)!;
    const camera = new Vector3((a.x + b.x) / 2, 5, (a.z + b.z) / 2);
    city.update(camera, quality);
    for (const { chunk, bounds } of sectors) {
      const distance = bounds.distanceToPoint(new Vector3(camera.x, 0, camera.z));
      // Check scenery that is clearly in view, leaving room for the 16 m
      // visibility-update threshold. This catches near river sections whose
      // batch center is outside the old cutoff without disabling city culling.
      if (distance < radius - 20) assert(chunk.visible, `Near scenery vanished on ${road.corridor} (${quality})`);
      if (distance > radius + 20) assert(!chunk.visible, `Distant scenery submitted on ${road.corridor} (${quality})`);
    }
    bridgeViewChecks++;
  }
}
city.update(new Vector3(d.spawn!.x, 5, d.spawn!.z), 'low'); assert(city.group.children.some(c => c.visible)); city.dispose();
const sunset = shiftLighting(0), night = shiftLighting(9 * 60); assert.equal(sunset.night, 0); assert.equal(night.night, 1); assert(night.sun < sunset.sun);
console.log(JSON.stringify({ pass: true, nodes: nodes.size, roads: d.roads.length, roadSamples, bridgeSamples, protectedGate: true, reachableFares: 10, trafficTransitions: changes, discoveryPersistence: true, meshConstructionAndDisposal: true, bridgeViewChecks }));
