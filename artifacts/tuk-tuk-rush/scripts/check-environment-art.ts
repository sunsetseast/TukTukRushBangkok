import assert from "node:assert/strict";
import {
  Box3,
  Vector3,
  Mesh,
  InstancedMesh,
  MeshStandardMaterial,
} from "three";
import { createBangkokWorld, riverDistance } from "../src/game/bangkok/world";
import {
  buildingIdentity,
  designBuildings,
  HERO_STREETS,
  GRAMMARS,
} from "../src/game/bangkok/buildingGrammar";
import { emitDistrictArchitecture } from "../src/game/bangkok/architecture";
import { buildBangkokGraybox } from "../src/game/bangkok/mesh";
import { bangkokPeople } from "../src/game/bangkok/urbanLayers";
import { SIGN_ENTRIES, TRADE_SIGNS } from "../src/game/bangkok/signage";
import { obstacleDistance, distanceToSegment } from "../src/game/world";
import { cityClearance } from "../src/game/bangkok/clearanceIndex";
const d = createBangkokWorld(),
  designs = designBuildings(d),
  byId = new Map(designs.map((p) => [p.id, p]));
assert.equal(
  new Set(d.buildings.map(buildingIdentity)).size,
  d.buildings.length,
);
const reordered = designBuildings({
  ...d,
  buildings: [...d.buildings].reverse(),
});
for (const p of reordered)
  assert.deepEqual(
    p,
    byId.get(p.id),
    "Identity must not depend on array order or earlier rejected parcels",
  );
const nodes = new Map(d.nodes.map((n) => [n.id, n]));
const types = new Set(designs.flatMap((p) => p.bays.map((b) => b.type)));
assert.deepEqual(
  types,
  new Set(Object.values(GRAMMARS).flatMap((g) => g.types)),
);
for (const p of designs) {
  assert.equal(p.region, p.parcel.regionId ?? "connector");
  assert(
    Math.abs(p.bays.reduce((s, a) => s + a.width, 0) - p.parcel.w) < 0.00001,
  );
  assert(
    p.bays.every((a) => a.front <= p.parcel.d / 2 && a.depth <= p.parcel.d),
  );
  assert(
    p.bays.every(
      (a) => a.type === "office" || a.type === "apartment" || a.height < 23,
    ),
    "Low-rise character must survive in heritage quarters",
  );
  for (const a of p.bays) {
    if (a.occupied) assert(TRADE_SIGNS[a.trade as keyof typeof TRADE_SIGNS]);
  }
  if (p.parcel.artRole === "background")
    assert(riverDistance(d, p.parcel) > d.riverWidth! / 2 + Math.hypot(p.parcel.w,p.parcel.d)/2+2,"Background parcel must clear water by its own radius");
}
const structuralKey = (p: (typeof designs)[number]) =>
  p.bays
    .map((a) =>
      [
        a.type,
        a.roof,
        a.floors,
        a.windows,
        a.balcony,
        Math.round(a.width * 10),
        Math.round(a.front * 10),
      ].join(":"),
    )
    .join("|");
const diversity = [];
for (const h of HERO_STREETS) {
  const row = designs
    .filter((p) => p.hero === h.id && !p.parcel.artRole)
    .sort((a, b) => a.parcel.x - b.parcel.x || a.parcel.z - b.parcel.z);
  assert(row.length > 0, `Missing curated street: ${h.id}`);
  assert(
    new Set(row.flatMap((p) => p.bays.map((a) => a.type))).size >= 3,
    `One template dominates ${h.id}`,
  );
  for (let i = 0; i < row.length - 3; i++)
    assert(
      new Set(row.slice(i, i + 4).map(structuralKey)).size > 1,
      `Four identical neighboring parcels: ${h.id}`,
    );
  diversity.push({
    hero: h.id,
    parcels: row.length,
    structuralCompositions: new Set(row.map(structuralKey)).size,
  });
}
// Actual contiguous graph sections, not just a count of templates in a catalog.
for (const corridor of [
  "yaowarat",
  "songwat",
  "old_w",
  "old_siam",
  "charoen_nakhon",
  "silom",
]) {
  const row = designs.filter(
    (p) => p.corridor === corridor && !p.parcel.artRole,
  );
  assert(row.length > 0);
  const signatures = new Set(row.map(structuralKey));
  assert(signatures.size > 1, `Uniform road ${corridor}`);
}
// Dimensional opening contract: dark room backs lie behind the columns and
// window planes. Measure emitted pieces in a chosen building's local frame.
const sample = designs.find(
  (p) => p.region === "chinatown" && p.bays.some((a) => a.type === "noodle"),
)!;
const emitted: any[] = [];
emitDistrictArchitecture([sample], (p) => emitted.push(p));
const b = sample.parcel,
  yaw = b.yaw ?? 0;
