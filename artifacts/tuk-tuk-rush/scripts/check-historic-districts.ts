import assert from 'node:assert/strict';
import * as T from 'three';
import { buildHistoricDistrict, HISTORIC_SITE_PLANS, historicDistrictLandmark, historicBoundaryColliders, historicFurnitureColliders } from '../src/game/bangkok/historicDistricts';

const result: Record<string, unknown> = {};
for (const [id, plan] of Object.entries(HISTORIC_SITE_PLANS)) {
  const rows: { triangles: number; calls: number; bytes: number }[] = [];
  for (const detail of [true, false]) {
    const model = buildHistoricDistrict(id, detail)!;
    const bounds = new T.Box3().setFromObject(model);
    assert(bounds.min.y > -.01, `${id}: floating below terrain`);
    assert(bounds.min.x >= -plan.width / 2 - 2 && bounds.max.x <= plan.width / 2 + 2, `${id}: unreserved x geometry`);
    assert(bounds.min.z >= -plan.depth / 2 - 2 && bounds.max.z <= plan.depth / 2 + 2, `${id}: unreserved z geometry`);
    let triangles = 0, calls = 0, bytes = 0;
    const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
    model.traverse(node => {
      if (!(node instanceof T.Mesh)) return;
      calls++;
      const geometry = node.geometry;
      triangles += (geometry.index?.count ?? geometry.attributes.position!.count) / 3;
      for (const attr of Object.values(geometry.attributes)) bytes += attr.array.byteLength;
      bytes += geometry.index?.array.byteLength ?? 0;
      geometries.add(geometry);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
      assert((node.material as T.MeshStandardMaterial).vertexColors, `${id}: unbatched repeated pieces`);
    });
    assert(calls <= 5, `${id}: per-object draw call regression`);
    assert(triangles < 18000, `${id}: geometry budget exceeded`);
    // Rendering ownership: baked geometry/materials must actually emit dispose
    // events, while both LODs have independent, reclaimable resources.
    let disposed = 0;
    for (const resource of [...geometries, ...materials]) {
      resource.addEventListener('dispose', () => disposed++);
      resource.dispose();
    }
    assert.equal(disposed, geometries.size + materials.size);
    rows.push({ triangles, calls, bytes });
  }
  assert(rows[1]!.triangles < rows[0]!.triangles * .6, `${id}: distant geometry does not simplify`);
  for (const mass of plan.masses) {
    assert(mass.w > 0 && mass.d > 0 && mass.h > 0);
    assert(Math.abs(mass.x) + mass.w / 2 <= plan.width / 2);
    assert(Math.abs(mass.z) + mass.d / 2 <= plan.depth / 2);
  }
  const lod = historicDistrictLandmark({ id } as never)!;
  assert.equal(lod.levels.length, 2);
  assert.equal(lod.levels[1]!.distance, 210);
  result[id] = rows;
}
assert.equal(HISTORIC_SITE_PLANS['jim-thompson']!.masses.length, 6, 'museum houses must remain separate collision volumes');
const contains = (id: string, x: number, z: number) => historicBoundaryColliders(id).some(m => Math.abs(x - m.x) < m.w / 2 && Math.abs(z - m.z) < m.d / 2);
assert(!contains('jim-thompson', 0, 31.5), 'museum gate must stay open to its pedestrian approach');
assert(contains('jim-thompson', 20, 31.5), 'museum wall must have a collision volume');
assert(!contains('swing', 0, -24), 'Wat Suthat central gate must stay physically open');
assert(contains('swing', 23, -24), 'temple side of gate must block vehicles');
assert.equal(historicFurnitureColliders('flowers').length, 3);
const temple = HISTORIC_SITE_PLANS.swing!.masses;
assert(temple.find(m => m.name === 'Wat Suthat wihan')!.z > temple.find(m => m.name === 'Giant Swing west timber')!.z, 'temple must be south of swing');
const market = HISTORIC_SITE_PLANS.flowers!.masses;
assert(market[0]!.x + market[0]!.w / 2 < -10 && market[1]!.x - market[1]!.w / 2 > 10, 'flower market alley must stay physically open');
assert.equal(buildHistoricDistrict('unknown', true), undefined);
console.log(JSON.stringify({ pass: true, assets: result }, null, 2));
