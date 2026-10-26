import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = new URL("../../../docs/qa/geographic-gameplay/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
const server = await startQaServer(24813);
let browser;
const report = {
  physicalIPhone: false,
  environment:
    "Headless Chromium / ANGLE SwiftShader, Linux; browser emulation is not physical iPhone/Safari certification",
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
  report.browserVersion = browser.version();
  const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    }),
    requests = [];
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));
  const started = performance.now();
  await page.goto("http://127.0.0.1:24813/?world=geographic&geographyQA");
  await page.waitForFunction(
    () =>
      window.__geography?.stream.settled &&
      window.__geography.stream.active >= 9,
    { timeout: 120000 },
  );
  report.firstResidentFrameMs = performance.now() - started;
  report.initial = await page.evaluate(() => window.__geography);
  assert(report.initial.stream.active <= 25);
  assert(
    !requests.some((u) => u.includes("runtime.v1")),
    "Production preview never decodes full reference dataset",
  );
  await page.getByTestId("button-free-roam").click();
  await page.waitForFunction(
    () => window.__geography.snapshot.stage === "delivery",
    { timeout: 15000 },
  );
  await page.evaluate(() => {
    const { session, places } = window.__geographyQA,
      p = session.player,
      l = places[0].landmark;
    p.heading = Math.atan2(l.x - p.x, l.z - p.z);
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: new URL("migrated-landmarks.png", out).pathname,
  });
  await page.getByTestId("button-view-landmark").click();
  await page.waitForFunction(
    () => !!window.__geography.snapshot.viewingLandmark,
  );
  report.checks.productionLandmarkLook = true;
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => window.__geography.snapshot.phase === "playing",
  );
  await page.evaluate(() => {
    const { session, network } = window.__geographyQA;
    session.player.heading = network.nearest(session.player).heading;
  });
  // Select a real destination; road-route distance remains global while only 9 chunks are visible.
  const destination = await page.evaluate(
    () => window.__geographyQA.network.stops[2].id,
  );
  await page.getByLabel("Geographic destination").selectOption(destination);
  const before = await page.evaluate(() => window.__geography.position);
  await page.keyboard.down("ArrowUp");
  await page.waitForFunction(
    (p) =>
      Math.hypot(
        window.__geography.position.x - p.x,
        window.__geography.position.z - p.z,
      ) > 12,
    before,
    { timeout: 20000 },
  );
  await page.keyboard.up("ArrowUp");
  report.checks.productionKeyboardDriving = true;
  report.driving = await page.evaluate(() => window.__geography);
  await page.screenshot({
    path: new URL("active-navigation.png", out).pathname,
  });
  report.frames = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const a = [];
        let last = performance.now();
        const tick = (now) => {
          a.push(now - last);
          last = now;
          if (a.length < 60) requestAnimationFrame(tick);
          else {
            a.sort((a, b) => a - b);
            resolve({ medianMs: a[30], p95Ms: a[57], samples: 60 });
          }
        };
        requestAnimationFrame(tick);
      }),
  );
  // Same production session, source-backed inspections. These relocations test residency;
  // the separate no-teleport controller integration test certifies an actual paid trip.
  const wallet = await page.evaluate(() => window.__geography.snapshot.wallet),
    mission = await page.evaluate(() => window.__geography.snapshot.passenger);
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() =>
      window.__geographyQA.move(100.5537913, 13.8025991),
    );
    await page.waitForFunction(
      () =>
        window.__geography.stream.settled &&
        window.__geography.coordinate.lat > 13.79,
      { timeout: 60000 },
    );
    const north = await page.evaluate(() => window.__geography);
    assert(north.stream.active <= 25);
    assert(north.stream.disposed >= 9);
    await page.evaluate(() =>
      window.__geographyQA.move(100.5214619, 13.7192683, Math.PI / 2),
    );
    await page.waitForFunction(
      () =>
        window.__geography.stream.settled &&
        window.__geography.coordinate.lat < 13.73,
      { timeout: 60000 },
    );
  }
  report.clearance = await page.evaluate(() => window.__geography);
  assert(report.clearance.stream.active <= 25);
  assert.equal(report.clearance.snapshot.wallet, wallet);
  assert.equal(report.clearance.snapshot.passenger, mission);
  assert(
    report.clearance.geometries < report.initial.geometries + 60,
    "GPU geometry residency remains bounded",
  );
  report.checks.streamingPreservesWalletAndMission = true;
  report.checks.repeatedEvictionBounded = true;
  await page.screenshot({
    path: new URL("elevated-clearance.png", out).pathname,
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "Route map", exact: true }).click();
  await page.getByTestId("geographic-map").waitFor();
  report.checks.landscapeMap = true;
  await page.getByRole("button", { name: "Route map", exact: true }).click();
  await page.setViewportSize({ width: 430, height: 932 });
  const turbo = page.getByTestId("button-boost");
  if (await turbo.count()) {
    await turbo.click();
    await page.waitForFunction(
      () => window.__geography.snapshot.boostState === "active",
    );
    report.checks.mobileBoost = true;
  }
  report.checks.mobileControls = await page.locator(".tt-controls").isVisible();
  requests.length = 0;
  await page.goto("http://127.0.0.1:24813/");
  await page.getByTestId("button-free-roam").waitFor({ timeout: 90000 });
  await page.getByTestId("button-geographic-preview").waitFor();
  await page.waitForFunction(
    () => window.__graphics?.stats?.calls > 0,
    undefined,
    { timeout: 90000 },
  );
  report.legacy = await page.evaluate(() => ({
    roads: window.__ttEngine?.model?.district?.roads.length,
    graphics: window.__graphics?.stats,
  }));
  assert(
    !requests.some((u) => u.includes("/assets/geography/")),
    "Legacy startup loads no geographic runtime",
  );
  report.checks.defaultLegacyStartup = true;
  assert.deepEqual(report.errors, []);
  fs.writeFileSync(
    new URL("browser-report.json", out),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
