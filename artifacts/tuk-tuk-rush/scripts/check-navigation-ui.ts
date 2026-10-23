import assert from "node:assert/strict";
import { navigationPath, guidanceFor } from "../src/game/navigation";
import { approaching, NAVIGATION } from "../src/game/ui/banner";
import { createBangkokWorld } from "../src/game/bangkok/world";
import { createMissions } from "../src/game/missions";
import type { District } from "../src/game/types";
const d: District = {
  nodes: [
    { id: "a", x: 0, z: 0 },
    { id: "b", x: 100, z: 0 },
    { id: "c", x: 100, z: 100 },
    { id: "d", x: 0, z: 100 },
    { id: "island", x: 200, z: 200 },
  ],
  roads: [
    { a: "a", b: "b", oneWay: true, width: 10, name: "east" },
    { a: "b", b: "c", oneWay: true, width: 10, name: "south" },
    { a: "c", b: "d", oneWay: true, width: 10, name: "west" },
    { a: "d", b: "a", oneWay: true, width: 10, name: "north" },
  ],
  buildings: [],
  obstacles: [],
  landmarks: [],
};
const backwards = guidanceFor(d, { x: 40, z: 0 }, Math.PI / 2, d.nodes[0]!);
assert.equal(backwards.distance, 360);
assert.deepEqual(
  backwards.path.slice(2).map((p) => [p.x, p.z]),
  [
    [100, 100],
    [0, 100],
    [0, 0],
  ],
);
assert.equal(
  backwards.bearing,
  0,
  "Guide east along legal road, not west directly to the target",
);
assert.deepEqual(navigationPath(d, { x: 40, z: 0 }, d.nodes[4]!), []);
assert.equal(guidanceFor(d, { x: 40, z: 0 }, 0, d.nodes[4]!).distance, null);
assert.deepEqual(navigationPath(d, { x: 0, z: 0 }, d.nodes[0]!), [
  { x: 0, z: 0 },
]);
const curb = { ...d.nodes[2]!, x: 103 };
assert.deepEqual(
  navigationPath(d, { x: 40, z: 0 }, curb).at(-1),
  { x: 103, z: 100 },
  "Guidance reaches the real curbside passenger position",
);
let latch = false;
for (const [distance, expected] of [
  [100, false],
  [90, true],
  [94, true],
  [115, true],
  [121, false],
  [119, false],
  [89, true],
] as const) {
  latch = approaching(latch, distance);
  assert.equal(latch, expected);
}
assert.equal(NAVIGATION.manualMs, 5000);
assert.equal(NAVIGATION.transitionMs, 300);
const city = createBangkokWorld(),
  missions = createMissions(city);
let routes = 0;
for (const m of missions) {
  const p = navigationPath(city, m.pickup, m.destination);
  assert(p.length > 1);
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1] as { id?: string },
      b = p[i] as { id?: string };
    if (a.id && b.id)
      assert(
        city.roads.some(
          (r) =>
            (r.a === a.id && r.b === b.id) ||
            (!r.oneWay && r.b === a.id && r.a === b.id),
        ),
        "Every routed edge must exist in its legal direction",
      );
  }
  routes++;
}
console.log(
  JSON.stringify({
    pass: true,
    oneWayDetour: true,
    disconnectedRoute: true,
    hysteresis: true,
    missionRoutes: routes,
  }),
);
