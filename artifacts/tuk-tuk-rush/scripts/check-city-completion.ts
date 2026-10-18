import assert from "node:assert/strict";
import fs from "node:fs";
import * as T from "three";
import { createBangkokWorld, toWorld } from "../src/game/bangkok/world";
import {
  BLOCK_DISTRICTS,
  planUrbanBlocks,
  inSiamSquare,
  emitBlockArchitecture,
} from "../src/game/bangkok/urbanBlocks";
import {
  ArchitecturalBatch,
  type ArtPiece,
} from "../src/game/bangkok/architecturalBatch";
import { inDestinationGrounds } from "../src/game/bangkok/destinationAccess";
import {
  distanceToSegment,
  obstacleDistance,
  orientedFootprintsOverlap,
} from "../src/game/world";
import { designBuildings } from "../src/game/bangkok/buildingGrammar";
import { geographicReference } from "../src/game/bangkok/geography";
import { EXISTING_SITE_WORLD_ANCHORS } from "../src/game/bangkok/authoredSites";
import { VICTORY_SITE } from "../src/game/bangkok/civicRoads";
import {
  insidePublicPolygon,
  publicWaterAt,
} from "../src/game/bangkok/publicSpaces";
import { commercialSiteMasses } from "../src/game/bangkok/commercialDistrictArt";
import { WAT_PHO_MASSES } from "../src/game/bangkok/watPhoCompound";
import { disposeObject } from "../src/game/assets";
const d = createBangkokWorld(),
  nodes = new Map(d.nodes.map((n) => [n.id, n]));
const terminal = d.landmarks.find((l) => l.id === "terminal")!,
  asok = toWorld([945, 550]);
assert(
  terminal.plot!.x < asok.x - 60 && terminal.plot!.z < asok.z - 60,
  "Terminal 21 northwest of the actual public Asok junction",
);
assert.deepEqual(
  terminal.plot,
  EXISTING_SITE_WORLD_ANCHORS.terminal,
  "Render/map/route site uses shared geographic anchor",
);
assert.deepEqual(
  terminal.plot,
  toWorld([...geographicReference("terminal")!.design]),
);
assert(
  VICTORY_SITE.center.x >
    d.transit!.lines.flatMap((l) => l.stations).find((s) => s.id === "siam")!.x,
  "Victory east of Siam",
);
assert.deepEqual(
  d.landmarks.find((l) => l.id === "victory")!.plot,
  VICTORY_SITE.center,
);
const roads = d.roads
  .filter((r) => !r.shortcut)
  .map((r) => {
    const a = nodes.get(r.a)!,
      b = nodes.get(r.b)!;
    return {
      ...a,
      x: (a.x + b.x) / 2,
      z: (a.z + b.z) / 2,
      w: r.width,
      d: Math.hypot(b.x - a.x, b.z - a.z),
      yaw: Math.atan2(b.x - a.x, b.z - a.z),
      height: 0,
      color: "#fff",
    };
  });
const blocks = planUrbanBlocks(d),
  buildings = blocks.flatMap((b) => b.buildings),
  count = d.buildings.length;
assert.strictEqual(planUrbanBlocks(d), blocks);
assert.equal(count, d.buildings.length);
assert(
  buildings.length >= 400 &&
    buildings.length <= BLOCK_DISTRICTS.reduce((n, q) => n + q.cap, 0),
  "Bounded meaningful block reconstruction",
);
assert(
  blocks.filter((b) => b.buildings.length > 1).length >= 100,
  "Multiple wings/courts, not only isolated roadside rows",
);
for (const block of blocks) {
  for (const b of block.buildings) {
    assert(
      d.buildings.includes(b) && d.obstacles.includes(b),
      "Shared physics/render building",
    );
    assert(
      !inDestinationGrounds(d, b),
      "Never occupy park/temple/hotel reservations",
    );
    assert(
      roads.every(
        (r) =>
          !orientedFootprintsOverlap({ ...b, w: b.w + 1.8, d: b.d + 1.8 }, r),
      ),
      "Canopies keep full road clearance",
    );
    assert(
      d.transit!.lines.every((l) =>
        l.samples.every((p) => obstacleDistance(p, b) > 8),
      ),
      "No rail envelope intrusion",
    );
    const pieces: ArtPiece[] = [];
    assert(emitBlockArchitecture(b, (p) => pieces.push(p)));
    assert(pieces.length < 110 && pieces.some((p) => p.layer === "detail"));
    assert(
      pieces.every(
        (p) =>
          [p.x, p.y, p.z, p.w, p.h, p.d, p.yaw].every(Number.isFinite) &&
          p.w > 0 &&
          p.h > 0 &&
          p.d > 0,
      ),
    );
  }
  if (block.court)
    assert(
      d.obstacles.every((o) => !orientedFootprintsOverlap(block.court!, o)),
      "Service court remains open",
    );
}
for (const q of BLOCK_DISTRICTS)
  assert(
    buildings.filter((b) => b.environmentId!.startsWith(`urban-block:${q.id}:`))
      .length <= q.cap,
  );
