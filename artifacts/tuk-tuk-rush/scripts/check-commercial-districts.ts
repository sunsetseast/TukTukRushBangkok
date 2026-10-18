import assert from "node:assert/strict";
import * as T from "three";
import { LandmarkBuilder } from "../src/game/bangkok/landmarkBuilder";
import {
  buildCommercialDistrictModel,
  COMMERCIAL_DISTRICT_BOUNDS,
  commercialSiteMasses,
} from "../src/game/bangkok/commercialDistrictArt";
import { realCommercial } from "../src/game/bangkok/realCommercial";

const totals: Record<string, unknown> = {};
for (const [id, contract] of Object.entries(COMMERCIAL_DISTRICT_BOUNDS)) {
  const levels = [];
  for (const detail of [true, false]) {
    const b = new LandmarkBuilder();
    assert(buildCommercialDistrictModel(id, b, detail));
    const root = b.finish(id),
      bounds = new T.Box3().setFromObject(root);
    assert(
      bounds.min.x >= -contract.w / 2 - 0.01 &&
        bounds.max.x <= contract.w / 2 + 0.01,
      `${id}: facade escapes authored width`,
    );
    assert(
      bounds.min.z >= -contract.d / 2 - 0.01 &&
        bounds.max.z <= contract.d / 2 + 0.01,
      `${id}: facade escapes authored depth`,
    );
    assert(
      bounds.min.y >= -0.1 && bounds.max.y <= contract.height + 0.01,
      `${id}: height violates collider contract`,
    );
    // These rays guard actual visual defects found in rendered review: a main
    // retail slab used to hide Paragon's glazing/sign and Terminal's window skin.
    const ray = (origin: T.Vector3, direction: T.Vector3) =>
      new T.Raycaster(origin, direction).intersectObject(root, true)[0];
    if (id === "paragon") {
      const sign = ray(new T.Vector3(0, 25.4, 100), new T.Vector3(0, 0, -1));
      assert(
        sign && sign.point.z > 34.25,
        "Paragon sign is buried inside entrance drum",
      );
      const facade = ray(new T.Vector3(46, 12, 100), new T.Vector3(0, 0, -1));
      assert(
        facade && facade.point.z > 22.7,
        "Paragon shoulder glazing is inside retail slab",
      );
      assert.equal(
        (facade.object as T.Mesh).material.roughness,
        0.25,
        "Paragon public shoulder must expose glazing",
      );
    }
    if (id === "siam-center") {
      const west = ray(new T.Vector3(-39, 100, -5), new T.Vector3(0, -1, 0)),
        east = ray(new T.Vector3(36, 100, -5), new T.Vector3(0, -1, 0));
      assert(
        west && east && west.point.y > east.point.y + 4,
        "Discovery must be the higher west wing; Center the lower east wing",
      );
      assert(
        root.children.every((child) => child.scale.x > 0),
        "Authored mall orientation must preserve mesh winding",
      );
    }
    if (id === "terminal") {
      const facade = ray(new T.Vector3(20, 69, 5), new T.Vector3(-1, 0, 0));
      assert(facade, "Terminal Y-wing facade is missing");
      assert.equal(
        (facade.object as T.Mesh).material.roughness,
        0.25,
        "Terminal hotel glazing is buried inside Y wing",
      );
    }
    let calls = 0,
      triangles = 0,
      bytes = 0;
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>();
    root.traverse((object) => {
      if (!(object instanceof T.Mesh)) return;
      calls++;
      const g = object.geometry;
      geometries.add(g);
      triangles += (g.index?.count ?? g.getAttribute("position").count) / 3;
      for (const a of Object.values(g.attributes)) bytes += a.array.byteLength;
      bytes += g.index?.array.byteLength ?? 0;
      for (const m of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        materials.add(m);
        assert.equal(
          m.transparent,
          false,
          `${id}: avoid transparent-glass overdraw`,
        );
        assert.equal(
          m.map,
          null,
          `${id}: no photo or logo texture allocations`,
        );
      }
    });
    assert(calls <= 5, `${id}: batched model submission budget`);
    assert(triangles < 9000, `${id}: silhouette budget`);
    assert(bytes < 700_000, `${id}: vertex buffer budget`);
    // A reconstructed facade must retain depth and primary silhouette in the far
    // level; whole detail layers must not disappear when switching quality/LOD.
    levels.push({
      calls,
      triangles,
      bytes,
      bounds: bounds.getSize(new T.Vector3()).toArray(),
    });
    let disposeCount = 0;
    for (const g of geometries) {
      g.addEventListener("dispose", () => disposeCount++);
      g.dispose();
    }
    assert.equal(disposeCount, geometries.size);
    for (const m of materials) m.dispose();
  }
  assert(levels[1]!.triangles <= levels[0]!.triangles);
  for (let axis = 0; axis < 3; axis++)
    assert(
      Math.abs(levels[0]!.bounds[axis]! - levels[1]!.bounds[axis]!) < 0.05,
      `${id}: LOD silhouette shift`,
    );
  totals[id] = levels;
  if (id !== "siam-center") {
    const lod = realCommercial({ id, name: id, kind: "mall", x: 0, z: 0 })!;
    assert.equal(lod.levels.length, 2);
    assert.equal(lod.levels[1]!.distance, 300);
    assert(
      lod.userData.nightMaterials.length > 0,
      `${id}: selective facade/sign illumination`,
    );
  }
}
assert.equal(
  buildCommercialDistrictModel("not-a-mall", new LandmarkBuilder(), true),
  false,
);
console.log(
  JSON.stringify(
    { pass: true, contract: COMMERCIAL_DISTRICT_BOUNDS, budgets: totals },
    null,
    2,
  ),
);

// Full world arrival detailing must retain the new non-square physical mall envelopes.
const { createBangkokWorld } = await import("../src/game/bangkok/world");
const city = createBangkokWorld();
for (const id of ["paragon", "central", "terminal"]) {
  const l = city.landmarks.find((l) => l.id === id)!;
  const bodies = city.obstacles.filter(
    (o) => o.landmarkId === id && !o.artRole,
  );
  const masses = commercialSiteMasses(id);
  assert.equal(
    bodies.length,
    masses.length,
    `${id}: multipart collision retained`,
  );
  for (const [i, m] of masses.entries()) {
    assert.equal(bodies[i]!.w, m.w);
    assert.equal(bodies[i]!.d, m.d);
    assert.equal(bodies[i]!.height, m.h);
    assert.equal(bodies[i]!.yaw, l.yaw ?? 0);
  }
}
