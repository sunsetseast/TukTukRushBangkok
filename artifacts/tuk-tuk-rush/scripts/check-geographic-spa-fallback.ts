/** Reproduce the exact iPhone failure: a missing .pack request returns
 * Replit/Vite index.html with HTTP 200, not an ordinary 404.
 */
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import {
  fetchGeographicBytes,
  fetchGeographicJson,
  fetchGeographicPayload,
} from "../src/game/bangkok/geographic/packedAsset";

const original = globalThis.fetch;
const gz = (content: string) => new Uint8Array(gzipSync(content)).slice().buffer;
const text = (content: string, contentType = "application/octet-stream") =>
  new Response(content, { status: 200, headers: { "content-type": contentType } });
const bytes = (data: ArrayBuffer, headers: Record<string, string> = {}) =>
  new Response(data, { status: 200, headers: { "content-type": "application/octet-stream", ...headers } });
const html = "<!DOCTYPE html><html><head><title>Bangkok</title></head><body>SPA</body></html>";
const url = "/assets/geography/road-rules.v1.json.pack";
const expected = { schema: 1, wayCount: 2, directed: [[0, 1]] };
const source = gz(JSON.stringify(expected));
let requests: string[] = [];
const mock = (fn: (url: string) => Response | Promise<Response>) => {
  requests = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const path = String(input);
    requests.push(path);
    return await fn(path);
  }) as typeof fetch;
};
try {
  // Replit/Vite: missing alias -> 200 text/html, original gzip is intact.
  mock((path) => path === url ? text(html, "text/html") :
    path.endsWith(".json.gz") ? bytes(source) : new Response("", { status: 404 }));
  assert.deepEqual(await fetchGeographicJson(url), expected);
  assert.deepEqual(requests, [url, "/assets/geography/road-rules.v1.json.gz"]);

  // Some proxies lie about type. Recognize the HTML body as well as header.
  mock((path) => path.endsWith(".pack") ? text(html) : bytes(source));
  assert.deepEqual(await fetchGeographicJson(url), expected);
  assert.equal(requests.length, 2);

  // A stale/malformed generated JSON must not mask a healthy source file.
  mock((path) => path.endsWith(".pack") ? text("{bad JSON") : bytes(source));
  assert.deepEqual(await fetchGeographicJson(url), expected);
  assert.equal(requests.length, 2);

  // Valid generated alias: no extra request, same actual content.
  mock(() => bytes(source));
  assert.deepEqual(await fetchGeographicJson(url), expected);
  assert.deepEqual(requests, [url]);

  // Transparent HTTP decompression (bytes already JSON, header still gzip).
  mock(() => text(JSON.stringify(expected), "application/json"));
  assert.deepEqual(await fetchGeographicJson(url), expected);
  assert.deepEqual(requests, [url]);

  // The real old workflow can generate a .bin.gz chunk, not .bin.pack.
  const chunkUrl = "/assets/geography/compiled/1024_2048.bin.pack";
  const binary = new Uint8Array([0x54, 0x47, 0x42, 0x34, 1, 2, 3, 4]).buffer;
  mock((path) => path.endsWith(".pack") ? text(html, "text/html") : bytes(gz(String.fromCharCode(...new Uint8Array(binary)))));
  const got = await fetchGeographicBytes(chunkUrl);
  // The original byte-gzipped compiled geometry starts with a binary codec header;
  // mock a genuine gzip stream to prove the extension fallback is not JSON-only.
  assert.equal(new TextDecoder().decode(got), String.fromCharCode(...new Uint8Array(binary)));
  assert.deepEqual(requests, [chunkUrl, "/assets/geography/compiled/1024_2048.bin.gz"]);

  // Even after correct transport, source-specific decoding errors must be
  // explicit and never silently substitute zeros or an empty city.
  mock(() => text(html, "text/html"));
  await assert.rejects(
    fetchGeographicJson(url),
    /generated alias and original source both failed.*\.pack.*\.gz/s,
  );
  assert.equal(requests.length, 2);

  mock(() => bytes(source));
  await assert.rejects(
    fetchGeographicPayload(url, () => { throw Error("invalid schema"); }),
    /original source both failed.*invalid schema.*invalid schema/s,
  );
  assert.equal(requests.length, 2);

  // Aborted requests should not issue a second fetch.
  const controller = new AbortController();
  controller.abort();
  mock(() => { throw new DOMException("Aborted", "AbortError"); });
  await assert.rejects(fetchGeographicJson(url, controller.signal), /Abort/);
  assert.equal(requests.length, 1);
  console.log({ ok: true, replitHtml200Fallback: true, invalidJsonFallback: true,
    originalGzip: true, legacyBuildingChunk: true, noSilentMissingRules: true, abortSafe: true });
} finally {
  globalThis.fetch = original;
}
