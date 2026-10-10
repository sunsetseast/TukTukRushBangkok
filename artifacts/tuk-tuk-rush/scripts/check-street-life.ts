import assert from "node:assert/strict";
import * as T from "three";
import { createDistrict, distanceToSegment } from "../src/game/world";
import { buildCity } from "../src/game/cityMesh";
import { ASSETS } from "../src/game/assets";
import { buildStreetLife, streetPeople } from "../src/game/streetLife";
const district = createDistrict(),
  textures = new Map(Object.values(ASSETS).map((p) => [p, new T.Texture()]));
const city = buildCity(district, textures),
  nodes = new Map(district.nodes.map((n) => [n.id, n]));
const people = streetPeople(district);
assert(people.length >= 25, "Chinatown must contain visible street activity");
assert(
  people.some((p) => p.role === "vendor"),
  "Food carts have vendors",
);
assert.deepEqual(people, streetPeople(district), "Deterministic placement");
for (const p of people)
  for (let k = 0; k <= 30; k++) {
    const q = {
      x: p.start.x + ((p.end.x - p.start.x) * k) / 30,
      z: p.start.z + ((p.end.z - p.start.z) * k) / 30,
    };
    assert(
      district.roads.every(
        (r) =>
          distanceToSegment(q, nodes.get(r.a)!, nodes.get(r.b)!).distance >=
          r.width / 2 + 0.7,
      ),
      "Entire walking path outside all roads",
    );
    assert(
      !district.obstacles.some(
        (o) =>
          Math.abs(o.x - q.x) < o.w / 2 + 0.35 &&
          Math.abs(o.z - q.z) < o.d / 2 + 0.35,
      ),
      "Path clear of shops and carts",
    );
  }
const life = buildStreetLife(district),
  camera = new T.Vector3(-270, 3, 40);
const positions = () => life.people.map((p) => [p.x, p.z]);
life.update(0, camera, "medium", false);
const initial = positions();
for (let k = 0; k < 300; k++) life.update(1 / 60, camera, "medium", true);
const moved = positions();
assert(
  moved.some(
    (p, i) =>
      Math.hypot(p[0]! - initial[i]![0]!, p[1]! - initial[i]![1]!) > 0.1,
  ),
  "Walkers move",
);
life.update(1, camera, "medium", false);
assert.deepEqual(positions(), moved, "Pause freezes street life");
const visible = (q: "low" | "medium") => {
  life.update(0, camera, q, false);
  const m = life.root.children[0] as T.InstancedMesh,
    mat = new T.Matrix4();
  let count = 0;
  for (let i = 0; i < m.count; i++) {
    m.getMatrixAt(i, mat);
    if (mat.elements[0] || mat.elements[2]) count++;
  }
  return count;
};
assert(
  visible("low") < visible("medium"),
  "Fast quality reduces visible people",
);
assert.equal(life.root.children.length, 13, "Bounded character draw calls");
const obstacleCount = district.obstacles.length;
life.dispose();
city.dispose();
assert.equal(
  district.obstacles.length,
  obstacleCount,
  "Presentation does not mutate gameplay collision data",
);
console.log(
  `PASS ${people.length} people; deterministic clear paths, movement, pause, quality and bounded batches`,
);
