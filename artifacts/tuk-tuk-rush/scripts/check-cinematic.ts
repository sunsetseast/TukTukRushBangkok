import assert from "node:assert/strict";
import * as T from "three";
import fs from "node:fs";
import { createBangkokWorld } from "../src/game/bangkok/world";
import { designBuildings } from "../src/game/bangkok/buildingGrammar";
import {
  cinematicParcel,
  emitYaowaratFacade,
  emitYaowaratLanterns,
} from "../src/game/bangkok/yaowarat";
import type { ArtPiece } from "../src/game/bangkok/architecturalBatch";
import { districtSigns } from "../src/game/bangkok/districtSigns";
import { titleDrivePose, composeTitleCamera } from "../src/game/titleCamera";
import { buildBangkokGraybox } from "../src/game/bangkok/mesh";
import { roadGraphKey } from "../src/game/bangkok/roadSurfaceGraph";
import { citySky } from "../src/game/bangkok/atmosphere";
import { disposeObject } from "../src/game/assets";
import { distanceToSegment } from "../src/game/world";
const d = createBangkokWorld(),
  roads = JSON.stringify(d.roads),
  colliders = JSON.stringify(d.obstacles),
  designs = designBuildings(d),
  row = designs.filter(cinematicParcel);
assert(
  row.length >= 10 && row.length <= 26,
  `Bounded corridor parcel budget: ${row.length}`,
);
assert.equal(roadGraphKey({...d,nodes:d.nodes.filter(n=>!n.id.startsWith('real-arrival:')),roads:d.roads.filter(r=>!r.corridor?.startsWith('real-arrival:'))}), "2198517381");
const pieces: ArtPiece[] = [];
row.forEach((p) => emitYaowaratFacade(p, (piece) => pieces.push(piece)));
assert(pieces.length < 14000, "No uncontrolled citywide detail pass");
for (const piece of pieces)
  assert(
    [piece.x, piece.y, piece.z, piece.w, piece.h, piece.d, piece.yaw].every(
      Number.isFinite,
    ) &&
      piece.w > 0 &&
      piece.h > 0 &&
      piece.d > 0,
  );
assert(pieces.some((p) => p.layer === "coarse"));
assert(pieces.some((p) => p.layer === "detail"));
assert(pieces.some((p) => p.layer === "night"));
for (const p of row) {
  const ps: ArtPiece[] = [];
  emitYaowaratFacade(p, (o) => ps.push(o));
  const b = p.parcel,
    yaw = b.yaw ?? 0;
  const v = (o: ArtPiece) =>
    Math.sin(yaw) * (o.x - b.x) + Math.cos(yaw) * (o.z - b.z);
  assert(
    ps.some((o) => o.y === 1.8 && v(o) < b.d / 2 - 2),
    "Shop room has genuine depth",
  );
  for (const a of p.bays) {
    assert(
      a.height < 23 && a.floors >= 3,
      "Retain low/mid-rise Chinatown silhouettes",
    );
    const paint = ps.find(
      (o) =>
        Math.abs(o.y - 4.32) < 0.001 &&
        Math.abs(o.w - (a.width - 0.12 - 0.68)) < 0.001 &&
        o.d === 0.04,
    )!;
    assert(
      paint && v(paint) + paint.d / 2 < a.front + 0.558,
      "Lettering must stand in front of the cabinet, never inside it",
    );
  }
}
for (const sign of districtSigns(row)) {
  assert(sign.width <= 10 && sign.height < 9);
  if (sign.blade)
    assert(sign.width < 2.5, "Sign proportional to its actual shophouse");
  assert(sign.y - sign.height / 2 > 4.4, "Overhead lane clearance");
}
const lanterns: ArtPiece[] = [];
emitYaowaratLanterns(d, (p) => lanterns.push(p));
assert(lanterns.length < 120);
for (const p of lanterns.filter((p) => p.layer === "night"))
  assert(p.y - p.h / 2 > 6.5);
for (const p of lanterns.filter((p) => p.h > 5)) {
  const n = new Map(d.nodes.map((n) => [n.id, n]));
  assert(
    d.roads.every(
      (r) =>
        distanceToSegment(p, n.get(r.a)!, n.get(r.b)!).distance >
        r.width / 2 + 1,
    ),
    "Lantern supports cannot stand in travel lanes",
  );
}
const pose = titleDrivePose(d),
  copy = { ...pose };
