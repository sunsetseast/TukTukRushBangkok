/** Regress Safari/WebKit's .gz Content-Encoding ambiguity using actual
 * Vite-served geography. This tests transport + decompression, not 3D FPS.
 * Physical iOS Safari validation is still required. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { webkit } from "playwright";
import { startQaServer } from "./browser-vite.mjs";

const output = new URL("../../../docs/qa/geographic-mobile-performance/", import.meta.url);
fs.mkdirSync(output, { recursive: true });
const server = await startQaServer(24817);
let browser;
try {
  browser = await webkit.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:24817/assets/geography/transport-check.html");
  const report = await page.evaluate(async () => {
    const names = [
      "gameplay.v2.json.pack", "navigation.v2.bin.pack",
      "road-rules.v1.json.pack", "compiled/3072_0.bin.pack",
    ];
    const files = [];
    for (const name of names) {
      const res = await fetch("/assets/geography/" + name);
      if (!res.ok) throw Error(name + ": HTTP " + res.status);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const gz = bytes[0] === 0x1f && bytes[1] === 0x8b;
      let unpacked = bytes.buffer;
      if (gz) unpacked = await new Response(
        new Blob([unpacked]).stream().pipeThrough(new DecompressionStream("gzip")),
      ).arrayBuffer();
      if (name === "gameplay.v2.json.pack") {
        const data = JSON.parse(new TextDecoder().decode(unpacked));
        if (data.schema !== 2 || data.ways.length < 1000) throw Error("Invalid gameplay source");
      } else if (name === "road-rules.v1.json.pack") {
        const data = JSON.parse(new TextDecoder().decode(unpacked));
        if (data.schema !== 1 || data.directed.length < 10) throw Error("Invalid rules source");
      } else if (name === "navigation.v2.bin.pack") {
        if (new DataView(unpacked).getUint32(0, true) !== 0x47454f32) throw Error("Invalid navigation");
      } else if (name.includes("/")) {
        if (new DataView(unpacked).getUint32(0, true) !== 0x34424754) throw Error("Invalid chunk");
      }
      files.push({
        name, ok: true, gzipMagic: gz, headerEncoding: res.headers.get("content-encoding"),
        decodedBytes: unpacked.byteLength,
      });
    }
    return { files, userAgent: navigator.userAgent };
  });
  assert.equal(report.files.length, 4);
  assert(report.files.every((v) => v.decodedBytes > 100));
  fs.writeFileSync(new URL("webkit-gzip-report.json", output), JSON.stringify(report, null, 2) + "\n");
  console.log(report);
} finally {
  await browser?.close();
  server.kill();
}
