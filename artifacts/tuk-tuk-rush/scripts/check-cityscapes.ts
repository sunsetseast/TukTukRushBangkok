import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { Vector3, Box3 } from "three";
import { createBangkokWorld, riverDistance } from "../src/game/bangkok/world";
import {
  planEnvironment,
  placementIndex,
} from "../src/game/bangkok/environmentPlan";
import { emitEnvironment } from "../src/game/bangkok/environmentArt";
import { emitCables } from "../src/game/bangkok/environmentCables";
import { boatRoutes, boatPose } from "../src/game/bangkok/riverfront";
import { sculptedLandmark } from "../src/game/bangkok/sculptedLandmarks";
import { emitScala, scalaParcel } from "../src/game/bangkok/scala";
import { distanceToSegment, obstacleLocal } from "../src/game/world";
import { createVehicle, VehicleController } from "../src/game/vehicle";
import { physicsObstacleIndex } from "../src/game/bangkok/clearanceIndex";
import { bangkokPeople } from "../src/game/bangkok/urbanLayers";
import { disposeObject } from "../src/game/assets";
const d = createBangkokWorld(),
  again = createBangkokWorld(),
  nodes = new Map(d.nodes.map((n) => [n.id, n]));
const contract = {
    nodes: d.nodes,
    roads: d.roads,
    landmarks: d.landmarks,
    river: d.river,
    riverWidth: d.riverWidth,
    spawn: d.spawn,
    bounds: d.bounds,
    regions: d.regions,
  },
  expected = JSON.parse(
    fs.readFileSync(
      new URL(
        "../../../docs/graphics/living-cityscapes/before/map-contract.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
assert.equal(
  createHash("sha256").update(JSON.stringify(contract)).digest("hex"),
  expected.sha,
  "Original map/plot/access contract",
);
const sites = planEnvironment(d),
  bySite = new Map(sites.map((s) => [s.id, s]));
assert.deepEqual(sites, planEnvironment(again));
assert.equal(new Set(sites.map((s) => s.id)).size, sites.length);
for (const site of sites) {
  const o = site.body,
    radius = Math.hypot(o.w, o.d) / 2;
  assert(d.obstacles.includes(o));
  assert(riverDistance(d, o) > d.riverWidth! / 2 + radius + 2);
  for (const r of d.roads)
    assert(
      distanceToSegment(o, nodes.get(r.a)!, nodes.get(r.b)!).distance >=
        r.width / 2 + radius + 1.7 - 1e-8,
      site.id,
    );
}
const forms = new Map<string, string[]>();
emitEnvironment(d, (p) => {
  if (!p.siteId) return;
  const site = bySite.get(p.siteId)!;
  if (!forms.has(site.kind)) forms.set(site.kind, []);
  forms.get(site.kind)!.push([p.w, p.h, p.d, p.shape, p.y].join(":"));
  if (p.y - p.h / 2 >= 1.7) return;
  for (const x of [-p.w / 2, p.w / 2])
    for (const z of [-p.d / 2, p.d / 2]) {
      const q = {
          x: p.x + Math.cos(p.yaw) * x + Math.sin(p.yaw) * z,
          z: p.z - Math.sin(p.yaw) * x + Math.cos(p.yaw) * z,
        },
        local = obstacleLocal(q, site.body);
      assert(
        Math.abs(local.x) <= site.body.w / 2 + 0.03 &&
          Math.abs(local.z) <= site.body.d / 2 + 0.03,
        `Ground art exceeds body: ${site.id}`,
      );
    }
});
assert.equal(
  new Set(
    ["noodle", "grill", "fruit", "tea"].map((k) => forms.get(k)?.join("|")),
  ).size,
  4,
);
let cablePieces = 0;
emitCables(d, (p) => {
  cablePieces++;
  assert(p.y - p.h / 2 > 7 || p.shape === "cylinder");
  assert(Number.isFinite(p.pitch ?? 0));
});
const bridges = d.roads.filter((r) => r.bridge),
  routes = boatRoutes(d);
assert.equal(routes.length, 7);
for (const r of routes) {
  for (let i = 0; i < 256; i++) {
    const p = boatPose(r, (i * r.period) / 256);
    assert(riverDistance(d, p) < d.riverWidth! / 2 - 17);
    for (const b of bridges)
      assert(
        distanceToSegment(p, nodes.get(b.a)!, nodes.get(b.b)!).distance >
          b.width / 2 + 18,
      );
  }
  const a = boatPose(r, 0),
    b = boatPose(r, r.period);
  assert(Math.hypot(a.x - b.x, a.z - b.z) < 1e-8);
  assert(Math.abs(Math.sin(a.heading - b.heading)) < 1e-8);
}
const index = placementIndex(d),
  people = bangkokPeople(d);
for (const p of people)
  for (let i = 0; i <= 12; i++)
    assert(
      index.person({
        x: p.start.x + ((p.end.x - p.start.x) * i) / 12,
        z: p.start.z + ((p.end.z - p.start.z) * i) / 12,
      }),
      "Pedestrian route clearance",
    );
for (const id of ["gate", "arun", "pho", "icon", "paragon"]) {
  const l = d.landmarks.find((l) => l.id === id)!,
    root = sculptedLandmark(l)!;
  assert.equal(root.userData.authoredAsset, id);
  const bounds = new Box3().setFromObject(root);
  assert(bounds.max.y > 10 && bounds.getSize(new Vector3()).length() > 20);
  assert(
    Math.max(
      Math.abs(bounds.min.x),
      Math.abs(bounds.max.x),
      Math.abs(bounds.min.z),
      Math.abs(bounds.max.z),
    ) <=
      l.size! / 2 + 3.6,
    id,
  );
  disposeObject(root);
}
const scala = scalaParcel(d);
let scalaEaves = 0;
emitScala(scala, (p) => {
  if (p.shape === "cylinder" && p.y > 4) scalaEaves++;
});
assert(scalaEaves > 100 && scala.height === 36);
assert(scala.regionId === "chinatown");
const reference = { ...d, worldId: undefined },
  c1 = new VehicleController(),
  c2 = new VehicleController(),
  p1 = createVehicle(d),
  p2 = createVehicle(d),
  grid = physicsObstacleIndex(d),
  counts: number[] = [];
for (let i = 0; i < 800; i++) {
  if (i % 80 === 0) {
    const o = d.obstacles[(i * 7) % d.obstacles.length]!;
    Object.assign(p1, { x: o.x, z: o.z });
    Object.assign(p2, { x: o.x, z: o.z });
  }
  const input = {
    gas: i % 17 < 14,
    brake: i % 17 >= 14,
    steer: Math.sin(i * 0.18) * 0.7,
  };
  c1.update(p1, input, d, [], 0.035);
  c2.update(p2, input, reference, [], 0.035);
  assert.deepEqual(p1, p2, `Solver equivalence ${i}`);
  counts.push(grid.query(p1).length);
}
counts.sort((a, b) => a - b);
console.log(
  JSON.stringify({
    pass: true,
    mapContract: expected.sha,
    sites: sites.length,
    solids: d.obstacles.length,
    boats: routes.length,
    boatSamples: routes.length * 256,
    pedestrians: people.length,
    cablePieces,
    flagships: 5,
    scalaEaves,
    matchedCollisionSteps: 800,
    medianPhysicsCandidates: counts[400],
  }),
);
