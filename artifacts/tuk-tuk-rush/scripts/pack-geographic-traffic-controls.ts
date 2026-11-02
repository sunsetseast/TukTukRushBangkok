/** Compile source-backed Bangkok signs and restriction relations into a
 * small browser asset. No country PBF downloads, network or inferred signs
 * during normal development and deployment.
 */
import fs from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import type { GeographicDataset } from "../src/game/bangkok/geographic/dataset";
import { GeographicNetwork, type GameplayMetadata } from "../src/game/bangkok/geographic/network";
import type { GeographicRoadRules } from "../src/game/bangkok/geographic/roadRules";
import {
  compileControlPack, emptyControlPack,
  type SourceControlSnapshot,
} from "../src/game/bangkok/geographic/controlImport";

const assets=new URL("../public/assets/geography/",import.meta.url);
const sourcePath=new URL("../../../data/bangkok/real-scale/traffic-controls.v1.json",import.meta.url);
const rawRuntime=fs.readFileSync(new URL("runtime.v1.json.gz",assets));
const metadata=JSON.parse(gunzipSync(fs.readFileSync(
  new URL("gameplay.v2.json.gz",assets))).toString()) as GameplayMetadata;
const hash=createHash("sha256").update(rawRuntime).digest("hex");
if(metadata.sourceSha256!==hash)throw Error("Road source changed; traffic controls require new map audit");
let compiled=emptyControlPack(hash);
if(fs.existsSync(sourcePath)) {
  const source=JSON.parse(fs.readFileSync(sourcePath,"utf8")) as SourceControlSnapshot;
  const runtime=JSON.parse(gunzipSync(rawRuntime).toString()) as GeographicDataset;
  const nav=gunzipSync(fs.readFileSync(new URL("navigation.v2.bin.gz",assets)));
  const rules=JSON.parse(gunzipSync(fs.readFileSync(
    new URL("road-rules.v1.json.gz",assets))).toString()) as GeographicRoadRules;
  const network=new GeographicNetwork(
    metadata,
    nav.buffer.slice(nav.byteOffset,nav.byteOffset+nav.byteLength),
    rules,
  );
  compiled=compileControlPack(source,runtime,network);
}
fs.writeFileSync(
  new URL("traffic-controls.v1.json.gz",assets),
  gzipSync(JSON.stringify(compiled),{level:9,mtime:0}),
);
console.log({
  source:compiled.source,status:compiled.status,
  controls:compiled.signs.length,stats:compiled.stats,
  sourceHash:compiled.roadSourceSha256,
});
