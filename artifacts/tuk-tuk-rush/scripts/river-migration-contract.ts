import { assertChinatownGraphMigration } from "./chinatown-migration-contract";
/** Explicit PR36 exceptions to older frozen-baseline contracts. Keep their
 * unrelated geometry guards, rather than replacing historic fixtures wholesale.
 * The separate river suite validates the actual new physical geometry. */
import assert from "node:assert/strict";
import fs from "node:fs";
import type { District, Obstacle } from "../src/game/types";
import {
  CITY_MODEL,
  assertApprovedCityGeometry,
} from "../src/game/bangkok/cityModel";
const ledger = JSON.parse(
  fs.readFileSync(
    new URL(
      "../../../docs/qa/chao-phraya/parcel-migration-ledger.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const keys = new Set<string>(
  [...ledger.removed, ...ledger.added].map((p: any) => p.key),
);
export const parcelGeometryKey = (o: Obstacle) =>
  [o.x, o.z, o.w, o.d, o.yaw ?? 0].map((n) => n.toFixed(4)).join(":");
export const approvedRiverParcel = (o: Obstacle) =>
  keys.has(parcelGeometryKey(o));
export function assertRiverMigration(d: District, before: District) {
  assertApprovedCityGeometry(d);
  const clean = JSON.parse(JSON.stringify(d)) as District;
  assertChinatownGraphMigration(d, before, true); // Earlier fixtures predate the already approved Asiatique migration.
  assert.deepEqual(
    clean.transit?.lines,
    before.transit?.lines,
    "All BTS/Gold Line guideways and station origins preserved",
  );
  assert.deepEqual(
    d.river!.map((p) => [Math.round(p.x * 1000), Math.round(p.z * 1000)]),
    CITY_MODEL.waterApproval.centerline.map(([x, z]) => [
      Math.round(x! * 1000),
      Math.round(z! * 1000),
    ]),
    "Versioned river spine",
  );
  assert.equal(d.waterVersion, ledger.version);
}
export function assertUnmovedParcels(current: any[], old: any[]) {
  const waterfront = new Set([
    "anantara",
    "oriental",
    "peninsula",
    "hilton",
    "shangri",
    "four-seasons",
    "capella",
    "river-city",
    "asiatique",
  ]);
  const geometry = (p: any) =>
    JSON.stringify({
      owner: p.landmarkId,
      use: p.use,
      boundary: p.boundary.map((q: any) => ({
        x: Math.round(q.x * 1e4) / 1e4,
        z: Math.round(q.z * 1e4) / 1e4,
      })),
    });
  for (const p of old) {
    // The existing builder numbers parcels globally. A hotel terrace changing
    // length can renumber later records without moving their physical geometry.
    if (waterfront.has(p.landmarkId)) continue;
    assert(
      current.some((q) => geometry(q) === geometry(p)),
      "Retain unrelated protected geometry " + p.id,
    );
  }
}
