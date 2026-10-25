import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = new URL("../../../docs/qa/expanded-geography/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
const server = await startQaServer(24801);
let browser;
const report = {
  physicalIPhone: false,
  environment:
    "Headless Chromium / ANGLE SwiftShader, Linux container; no physical Safari benchmark",
  errors: [],
  checks: {},
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
    }),
    requests = [];
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));
  const started = performance.now();
  await page.goto("http://127.0.0.1:24801/?world=geographic&geographyQA");
  await page.waitForFunction(
    () =>
      window.__geography?.stream.settled &&
      window.__geography.stream.active >= 9,
    undefined,
    { timeout: 120000 },
  );
  report.firstResidentFrameMs = performance.now() - started;
  console.log("Geographic first frame", report.firstResidentFrameMs);
  report.initial = await page.evaluate(() => window.__geography);
  assert(report.initial.stream.active <= 25);
  assert(report.initial.stream.requests < 25);
  assert(report.initial.stream.total > 400);
  await page.keyboard.down("ArrowUp");
  await page.waitForFunction(
    (x) =>
      Math.hypot(
        window.__geography.position.x - x.x,
        window.__geography.position.z - x.z,
      ) > 12,
    report.initial.position,
    { timeout: 20000 },
  );
  await page.keyboard.up("ArrowUp");
  report.checks.keyboardDriving = true;
  report.frames = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const a = [];
        let last = performance.now();
        function tick(now) {
          a.push(now - last);
          last = now;
          if (a.length < 60) requestAnimationFrame(tick);
          else {
            a.sort((x, y) => x - y);
            resolve({ medianMs: a[30], p95Ms: a[57], samples: 60 });
          }
        }
        requestAnimationFrame(tick);
      }),
  );
  await page.getByRole("button", { name: "Overhead", exact: true }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: new URL("city-network.png", out).pathname });
  report.overview = await page.evaluate(() => window.__geography);
  assert.equal(
    report.overview.stream.requests,
    report.initial.stream.requests,
    "Overview does not load full-world chunks",
  );
  await page.getByRole("button", { name: "Drive view", exact: true }).click();
  // Explicit source coordinate inspections: the same player/session/vehicle survives every relocation.
  await page.evaluate(() => window.__geographyQA.move(100.5537913, 13.8025991));
  await page.waitForFunction(
    () =>
      window.__geography.stream.settled &&
      window.__geography.stream.disposed >= 9,
    undefined,
    { timeout: 60000 },
  );
  report.north = await page.evaluate(() => window.__geography);
  assert(
    report.initial.stream.ids.every(
      (id) => !report.north.stream.ids.includes(id),
    ),
  );
  assert(report.north.stream.active <= 25);
  report.checks.northernActivationAndSouthernDisposal = true;
  await page.evaluate(() =>
    window.__geographyQA.move(100.5214619, 13.7192683, Math.PI / 2),
  );
  await page.waitForFunction(
    () =>
      window.__geography.stream.settled &&
      window.__geography.coordinate.lat < 13.73,
    undefined,
    { timeout: 60000 },
  );
  report.elevatedClearance = await page.evaluate(() => window.__geography);
  const closeup = await page.evaluate(() => window.__geographyQA.closeup());
  fs.writeFileSync(
    new URL("dense-streets.png", out),
    Buffer.from(closeup.split(",")[1], "base64"),
  );

  await page.screenshot({
    path: new URL("streamed-driving.png", out).pathname,
  });
  await page.setViewportSize({ width: 430, height: 932 });
  await page.getByRole("button", { name: "Source map", exact: true }).click();
  await page.getByTestId("geographic-map").waitFor();
  report.checks.mobileDebugMap = true;
  await page.getByRole("button", { name: "Source map", exact: true }).click();
  // Default route does not request any new geographic assets.
  console.log("Geographic checks passed; checking default game");
  requests.length = 0;
  await page.goto("http://127.0.0.1:24801/");
  await page.getByTestId("button-free-roam").waitFor({ timeout: 90000 });
  await page.waitForFunction(
    () => window.__graphics?.stats?.calls > 0,
    undefined,
    { timeout: 90000 },
  );
  report.checks.default = await page.evaluate(() => ({
    worldId: window.__graphics.engine.model.district.worldId,
    roads: window.__graphics.engine.model.district.roads.length,
    traffic: window.__graphics.engine.model.traffic.length,
  }));
  assert.equal(report.checks.default.worldId, "bangkok");
  assert(!requests.some((u) => u.includes("assets/geography")));
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
