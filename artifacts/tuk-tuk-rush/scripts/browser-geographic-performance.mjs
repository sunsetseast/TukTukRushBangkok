/** Browser-only smoke test for the opt-in iPhone performance UI.
 * Chromium software WebGL is NOT evidence of physical iPhone performance. */
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";

const out = new URL("../../../docs/qa/geographic-mobile-performance/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
const server = await startQaServer(24816);
let browser;
const report = { browser: "", environment: "Headless Chromium software WebGL; NOT physical iPhone/Safari",
  checks: [], samples: {}, errors: [] };
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  report.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });
  page.on("pageerror", error => report.errors.push(error.message));
  await page.goto("http://127.0.0.1:24816/?world=geographic&geoPerf=1");
  await page.waitForFunction(() =>
    window.__geography?.stream?.settled && window.__geography.stream.active >= 9,
    undefined, { timeout: 120000 },
  );
  const monitor = page.getByTestId("geographic-performance");
  await monitor.waitFor({ timeout: 30000 });
  await page.waitForFunction(() =>
    Number(document.querySelector('[data-testid="geographic-performance"]')?.getAttribute("data-samples") ?? 0) > 3,
    undefined, { timeout: 30000 },
  );
  report.checks.push("query-option-enables-profiler");
  await page.getByTestId("button-free-roam").click();
  await page.waitForFunction(() => window.__geography?.snapshot?.phase === "playing", undefined, {timeout:60000});
  await page.waitForTimeout(1500);
  report.samples = await page.evaluate(() => ({
    samples: Number(document.querySelector('[data-testid="geographic-performance"]')?.getAttribute("data-samples")),
    contents: document.querySelector('[data-testid="geographic-performance"]')?.textContent,
    chunks: window.__geography.stream.active,
    buildings: window.__geography.buildings,
  }));
  assert(report.samples.samples >= 4, "Profiler must use actual frames");
  assert(report.samples.chunks >= 1);
  assert(report.samples.buildings > 0);
  await page.screenshot({ path: new URL("overlay-software-webgl.png", out).pathname });
  await page.getByLabel("Close performance monitor").click();
  assert.equal(await monitor.count(), 0);
  await page.getByTestId("geographic-performance-toggle").click();
  await monitor.waitFor();
  report.checks.push("touch-control-close-and-reopen");
  assert.deepEqual(report.errors, []);
  fs.writeFileSync(new URL("browser-report.json", out), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