const localZ = (p: any) =>
  Math.sin(yaw) * (p.x - b.x) + Math.cos(yaw) * (p.z - b.z);
assert(
  emitted.some((p) => p.color === "#694b37" && localZ(p) < b.d / 2 - 1.7),
  "Recessed interior missing",
);
assert(
  emitted.some((p) => p.shape === "gable" || p.shape === "arch") ||
    sample.bays.some((a) => a.balcony),
  "Sample facade should contain an architectural feature",
);
const people = bangkokPeople(d),
  segments = d.roads.map((r) => ({
    r,
    a: nodes.get(r.a)!,
    b: nodes.get(r.b)!,
  }));
assert(people.length > 0 && people.length <= 360);
for (const person of people)
  for (const p of [person.start, person.end]) {
    assert(d.obstacles.every((o) => obstacleDistance(p, o) > 0.5));
    assert(
      segments.every(
        (s) => distanceToSegment(p, s.a, s.b).distance > s.r.width / 2 + 0.7,
      ),
    );
  }
assert(SIGN_ENTRIES.every((e) => e.text.trim() && !/[\uFFFD]/.test(e.text)),"All sign entries have valid text");
assert(
  SIGN_ENTRIES.some((e) => /[\u0E00-\u0E7F]/.test(e.text)) &&
    SIGN_ENTRIES.some((e) => /[\u4e00-\u9fff]/.test(e.text)),
  "Thai and Chinese signs exist",
);
const city = buildBangkokGraybox(d);
city.update(new Vector3(d.spawn!.x, 5, d.spawn!.z), "low", true);
const core = city.group.children.filter(
  (c) => c.name === "BangkokArchitecture",
);
assert(core.some((c) => c.visible));
assert(
  city.group.children
    .filter((c) => c.name === "BangkokDetail")
    .every((c) => !c.visible),
);
city.update(new Vector3(d.spawn!.x, 5, d.spawn!.z), "medium", true);
assert(
  city.group.children.some((c) => c.name === "BangkokDetail" && c.visible),
);
const night = city.group.children
  .filter((c) => c.name === "BangkokNight")
  .flatMap((c) => c.children)
  .map((c) => (c as Mesh).material as MeshStandardMaterial);
city.setNight(1);
assert(night.every((m) => m.emissiveIntensity > 0.8));
city.setNight(0);
assert(night.every((m) => m.emissiveIntensity === 0));
const gs = new Set<any>(),
  ms = new Set<any>(),
  ts = new Set<any>(),
  inst = new Set<InstancedMesh>();
city.group.traverse((o) => {
  if (o instanceof InstancedMesh) {
    inst.add(o);
    if(o.userData.environmentEffect) {assert(o.geometry.hasAttribute("position"));assert(o.instanceMatrix.count>=o.count);}else{
    assert(
      o.geometry.hasAttribute("color"),
      "Instanced tint must not multiply by an absent zero vertex color",
    );
    assert(o.geometry.hasAttribute("artSurface"));
    assert(o.boundingSphere && Number.isFinite(o.boundingSphere.radius));
    }
  }
  if (o instanceof Mesh) {
    gs.add(o.geometry);
    for (const m of [o.material].flat()) {
      ms.add(m);
      for (const t of Object.values(m)) if ((t as any)?.isTexture) ts.add(t);
    }
  }
});
let geometryDisposals = 0,
  materialDisposals = 0,
  textureDisposals = 0,
  instanceDisposals = 0;
