import {assertProtectedGeography} from './protected-geography';
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import * as T from "three";
import {
  createBangkokWorld,
  riverDistance,
  toMap,
} from "../src/game/bangkok/world";
import { REAL_PLACES } from "../src/game/bangkok/realPlaces";
import {
  placeAuthoredSites,
  sitePoint,
} from "../src/game/bangkok/authoredSites";
import { buildRealArchitecture } from "../src/game/bangkok/realArchitecture";
import {
  obstacleDistance,
  orientedFootprintsOverlap,
  routeBetween,
  distanceToSegment,
} from "../src/game/world";
import { passengerStops } from "../src/game/missions";
import { discover } from "../src/game/bangkok/discovery";
import { disposeObject } from "../src/game/assets";
import { auditStreetEdges } from "../src/game/bangkok/streetEdges";
const root = new URL(
  "../../../docs/qa/authored-landmark-districts/",
  import.meta.url,
);
fs.mkdirSync(root, { recursive: true });
const d = createBangkokWorld(),
  nodes = new Map(d.nodes.map((n) => [n.id, n])),
  stops = passengerStops(d),
  sites = d.authoredSites!.filter((s) =>
    REAL_PLACES.some((p) => p.id === s.id && p.id !== "state"),
  );
const roadBodies = d.roads.map((r) => {
  const a = nodes.get(r.a)!,
    b = nodes.get(r.b)!;
  return {
    ...r,
    x: (a.x + b.x) / 2,
    z: (a.z + b.z) / 2,
    w: r.width,
    d: Math.hypot(b.x - a.x, b.z - a.z),
    yaw: Math.atan2(b.x - a.x, b.z - a.z),
    height: 0,
    color: "#fff",
  };
});
assert.equal(sites.length, REAL_PLACES.length - 1);
assert.equal(new Set(d.landmarks.map((l) => l.id)).size, d.landmarks.length);
assertProtectedGeography(d);
const assetBudgets = [];
for (const s of sites) {
  const p = REAL_PLACES.find((p) => p.id === s.id)!,
    l = d.landmarks.find((l) => l.id === s.id)!;
  assert.deepEqual(
    toMap(s.origin),
    { x: p.map[0], y: p.map[1] },
    `No silent fitting ${s.id}`,
  );
  assert(s.reservations.length >= s.solids.length && s.boundary.length >= 4);
  assert(
    d.buildings.every((b) =>
      s.reservations.every((r) => !orientedFootprintsOverlap(b, r, 1)),
    ),
    `Procedural exclusion ${s.id}`,
  );
  for (const o of s.solids) {
    assert(d.obstacles.includes(o));
    assert(
      roadBodies.every((r) => !orientedFootprintsOverlap(o, r, 0.2)),
      `Road through solid ${s.id}: ${roadBodies.filter((r) => orientedFootprintsOverlap(o, r, 0.2)).map((r) => r.name)}`,
    );
    for (const [x, z] of [
      [-o.w / 2, -o.d / 2],
      [o.w / 2, -o.d / 2],
      [o.w / 2, o.d / 2],
      [-o.w / 2, o.d / 2],
    ])
      assert(
        riverDistance(d, sitePoint(o, o.yaw ?? 0, x!, z!)) >
          d.riverWidth! / 2 + 1,
        `Dry wing ${s.id}`,
      );
  }
  for (const o of s.furniture ?? []) {
    assert(d.obstacles.includes(o), "Planting must have physical collision");
    assert(
      roadBodies.every((r) => !orientedFootprintsOverlap(o, r, 0.2)),
      `Planted island blocks road ${s.id}`,
    );
    assert(o.crownWidth > 0 && o.height > 0 && o.height <= 18, "Bounded tropical vegetation, including tall palms");
  }
  const stop = nodes.get(l.accessNode!)!;
  assert(stop);
  assert(stops.some((n) => n.id === stop.id));
  assert(routeBetween(d, d.nodes[0]!.id, stop.id).length);
  assert(
    d.obstacles.every((o) => obstacleDistance(stop, o) > 2),
    `Clear passenger stop ${s.id}`,
  );
  const discovery = {
    regions: [],
    landmarks: ["state", "icon", "pho"],
    shortcuts: [],
  } as { regions: string[]; landmarks: string[]; shortcuts: string[] };
  discover(d, stop, discovery);
  assert(discovery.landmarks.includes(s.id));
  assert(discovery.landmarks.includes("state"));
  if (p.bank) {
    const river = d
      .river!.slice(1)
      .map((b, i) => distanceToSegment(stop, d.river![i]!, b))
      .sort((a, b) => a.distance - b.distance)[0]!.point;
    assert(
      p.bank === "east" ? stop.x > river.x : stop.x < river.x,
      `Same-bank access ${s.id}`,
    );
  }
  const g = buildRealArchitecture(l)!;
  assert(g instanceof T.LOD);
  const near = g.levels[0]!.object,
    far = g.levels[1]!.object;
  const box = new T.Box3().setFromObject(near),
    size = box.getSize(new T.Vector3());
  assert(
    size.x <= p.footprint[0] + 0.5 && size.z <= p.footprint[1] + 0.5,
    `Render reservation ${s.id}: ${size.toArray()}`,
  );
  assert(box.max.y <= p.height + 0.5, `Declared height ${s.id}: ${box.max.y}`);
  const cost = (o: T.Object3D) => {
    let triangles = 0,
      meshes = 0;
    const mats = new Set(),
      arrays = new Set<ArrayBufferView>();
    o.traverse((n) => {
      if (n instanceof T.Mesh) {
        meshes++;
        triangles +=
          (n.geometry.index?.count ?? n.geometry.attributes.position.count) / 3;
        for (const a of Object.values(n.geometry.attributes))
          arrays.add(a.array);
        if (n.geometry.index) arrays.add(n.geometry.index.array);
        for (const m of Array.isArray(n.material) ? n.material : [n.material])
          mats.add(m);
      }
    });
    return {
      triangles,
      meshes,
      materials: mats.size,
      bytes: [...arrays].reduce((n, a) => n + a.byteLength, 0),
    };
  };
  if (p.id === "oriental") {
    near.updateMatrixWorld(true);
    const surface = (y: number) => {
      const ray = new T.Raycaster(
        new T.Vector3(-47.5, y, 25),
        new T.Vector3(0, 0, -1),
      );
      const hit = ray.intersectObject(near, true)[0]!;
      assert(hit?.face, "Exposed Oriental facade");
      const mesh = hit.object as T.Mesh,
        colors = mesh.geometry.getAttribute("color");
      return [hit.face.a, hit.face.b, hit.face.c].reduce(
        (v, i) => v + (colors.getX(i) + colors.getY(i) + colors.getZ(i)) / 9,
        0,
      );
    };
    assert(
      surface(4.3) > surface(5.7) + 0.2,
      "Cream floor bands must be exposed in front of glazing, not buried inside it",
    );
  }
  const a = cost(near),
    b = cost(far);
  assert(b.triangles < a.triangles, `Meaningful far LOD ${s.id}`);
  assert(a.meshes <= 24, `Batched draw budget ${s.id}`);
  assert(a.triangles < 55000, `Bounded mesh generation ${s.id}`);
  let geometryEvents = 0,
    materialEvents = 0;
  g.traverse((n) => {
    if (n instanceof T.Mesh) {
      n.geometry.addEventListener("dispose", () => geometryEvents++);
      for (const m of Array.isArray(n.material) ? n.material : [n.material])
        m.addEventListener("dispose", () => materialEvents++);
    }
  });
  disposeObject(g);
  assert(geometryEvents && materialEvents, `Owned resources disposed ${s.id}`);
  assetBudgets.push({
    id: s.id,
    near: a,
    far: b,
    bounds: size.toArray(),
    height: box.max.y,
  });
}
// Real open courts: no whole-property collision fills the pools/gardens.
for (const id of ["four-seasons", "capella", "anantara"]) {
  const s = sites.find((s) => s.id === id)!;
  const q = sitePoint(s.origin, s.yaw, 0, id === "anantara" ? 3 : 7);
  assert(
    s.solids.every((o) => obstacleDistance(q, o) > 2),
    `Open court ${id}`,
  );
}
// Rails keep authored buildings intact. Supports may never occupy a solid wing.
for (const support of d.transit!.supports)
  for (const s of sites)
    assert(
      s.solids.every((o) => obstacleDistance(support, o) > 1),
      `BTS support intersects ${s.id}`,
    );
