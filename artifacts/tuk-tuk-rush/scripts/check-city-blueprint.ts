import {
  chinatownBenchmark,
  emitChinatownBenchmark,
} from "./chinatown-benchmark";
import { approvedChinatownParcel } from "./chinatown-migration-contract";
import { approvedWaterfrontParcel } from "./waterfront-migration-contract";
import {
  assertRiverMigration,
  approvedRiverParcel,
} from "./river-migration-contract";
import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { createBangkokWorld } from "../src/game/bangkok/world";
import {
  CITY_MODEL,
  assertApprovedCityGeometry,
  canonicalFeaturePoint,
} from "../src/game/bangkok/cityModel";
import { cityGraphApprovalKey } from "../src/game/bangkok/roadIdentity";
import { buildLandmarkRegistry } from "../src/game/bangkok/landmarkRegistry";
import {
  landmarkParcels,
  parcelConflicts,
  localPoint,
  rectangleBoundary,
  polygonsOverlap,
} from "../src/game/bangkok/landmarkParcels";
import { geographicToWorld } from "../src/game/bangkok/geography";
import { planMrtEntrances } from "../src/game/bangkok/mrtSurface";
import { designBuildings } from "../src/game/bangkok/buildingGrammar";
import {
  cinematicParcel,
  emitYaowaratFacade,
} from "../src/game/bangkok/yaowarat";
import { cityGeometry } from "../src/game/bangkok/cityGeometry";
import { isHistoricWaterfront } from "../src/game/bangkok/historicPlan";
import {
  pieceVolume,
  validateSpatialVolumes,
} from "../src/game/bangkok/spatialValidation";
import type { District, Obstacle } from "../src/game/types";
const out = new URL("../../../docs/qa/world-blueprint/", import.meta.url),
  before = JSON.parse(
    gunzipSync(
      fs.readFileSync(new URL("before-world.json.gz", out)),
    ).toString(),
  ) as District,
  d = createBangkokWorld();
assertRiverMigration(d, before);
const sourceRoot = new URL("../src/", import.meta.url);
for (const file of fs
  .readdirSync(sourceRoot, { recursive: true })
  .filter(
    (f) => typeof f === "string" && /\.tsx?$/.test(f as string),
  ) as string[])
  assert(
    !/from\s+["'][^"']*layout\.json["']/.test(
      fs.readFileSync(new URL(file, sourceRoot), "utf8"),
    ),
    "Runtime must use canonical cityLayout adapter: " + file,
  );
assertApprovedCityGeometry(d);
assert.equal(cityGraphApprovalKey(d), CITY_MODEL.roadBaseline.fullGraphKey);
assert.notEqual(
  cityGraphApprovalKey({
    ...d,
    roads: d.roads.map((r, i) => (i ? r : { ...r, oneWay: !r.oneWay })),
  }),
  CITY_MODEL.roadBaseline.fullGraphKey,
  "Direction changes invalidate approval",
);
assert.equal(new Set(CITY_MODEL.features.map((p) => p.id)).size, 49);
for (const p of CITY_MODEL.geographicReferences)
  assert(
    Number.isFinite(p.coordinate.lat) &&
      Number.isFinite(p.coordinate.lon) &&
      p.sources.length,
  );
const registry = buildLandmarkRegistry(d),
  old = JSON.parse(
    fs.readFileSync(new URL("before-registry.json", out), "utf8"),
  );
assert(old.every((p: { id: string }) => registry.some((q) => q.id === p.id)));
assert.equal(registry.length, 98);
assert(
  landmarkParcels(d).length >= 208 + CITY_MODEL.architecturalAprons.length,
  "Preserve sites; bank-shaped terrace reservations vary",
);
const swing = registry.find((p) => p.id === "swing")!,
  suthat = registry.find((p) => p.id === "suthat")!;
