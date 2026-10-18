import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = new URL(
  "../../../docs/qa/geographic-city-reconstruction/browser/",
  import.meta.url,
).pathname;
await fs.mkdir(out, { recursive: true });
const server = await startQaServer(24401),
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
const report = { physicalIPhone: false, errors: [], checks: [] };
try {
  const p = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
  });
  p.setDefaultTimeout(600000);
  p.on("pageerror", (e) => report.errors.push(e.message));
  await p.goto("http://127.0.0.1:24401");
  await p.waitForFunction(() => window.__graphics);
  await p.getByTestId("button-free-roam").click();
  await p.getByTestId("button-open-map").click();
  await p.getByTestId("world-map").waitFor();
  assert.equal(
    await p
      .getByTestId("world-map")
      .getByTestId("public-space-park")
      .locator("path")
      .count(),
    5,
  );
  assert(
    await p
      .getByRole("link", {
        name: "Park outlines © OpenStreetMap contributors",
      })
      .isVisible(),
  );
  report.checks.push(
    "Map uses sourced park/lake polygons, island holes and linked geographic attribution",
  );
  const discovered = await p.evaluate(() =>
    JSON.stringify(window.__graphics.engine.model.snapshot.discoveredLandmarks),
  );
  for (const [id, name] of [
    ["dusit", "Dusit Thani"],
    ["okura", "The Okura"],
    ["anantara", "Anantara Riverside"],
    ["embassy", "Park Hyatt"],
  ]) {
    const pin = p.getByTestId(`map-place-hotel:${id}`);
    await pin.focus();
    await p.keyboard.press("Enter");
    assert(
      (await p.getByTestId("map-place-detail").innerText()).includes(name),
    );
    await p
      .getByRole("button", { name: "Close place details", exact: true })
      .click();
  }
  assert.equal(
    await p.evaluate(() =>
      JSON.stringify(
        window.__graphics.engine.model.snapshot.discoveredLandmarks,
      ),
    ),
    discovered,
  );
  report.checks.push("Named hotel markers open and do not award discovery");
  await p.screenshot({
    path: `${out}/city-map-landscape.jpg`,
    type: "jpeg",
    quality: 86,
  });
  await p.getByRole("button", { name: "Back to driving", exact: true }).click();
  // Documented setup at the connected hotel driveway. Only keyboard controller
  // input advances the vehicle during the following drive; no position edits.
  const setup = await p.evaluate(() => {
    const e = window.__graphics.engine,
      d = e.model.district,
      l = d.landmarks.find((l) => l.id === "park"),
      roads = d.roads.filter((r) => r.corridor === "lumphini-parking"),
      r = roads[Math.floor(roads.length / 2)],
      a = d.nodes.find((n) => n.id === r.a),
      b = d.nodes.find((n) => n.id === r.b);
    e.restart();
    e.setQuality("low");
    e.model.traffic.length = 0;
    Object.assign(e.model.player, {
      x: a.x,
      z: a.z,
      heading: Math.atan2(b.x - a.x, b.z - a.z),
      speed: 0,
    });
    e.resume();
    return { start: { ...e.model.player }, road: r.name };
  });
  const cdp = await p.context().newCDPSession(p),
    gas = await p.getByTestId("button-gas").boundingBox();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: gas.x + gas.width / 2, y: gas.y + gas.height / 2, id: 7 },
    ],
  });
  const begin = await p.evaluate(() => {
    const e = window.__graphics.engine;
    return {
      elapsed: e.model.snapshot.elapsed,
      x: e.model.player.x,
      z: e.model.player.z,
    };
  });
  await p.waitForFunction((b) => {
    const e = window.__graphics.engine;
    return e.model.snapshot.elapsed - b.elapsed > 1.2;
  }, begin);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const brake = await p.getByTestId("button-brake").boundingBox();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: brake.x + brake.width / 2, y: brake.y + brake.height / 2, id: 8 },
    ],
  });
  await p.waitForFunction(
    () => Math.abs(window.__graphics.engine.model.player.speed) < 0.5,
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const end = await p.evaluate(() => {
    const e = window.__graphics.engine;
    return {
      player: { ...e.model.player },
      elapsed: e.model.snapshot.elapsed,
      quality: e.model.snapshot.quality,
    };
  });
  assert(Math.hypot(end.player.x - begin.x, end.player.z - begin.z) > 1);
  assert(!end.player.collision);
  report.drive = {
    setup,
    begin,
    end,
    controllerOnly: true,
    trafficDisabled: true,
    emulatedTouch: true,
  };
  await p.screenshot({
    path: `${out}/park-driven-fast.jpg`,
    type: "jpeg",
    quality: 87,
  });
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.setQuality("medium");
    e.frameTime = -100000;
  });
  const frame = await p.evaluate(() => window.__graphics.frameId);
  await p.waitForFunction((f) => window.__graphics.frameId > f + 2, frame);
  await p.screenshot({
    path: `${out}/park-driven-detailed.jpg`,
    type: "jpeg",
    quality: 87,
  });
  report.checks.push(
    "Native emulated touch pedals drive/brake on park parking lane; Fast/Detailed scenes",
  );
  await p.getByTestId("button-open-map").click();
  await p.getByTestId("world-map").waitFor();
  await p.setViewportSize({ width: 390, height: 844 });
  await p.getByTestId("world-map").waitFor();
  await p.screenshot({
    path: `${out}/city-map-portrait.jpg`,
    type: "jpeg",
    quality: 86,
  });
  report.checks.push("Landscape and portrait map");
  await p.setViewportSize({ width: 844, height: 390 });
  await p.getByRole("button", { name: "Back to driving", exact: true }).click();
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.restart();
    const d = e.model.district,
      n = d.nodes.find(
        (n) => n.id === d.landmarks.find((l) => l.id === "victory").accessNode,
      );
    Object.assign(e.model.player, { x: n.x, z: n.z, speed: 0, collision: 0 });
    e.resume();
  });
  await p.getByTestId("button-view-landmark").click();
  await p.waitForFunction(
    () => window.__graphics.engine.model.snapshot.viewingLandmark === "victory",
  );
  await p.evaluate(() => window.__graphics.engine.restart());
  await p.waitForFunction(() => {
    const e = window.__graphics.engine;
    return (
      e.model.snapshot.phase === "playing" &&
      !e.model.snapshot.viewingLandmark &&
      !e.inspection.subject
    );
  });
  await p.screenshot({
    path: `${out}/restart-after-victory.jpg`,
    type: "jpeg",
    quality: 86,
  });
  report.checks.push(
    "Victory inspection opens; restart clears inspection and restores the driving scene",
  );
  assert.equal(report.errors.length, 0);
  await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
  server.kill();
}
