import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out=process.env.QA_OUT||new URL("../../../docs/ui/night-drive/after/", import.meta.url)
  .pathname;
await fs.mkdir(out, { recursive: true });
const server = await startQaServer(24232),
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
const report = {
  physicalIPhone: false,
  softwareWebGL: true,
  videoRecorded: false,
  checks: [],
  viewports: [],
  errors: [],
  http: [],
};
try {
  const context = await browser.newContext({
      viewport: { width: 844, height: 390 },
      hasTouch: true,
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  page.setDefaultTimeout(120000);
  page.on("pageerror",(e)=>report.errors.push(e.message));
  page.on("console",m=>{if(m.type()==="error")report.errors.push(m.text());});
  page.on("response", (r) => {
    if (r.status() >= 400) report.http.push(`${r.status()} ${r.url()}`);
  });
  await page.clock.install();
  const before = Date.now();
  await page.goto("http://127.0.0.1:24232");
  await page.waitForFunction(() => window.__graphics);
  report.readyMs = Date.now() - before;
  console.log("Renderer ready", report.readyMs);
  const check = (s) => {
    report.checks.push(s);
    console.log("CHECK", s);
  };
  const cdp = await context.newCDPSession(page),
    touch = (type, points) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  const phase = () =>
    page.evaluate(() => window.__graphics.engine.model.snapshot.phase);
  const mode = () =>
    page.getByTestId("destination-banner").getAttribute("data-mode");
  const waitMode = async (wanted) => {
    await page.waitForFunction(
      (wanted) =>
        document
          .querySelector('[data-testid="destination-banner"]')
          ?.getAttribute("data-mode") === wanted,
      wanted,
    );
  };
  const far = async () => {
    await page.evaluate(() => {
      const e = window.__graphics.engine;
      e.restart();
      e.setQuality("low");
      e.frameTime = -100000;
      const m = e.model.district.nodes.find(
        (n) =>
          n.name &&
          Math.hypot(n.x - e.model.player.x, n.z - e.model.player.z) > 500,
      );
      e.model.snapshot.target = m;
      e.model.snapshot.message = "";
    });
    await page.clock.fastForward(101);
    await waitMode("compact");
  };
  await page.getByTestId("button-start-shift").click();
  await far();
  console.log("Far set");
  // Virtual wall clock tests the real mounted component without waiting on software GPU frames.
  console.log("Pause clock");
  await page.clock.pauseAt(new Date(Date.now() + 500));
  console.log("Clock paused");
  await page.getByTestId("text-mission").click({ force: true });
  await page.clock.fastForward(1);
  assert.equal(await mode(), "manual");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  assert.equal(
    await page
      .getByTestId("destination-banner")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    "0.3s",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.fastForward(4998);
  assert.equal(await mode(), "manual");
  await page.clock.fastForward(2);
  assert.equal(await mode(), "compact");
  check("manual expansion expires at 5000 ms");
  await page.evaluate(() => {
    const e = window.__graphics.engine,
      longest = e.model.district.nodes
        .filter((n) => n.name)
        .sort((a, b) => b.name.length - a.name.length)[0];
    e.model.snapshot.target = {
      ...e.model.snapshot.target,
      name: longest.name,
    };
  });
  await page.clock.fastForward(101);
  await page.getByTestId("text-mission").click({ force: true });
  assert(
    await page
      .getByTestId("text-mission")
      .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    "Expanded trip details must fit",
  );

  await page.getByTestId("text-mission").click({ force: true });
  await page.clock.fastForward(3000);
  await page.getByTestId("text-mission").click({ force: true });
  await page.clock.fastForward(4999);
  assert.equal(await mode(), "manual");
  await page.clock.fastForward(1);
  assert.equal(await mode(), "compact");
  check("repeated taps restart one five-second timer");
  await page.getByTestId("text-mission").click({ force: true });
  await page.clock.fastForward(2000);
  await page.getByTestId("button-open-map").click({ force: true });
  assert.equal(await phase(), "paused");
  await page.clock.fastForward(9000);
  await page.getByTestId("button-close-map").click({ force: true });
  assert.equal(await phase(), "playing");
  await page.getByTestId("button-open-map").focus();
  await page.keyboard.down("ArrowUp");
  assert(
    await page.evaluate(() => {
      const e = window.__graphics.engine;
      e.update(0.05);
      return Math.abs(e.model.player.speed) > 0;
    }),
    "Keyboard acceleration must work after map restores button focus",
  );
  await page.keyboard.up("ArrowUp");
  check("keyboard driving works after map restores focus");
  await page.clock.fastForward(2999);
  assert.equal(await mode(), "manual");
  await page.clock.fastForward(1);
  assert.equal(await mode(), "compact");
  check("map suspends expansion deadline and restores playing state");
  // Arrival and hysteresis use a real edge near a real mission node, not mocked distances.
  const approach = async (distance) => {
    await page.evaluate((distance) => {
      const e = window.__graphics.engine,
        d = e.model.district,
        r = d.roads
          .filter((r) => !r.oneWay)
          .sort((r, s) => {
            const length = (r) => {
              const a = d.nodes.find((n) => n.id === r.a),
                b = d.nodes.find((n) => n.id === r.b);
              return Math.hypot(a.x - b.x, a.z - b.z);
            };
            return length(s) - length(r);
          })[0],
        t = {
          ...d.nodes.find((n) => n.id === r.b),
          name: r.name + " · roadside stop",
        },
        other = d.nodes.find((n) => n.id === (r.a === t.id ? r.b : r.a)),
        l = Math.hypot(other.x - t.x, other.z - t.z);
      e.model.snapshot.target = t;
      Object.assign(e.model.player, {
        x: t.x + ((other.x - t.x) * distance) / l,
        z: t.z + ((other.z - t.z) * distance) / l,
        speed: 0,
        collision: 0,
      });
      e.model.snapshot.message = "";
      e.update(0.01);
    }, distance);
    await page.clock.fastForward(101);
  };
  await approach(85);
  assert.equal(await mode(), "approach");
  for (const d of [94, 105, 112]) {
    await approach(d);
    assert.equal(await mode(), "approach");
  }
  await approach(125);
  assert.equal(await mode(), "compact");
  await approach(110);
  assert.equal(await mode(), "compact");
  check("road-distance approach and departure hysteresis");
  await approach(2);
  await page.evaluate(
    () => (window.__graphics.engine.model.snapshot.boarding = 0.45),
  );
  await page.clock.fastForward(101);
  assert.equal(await mode(), "arrival");
  assert(await page.getByRole("progressbar").isVisible());
  await far();
  await page.clock.fastForward(101);
  await page.getByTestId("button-open-map").click({ force: true });
  const svg = page.getByTestId("world-map").locator(".tt-world-map-body>svg"),
    v0 = await svg.getAttribute("viewBox");
  await page
    .getByRole("button", { name: "Zoom in", exact: true })
    .click({ force: true });
  const v1 = await svg.getAttribute("viewBox");
  assert.notEqual(v0, v1);
  await page.getByTestId("button-map-recenter").click({ force: true });
  await page.getByTestId("button-whole-city").click({ force: true });
  const pin = page.locator('[data-testid^="map-landmark-"]').first();
  const pinPoint = await pin.evaluate((el) => {
    const p = new DOMPoint(0, 0).matrixTransform(el.getScreenCTM());
    return { x: p.x, y: p.y };
  });
  await touch("touchStart", [{ id: 42, ...pinPoint }]);
  await touch("touchEnd", []);
  assert(await page.getByTestId("map-detail").isVisible());
  await page
    .getByRole("button", { name: "Close place details" })
    .click({ force: true });
  await pin.focus();
  await page.keyboard.press("Enter");
  assert(await page.getByTestId("map-detail").isVisible());
  await page
    .getByRole("button", { name: "Close place details" })
    .click({ force: true });
  const route = await page
    .getByTestId("world-map")
    .getByTestId("map-route")
    .getAttribute("points");
  await page.getByTestId("button-landmark-layer").click({ force: true });
  await page.getByTestId("button-transit-layer").click({ force: true });
  assert.equal(await page.locator('[data-testid^="map-rail-"]').count(), 0);
  assert.equal(
    await page
      .getByTestId("world-map")
      .getByTestId("map-route")
      .getAttribute("points"),
    route,
  );
  await page.getByTestId("button-transit-layer").click({ force: true });
  await page.getByTestId("button-nearby-stations").click({ force: true });
  await page
    .locator('[data-testid^="map-station-"]')
    .first()
    .click({ force: true });
  assert.match(
    await page.getByTestId("world-map").getByRole("status").innerText(),
    /elevated railway/,
  );

  await page
    .getByRole("button", { name: "Close station list" })
    .click({ force: true });
  const box = await svg.boundingBox(),
    x = box.x + box.width * 0.55,
    y = box.y + box.height * 0.5;
  const panBefore = await svg.getAttribute("viewBox");
  await touch("touchStart", [{ id: 1, x, y }]);
  await touch("touchMove", [{ id: 1, x: x + 55, y: y + 20 }]);
  await touch("touchEnd", []);
  assert.notEqual(await svg.getAttribute("viewBox"), panBefore);
  const pinchBefore = Number((await svg.getAttribute("viewBox")).split(" ")[2]);
  await touch("touchStart", [
    { id: 1, x: x - 50, y },
    { id: 2, x: x + 50, y },
  ]);
  await touch("touchMove", [
    { id: 1, x: x - 85, y },
    { id: 2, x: x + 85, y },
  ]);
  await touch("touchEnd", []);
  assert(
    Number((await svg.getAttribute("viewBox")).split(" ")[2]) < pinchBefore,
  );
  check(
    "CDP touch map pan, pinch, zoom, recenter and layers; mission route remains visible",
  );
  const savedDiscovery = await page.evaluate(() => {
    const e = window.__graphics.engine,
      s = e.model.snapshot,
      saved = {
        regions: s.discoveredDistricts,
        landmarks: s.discoveredLandmarks,
      };
    s.discoveredDistricts = e.model.district.regions.map((r) => r.id);
    s.discoveredLandmarks = e.model.district.landmarks.map((l) => l.id);
    e.setQuality("medium");
    e.setQuality("low");
    return saved;
  });
  await page.getByTestId("button-whole-city").click({ force: true });
  const centers = await page
    .locator('[data-testid^="map-landmark-"]')
    .evaluateAll((els) =>
      els.map((el) => {
        const p = new DOMPoint(0, 0).matrixTransform(el.getScreenCTM());
        return { x: p.x, y: p.y };
      }),
    );
  for (let i = 0; i < centers.length; i++)
    for (let j = i + 1; j < centers.length; j++)
      assert(
        Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y) >=
          28,
        "Discovered-place icons must remain separated at city scale",
      );
  await page.evaluate((saved) => {
    const e = window.__graphics.engine;
    e.model.snapshot.discoveredDistricts = saved.regions;
    e.model.snapshot.discoveredLandmarks = saved.landmarks;
    e.setQuality("medium");
    e.setQuality("low");
  }, savedDiscovery);
  check("fully discovered city keeps a clear marker hierarchy");
  await page.getByTestId("button-close-map").click({ force: true });
  assert.equal(await phase(), "playing");
  await page.getByTestId("button-pause").click({ force: true });
  await page.getByTestId("button-pause-map").click({ force: true });
  await page.getByTestId("button-close-map").click({ force: true });
  assert.equal(await phase(), "paused");
  await page.getByTestId("button-pause-settings").click({ force: true });
  await page
    .getByRole("button", { name: "Large", exact: true })
    .click({ force: true });
  await page
    .getByRole("button", { name: "Reduced", exact: true })
    .click({ force: true });
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("ttr-interface-v1")).controls,
    ),
    "large",
  );
  await page
    .getByRole("button", { name: "Back to pause menu" })
    .click({ force: true });
  await page.getByTestId("button-restart").click({ force: true });
  assert.equal(await phase(), "paused");
  await page
    .getByRole("button", { name: "Keep this drive" })
    .click({ force: true });
  await page.getByTestId("button-resume").click({ force: true });
  check(
    "pause map returns paused; settings persist; restart confirmation cancels safely",
  );
  // Simultaneous fingers and cancellation, then opening map during held controls.
  const gas = await page.getByTestId("button-gas").boundingBox(),
    gx = gas.x + gas.width / 2,
    gy = gas.y + gas.height / 2;
  await touch("touchStart", [
    { id: 11, x: 100, y: 300 },
    { id: 12, x: gx, y: gy },
  ]);
  await touch("touchMove", [
    { id: 11, x: 140, y: 300 },
    { id: 12, x: gx, y: gy },
  ]);
  let input = await page.evaluate(() => ({
    ...window.__graphics.engine.model.input,
  }));
  assert(input.gas && input.steer > 0.3);
  await page.getByTestId("button-open-map").dispatchEvent("click");
  input = await page.evaluate(() => ({
    ...window.__graphics.engine.model.input,
  }));
  assert(!input.gas && !input.brake && input.steer === 0);
  await touch("touchCancel", []);
  await page.keyboard.press("p");
  assert.equal(await phase(), "paused");
  await page.keyboard.press("Escape");
  assert.equal(await phase(), "playing");
  check(
    "simultaneous steering + throttle, pointer cancel, map input clearing and keyboard isolation",
  );
  await page.getByTestId("button-brake").focus();
  await page.keyboard.down("Space");
  assert(await page.evaluate(() => window.__graphics.engine.model.input.brake));
  await page.keyboard.up("Space");
  assert(
    !(await page.evaluate(() => window.__graphics.engine.model.input.brake)),
  );
  const horn = await page.getByTestId("button-horn").boundingBox();
  await touch("touchStart", [{ id: 20, x: horn.x + 22, y: horn.y + 22 }]);
  assert.equal(
    await page.getByTestId("button-horn").getAttribute("aria-pressed"),
    "true",
  );
  await touch("touchEnd", []);
  await page.getByTestId("button-boost").dispatchEvent("click", { detail: 0 });
  assert.equal(
    await page.evaluate(() => window.__graphics.engine.boost.state),
    "active",
  );
  check("keyboard brake release, horn press feedback, boost activation");
  await page.evaluate(() => {
    const e = window.__graphics.engine;
    e.restart();
    const d = e.model.district,
      a = d.destinations.find((a) => a.id === "pho"),
      n = d.nodes.find((n) => n.id === a.arrivalNode);
    Object.assign(e.model.player, { x: n.x, z: n.z, speed: 0, collision: 0 });
  });
  await page.clock.fastForward(101);
  await page.getByTestId("text-mission").click({ force: true });
  await page.clock.fastForward(2000);
  await page.evaluate(() => {
    if (!window.__graphics.engine.viewLandmark("pho"))
      throw Error("LOOK unavailable");
  });
  await page.clock.fastForward(9000);
  await page.getByTestId("inspection-return").click({ force: true });
  await page.clock.fastForward(2999);
  assert.equal(await mode(), "manual");
  await page.clock.fastForward(1);
  assert.equal(await mode(), "compact");
  check("LOOK suspends the manual banner deadline and restores remaining time");
  await page.evaluate(() => {
    if (!window.__graphics.engine.viewLandmark("pho"))
      throw Error("LOOK unavailable");
  });
  await page.clock.fastForward(101);
  const orbit = await page.evaluate(
    () => window.__graphics.engine.inspection.azimuth,
  );
  await touch("touchStart", [{ id: 21, x: 390, y: 170 }]);
  await touch("touchMove", [{ id: 21, x: 450, y: 200 }]);
  await touch("touchEnd", []);
  await page.clock.fastForward(101);
  assert.notEqual(
    await page.evaluate(() => window.__graphics.engine.inspection.azimuth),
    orbit,
  );
  const pinchStart = await page.evaluate(() => {
    const c = window.__graphics.engine.inspection;
    return { distance: c.distance, panX: c.panX, panY: c.panY };
  });
  await touch("touchStart", [
    { id: 23, x: 350, y: 160 },
    { id: 24, x: 490, y: 160 },
  ]);
  await touch("touchMove", [
    { id: 23, x: 320, y: 175 },
    { id: 24, x: 535, y: 175 },
  ]);
  await touch("touchEnd", []);
  await page.clock.fastForward(101);
  const pinchEnd = await page.evaluate(() => {
    const c = window.__graphics.engine.inspection;
    return { distance: c.distance, panX: c.panX, panY: c.panY };
  });
  assert(pinchEnd.distance < pinchStart.distance);
  assert(
    pinchEnd.panX !== pinchStart.panX || pinchEnd.panY !== pinchStart.panY,
  );
  await page.getByTestId("inspection-view-feet").click({ force: true });
  await page.getByTestId("inspection-reset").click({ force: true });
  const frozen = await page.evaluate(() => {
    const e = window.__graphics.engine,
      b = e.model.snapshot.elapsed;
    for (let i = 0; i < 60; i++) e.update(0.05);
    return (
      b === e.model.snapshot.elapsed &&
      !e.model.input.gas &&
      e.model.input.steer === 0
    );
  });
  assert(frozen);
  await page.getByTestId("inspection-return").click({ force: true });
  assert.equal(await phase(), "playing");
  check(
    "LOOK orbit, pinch zoom, two-finger pan, viewpoint, reset, timer freeze and return",
  );
  await page.evaluate(() => {
    const e = window.__graphics.engine;
    e.restart();
    e.model.snapshot.elapsed = 300;
    e.model.snapshot.message = "";
  });
  await page.clock.fastForward(101);
  await page.evaluate(() => {
    const e = window.__graphics.engine;
    Object.assign(e.model.snapshot, {
      phase: "ended",
      earnings: 1240,
      score: 6940,
      deliveries: 4,
    });
    e.publish();
  });
  await page.clock.fastForward(101);
  assert.equal(await page.getByTestId("text-result-fares").innerText(), "4");
  await page.getByTestId("button-again").click({ force: true });
  await page.clock.fastForward(101);
  assert.equal(await phase(), "playing");
  await page.getByTestId("button-pause").click({ force: true });
  await page.getByTestId("button-return-title").click({ force: true });
  await page.getByTestId("button-confirm-leave").click({ force: true });
  assert.equal(await phase(), "title");
  await page.getByTestId("button-free-roam").click({ force: true });
  assert.equal(
    await page.evaluate(() => window.__graphics.engine.model.snapshot.mode),
    "free",
  );
  check("confirmed return to title and free-roam entry");
  // Responsive checks include actual menu/map surfaces in portrait and all driving controls in landscape.
  for (const [width, height] of [
    [375, 812],
    [430, 932],
    [844, 390],
    [932, 430],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      const e = window.__graphics.engine;
      e.restart();
      e.pause();
    });
    await page.clock.fastForward(101);
    await page.getByTestId("button-pause-settings").click({ force: true });
    await page.clock.fastForward(20);
    for (const el of await page
      .getByTestId("settings")
      .locator("button,input")
      .all()) {
      await el.scrollIntoViewIfNeeded();
      const b = await el.boundingBox();
      assert(
        b &&
          b.x >= 0 &&
          b.y >= 0 &&
          b.x + b.width <= width + 1 &&
          b.y + b.height <= height + 1,
        `Settings out of bounds ${width}x${height}`,
      );
    }
    await page
      .getByRole("button", { name: "Back to pause menu" })
      .click({ force: true });
    await page.getByTestId("button-pause-map").click({ force: true });
    await page.clock.fastForward(20);
    for (const name of ["Zoom in", "Zoom out", "My tuk-tuk", "Whole city"]) {
      const b = await page
        .getByRole("button", { name, exact: true })
        .boundingBox();
      assert(
        b &&
          b.x >= 0 &&
          b.y >= 0 &&
          b.x + b.width <= width + 1 &&
          b.y + b.height <= height + 1,
      );
    }
    assert(await page.getByTestId("hint-rotate").isHidden());
    await page.getByTestId("button-close-map").click({ force: true });
    assert.equal(await phase(), "paused");
    if (width > height) {
      await page.getByTestId("button-resume").click({ force: true });
      await page.clock.fastForward(101);
      for (const id of [
        "button-pause",
        "button-gas",
        "button-brake",
        "button-boost",
        "button-open-map",
      ]) {
        const b = await page.getByTestId(id).boundingBox();
        assert(
          b &&
            b.x >= 0 &&
            b.y >= 0 &&
            b.x + b.width <= width + 1 &&
            b.y + b.height <= height + 1,
          `${id} out of bounds`,
        );
      }
    }
    if (width < height) {
      await page.evaluate(() => {
        const e = window.__graphics.engine;
        e.restart();
        const d = e.model.district,
          a = d.destinations.find((a) => a.id === "pho"),
          n = d.nodes.find((n) => n.id === a.arrivalNode);
        Object.assign(e.model.player, {
          x: n.x,
          z: n.z,
          speed: 0,
          collision: 0,
        });
        e.viewLandmark("pho");
      });
      await page.clock.fastForward(101);
      for (const id of ["inspection-return", "inspection-reset"]) {
        const b = await page.getByTestId(id).boundingBox();
        assert(
          b.x >= 0 &&
            b.y >= 0 &&
            b.x + b.width <= width + 1 &&
            b.y + b.height <= height + 1,
        );
      }
      const nav = page.locator(".tt-inspection nav"),
        nb = await nav.boundingBox();
      if (await nav.evaluate((el) => el.scrollWidth > el.clientWidth + 2)) {
        await touch("touchStart", [
          { id: 51, x: nb.x + nb.width - 25, y: nb.y + 22 },
        ]);
        await touch("touchMove", [{ id: 51, x: nb.x + 30, y: nb.y + 22 }]);
        await touch("touchEnd", []);
        assert(
          (await nav.evaluate((el) => el.scrollLeft)) > 0,
          "Viewpoint strip must scroll on touch",
        );
      }
      await page.getByTestId("inspection-return").click({ force: true });
      assert.equal(await phase(), "paused");
    }
    report.viewports.push({ width, height, pass: true });
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => window.__graphics.engine.restart());
  await page.clock.fastForward(101);
  await page.addStyleTag({
    content: ".tt-root{--edge-left:59px;--edge-right:59px;--edge-bottom:21px}",
  });
  for (const id of ["button-open-map", "button-pause", "button-gas"]) {
    const b = await page.getByTestId(id).boundingBox();
    assert(b.x >= 59 && b.x + b.width <= 844 - 59);
  }
  check("landscape notch/home-indicator inset simulation");
  const saved = await context.storageState();
  await context.close();
  const legacyContext = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    reducedMotion: "reduce",
    storageState: saved,
  });
  const legacy = await legacyContext.newPage();
  legacy.setDefaultTimeout(120000);
  legacy.on("pageerror", (e) => report.errors.push(e.message));
  await legacy.goto("http://127.0.0.1:24232/?world=chinatown");
  await legacy.waitForFunction(() => window.__graphics);
  assert(await legacy.locator(".tt-controls-large").count());
  await legacy.getByTestId("button-free-roam").click();
  assert.equal(
    await legacy.evaluate(
      () => window.__graphics.engine.model.district.worldId ?? "chinatown",
    ),
    "chinatown",
  );
  assert(await legacy.getByTestId("button-open-map").isDisabled());
  await legacy.getByTestId("button-pause").click();
  await legacy.getByTestId("button-pause-recover").click();
  assert.equal(
    await legacy.evaluate(() => window.__graphics.engine.model.snapshot.phase),
    "playing",
  );
  await legacyContext.close();
  check("original Chinatown free roam, controls, pause and recovery");
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.http, []);
  report.pass = true;
  await fs.writeFile(`${out}/qa.json`, JSON.stringify(report, null, 2));
  console.log("PASS", JSON.stringify(report));
} catch (e) {
  report.pass = false;
  report.failure = String(e.stack);
  await fs.writeFile(`${out}/qa.json`, JSON.stringify(report, null, 2));
  throw e;
} finally {
  await browser.close();
  server.kill();
}