assert.deepEqual(swing.world, { x: -360, z: -998 });
assert.deepEqual(suthat.world, { x: -360, z: -901 });
const g = CITY_MODEL.geographicReferences.find((g) => g.id === "swing")!,
  projected = geographicToWorld(g.coordinate);
assert(
  Math.abs(swing.world.z - projected.z + 263) < 0.001,
  "Explicit local Swing compression, unchanged global projection",
);
for (const l of d.landmarks)
  assert.deepEqual(
    canonicalFeaturePoint(l.id!, l.plot ?? l, l.yaw ?? 0),
    registry.find((p) => p.id === l.id)!.world,
  );
for (const p of CITY_MODEL.infrastructure.piers) {
  const r = registry.find((r) => r.id === "pier:" + p.id)!;
  assert.equal(r.district, p.district);
  assert.deepEqual(r.neighbors, [p.owner]);
  assert.deepEqual(r.roadRelationships, [
    ...p.streets,
    `${p.bank} bank of Chao Phraya`,
  ]);
  assert(!r.roadRelationships.some((s) => s.includes("Odeon")));
}
assert.equal(
  registry.find((p) => p.id === "pier:tha-chang")!.district,
  "Phra Nakhon",
);
const mrt = planMrtEntrances(d);
assert.equal(mrt.length, 7);
for (const s of mrt.filter((s) => s.introduced < 34)) {
  const prev = before.obstacles.find((o) => o.environmentId === s.id)!;
  assert.equal(s.x, prev.x);
  assert.equal(s.z, prev.z);
}
assert.equal(d.buildings.flatMap((b) => parcelConflicts(d, b)).length, 0);
const key = (o: Obstacle) => JSON.stringify([o.x, o.z, o.w, o.d, o.yaw ?? 0]),
  a = new Set(before.buildings.map(key)),
  b = new Set(d.buildings.map(key));
const removed = before.buildings.filter((o) => !b.has(key(o))),
  added = d.buildings.filter((o) => !a.has(key(o))),
  newMrt = mrt.filter((s) => s.introduced >= 34);
const aprons = CITY_MODEL.architecturalAprons.map((a) => {
  const l = d.landmarks.find((l) => l.id === a.landmarkId)!;
  return {
    ...localPoint(l.plot!, l.yaw ?? 0, a.center[0]!, a.center[1]!),
    w: a.width,
    d: a.depth,
    yaw: l.yaw ?? 0,
    margin: a.contextReflowMargin,
  };
});
const localApronContext = (o: Obstacle) =>
  aprons.some((a) =>
    rectangleBoundary(o).every((p) => {
      const dx = p.x - a.x,
        dz = p.z - a.z,
        c = Math.cos(a.yaw),
        s = Math.sin(a.yaw);
      return (
        Math.abs(c * dx - s * dz) <= a.w / 2 + a.margin &&
        Math.abs(s * dx + c * dz) <= a.d / 2 + a.margin
      );
    }),
  );
for (const o of [...removed, ...added])
  assert(
    approvedRiverParcel(o) ||
      approvedWaterfrontParcel(o) ||
      approvedChinatownParcel(o) ||
      newMrt.some((s) => Math.hypot(s.x - o.x, s.z - o.z) < 140) ||
      localApronContext(o),
    "No footprint churn outside approved MRT/apron collar",
  );
const pr34 = JSON.parse(
    gunzipSync(fs.readFileSync(new URL("after-world.json.gz", out))).toString(),
  ) as District,
  pr34Keys = new Set(pr34.buildings.map(key));
assert(
  pr34.buildings
    .filter((o) => !b.has(key(o)))
    .every(
      (o) =>
        approvedRiverParcel(o) ||
        approvedWaterfrontParcel(o) ||
        approvedChinatownParcel(o) ||
        aprons.some((a) =>
          polygonsOverlap(rectangleBoundary(a), rectangleBoundary(o)),
        ),
    ),
  "Removed PR34 buildings must intersect the researched apron",
);
assert(
  d.buildings
    .filter((o) => !pr34Keys.has(key(o)))
    .every(
      (o) =>
        approvedRiverParcel(o) ||
        approvedWaterfrontParcel(o) ||
        approvedChinatownParcel(o) ||
        localApronContext(o),
    ),
  "Every new PR35 infill must stay in the approved collar",
);

