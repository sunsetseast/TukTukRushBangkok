/** Verify the actual Vite/Replit HTTP-200-index.html failure path under WebKit.
 * Only tests asset transport; no WebGL and no Replit Agent/runtime access.
 */
import assert from "node:assert/strict";
import { webkit } from "playwright";
import { startQaServer } from "./browser-vite.mjs";

const server = await startQaServer(24819);
let browser;
try {
  browser = await webkit.launch({headless: true});
  const page = await browser.newPage();
  const requests = [];
  page.on("request", r => {
    if (r.url().includes("road-rules.v1.json.")) requests.push(new URL(r.url()).pathname);
  });
  await page.route("**/assets/geography/road-rules.v1.json.pack", async route => {
    // Reproduce the verified Replit response: 200 OK + text/html SPA fallback.
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!DOCTYPE html><html><body>Replit app shell, not Bangkok JSON</body></html>",
    });
  });
  await page.goto("http://127.0.0.1:24819/assets/geography/transport-check.html");
  const rules = await page.evaluate(async () => {
    const { fetchGeographicJson } =
      await import("/src/game/bangkok/geographic/packedAsset.ts");
    const data = await fetchGeographicJson(
      "/assets/geography/road-rules.v1.json.pack",
    );
    return {
      schema: data.schema,
      wayCount: data.wayCount,
      directed: data.directed.length,
    };
  });
  assert.equal(rules.schema, 1);
  assert(rules.wayCount > 1000);
  assert(rules.directed > 0);
  assert.deepEqual(requests, [
    "/assets/geography/road-rules.v1.json.pack",
    "/assets/geography/road-rules.v1.json.gz",
  ]);
  console.log({ pass: true, browser: browser.version(), rules,
    recoveredFromReplitHtml200: true, requests });
} finally {
  await browser?.close();
  server.kill();
}
