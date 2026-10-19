import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { createBangkokWorld } from "../src/game/bangkok/world";
import { buildLandmarkRegistry } from "../src/game/bangkok/landmarkRegistry";
import {
  landmarkParcels,
  prepareLandmarkParcels,
  parcelConflicts,
} from "../src/game/bangkok/landmarkParcels";
import {
  validateLandmarkVisibility,
  validateFacadeOrientation,
} from "../src/game/bangkok/landmarkVisibility";
import { completeLandmarkContext } from "../src/game/bangkok/landmarkContext";
import { auditUrbanLand } from "../src/game/bangkok/urbanBlocks";
import type { District } from "../src/game/types";
const out = new URL("../../../docs/qa/landmark-accuracy/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
const before = JSON.parse(
  gunzipSync(fs.readFileSync(new URL("baseline-world.json.gz", out))).toString("utf8"),
) as District;
// JSON preserves geometry but not shared object identity. Restore the physical
// building references so blocker categories match the live-world classifier.
const snapshotKey = (o: District["buildings"][number]) =>
  [o.x, o.z, o.w, o.d, o.yaw ?? 0, o.height].join(":");
const snapshotBuildings = new Map(
  before.buildings.map((b) => [snapshotKey(b), b]),
);
before.obstacles = before.obstacles.map(
  (o) => snapshotBuildings.get(snapshotKey(o)) ?? o,
);
prepareLandmarkParcels(before);
const after = createBangkokWorld();
for (const [label, d] of [
  ["before", before],
  ["after", after],
] as const) {
  const registry = buildLandmarkRegistry(d),
    visibility = validateLandmarkVisibility(d),
    orientation = validateFacadeOrientation(d),
    parcels = landmarkParcels(d);
  const observationsFile = new URL("visual-observations.json", out);
  if (fs.existsSync(observationsFile)) {
    const observations = JSON.parse(fs.readFileSync(observationsFile, "utf8"));
    for (const r of registry)
      r.visualQa = observations[r.id]?.[label]?.reviewed
        ? "street-and-elevated-reviewed"
        : "volume-audit-only";
  }
  fs.writeFileSync(
    new URL(`registry-${label}.json`, out),
    JSON.stringify(registry, null, 2),
  );
  fs.writeFileSync(
    new URL(`visibility-${label}.json`, out),
    JSON.stringify({ orientation, visibility }, null, 2),
  );
  const occupancy = d.buildings.flatMap((b, i) =>
    parcelConflicts(d, b).map((p) => ({
      objectId: b.environmentId ?? `building:${i}`,
      landmarkId: p.landmarkId,
      parcel: p.id,
      use: p.use,
    })),
  );
  const land = auditUrbanLand(d);
  fs.writeFileSync(new URL(`land-${label}.json`, out), JSON.stringify(land));
  fs.writeFileSync(
    new URL(`parcels-${label}.json`, out),
    JSON.stringify({ parcels, occupancy }, null, 2),
  );
  console.log(label, {
    registry: registry.length,
    buildings: d.buildings.length,
    parcels: parcels.length,
    occupancy: occupancy.length,
    sightlines: visibility.length,
    visible: visibility.filter((v) => v.visible).length,
    orientationErrors: orientation.filter((o) => !o.pass),
    land: { ...land, cells: undefined },
  });
}
const old = new Map(before.landmarks.map((l) => [l.id, l]));
const changes = after.landmarks.map((l) => {
  const b = old.get(l.id);
  const bp = b?.plot ?? b!,
    p = l.plot ?? l;
  return {
    id: l.id,
    repositioned: Math.hypot(p.x - bp.x, p.z - bp.z) > 0.01,
    reoriented: Math.abs((l.yaw ?? 0) - (b?.yaw ?? 0)) > 0.01,
    beforePlot: bp,
    afterPlot: p,
    beforeYaw: b?.yaw ?? 0,
    afterYaw: l.yaw ?? 0,
  };
});
fs.writeFileSync(
  new URL("changes.json", out),
  JSON.stringify({ changes, context: completeLandmarkContext(after) }, null, 2),
);

const buildingKey=(b:District['buildings'][number])=>[b.x,b.z,b.w,b.d,b.yaw??0].map(n=>n.toFixed(3)).join(':');
const beforeKeys=new Set(before.buildings.map(buildingKey)),afterKeys=new Set(after.buildings.map(buildingKey));
const removed=before.buildings.filter(b=>!afterKeys.has(buildingKey(b))).map(b=>({id:b.environmentId??buildingKey(b),x:b.x,z:b.z,protectedBy:parcelConflicts(after,b).map(p=>({landmarkId:p.landmarkId,use:p.use}))}));
const added=after.buildings.filter(b=>!beforeKeys.has(buildingKey(b))).map(b=>({id:b.environmentId??buildingKey(b),x:b.x,z:b.z}));
fs.writeFileSync(new URL('generation-delta.json',out),JSON.stringify({method:'Physical building footprint identity (x,z,w,d,yaw), not visual grading or ownership data.',beforeBuildings:before.buildings.length,afterBuildings:after.buildings.length,removed,added,removedForProtectedLandmarks:removed.filter(b=>b.protectedBy.length).length},null,2));