const designs = designBuildings(d),
  row = designs.filter(chinatownBenchmark),
  waterfront = designs.filter((p) => isHistoricWaterfront(p.parcel)),
  pieces: Parameters<typeof pieceVolume>[0][] = [];
row.forEach((p) => emitChinatownBenchmark(p, (o) => pieces.push(o)));
assert(row.length >= 40 && row.length <= 90);
assert(new Set(row.flatMap((p) => p.bays.map((b) => b.trade))).size >= 8);
assert(
  row.every((p) =>
    p.bays.every(
      (b) => b.height <= p.parcel.height && b.floors >= 2 && b.floors <= 7,
    ),
  ),
);
const conflicts = validateSpatialVolumes(
  { ...d, transit: undefined },
  pieces.map((p, i) => pieceVolume(p, "benchmark:" + i)),
);
assert.equal(conflicts.length, 0, JSON.stringify(conflicts.slice(0, 3)));
assert(waterfront.length > 20);
assert(
  cityGeometry(d).every(
    (f) =>
      f.geometry.length &&
      f.geometry.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z)),
  ),
);
const inv = JSON.parse(
  fs.readFileSync(
    new URL("../../../data/bangkok/iconic-inventory.v1.json", import.meta.url),
    "utf8",
  ),
);
assert(inv.places.length >= 130);
assert.equal(new Set(inv.places.map((p: any) => p.id)).size, inv.places.length);
assert(
  inv.places.every((p: any) => !p.coordinate || p.geographicSource.length),
);
assert(inv.places.every((p: any) => p.recognizabilityGrade !== "A"));
// A name alone cannot certify object identity: temple/bridge names also label
// ferry stops, and The Siam Society is not The Siam hotel.
const osm = JSON.parse(
  fs.readFileSync(
    new URL("../../../data/bangkok/osm-places.v1.json", import.meta.url),
    "utf8",
  ),
).places;
for (const p of inv.places)
  for (const url of p.geographicSource) {
    const candidate = osm.find((o: any) => o.source === url);
    if (!candidate) continue;
    if (p.category !== "river-pier")
      assert.notEqual(
        candidate.tags.amenity,
        "ferry_terminal",
        "Wrong source feature class for " + p.id,
      );
    if (p.category === "hotel")
      assert(
        candidate.tags.tourism === "hotel" ||
          candidate.tags.building === "hotel",
        "Hotel source must identify a hotel: " + p.id,
      );
    if (p.category === "bts-station")
      assert(
        ["station", "halt"].includes(candidate.tags.railway),
        "Station source must identify rail infrastructure: " + p.id,
      );
  }
assert.equal(
  inv.places.find((p: any) => p.id === "the-siam").coordinate,
  null,
  "Ambiguous museum name must not supply hotel coordinates",
);
assert.equal(
  inv.places.find((p: any) => p.id === "sena-ruam-bts").status,
  "intentionally excluded from the playable scope",
);
const summary = {
  pass: true,
  roads: d.roads.length,
  nodes: d.nodes.length,
  buildings: d.buildings.length,
  places: registry.length,
  parcels: landmarkParcels(d).length,
  benchmarkParcels: row.length,
  benchmarkPieces: pieces.length,
  waterfrontParcels: waterfront.length,
  emittedLaneConflicts: conflicts.length,
  mrt: newMrt,
  footprintDeltas: { removed, added },
  inventory: inv.places.length,
  geographicReferences: inv.places.filter((p: any) => p.coordinate).length,
};
fs.writeFileSync(
  new URL("certification.json", out),
  JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify(summary));