for (const aspect of [844 / 390, 1280 / 800, 375 / 812, 430 / 932]) {
  const composed = composeTitleCamera(pose, aspect),
    camera = new T.PerspectiveCamera(composed.fov, aspect, 0.2, 800);
  camera.position.fromArray(composed.position);
  camera.lookAt(new T.Vector3(...composed.target));
  camera.updateMatrixWorld();
  const v = new T.Vector3(pose.x, 1.2, pose.z).project(camera);
  assert(
    Math.abs(v.x) < 0.85 && Math.abs(v.y) < 0.9,
    "Title must show the vehicle",
  );
  if (aspect > 1)
    assert(v.x > 0.15, "Landscape vehicle stays clear of left-hand menu");
  else assert(Math.abs(v.x) < 0.1);
}
assert.deepEqual(
  pose,
  copy,
  "Title composition never mutates player/chase state",
);
const sky = citySky();
for (const v of [0, 0.25, 0.6, 1]) {
  sky.update(new T.Vector3(1, 2, 3), v, v);
  assert(sky.root.position.equals(new T.Vector3(1, 2, 3)));
}
disposeObject(sky.root);
const city = buildBangkokGraybox(d),
  at = new T.Vector3(pose.x, 4, pose.z);
city.update(at, "medium", true);
city.group.traverse((o) => {
  if (o instanceof T.Mesh)
    assert(!o.castShadow, "Keep mobile projected-shadow budget");
});
const laneMarks = (
  city.group.getObjectByName("YaowaratRoadFinish")!.children[1] as T.Mesh
).geometry.attributes.position!;
const roadNodes = new Map(d.nodes.map((n) => [n.id, n]));
for (let i = 0; i < laneMarks.count; i++) {
  const point = { x: laneMarks.getX(i), z: laneMarks.getZ(i) };
  assert(
    d.roads
      .filter((r) => r.corridor === "yaowarat")
      .some(
        (r) =>
          distanceToSegment(point, roadNodes.get(r.a)!, roadNodes.get(r.b)!)
            .distance < 0.06,
      ),
    "Markings separate the existing half-carriageway lanes",
  );
}
const hero = city.group.children.filter((c) => c.userData.cinematic);
assert(hero.length > 0 && hero.length < 35);
city.update(at, "low", true);
assert(
  hero.filter((c) => c.name === "BangkokDetail").every((c) => !c.visible),
  "Fast removes small detail",
);
assert(
  hero.some((c) => c.visible && c.name === "BangkokArchitecture"),
  "Fast retains complete architecture",
);
city.update(new T.Vector3(1500, 3, 1500), "medium", true);
assert(
  hero.every((c) => !c.visible),
  "Far corridor is culled",
);
const gs = new Set<T.BufferGeometry>(),
  ms = new Set<T.Material>(),
  ts = new Set<T.Texture>();
city.group.traverse((o) => {
  if (o instanceof T.Mesh) {
    gs.add(o.geometry);
    for (const m of [o.material].flat()) {
      ms.add(m);
      for (const x of Object.values(m)) if (x instanceof T.Texture) ts.add(x);
    }
  }
});
let disposed = 0;
for (const r of [...gs, ...ms, ...ts])
  r.addEventListener("dispose", () => disposed++);
city.dispose();
assert.equal(
  disposed,
  gs.size + ms.size + ts.size,
  "City owns and disposes shared resources exactly once",
);
assert.equal(JSON.stringify(d.roads), roads);
assert.equal(
  JSON.stringify(d.obstacles),
  colliders,
  "Art cannot alter gameplay colliders",
);
assert(fs.statSync("public/assets/fonts/lilita-one.woff").size < 10000);
console.log(
  JSON.stringify({
    pass: true,
    parcels: row.length,
    facadePieces: pieces.length,
    lanternPieces: lanterns.length,
    dynamicShadowPasses: 0,
    resourcesDisposed: disposed,
    roadGraphUnchanged: true,
    titleCameraIsolated: true,
  }),
);
