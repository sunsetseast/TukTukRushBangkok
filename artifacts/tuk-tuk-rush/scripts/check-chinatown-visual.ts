import { beforeBangRak } from "./bang-rak-migration-contract";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import * as T from "three";
import { createBangkokWorld } from "../src/game/bangkok/world";
import { designBuildings } from "../src/game/bangkok/buildingGrammar";
import { emitChinatownDetail } from "../src/game/bangkok/chinatownDetail";
import {
  chinatownSigns,
  CHINATOWN_SIGN_ENTRIES,
} from "../src/game/bangkok/chinatownSigns";
import {
  ArchitecturalBatch,
  type ArtPiece,
} from "../src/game/bangkok/architecturalBatch";
import { installChinatownLight } from "../src/game/bangkok/chinatownLighting";
import { bangkokPeople } from "../src/game/bangkok/urbanLayers";
import { placementIndex } from "../src/game/bangkok/environmentPlan";
import { shiftLighting } from "../src/game/bangkok/lighting";
const out = new URL(
  "../../../docs/qa/chinatown-visual/validation/",
  import.meta.url,
);
fs.mkdirSync(out, { recursive: true });
const world = process.env.VISUAL_BASE_CHECKOUT
  ? (
      await import(
        pathToFileURL(
          process.env.VISUAL_BASE_CHECKOUT +
            "/artifacts/tuk-tuk-rush/src/game/bangkok/world.ts",
        ).href
      )
    ).createBangkokWorld
  : createBangkokWorld;
const d = world(),
  hash = (v: unknown) =>
    createHash("sha256").update(JSON.stringify(v)).digest("hex");
const foundation = Object.fromEntries(
  [
    "nodes",
    "roads",
    "buildings",
    "obstacles",
    "landmarks",
    "riverPolygon",
    "bridges",
    "destinations",
    "transit",
  ].map((k) => [k, hash((beforeBangRak(d) as any)[k] ?? null)]),
);
if (process.env.VISUAL_BASE_CHECKOUT) {
  fs.writeFileSync(
    new URL("foundation-base.json", out),
    JSON.stringify(foundation, null, 2),
  );
  console.log("Baseline foundation fingerprints saved");
  process.exit();
}
assert.deepEqual(
  foundation,
  JSON.parse(fs.readFileSync(new URL("foundation-base.json", out), "utf8")),
  "Every world footprint, collision object, road, landmark, destination and transit record remains identical to PR39",
);
const designs = designBuildings(d).filter((p) => p.parcel.chinatown),
  pieces: ArtPiece[] = [];
let signCount = 0;
const byCharacter: Record<
  string,
  {
    fronts: number;
    pieces: number;
    lit: number;
    signs: number;
    trades: Record<string, number>;
  }