// Reconstructing a site explicitly clears generic parcels, then is idempotent.
const demo = createBangkokWorld(),
  site = demo.authoredSites!.find((s) => s.id === "oriental")!,
  parcel = { ...site.solids[0]!, landmarkId: undefined };
demo.authoredSites = demo.authoredSites!.filter((s) => s.id !== "oriental");
demo.buildings.push(parcel);
demo.obstacles.push(parcel);
placeAuthoredSites(demo, [REAL_PLACES.find((p) => p.id === "oriental")!]);
assert(!demo.buildings.includes(parcel));
assert.equal(new Set(demo.nodes.map((n) => n.id)).size, demo.nodes.length);
const counts = [demo.nodes.length, demo.roads.length, demo.landmarks.length];
placeAuthoredSites(demo, REAL_PLACES);
assert.deepEqual(
  [demo.nodes.length, demo.roads.length, demo.landmarks.length],
  counts,
);
const edges = auditStreetEdges(d),
  open = edges.filter((e) => e.kind === "open");
fs.writeFileSync(
  new URL("asset-budgets.json", root),
  JSON.stringify(assetBudgets, null, 2),
);
fs.writeFileSync(
  new URL("remaining-edges.json", root),
  JSON.stringify(
    open.map((e) => ({
      corridor: e.road.corridor,
      point: toMap(e.point),
      kind: e.kind,
      note: "Unresolved physical roadside gap; not relabeled as a park.",
    })),
    null,
    2,
  ),
);
const report = {
  pass: true,
  sites: sites.length,
  solidWings: sites.reduce((n, s) => n + s.solids.length, 0),
  newDestinations: ["dusit", "one-bangkok", "okura", "anantara"],
  publicExtensionEdges: d.roads.filter(
    (r) => r.corridor === "charoen-nakhon-south",
  ).length,
  drivewayEdges: d.roads.filter((r) => r.corridor?.startsWith("real-arrival:"))
    .length,
  passengerStops: stops.length,
  openEdges: open.length,
  samples: edges.length,
};
fs.writeFileSync(
  new URL("site-validation.json", root),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
