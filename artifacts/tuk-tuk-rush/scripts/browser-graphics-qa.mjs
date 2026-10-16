import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = "../../docs/graphics/living-bangkok/after",
  server = await startQaServer(24246);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const report = {
  physicalIPhone: false,
  errors: [],
  checks: [],
  viewports: [],
  stills: [],
};
try {
  const p = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  p.setDefaultTimeout(90000);
  p.on("pageerror", (e) => report.errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") report.errors.push(m.text());
  });
  await p.goto("http://127.0.0.1:24246");
  await p.waitForFunction(() => window.__graphics);
  await p.getByTestId("button-free-roam").click();
  const cdp = await p.context().newCDPSession(p),
    gas = await p.getByTestId("button-gas").boundingBox(),
    steer = await p.getByTestId("control-steer").boundingBox(),
    go = { id: 1, x: gas.x + gas.width / 2, y: gas.y + gas.height / 2 },
    thumb = {
      id: 2,
      x: steer.x + steer.width / 2,
      y: steer.y + steer.height / 2,
    };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [go, thumb],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [go, { ...thumb, x: thumb.x + 30 }],
  });
  await p.waitForFunction(
    () =>
      window.__graphics.engine.model.input.gas &&
      Math.abs(window.__graphics.engine.model.input.steer) > 0.15,
  );
  report.checks.push("Simultaneous native touch steering and throttle");
  await p.evaluate(() =>
    document.querySelector('[data-testid="button-open-map"]').click(),
  );
  await p.getByTestId("world-map").waitFor();
  assert.equal(
    await p.evaluate(() => window.__graphics.engine.model.input.gas),
    false,
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await p.waitForTimeout(1000);
  const idle = await p.evaluate(() => window.__graphics.frameId);
  await p.waitForTimeout(1500);
  report.mapIdleFrames =
    (await p.evaluate(() => window.__graphics.frameId)) - idle;
  assert(report.mapIdleFrames <= 1);
  const shot = async (name) => {
    await p.screenshot({
      path: `${out}/${name}.jpg`,
      type: "jpeg",
      quality: 84,
      timeout: 90000,
    });
    report.stills.push(name);
    assert.deepEqual(report.errors, []);
  };
  for (const [width, height] of [
    [375, 812],
    [430, 932],
    [844, 390],
    [932, 430],
    [1280, 800],
  ]) {
    await p.setViewportSize({ width, height });
    await p.waitForTimeout(150);
    assert(await p.getByTestId("button-close-map").isVisible());
    const r = await p.getByTestId("button-close-map").boundingBox();
    assert(r.x >= 0 && r.x + r.width <= width);
    report.viewports.push([width, height]);
    if (height > width) await shot(`map-${width}x${height}`);
  }
  // A marker is a tap target and a valid starting point for a map drag.
  await p.setViewportSize({ width: 844, height: 390 });
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.model.snapshot.discoveredDistricts = e.model.district.regions.map(
      (r) => r.id,
    );
    e.model.snapshot.discoveredLandmarks = e.model.district.landmarks.map(
      (l) => l.id,
    );
    e.publish();
  });
  await p.getByTestId("button-whole-city").click();
  await p.waitForFunction(
    () =>
      Number(
        document
          .querySelector(".tt-world-map-body>svg")
          .getAttribute("viewBox")
          .split(" ")[3],
      ) >= 1249,
  );
  const svg = p.locator(".tt-world-map-body>svg");
  const visiblePin = async () => {
    const pins = await p
      .locator('[data-testid^="map-landmark-"]')
      .evaluateAll((els) =>
        els
          .map((el) => {
            const point = new DOMPoint(0, 0).matrixTransform(el.getScreenCTM()),
              x = point.x,
              y = point.y;
            return {
              id: el.getAttribute("data-testid"),
              x,
              y,
              clear:
                x > 120 &&
                x < 740 &&
                y > 110 &&
                y < 290 &&
                document.elementFromPoint(x, y)?.closest(".tt-map-pin") === el,
            };
          })
          .filter((p) => p.clear),
      );
    assert(
      pins.length,
      "At least one discovered, unobscured landmark is available",
    );
    return pins[0];
  };
  const pin = await visiblePin(),
    v = await svg.getAttribute("viewBox");
  const finger = { id: 3, x: pin.x, y: pin.y };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [finger],
  });
  for (const dx of [10, 20, 30, 40]) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...finger, x: finger.x + dx }],
    });
    await p.waitForTimeout(30);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const moved = await svg.getAttribute("viewBox");
  assert.notEqual(moved, v);
  const pixelDelta = await svg.evaluate(
    (el, previous) =>
      (Number(el.getAttribute("viewBox").split(" ")[0]) -
        Number(previous.split(" ")[0])) *
      el.getScreenCTM().a,
    v,
  );
  assert(
    pixelDelta < -35 && pixelDelta > -45,
    "Capture transfer must preserve the complete 40px drag",
  );
  assert.equal(
    await p.getByTestId("map-detail").count(),
    0,
    "Dragging must not select a landmark",
  );
  const tap = await visiblePin();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 4, x: tap.x, y: tap.y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await p.waitForTimeout(500);

  await p.getByTestId("map-detail").waitFor({ timeout: 10000 });
  report.checks.push(
    "Native touch drag starting on marker pans without selection; subsequent tap selects",
  );
  await p.getByTestId("button-close-map").click();
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.resume();
    e.model.snapshot.elapsed = 300;
    e.model.snapshot.message = "";
    e.messageTime = 0;
    e.publish();
  });
  for (const [width, height] of [
    [844, 390],
    [932, 430],
    [1280, 800],
  ]) {
    await p.setViewportSize({ width, height });
    const f = await p.evaluate(() => window.__graphics.frameId);
    await p.waitForFunction((f) => window.__graphics.frameId > f + 3, f);
    await shot(`night-drive-${width}x${height}`);
  }
  await p.setViewportSize({ width: 844, height: 390 });
  for (const id of ["arun", "pho", "paknam"]) {
    assert(
      await p.evaluate((id) => {
        const e = window.__graphics.engine,
          d = e.model.district,
          a = d.destinations.find((a) => a.landmarkId === id),
          n = d.nodes.find((n) => n.id === a.arrivalNode);
        e.resume();
        e.setQuality("medium");
        Object.assign(e.model.player, {
          x: n.x,
          z: n.z,
          speed: 0,
          collision: 0,
        });
        e.model.snapshot.elapsed = 145;
        return e.viewLandmark(id);
      }, id),
    );
    const f = await p.evaluate(() => window.__graphics.frameId);
    await p.waitForFunction((f) => window.__graphics.frameId > f + 8, f);
    const lod = await p.evaluate((id) => {
      const g = window.__graphics.scene.getObjectByName(
        `BangkokLandmark:${id}`,
      );
      return g.isLOD
        ? { automatic: g.autoUpdate, near: g.levels[0].object.visible }
        : null;
    }, id);
    if (lod) assert(!lod.automatic && lod.near);
    await shot(`look-${id}`);
    const views = p.locator(".tt-inspection nav button");
    if ((await views.count()) > 1) {
      await views.nth(1).click();
      const f = await p.evaluate(() => window.__graphics.frameId);
      await p.waitForFunction((f) => window.__graphics.frameId > f + 5, f);
      await shot(`look-${id}-second-view`);
    }
    await p.getByTestId("inspection-return").click();
  }
  report.checks.push(
    "Map clears held input and suspends rendering",
    "Five responsive viewports",
    "LOOK high-detail lock and alternate views",
  );
  assert.deepEqual(report.errors, []);
  await fs.writeFile(
    "../../docs/graphics/living-bangkok/validation/graphics-browser.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
  server.kill();
}
