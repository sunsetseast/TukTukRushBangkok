/** Deterministic, small derived traffic-rule asset from the ALREADY PINNED map.
 * Does not fetch new OSM data, mutate source geography, or regenerate roads.
 * Kept separate from navigation.v2.bin.gz to preserve its compact ABI.
 */
import fs from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import type { GeographicDataset } from "../src/game/bangkok/geographic/dataset";
import type { GameplayMetadata } from "../src/game/bangkok/geographic/network";
import { roadDirectionFromTags, motorTrafficAllowed, type GeographicRoadRules } from "../src/game/bangkok/geographic/roadRules";

const dir = new URL("../public/assets/geography/", import.meta.url);
const sourceBytes = fs.readFileSync(new URL("runtime.v1.json.gz", dir));
const data = JSON.parse(gunzipSync(sourceBytes).toString()) as GeographicDataset;
const metadata = JSON.parse(
  gunzipSync(fs.readFileSync(new URL("gameplay.v2.json.gz", dir))).toString(),
) as GameplayMetadata;
const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
if (metadata.sourceSha256 !== sourceSha256 ||
    metadata.ways.some(w => !w.id))
  throw Error("Pinned geographic navigation/source mismatch; rebuild approved geography first");
const ways = new Map(data.roads.map(w => [w.id, w]));
const directed: GeographicRoadRules["directed"] = [];
const blockedMotor: number[] = [];
let missing = 0, explicitlyTwoWay = 0, unknown = 0;
metadata.ways.forEach((w, i) => {
  const source = ways.get(w.id);
  if (!source) { missing++; return; }
  const direction = roadDirectionFromTags(source.tags);
  if (!motorTrafficAllowed(source.tags) || !source.vehicleClearance) blockedMotor.push(i);
  if (direction) directed.push([i, direction]);
  else if (source.tags.oneway === "no") explicitlyTwoWay++;
  else if (source.tags.oneway && !["false", "0"].includes(source.tags.oneway.toLowerCase())) unknown++;
});
if (missing) throw Error("Unmapped road-rule source IDs: " + missing);
const rules: GeographicRoadRules = {
  schema: 1, sourceSha256, wayCount: metadata.ways.length, directed, blockedMotor,
};
fs.writeFileSync(
  new URL("road-rules.v1.json.gz", dir),
  gzipSync(JSON.stringify(rules), { level: 9, mtime: 0 }),
);
console.log({
  rulePack: "road-rules.v1.json.gz", sourceSha256,
  ways: rules.wayCount, directed: directed.length, blockedMotor: blockedMotor.length,
  explicitlyTwoWay, unknownDynamicOrUnrecognized: unknown,
});