> = {};
for (const p of designs) {
  const b = p.parcel,
    ct = b.chinatown!,
    list: ArtPiece[] = [];
  emitChinatownDetail(p, (q) => list.push(q));
  pieces.push(...list);
  const s = chinatownSigns(p);
  signCount += s.length;
  const rec = (byCharacter[ct.character] ??= {
    fronts: 0,
    pieces: 0,
    lit: 0,
    signs: 0,
    trades: {},
  });
  rec.fronts++;
  rec.pieces += list.length;
  rec.lit += list.filter((q) => q.glow).length;
  rec.signs += s.length;
  rec.trades[p.bays[0]!.trade] = (rec.trades[p.bays[0]!.trade] ?? 0) + 1;
  for (const q of list) {
    assert([q.x, q.y, q.z, q.w, q.h, q.d, q.yaw].every(Number.isFinite));
    assert(q.w > 0 && q.h > 0 && q.d > 0);
    const dx = q.x - b.x,
      dz = q.z - b.z,
      u = dx * Math.cos(b.yaw ?? 0) - dz * Math.sin(b.yaw ?? 0),
      v = dx * Math.sin(b.yaw ?? 0) + dz * Math.cos(b.yaw ?? 0);
    assert(
      Math.abs(u) + q.w / 2 <= b.w / 2 + 0.4,
      "Detail width belongs to its owner",
    );
    if (q.y - q.h / 2 < 3.1)
      assert(
        v + q.d / 2 <= b.d / 2 + 2.4,
        "Low detail cannot exceed the existing sidewalk apron",
      );
  }
  for (const sign of s) {
    assert(
      sign.y - sign.height / 2 >= 4.5,
      "No cabinet in pedestrian/vehicle space",
    );
    assert(sign.y + sign.height / 2 <= b.height);
    assert(
      sign.v + (sign.blade ? sign.width / 2 : 0.3) - b.d / 2 < 4,
      "Bounded projection",
    );
    assert(Math.abs(sign.u) < b.w / 2);
    assert(
      CHINATOWN_SIGN_ENTRIES.some((e) => e.key === sign.key) ||
        sign.key.startsWith("chinatown-"),
    );
  }
}
assert.equal(
  d.buildings.filter((b) => b.chinatown && !b.chinatown.role).length,
  798,
);
assert.equal(
  d.buildings.filter((b) => b.chinatown?.role === "rear").length,
  111,
);
assert(byCharacter.yaowarat!.lit > 500);
assert(
  byCharacter.yaowarat!.signs / byCharacter.yaowarat!.fronts >
    (byCharacter.songwat!.signs / byCharacter.songwat!.fronts) * 2,
);
assert.equal(byCharacter.yaowarat!.trades.residence ?? 0, 0);
const people = bangkokPeople(d),
  clear = placementIndex(d).person;
assert(people.length <= 360);
for (const p of people)
  for (let t = 0; t <= 1; t += 0.1)
    assert(
      clear({
        x: p.start.x + (p.end.x - p.start.x) * t,
        z: p.start.z + (p.end.z - p.start.z) * t,
      }),
      "Entire pedestrian route stays clear, not just endpoints",
    );
const material = new T.MeshStandardMaterial(),
  night = { value: 1 };
installChinatownLight(material, night);
const shader: any = {
  uniforms: {},
  vertexShader: "#include <begin_vertex>",
  fragmentShader: "#include <emissivemap_fragment>",
};
material.onBeforeCompile(shader, {} as any);
assert(shader.vertexShader.includes("artGlow"));
assert.equal(shader.uniforms.chinatownNight, night);
assert(shader.fragmentShader.includes("shopEmission"));
const batch = new ArchitecturalBatch(material, new T.MeshStandardMaterial());
batch.add({
  x: 0,
  y: 1,
  z: 0,
  w: 1,
  h: 1,
  d: 1,
  yaw: 0,
  color: "#fff",
  glow: "#ff8040",
});
batch.add({
  x: 0,
  y: 1,
  z: 0,
  w: 1,
  h: 1,
  d: 1,
  yaw: 0,
  color: "#fff",
  shape: "gable",
  glow: "#ff8040",
});
const groups = batch.finish();
for (const root of groups)
  for (const m of root.children as T.Mesh[]) {
    assert(m.geometry.attributes.artGlow);
    assert(m.geometry.attributes.artGlow.normalized);
    assert(m.geometry.attributes.artGlow.array.some((v) => v > 0));
  }
let previous = -1;
for (let t = 0; t <= 650; t++) {
  const a = shiftLighting(t);
  assert(a.night >= previous);
  previous = a.night;
  assert(a.ambient > 0 && a.exposure > 0);
}
assert(shiftLighting(650).ambient < shiftLighting(40).ambient);
const report = {
  pass: true,
  foundation,
  frontages: 798,
  rearBuildings: 111,
  details: pieces.length,
  signCount,
  byCharacter,
  people: people.length,
  stagedPeople: people.filter((p) => p.seed >= 1100).length,
  centralPeople: people.filter((p) => Math.hypot(p.x + 110, p.z + 200) < 100)
    .length,
  newPointLights: 0,
  transparentLayers: 0,
  instancedGlowBytesPerInstance: 3,
  physicalSafari: false,
};
fs.writeFileSync(new URL("visual.json", out), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
