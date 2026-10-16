import assert from "node:assert/strict";
import * as T from "three";
import { createDistrict, distanceToSegment, obstacleDistance } from "../src/game/world";
import { buildCity } from "../src/game/cityMesh";
import { ASSETS } from "../src/game/assets";
import { buildStreetLife, streetPeople } from "../src/game/streetLife";
const district = createDistrict(),
  textures = new Map(Object.values(ASSETS).map((p) => [p, new T.Texture()]));
const city = buildCity(district, textures),
  nodes = new Map(district.nodes.map((n) => [n.id, n]));
const people = streetPeople(district);
assert(people.length >= 50, "Chinatown must contain active street life");
const heroes=district.buildings.filter(b=>b.signatureId);
const occupied=people.filter(p=>heroes.some(h=>Math.hypot(p.x-h.x,p.z-h.z)<125));
assert(occupied.length>=18,"Signature Yaowarat corridor needs populated storefronts");
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
        (o) => obstacleDistance(q, o) < 0.35,
      ),
      "Path clear of shops and carts",
    );
  }
const life = buildStreetLife(district),
  camera = new T.Vector3(0, 3, 50);
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
// Approaching vehicles should cause visible lateral/along-sidewalk evasion,
 // without hiding people, and the resulting location must stay out of roads.
let dodged = false;
for (const person of life.people.filter(p => p.role === "walker").slice(0, 30)) {
  const near = { x: person.x - 2.0, z: person.z, heading: Math.PI / 2, speed: 10 };
  life.update(1 / 30, camera, "medium", true, near);
  for (const p of life.people) {
    if (Math.hypot((p.renderX ?? p.x) - p.x, (p.renderZ ?? p.z) - p.z) <= 0.01) continue;
    dodged = true;
    const q = { x: p.renderX!, z: p.renderZ! };
    assert(district.roads.every(r =>
      distanceToSegment(q, nodes.get(r.a)!, nodes.get(r.b)!).distance >= r.width / 2 + 0.48),
      "Dodge must not enter traffic");
    assert(district.obstacles.every(o => obstacleDistance(q, o) >= 0.48),
      "Dodge must not enter solid scenery");
  }
  if (dodged) break;
}
assert(dodged, "At least one roadside walker visibly evades an approaching tuk-tuk");
const dodgeSnapshot = life.people.map(p => [p.renderX, p.renderZ]);
life.update(1 / 30, camera, "medium", false, { x: 999, z: 999, heading: 0, speed: 0 });
assert.deepEqual(life.people.map(p => [p.renderX, p.renderZ]), dodgeSnapshot,
  "Pause freezes pedestrian evasion animation");
assert.equal(life.root.children.length, 14, "One extra shared accessory stream; no per-person draw calls");
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
