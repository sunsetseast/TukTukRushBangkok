import assert from 'node:assert/strict';
import { createDistrict, obstacleDistance, distanceToSegment } from '../src/game/world';
import { SIGNATURE_SEQUENCE, signaturePlots } from '../src/game/signatureCorridor';

const d = createDistrict();
const buildings = d.buildings.filter(b => b.signatureId);
assert.equal(buildings.length, SIGNATURE_SEQUENCE.length, 'All curated storefronts must be built');
assert.equal(new Set(buildings.map(b => b.signatureId)).size, SIGNATURE_SEQUENCE.length, 'No duplicate signature buildings');
const nodes = new Map(d.nodes.map(n => [n.id, n]));
const signatures = SIGNATURE_SEQUENCE.filter(s => s.verifiedBusiness);
assert.equal(signatures.length, 4);
for (const spec of SIGNATURE_SEQUENCE) {
  const b = buildings.find(x => x.signatureId === spec.id);
  assert(b, 'Missing signature ' + spec.id);
  assert.equal(b.sign, spec.sign);
  assert.equal(b.style, spec.style);
  if (spec.verifiedBusiness) assert(spec.address && spec.source, 'Verified addresses must have sources');
  for (const r of d.roads) {
    const clearance = distanceToSegment(b, nodes.get(r.a)!, nodes.get(r.b)!).distance;
    assert(clearance > r.width / 2 + 2, 'Signature ' + spec.id + ' overlaps road ' + r.name);
  }
  for (const other of d.obstacles) {
    if (other === b) continue;
    assert(obstacleDistance(b, other) > 1.5, 'Signature '+spec.id+' overlaps another collider');
  }
}
const first = buildings.find(x => x.signatureId === 'hua418')!;
const last = buildings.find(x => x.signatureId === 'so456')!;
assert(Math.hypot(first.x - last.x, first.z - last.z) < 180, 'Signature references must form one corridor');
// Using shared road edges prevents detached shops and validates the content
// without falsely assuming Google Street View or GPS plot boundaries.
const roads = d.roads.map(r => ({ r, a: nodes.get(r.a)!, b: nodes.get(r.b)! }));
assert.equal(signaturePlots(roads).length, 7);
console.log('PASS Yaowarat signature plots, road/collider clearance, four verified businesses');