gs.forEach((g) => g.addEventListener("dispose", () => geometryDisposals++));
ms.forEach((m) => m.addEventListener("dispose", () => materialDisposals++));
ts.forEach((t) => t.addEventListener("dispose", () => textureDisposals++));
inst.forEach((i) => i.addEventListener("dispose", () => instanceDisposals++));
city.dispose();
assert.equal(geometryDisposals, gs.size);
assert.equal(materialDisposals, ms.size);
assert.equal(textureDisposals, ts.size);
assert.equal(instanceDisposals, inst.size);
console.log(
  JSON.stringify({
    pass: true,
    identities: designs.length,
    typologies: [...types].sort(),
    heroDiversity: diversity,
    pedestrians: people.length,
    tradeSignEntries: SIGN_ENTRIES.length,
    sharedResourcesReleasedExactlyOnce: true,
  }),
);

// Check bundled glyphs, not just document.fonts.check (which accepts fallback).
const { readFileSync } = await import("node:fs");
function glyphInFont(data: Buffer, code: number) {
  const tables = data.readUInt16BE(4);
  let cmap = 0;
  for (let i = 0; i < tables; i++) {
    const o = 12 + i * 16;
    if (data.toString("ascii", o, o + 4) === "cmap")
      cmap = data.readUInt32BE(o + 8);
  }
  assert(cmap, "Font has no cmap");
  for (let t = 0; t < data.readUInt16BE(cmap + 2); t++) {
    const start = cmap + data.readUInt32BE(cmap + 4 + t * 8 + 4),
      format = data.readUInt16BE(start);
    if (format === 4 && code <= 65535) {
      const count = data.readUInt16BE(start + 6) / 2,
        end = start + 14,
        begin = end + count * 2 + 2,
        delta = begin + count * 2,
        range = delta + count * 2;
      for (let i = 0; i < count; i++) {
        if (
          code < data.readUInt16BE(begin + i * 2) ||
          code > data.readUInt16BE(end + i * 2)
        )
          continue;
        const shift = data.readInt16BE(delta + i * 2),
          offset = data.readUInt16BE(range + i * 2);
        if (!offset) return ((code + shift) & 65535) !== 0;
        const address =
          range +
          i * 2 +
          offset +
          (code - data.readUInt16BE(begin + i * 2)) * 2;
        const glyph = data.readUInt16BE(address);
        if (glyph && ((glyph + shift) & 65535) !== 0) return true;
      }
    } else if (format === 12) {
      for (let i = 0; i < data.readUInt32BE(start + 12); i++) {
        const o = start + 16 + i * 12,
          a = data.readUInt32BE(o),
          b = data.readUInt32BE(o + 4);
        if (code >= a && code <= b && data.readUInt32BE(o + 8) + code - a !== 0)
          return true;
      }
    }
  }
  return false;
}
const thai = readFileSync(
    new URL("../public/assets/fonts/thai-signs.ttf", import.meta.url),
  ),
  chinese = readFileSync(
    new URL("../public/assets/fonts/chinese-signs.ttf", import.meta.url),
  );
for (const entry of SIGN_ENTRIES)
  for (const char of entry.text) {
    const code = char.codePointAt(0)!;
    assert(
      glyphInFont(thai, code) || glyphInFont(chinese, code),
      `Missing bundled glyph ${char} in ${entry.text}`,
    );
  }
console.log(
  "PASS bundled Thai/Chinese/Latin glyph coverage for all 36 trade signs",
);

const indexedClear = cityClearance(d);
for (const p of d.nodes
  .filter((_, i) => i % 5 === 0)
  .flatMap((n) => [
    n,
    { x: n.x + 13, z: n.z + 15 },
    { x: n.x - 20, z: n.z - 15 },
  ])) {
  const exact =
    d.obstacles.every((o) => obstacleDistance(p, o) >= 0.5) &&
    segments.every(
      (s) => distanceToSegment(p, s.a, s.b).distance >= s.r.width / 2 + 0.5,
    );
  assert.equal(
    indexedClear(p),
    exact,
    "Spatial broad phase changed pedestrian clearance",
  );
}
console.log("PASS pedestrian spatial index matches full collision scans");

// Rebuilding a scene after disposal must own fresh materials/textures rather
// than revive resources disposed by an earlier scene.
const rebuilt = buildBangkokGraybox(d);
rebuilt.group.traverse((o) => {
  if (o instanceof Mesh)
    for (const m of [o.material].flat())
      assert(!ms.has(m), "Disposed material reused by a new scene");
});
rebuilt.setNight(1);
rebuilt.update(new Vector3(d.spawn!.x, 5, d.spawn!.z), "low", true);
rebuilt.dispose();
console.log("PASS fresh scene construction after resource disposal");
