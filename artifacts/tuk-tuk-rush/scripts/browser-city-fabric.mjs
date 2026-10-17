import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = path.resolve(
  process.env.QA_OUT || "../../docs/qa/city-fabric/browser",
);
await fs.mkdir(out, { recursive: true });
const server = await startQaServer(24281);
let browser;
const report = { physicalIPhone: false, checks: [], viewports: [], errors: [] };
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const p = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  p.setDefaultTimeout(120000);
  p.on("pageerror", (e) => report.errors.push(e.message));
  await p.goto("http://127.0.0.1:24281");
  await p.waitForFunction(() => window.__graphics?.frameId > 2);
  await p.getByTestId("button-start-shift").click();
  assert.equal(
    await p.evaluate(() => window.__graphics.engine.model.snapshot.mode),
    "shift",
  );
  await p.getByTestId("button-open-map").click();
  await p.getByTestId("world-map").waitFor();
  const discovery = await p.evaluate(() =>
    JSON.stringify([
      window.__graphics.engine.model.snapshot.discoveredDistricts,
      window.__graphics.engine.model.snapshot.discoveredLandmarks,
    ]),
  );
  for (const id of ["hotel:siam", "pier:icon"]) {
    const marker = p.getByTestId(`map-place-${id}`);
    await marker.focus();
    await p.keyboard.press("Enter");
    await p.getByTestId("map-place-detail").waitFor();
    assert(
      (await p.getByTestId("map-place-detail").innerText()).includes(
        id.startsWith("hotel") ? "Siam city hotel" : "ICONSIAM pier",
      ),
    );
    await p
      .getByRole("button", { name: "Close place details", exact: true })
      .click();
  }
  report.checks.push(
    "Real hotel/pier markers support keyboard selection, focused details and close",
  );
  const svg = p.locator(".tt-world-map-body > svg");
  await svg.focus();
  const before = await svg.getAttribute("viewBox");
  await p.keyboard.press("ArrowRight");
  await p.waitForFunction(
    (before) =>
      document
        .querySelector(".tt-world-map-body > svg")
        .getAttribute("viewBox") !== before,
    before,
  );
  await p.getByTestId("button-map-recenter").click();
  await p.getByTestId("button-landmark-layer").click();
  assert.equal(
    await p.locator('[data-testid^="map-place-"][role="button"]').count(),
    0,
  );
  assert(await p.getByTestId("map-route").count());
  await p.getByTestId("button-landmark-layer").click();
  await p.getByTestId("button-transit-layer").click();
  assert.equal(await p.getByTestId("map-rail-sukhumvit").count(), 0);
  await p.getByTestId("button-transit-layer").click();
  report.checks.push(
    "Pan/recenter and optional place/BTS filters preserve fare guidance",
  );
  for (const [width, height] of [
    [375, 812],
    [430, 932],
    [844, 390],
    [1280, 800],
  ]) {
    await p.setViewportSize({ width, height });
    await p.waitForFunction(
      () =>
        document
          .querySelector(".tt-world-map-body>svg")
          ?.getBoundingClientRect().width > 0,
    );
    const r = await p.evaluate(() => {
      const map = document
        .querySelector('[data-testid="world-map"]')
        .getBoundingClientRect();
      return {
        width: innerWidth,
        height: innerHeight,
        scroll: document.documentElement.scrollHeight > innerHeight + 1,
        clipped:
          map.left < -0.5 ||
          map.top < -0.5 ||
          map.right > innerWidth + 0.5 ||
          map.bottom > innerHeight + 0.5,
        targets: [...document.querySelectorAll(".tt-world-map button")]
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => ({
            name: e.getAttribute("aria-label") || e.textContent.trim(),
            w: e.getBoundingClientRect().width,
            h: e.getBoundingClientRect().height,
          })),
      };
    });
    assert(!r.scroll && !r.clipped);
    assert(r.targets.every((t) => t.w >= 43.5 && t.h >= 43.5));
    report.viewports.push(r);
  }
  assert.equal(
    await p.evaluate(() =>
      JSON.stringify([
        window.__graphics.engine.model.snapshot.discoveredDistricts,
        window.__graphics.engine.model.snapshot.discoveredLandmarks,
      ]),
    ),
    discovery,
    "Browsing public places cannot award discoveries",
  );
  await p.getByTestId("button-close-map").click();
  assert.equal(
    await p.evaluate(() => window.__graphics.engine.model.snapshot.phase),
    "playing",
  );
  report.checks.push(
    "Four viewport map layouts, 44px targets, unchanged discoveries, correct simulation return",
  );
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report));
} finally {
  await fs.writeFile(`${out}/checks.json`, JSON.stringify(report, null, 2));
  await browser?.close();
  server.kill();
}
