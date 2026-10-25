import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = new URL("../../../docs/qa/real-scale/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
const server = await startQaServer(24801);
let browser;
const report = {
  physicalIPhone: false,
  environment: "Chromium headless WebGL2 / ANGLE SwiftShader; Linux container",
  errors: [],
  checks: {},
  startedAt: new Date().toISOString(),
};
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--single-process",
      "--in-process-gpu",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") report.errors.push(m.text());
  });
  if (!process.argv.includes("--default-only")) {
    const started = performance.now();
    await page.goto("http://127.0.0.1:24801/?world=geographic");
    await page.waitForFunction(() => window.__geography, undefined, {
      timeout: 60000,
    });
    report.firstFrameMs = performance.now() - started;
    report.initial = await page.evaluate(() => window.__geography);
    await page.keyboard.down("ArrowUp");
    await page.waitForFunction(
      (x) => window.__geography.position.x < x - 12,
      report.initial.position.x,
      { timeout: 10000 },
    );
    await page.keyboard.up("ArrowUp");
    const moved = await page.evaluate(() => window.__geography);
    report.checks.keyboardDistanceM = Math.hypot(
      moved.position.x - report.initial.position.x,
      moved.position.z - report.initial.position.z,
    );
    assert(report.checks.keyboardDistanceM > 12);
    await page.getByRole("button", { name: "Reset to Yaowarat" }).click();
    const gas = page.getByTestId("button-gas");
    const rect = await gas.boundingBox();
    assert(
      rect && rect.x > 600 && rect.y > 400,
      "Touch controls correctly anchored",
    );
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.waitForFunction(
      (x) => window.__geography.position.x < x - 5,
      report.initial.position.x,
      { timeout: 10000 },
    );
    await page.mouse.up();
    report.checks.touchPedal = true;
    // Sample the actual browser's RAF cadence once; this is software rendering, not iPhone FPS.
    report.frameMs = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const samples = [];
          let last = performance.now();
          function tick(now) {
            samples.push(now - last);
            last = now;
            if (samples.length >= 90) resolve(samples);
            else requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }),
    );
    report.frameMs.sort((a, b) => a - b);
    report.frames = {
      medianMs: report.frameMs[45],
      p95Ms: report.frameMs[85],
      samples: 90,
    };
    delete report.frameMs;
    await page.getByRole("button", { name: "Source map", exact: true }).click();
    await page.getByTestId("geographic-map").waitFor();
    report.checks.debugMap = true;
    await page.screenshot({ path: new URL("driving.png", out).pathname });
    await page.getByRole("button", { name: "Source map", exact: true }).click();
    await page.getByRole("button", { name: "Overhead", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector("button")?.textContent === "Drive view" ||
        [...document.querySelectorAll("button")].some(
          (b) => b.textContent === "Drive view",
        ),
    );
    await page
      .locator("canvas")
      .screenshot({ path: "/tmp/bangkok-overhead-webgl.png" });
    report.render = await page.evaluate(() => window.__geography);
  } else
    Object.assign(
      report,
      JSON.parse(fs.readFileSync(new URL("browser-checks.json", out), "utf8")),
    );
  // Default route must not fetch any geographic dataset and must still initialize production engine/art.
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("http://127.0.0.1:24801/");
  await page.getByTestId("button-free-roam").waitFor({ timeout: 60000 });
  await page.waitForFunction(
    () => window.__graphics?.stats?.calls > 0,
    undefined,
    { timeout: 60000 },
  );
  report.checks.defaultWorld = await page.evaluate(() => ({
    worldId: window.__graphics.engine.model.district.worldId,
    roads: window.__graphics.engine.model.district.roads.length,
    traffic: window.__graphics.engine.model.traffic.length,
  }));
  assert.equal(report.checks.defaultWorld.worldId, "bangkok");
  assert(!requests.some((url) => url.includes("assets/geography")));
  report.checks.defaultStartup = true;
  report.checks.defaultGeographicRequests = 0;
  assert.equal(report.errors.length, 0, report.errors.join("\n"));
  report.pass = true;
} finally {
  await browser?.close();
  server.kill();
  fs.writeFileSync(
    new URL("browser-checks.json", out),
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(JSON.stringify(report, null, 2));
