/** Release gate: a green build with an empty traffic-control placeholder
 * is NOT evidence that Bangkok's real lights/signs have been imported.
 * This check is intentionally red until the audited OSM source is committed.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import type { RuntimeControlPack } from "../src/game/bangkok/geographic/controlImport";
const dir=new URL("../public/assets/geography/",import.meta.url);
const sourceFile=new URL("../../../data/bangkok/real-scale/traffic-controls.v1.json",import.meta.url);
const archiveFile=new URL("../../../data/bangkok/real-scale/traffic-controls.v1.json.gz.b64",import.meta.url);
assert(
  fs.existsSync(sourceFile)||fs.existsSync(archiveFile),
  "NO SOURCE INVENTORY: commit the real, checked OSM traffic-control extraction before declaring PR #56 ready",
);
const pack=JSON.parse(gunzipSync(fs.readFileSync(
  new URL("traffic-controls.v1.json.gz",dir),
)).toString()) as RuntimeControlPack;
assert.equal(pack.status,"ready","Empty placeholder is NOT an imported traffic-control inventory");
assert.match(pack.controlSourceSha256 ?? "",/^[0-9a-f]{64}$/);
assert(pack.stats.taggedNodes>0, "OSM signs are absent from the extracted source");
assert(pack.signs.length>0, "No control signs verified for visual use");
assert(pack.stats.mappedSignals>0,
  "No verified traffic-signal nodes align to the actual Bangkok road graph");
assert(pack.signs.some(s=>s.kind==="signal"&&s.approaches.length>0),
  "No verified red/green signal approaches would actually affect AI traffic");
assert(pack.stats.taggedNodes >= pack.stats.mappedSignals,
  "Count mismatch");
const ids=new Set<string>();
for(const sign of pack.signs) {
  assert(/^osm:node\/\d+$/.test(sign.id),"Fake/untraceable sign ID");
  assert(!ids.has(sign.id),"Duplicate sign ID");
  ids.add(sign.id);
  assert(Number.isFinite(sign.x)&&Number.isFinite(sign.z));
}
console.log({
  pass:true,
  source:pack.source,
  sourceSha256:pack.controlSourceSha256,
  signTags:pack.stats.taggedNodes,
  verifiedSignals:pack.stats.mappedSignals,
  verifiedStops:pack.stats.mappedStops,
  verifiedYields:pack.stats.mappedYields,
  unmatched:pack.stats.unmatched,
  turnRestrictions:pack.stats.restrictions,
});
