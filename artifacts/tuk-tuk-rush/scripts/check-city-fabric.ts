import {assertProtectedGeography} from './protected-geography';
import { ChaseCamera } from "../src/game/chaseCamera";
import { createVehicle } from "../src/game/vehicle";
import assert from "node:assert/strict";
import { createBangkokWorld } from "../src/game/bangkok/world";
import { footprintRay, streetFaces } from "../src/game/bangkok/streetEdges";
import {
  completeStreetFabric,
  emitStreetFrontages,
  emitStreetGardens,
} from "../src/game/bangkok/streetFabric";
import { cityPlaces } from "../src/game/bangkok/cityPlaces";
import { riverPiers } from "../src/game/bangkok/riverfront";
import { designBuildings } from "../src/game/bangkok/buildingGrammar";
import { roadGraphKey } from "../src/game/bangkok/roadSurfaceGraph";
import {
  obstacleDistance,
  distanceToSegment,
  orientedFootprintsOverlap,
} from "../src/game/world";
import type { ArtPiece } from "../src/game/bangkok/architecturalBatch";
const d = createBangkokWorld(),
  plan = completeStreetFabric(d),
  nodes = new Map(d.nodes.map((n) => [n.id, n]));
assertProtectedGeography(d);
assert.equal(
  new Set(plan.after.map((s) => s.roadIndex)).size,
  d.roads.length,
  "Both sides of every drivable road, shortcut, bridge and arrival are surveyed",
);
assert.equal(plan.after.length, plan.before.length);
assert(
  plan.after.filter((s) => s.kind === "open").length <
    plan.before.filter((s) => s.kind === "open").length,
);
assert(plan.infill.length > 50 && plan.infill.length < 300);
assert(plan.faces.length > 200 && plan.faces.length < 900);
assert(plan.pockets.length > 30 && plan.pockets.length < 180);
assert(plan.ends.length < 40);
assert.equal(
  plan,
  completeStreetFabric(d),
  "Never duplicate planning/solids during frames",
);
for (const yaw of [0, 0.37, Math.PI / 2, -1.15])
  for (let face = 0; face < 4; face++) {
    const b = { x: 20, z: -30, w: 12, d: 8, height: 10, color: "#fff", yaw },
      angle = yaw + (face * Math.PI) / 2,
      n = { x: Math.sin(angle), z: Math.cos(angle) },
      p = { x: b.x + n.x * 30, z: b.z + n.z * 30 },
      hit = footprintRay(p, { x: -n.x, z: -n.z }, b)!;
    assert(hit);
    assert.equal(hit.face, face);
    assert(Math.abs(hit.distance - (30 - (face % 2 ? b.w : b.d) / 2)) < 1e-7);
  }
for (const b of [...plan.infill, ...plan.pockets, ...plan.ends]) {
  assert(d.obstacles.includes(b));
  if (plan.infill.includes(b)) assert(d.buildings.includes(b));
  for (const r of d.roads) {
    const a = nodes.get(r.a)!,
      z = nodes.get(r.b)!;
    assert(
      !orientedFootprintsOverlap(b, {
        x: (a.x + z.x) / 2,
        z: (a.z + z.z) / 2,
        w: r.width + 3.4,
        d: Math.hypot(z.x - a.x, z.z - a.z) + 3.4,
        yaw: Math.atan2(z.x - a.x, z.z - a.z),
        height: 0,
        color: "#fff",
      }),
      `Blocks ${r.corridor}`,
    );
  }
  assert(
    d.obstacles
      .filter((o) => o.protected)
      .every((o) => !orientedFootprintsOverlap(b, o)),
    "Keep legitimate parks",
  );
  for (const a of d.destinations!)
    for (const id of a.roadNodes)
      assert(obstacleDistance(nodes.get(id)!, b) > 2, "Keep visitor access");
}
assert.deepEqual(streetFaces(d, plan.after), plan.faces);
for (const f of plan.faces) {
  const nx = Math.sin(f.yaw),
    nz = Math.cos(f.yaw);
  assert(
    plan.after.some(
      (s) =>
        s.building === f.parcel &&
        s.face === f.face &&
        s.road === f.road &&
        nx * s.outward.x + nz * s.outward.z < -0.28,
    ),
    "Facade faces the actual exposed street",
  );
}
const designs = designBuildings(d),
  pieces: ArtPiece[] = [];
emitStreetFrontages(d, designs, (p) => pieces.push(p));
emitStreetGardens(d, (p) => pieces.push(p));
assert(pieces.length < 50000, "Strict instancing budget");
assert(pieces.some((p) => p.layer === "night"));
assert(pieces.some((p) => p.layer === "detail"));
for (const p of pieces)
  assert(
    [p.x, p.y, p.z, p.w, p.h, p.d, p.yaw].every(Number.isFinite) &&
      p.w > 0 &&
      p.h > 0 &&
      p.d > 0,
  );
// Real Wat Pho / diagonal-public-road repro: the entrance post used to push
// the native camera to 1.56m behind the player, inside the canopy.
const phoPlot=d.landmarks.find(l=>l.id==='pho')!.plot!;
const phoEdge=d.roads.filter(r=>r.corridor==='old_e').sort((a,b)=>distanceToSegment(phoPlot,nodes.get(a.a)!,nodes.get(a.b)!).distance-distanceToSegment(phoPlot,nodes.get(b.a)!,nodes.get(b.b)!).distance)[0]!;
const pa = nodes.get(phoEdge.a)!,
  pb = nodes.get(phoEdge.b)!,
  heading = Math.atan2(pb.x - pa.x, pb.z - pa.z),
  driver = {
    ...createVehicle(d),
    x: (pa.x + pb.x) / 2 + Math.cos(heading) * 3,
    z: (pa.z + pb.z) / 2 - Math.sin(heading) * 3,
    heading,
    speed: 0,
  },
  camera = new ChaseCamera();
camera.update(d, driver, 0.05, 0, false, false);
assert(
  Math.hypot(camera.pos.x - driver.x, camera.pos.z - driver.z) > 7.5,
  "Wat Pho portal cannot obstruct normal street chase",
);
assert(camera.pos.y >= 3.25);
const places = cityPlaces(d, designs),
  piers = riverPiers(d);
assert.equal(places.filter((p) => p.kind === "pier").length, piers.length);
for (const region of ["siam", "icon", "silom", "south"])
  assert(places.some((p) => p.kind === "hotel" && p.region === region));
assert(
  piers.some((p) => p.id === "sathorn") && piers.some((p) => p.id === "icon"),
);
for (const p of places.filter((p) => p.kind === "hotel"))
  assert(d.landmarks.some(l=>`hotel:${l.id}`===p.id && l.plot?.x===p.x && l.plot?.z===p.z));
for (const p of piers)
  assert(
    d.roads.every(
      (r) =>
        distanceToSegment(p, nodes.get(r.a)!, nodes.get(r.b)!).distance >=
        r.width / 2 + 14,
    ),
  );
console.log(
  JSON.stringify({
    pass: true,
    roads: d.roads.length,
    samples: plan.after.length,
    infill: plan.infill.length,
    faces: plan.faces.length,
    gardens: plan.pockets.length,
    terminalCourts: plan.ends.length,
    pieces: pieces.length,
    openBefore: plan.before.filter((s) => s.kind === "open").length,
    openAfter: plan.after.filter((s) => s.kind === "open").length,
    places: places.map((p) => p.name),
  }),
);
