import assert from 'node:assert/strict';
import { MeshStandardMaterial, Vector3 } from 'three';
import { createBangkokWorld } from '../src/game/bangkok/world';
import { emitBangkokArchitecture, familyForRegion, type Piece } from '../src/game/bangkok/architecture';
import { buildBangkokGraybox } from '../src/game/bangkok/mesh';
import { distanceToSegment } from '../src/game/world';

const d = createBangkokWorld();
assert(d.buildings.length > 100, 'Expected a genuine city-wide streetscape, not isolated blocks');
assert.equal(familyForRegion('chinatown'), 'market');
assert.equal(familyForRegion('talatnoi'), 'heritage');
assert.equal(familyForRegion('siam'), 'modern');
assert.equal(familyForRegion('westbank'), 'riverside');

let core = 0, trim = 0, windows = 0;
const counts: Piece[] = [
  () => { core++; },
  () => { trim++; },
  () => { windows++; },
];
const stats = emitBangkokArchitecture(d, ...counts as [Piece, Piece, Piece]);
assert.equal(stats.total, d.buildings.length);
assert(stats.districts.length >= 4, 'Distinct neighborhoods need independent art families');
assert(stats.market > 0 && stats.heritage > 0 && stats.modern > 0, 'Missing a regional art language');
assert(core >= d.buildings.length * 8, 'The always-visible silhouette lost its shopfronts');
assert(trim > d.buildings.length && windows > d.buildings.length, 'Upper-floor details missing');

const byId = new Map(d.nodes.map(n => [n.id, n]));
let aligned = 0;
for (const b of d.buildings) {
  const road = d.roads.reduce((best, r) => {
    const q = distanceToSegment(b, byId.get(r.a)!, byId.get(r.b)!).distance;
    return q < best.distance ? { road: r, distance: q } : best;
  }, { road: d.roads[0]!, distance: Infinity });
  const a = byId.get(road.road.a)!, z = byId.get(road.road.b)!;
  const near = distanceToSegment(b, a, z).point;
  const nx = Math.sin(b.yaw ?? 0), nz = Math.cos(b.yaw ?? 0);
  const vx = near.x - b.x, vz = near.z - b.z;
  if (vx * nx + vz * nz > 0) aligned++;
}
assert(aligned > d.buildings.length * .8, 'Frontages should face the streets');

const city = buildBangkokGraybox(d);
const lit = city.group.children.filter(c => c.name === 'BangkokNight')
  .flatMap(c => c.children).map(c => (c as { material: MeshStandardMaterial }).material);
assert(lit.length > 0 && lit.every(m => m.emissiveIntensity === 0));
city.setNight(1);
assert(lit.every(m => m.emissiveIntensity > .8), 'Window emissives must appear at night');
city.setNight(0);
assert(lit.every(m => m.emissiveIntensity === 0), 'Windows must dim again at sunset reset');
city.update(new Vector3(d.spawn!.x, 5, d.spawn!.z), 'low');
assert(city.group.children.filter(c => c.name === 'BangkokDetail').every(c => !c.visible));
city.update(new Vector3(d.spawn!.x, 5, d.spawn!.z), 'medium');
assert(city.group.children.some(c => c.name === 'BangkokDetail' && c.visible));
city.dispose();
console.log(JSON.stringify({ pass: true, buildings: d.buildings.length, aligned, families: stats.districts, alwaysVisiblePieces: core, details: trim, windows }));
