/** CI-only WebGL/UI QA, using the repository's existing Playwright pipeline.
 * Inspection-camera position changes are not claimed as driven gameplay.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const local = process.env.GAME_URL ? null : await startQaServer(24177);
const output = fileURLToPath(
  new URL("../../../generated-artifacts/compact-bangkok/", import.meta.url),
);
await fs.mkdir(`${output}/screenshots`, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  hasTouch: true,
});
// SwiftShader can take longer to resize/read back the portrait WebGL canvas
// than Playwright's default 30 seconds on a shared CI runner.
page.setDefaultTimeout(120000);
const errors = [],
  failures = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
});
try {
  await page.addInitScript(() => { if(location.protocol.startsWith('http')){const u=new URL(location.href);u.searchParams.set('qa','1');history.replaceState(null,'',u);} });
  await page.goto(process.env.GAME_URL || "http://localhost:24177/", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => window.__graphics?.engine?.model?.district?.worldId === "bangkok",
    null,
    { timeout: 90000 },
  );
  await page.getByTestId("button-free-roam").click();
  const cdp = await page.context().newCDPSession(page);
  const gas = await page.getByTestId("button-gas").boundingBox();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 1, x: gas.x + gas.width / 2, y: gas.y + gas.height / 2 },
    ],
  });
  await page.waitForFunction(() => window.__graphics.engine.model.input.gas);
  await page.waitForTimeout(350);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForFunction(() => !window.__graphics.engine.model.input.gas);
  await page.getByTestId("button-open-map").click();
  await page.getByTestId("world-map").waitFor({ state: "visible" });
  const time = await page.evaluate(
    () => window.__graphics.engine.model.snapshot.elapsed,
  );
  await page.waitForTimeout(600);
  assert.equal(
    await page.evaluate(() => window.__graphics.engine.model.snapshot.elapsed),
    time,
    "Map must pause simulation",
  );
  const mapSvg = page.locator(".tt-world-map-body > svg");
  // Verify a real canvas gesture instead of assuming a fixed point is not a pin.
  const canvasPoint = () =>
    mapSvg.evaluate((svg) => {
      const b = svg.getBoundingClientRect();
      for (const fy of [0.48, 0.36, 0.62])
        for (const fx of [0.55, 0.4, 0.65, 0.3]) {
          const p = { x: b.x + b.width * fx, y: b.y + b.height * fy };
          if (
            [-40, 0, 40].every((dx) => {
              const e = document.elementFromPoint(p.x + dx, p.y);
              return e && svg.contains(e) && !e.closest(".tt-map-pin");
            })
          )
            return p;
        }
      throw Error("No unoccluded map canvas for gesture");
    });
  let center = await canvasPoint();
  const initialView = await mapSvg.getAttribute("viewBox");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 2, ...center }],
  });
  for (let step = 1; step <= 4; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { id: 2, x: center.x + (48 * step) / 4, y: center.y - (20 * step) / 4 },
      ],
    });
    await page.waitForTimeout(20);
  }
  await page.waitForFunction(
    (view) =>
      document
        .querySelector(".tt-world-map-body>svg")
        .getAttribute("viewBox") !== view,
    initialView,
    { timeout: 10000 },
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const panned = (await mapSvg.getAttribute("viewBox")).split(" ").map(Number),
    original = initialView.split(" ").map(Number);
  assert(
    panned[0] < original[0] && panned[1] > original[1],
    "Pan must move west/south in north-up coordinates",
  );
  center = await canvasPoint();
  const beforePinch = Number(
    (await mapSvg.getAttribute("viewBox")).split(" ")[2],
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 3, x: center.x - 25, y: center.y },
      { id: 4, x: center.x + 25, y: center.y },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { id: 3, x: center.x - 40, y: center.y },
      { id: 4, x: center.x + 40, y: center.y },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForFunction(
    (width) =>
      Number(
        document
          .querySelector(".tt-world-map-body > svg")
          .getAttribute("viewBox")
          .split(" ")[2],
      ) < width,
    beforePinch,
  );
  assert.equal(
    await page
      .locator(".tt-root")
      .evaluate((el) => getComputedStyle(el).touchAction),
    "auto",
  );
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Whole city", exact: true }).click();
  await page.waitForFunction(
    () =>
      Number(
        document
          .querySelector(".tt-world-map-body>svg")
          .getAttribute("viewBox")
          .split(" ")[3],
      ) >= 1249,
    null,
    { timeout: 10000 },
  );
  await page.screenshot({ path: `${output}/screenshots/map-landscape.png` });
  await page.setViewportSize({ width: 430, height: 932 });
  await page.getByTestId("world-map").waitFor({ state: "visible" });
  assert.equal(
    await page.getByTestId("hint-rotate").isVisible(),
    false,
    "Portrait map must remain visible",
  );
  await page.screenshot({ path: `${output}/screenshots/map-portrait.png` });
  await page.getByTestId("button-close-map").click();
  assert.equal(
    await page.evaluate(() => window.__graphics.engine.model.snapshot.phase),
    "paused",
    "Closing portrait map must not resume behind rotate prompt",
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByTestId("button-resume").click();
  // Ordinary chase-camera captures are essential: aerial art previews alone
  // cannot establish that the world looks inhabited while actually driving.
  await page.waitForFunction(() => window.__graphics.frameId > 10);
  await page.screenshot({
    path: `${output}/screenshots/street-chase-sunset.png`,
  });
  await page.evaluate(() => {
    const { engine } = window.__graphics;
    engine.pause();
    engine.setQuality("low");
  });
  await page.addStyleTag({
    content: ".tt-ui { visibility: hidden !important; }",
  });
  const lowFrame = await page.evaluate(() => window.__graphics.frameId);
  await page.waitForFunction(
    (frame) => window.__graphics.frameId > frame + 3,
    lowFrame,
  );
  const visibleSigns = await page.evaluate(
    () =>
      window.__graphics.scene
        .getObjectByName("City")
        .children.filter((c) => c.name === "BangkokSign" && c.visible).length,
  );
  assert(
    visibleSigns > 0,
    "Generic Thai/Chinese shop signs must remain in Fast mode",
  );
  await page.screenshot({
    path: `${output}/screenshots/street-chase-fast.png`,
  });
  await page.evaluate(() => window.__graphics.engine.setQuality("medium"));
  const detailedFrame = await page.evaluate(() => window.__graphics.frameId);
  await page.waitForFunction(
    (frame) => window.__graphics.frameId > frame + 3,
    detailedFrame,
  );
  await page.screenshot({
    path: `${output}/screenshots/street-chase-pretty.png`,
  });
  // Following snapshots set simulated time for art inspection; this is not a
  // claim that the player drove to night during the automated QA run.
  await page.evaluate(() => {
    const { engine } = window.__graphics;
    engine.pause();
    engine.model.snapshot.elapsed = 9 * 60;
  });
  await page.addStyleTag({
    content: ".tt-ui { visibility: hidden !important; }",
  });
  const nightFrame = await page.evaluate(() => window.__graphics.frameId);
  await page.waitForFunction(
    (frame) => window.__graphics.frameId > frame + 6,
    nightFrame,
    { timeout: 30000 },
  );
  const luminous = await page.evaluate(() =>
    window.__graphics.scene
      .getObjectByName("City")
      .children.filter((c) => c.name === "BangkokNight")
      .flatMap((c) => c.children)
      .some((m) => m.material.emissiveIntensity > 0.5),
  );
  assert(luminous, "Night-time city windows must illuminate");
  await page.screenshot({
    path: `${output}/screenshots/street-chase-night.png`,
  });
  for (const quality of ["low", "medium"]) {
    await page.evaluate((quality) => {
      const { engine } = window.__graphics;
      engine.pause();
      engine.setQuality(quality);
      window.__artCamera = {
        position: [-1130, 110, 200],
        look: [-860, 0, 210],
      };
    }, quality);
    const before = await page.evaluate(() => window.__graphics.frameId);
    await page.waitForFunction(
      (frame) => window.__graphics.frameId > frame + 8,
      before,
      { timeout: 30000 },
    );
    const visibility = await page.evaluate((quality) => {
      const { scene, three: T, camera } = window.__graphics;
      const radius = quality === "low" ? 420 : 650;
      let nearby = 0,
        distant = 0;
      const missing = [],
        excessive = [];
      for (const chunk of scene
        .getObjectByName("City")
        .children.filter((c) => c.name === "BangkokSector")) {
        const bounds = new T.Box3().setFromObject(chunk);
        const distance = bounds.distanceToPoint(
          new T.Vector3(camera.position.x, 0, camera.position.z),
        );
        if (distance < radius - 20) {
          nearby++;
          if (!chunk.visible) missing.push(chunk.userData.center.toArray());
        }
        if (distance > radius + 20) {
          distant++;
          if (chunk.visible) excessive.push(chunk.userData.center.toArray());
        }
      }
      return { nearby, distant, missing, excessive };
    }, quality);
    assert(visibility.nearby > 0 && visibility.distant > 0);
    assert.deepEqual(
      visibility.missing,
      [],
      `Nearby river scenery must remain visible (${quality})`,
    );
    assert.deepEqual(
      visibility.excessive,
      [],
      `Distant scenery must still be culled (${quality})`,
    );
    await page.screenshot({
      path: `${output}/screenshots/memorial-${quality}.png`,
    });
  }
  for (const id of ["gate", "arun", "icon", "paragon", "mahanakhon"]) {
    await page.evaluate((id) => {
      const { engine } = window.__graphics,
        d = engine.model.district,
        l = d.landmarks.find((l) => l.id === id),
        n = d.nodes.find((n) => n.id === l.accessNode);
      engine.pause();
      Object.assign(engine.model.player, { x: n.x, z: n.z, speed: 0 });
      engine.recover();
      engine.model.snapshot.elapsed = id === "mahanakhon" ? 600 : 0;
      const site = l.plot || l;
      window.__artCamera = {
        position: [site.x + 105, 160, site.z + 120],
        look: [site.x, 10, site.z],
      };
    }, id);
    const before = await page.evaluate(() => window.__graphics.frameId);
    await page.waitForFunction(
      (frame) => window.__graphics.frameId > frame + 3,
      before,
      { timeout: 30000 },
    );
    await page.screenshot({ path: `${output}/screenshots/${id}.png` });
  }
  const stats = await page.evaluate(() => window.__graphics.stats);
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  await fs.writeFile(
    `${output}/qa.json`,
    JSON.stringify(
      {
        pass: true,
        mapPauses: true,
        portraitMap: true,
        touchThrottleRelease: true,
        touchPanAndPinch: true,
        bridgeBoundsVisibility: ["Fast", "Pretty"],
        inspectionViews: 7,
        ordinaryChaseCaptures: 4,
        javascriptErrors: errors,
        assetFailures: failures,
        stats,
        performanceEnvironment:
          "Chromium software WebGL; not physical-iPhone performance",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  local?.kill();
}
