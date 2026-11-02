import assert from "node:assert/strict";
import fs from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { unpackGeographicBytes } from "../src/game/bangkok/geographic/packedAsset";
import { compiledChunkFile } from "../src/game/bangkok/geographic/compiledBuildings";

const root = new URL("../public/assets/geography/", import.meta.url);
for (const name of ["gameplay.v2.json", "navigation.v2.bin", "road-rules.v1.json", "runtime.v1.json"]) {
  const source = fs.readFileSync(new URL(name + ".gz", root));
  const alias = fs.readFileSync(new URL(name + ".pack", root));
  assert.deepEqual(alias, source, "Browser asset is an exact copy of the pinned gzip source: " + name);
  const unpacked = await unpackGeographicBytes(alias.buffer.slice(alias.byteOffset, alias.byteOffset + alias.length), name);
  assert.deepEqual(Buffer.from(unpacked), gunzipSync(source));
  const alreadyDecoded = await unpackGeographicBytes(unpacked, name);
  assert.strictEqual(alreadyDecoded, unpacked, "Never decompress content twice when a proxy already decoded");
}
for (const input of [
  Buffer.from(JSON.stringify({ content: "valid JSON without Content-Encoding" })),
  Buffer.from([0x54, 0x47, 0x42, 0x34, 0, 0, 0, 0]),
]) {
  const copy = input.buffer.slice(input.byteOffset, input.byteOffset + input.length);
  assert.strictEqual(await unpackGeographicBytes(copy, "already-decoded"), copy);
}
await assert.rejects(
  unpackGeographicBytes(new ArrayBuffer(0), "empty"), /Empty Bangkok map asset/,
);
const malformed = new Uint8Array([0x1f, 0x8b, 1, 2, 3]);
await assert.rejects(
  unpackGeographicBytes(malformed.buffer, "broken"), /Invalid gzip-compressed/,
);
assert(compiledChunkFile({ id: "123:456" } as any).endsWith(".bin.pack"));
assert(!compiledChunkFile({ id: "123:456" } as any).endsWith(".gz"));
const packed = gzipSync("sample Bangkok asset");
const once = await unpackGeographicBytes(packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength), "fixture");
assert.equal(Buffer.from(once).toString(), "sample Bangkok asset");
console.log({ pass: true, exactGzipSources: 4, alreadyDecoded: true, corruptedGzipRejected: true });
