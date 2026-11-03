/** Canonical source proof after migration from tracked .bin.gz to generated
 * .bin.pack. This prevents weakening the geography gate when excluding
 * intentionally retired legacy compiled files from git diff.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { compiledChunkFile } from "../src/game/bangkok/geographic/compiledBuildings";
import type { GeographicDataset } from "../src/game/bangkok/geographic/dataset";
const assets = new URL("../public/assets/geography/", import.meta.url);
const source = JSON.parse(gunzipSync(fs.readFileSync(
  new URL("runtime.v1.json.gz",assets))).toString()) as GeographicDataset;
const report = JSON.parse(fs.readFileSync(new URL("compiled/report.json",assets),"utf8"));
assert.equal(report.schema,4,"Unsupported compiled geometry report schema");
assert.equal(report.chunks.length,source.chunks.length,
  "Every real Bangkok source chunk must have a compiled output");
const entries = new Map<string,any>(report.chunks.map((entry:any)=>[entry.id,entry]));
let total = 0;
for (const ref of source.chunks) {
  const item=entries.get(ref.id);
  assert(item, "No compiled geometry report for source chunk "+ref.id);
  assert.equal(item.source,ref.sha256,"Stale source hash for chunk "+ref.id);
  const name=compiledChunkFile(ref);
  assert(name.endsWith(".bin.pack")&&!name.endsWith(".bin.gz"));
  const buffer=fs.readFileSync(new URL(name,assets));
  assert(buffer.length>=32,"Missing compiled geometry bytes: "+name);
  assert.equal(createHash("sha256").update(buffer).digest("hex"),item.sha256,
    "Compiled bytes do not match the compiler's audited checksum: "+name);
  assert.equal(buffer.subarray(0,2).toString("hex"),"1f8b",
    "Compiled geometry must remain gzip-compressed: "+name);
  const raw=gunzipSync(buffer);
  assert.equal(raw.readUInt32LE(0),0x34424754,"Invalid packed geometry header: "+name);
  assert.equal(raw.byteLength,item.decodedBytes,
    "Incorrect compiled geometry body length: "+name);
  total += item.buildings;
}
assert.equal(total,source.chunks.reduce((n,c)=>n + (c as any).buildingCount,0) || total,
  "Compiled building total must agree with source metadata when available");
console.log({pass:true,sourceChunks:source.chunks.length,compiledChunks:report.chunks.length,buildings:total});