const siam = designBuildings(d).filter((p) => inSiamSquare(p.parcel));
assert(
  siam.length > 20 &&
    siam.every((p) =>
      p.bays.every(
        (b) =>
          ["retail", "shophouse", "noodle"].includes(b.type) && b.floors <= 3,
      ),
    ),
  "Siam Square is low-rise shopping fabric",
);
const central = d.landmarks.find((l) => l.id === "central")!;
assert.equal(
  central.yaw,
  Math.PI / 2,
  "CentralWorld event square faces Ratchadamri east",
);
assert.equal(
  d.obstacles.filter((o) => o.landmarkId === "central" && !o.artRole).length,
  commercialSiteMasses("central").length,
);
const plaza = {
  x: central.plot!.x + 35,
  z: central.plot!.z,
  yaw: 0,
  w: 3,
  d: 10,
  height: 0,
  color: "#fff",
};
assert(
  !d.obstacles
    .filter((o) => o.landmarkId === "central")
    .some((o) => orientedFootprintsOverlap(plaza, o)),
  "Event square not filled by obsolete whole-site collider",
);
assert(
  d.obstacles.filter((o) => o.landmarkId === "pho").length >=
    WAT_PHO_MASSES.length + 9,
  "Wat Pho halls/walls retained as independent physical masses",
);
const ben = d.publicSpaces!.find((p) => p.id === "benjakitti")!,
  wet = ben.water.filter((w) => !w.hole),
  islands = ben.water.filter((w) => w.hole);
assert.equal(wet.length, 4);
assert(islands.length >= 24);
for (const island of islands) {
  const p = {
    x: island.points.reduce((n, p) => n + p.x, 0) / island.points.length,
    z: island.points.reduce((n, p) => n + p.z, 0) / island.points.length,
  };
  assert(wet.some((w) => insidePublicPolygon(p, w.points)));
  assert(!publicWaterAt(d, p), "Wetland island is land in physics too");
}
assert(
  ben.paths.some((p) => p.elevation === 6.2) &&
    ben.paths.some((p) => p.elevation === 1.8),
);
assert(ben.paths.every((p) => p.mode === "pedestrian"));
assert(
  ben.facilities!.every((o) => d.obstacles.includes(o)),
  "Repurposed factory structures have collision",
);
// Buffer sharing must preserve independent tiles/transforms/visibility/disposal.
const material = new T.MeshStandardMaterial(),
  night = material.clone(),
  batch = new ArchitecturalBatch(material, night);
for (const [i, x] of [0, 240, 480].entries())
  batch.add({
    x,
    z: 0,
    y: 2,
    w: 3,
    h: 4,
    d: 5,
    yaw: 0,
    color: "#bbaa88",
    surface: i === 0 ? "brick" : "wood",
  });
const root = new T.Group();
root.add(...batch.finish());
const meshes = root.children.map((g) => g.children[0] as T.InstancedMesh);
assert.equal(meshes.length, 3);
assert.strictEqual(
  meshes[0]!.geometry.attributes.position,
  meshes[1]!.geometry.attributes.position,
);
assert.strictEqual(meshes[0]!.geometry.index, meshes[2]!.geometry.index);
assert.notStrictEqual(
  meshes[0]!.geometry.attributes.artSurface,
  meshes[1]!.geometry.attributes.artSurface,
);
assert.notStrictEqual(meshes[0]!.instanceMatrix, meshes[1]!.instanceMatrix);
assert(
  meshes[1]!.boundingBox!.min.x > 230 && meshes[0]!.boundingBox!.max.x < 5,
);
let disposed = 0;
for (const m of meshes)
  m.geometry.addEventListener("dispose", () => disposed++);
disposeObject(root);
assert.equal(disposed, 3);
const report = {
  pass: true,
  blocks: blocks.length,
  buildings: buildings.length,
  multiWingBlocks: blocks.filter((b) => b.buildings.length > 1).length,
  courts: blocks.filter((b) => b.court).length,
  siamSquareParcels: siam.length,
  benjakittiWetlandIslands: islands.length,
  geography: [
    "Terminal NW of Asok",
    "Victory east of Siam",
    "CentralWorld east frontage",
  ],
  sharedGeometryBuffers: true,
  physicalIPhone: false,
};
fs.writeFileSync(
  new URL(
    "../../../docs/qa/city-completion/structural-validation.json",
    import.meta.url,
  ),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
