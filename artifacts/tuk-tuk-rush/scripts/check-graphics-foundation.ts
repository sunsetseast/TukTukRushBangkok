import assert from "node:assert/strict";
import * as T from "three";
import { compactGeometry } from "../src/game/compactGeometry";
import { facadeFinishes } from "../src/game/bangkok/facadeFinish";
import { lightingState, shiftLighting } from "../src/game/bangkok/lighting";
import { buildTrafficModel } from "../src/game/trafficMesh";
import { disposeObject } from "../src/game/assets";
const geo = new T.BoxGeometry(),
  positions = geo.attributes.position.array.slice(),
  before = Object.values(geo.attributes).reduce(
    (n, a) => n + a.array.byteLength,
    0,
  );
compactGeometry(geo);
assert.deepEqual(geo.attributes.position.array, positions);
const after = Object.values(geo.attributes).reduce(
  (n, a) => n + a.array.byteLength,
  0,
);
assert(after < before * 0.7);
const repeated = new T.PlaneGeometry();
repeated.attributes.uv.setX(0, 20);
const uv = repeated.attributes.uv;
compactGeometry(repeated);
assert.equal(uv, repeated.attributes.uv, "Repeating UVs must not be clamped");
const finishes = facadeFinishes();
assert.equal(finishes.albedo.colorSpace, T.SRGBColorSpace);
assert.equal(finishes.normal.colorSpace, T.NoColorSpace);
assert.equal(finishes.pbr.colorSpace, T.NoColorSpace);
assert.equal(finishes.albedo.image.width, 512);
assert(
  finishes.pbr.image.data[1] >
    finishes.pbr.image.data[(128 + 128 * 512) * 4 + 1],
);
const state = lightingState();
for (let t = 0; t <= 600; t++) {
  assert.equal(shiftLighting(t, state), state);
  assert(
    [
      state.ambient,
      state.sun,
      state.exposure,
      state.night,
      ...state.sky.toArray(),
    ].every(Number.isFinite),
  );
  assert(state.ambient > 0.5);
}
assert.equal(shiftLighting(240).night, 1);
assert.equal(shiftLighting(0).night, 0);
const near = buildTrafficModel("car", "#88aabb"),
  far = buildTrafficModel("car", "#88aabb", false),
  triangles = (g: T.Group) => {
    let n = 0;
    g.traverse((o) => {
      if (o instanceof T.Mesh)
        n +=
          (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    });
    return n;
  };
assert(triangles(far) < triangles(near) * 0.4);
disposeObject(near);
disposeObject(far);
geo.dispose();
repeated.dispose();
Object.values(finishes).forEach((t) => t.dispose());
console.log(
  JSON.stringify({
    pass: true,
    compactAttributeBytes: { before, after },
    unchangedPositions: true,
    linearPbrAndNormals: true,
    nightAt240: true,
    trafficLodReduction: true,
  }),
);
