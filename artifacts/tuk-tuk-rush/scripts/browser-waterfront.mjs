import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out =
    process.env.RIVER_OUTPUT ??
    new URL("../../../docs/qa/waterfront-certification/", import.meta.url)
      .pathname,
  label = process.env.RIVER_QA_LABEL ?? "after",
  port = +(process.env.RIVER_QA_PORT ?? 24641);
await fs.mkdir(`${out}/browser`, { recursive: true });
const server = await startQaServer(port),
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
  label,
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  renderer: `Chromium ${browser.version()} / SwiftShader`,
  physicalIPhone: false,
  sharedHost: true,
  errors: [],
  layouts: [],
  resets: [],
  performance: [],
};
try {
  let page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
  });
  page.setDefaultTimeout(600000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/?qa=1`);
  await page.waitForFunction(() => window.__graphics?.frameId > 2);
  await page.getByTestId("button-free-roam").click();
  let cdp = await page.context().newCDPSession(page);
  if (label === "after" && process.env.RIVER_QA_PERF_ONLY !== "1") {
    await page.getByTestId("button-open-map").click();
    await page.getByTestId("world-map").waitFor();
    for (const [width, height] of [
      [375, 812],
      [430, 932],
      [844, 390],
      [1280, 800],
    ]) {
      await page.setViewportSize({ width, height });
      await page.getByTestId("button-whole-city").click();
      await page.waitForFunction(() => {
        const root = document.querySelector(
          '[data-testid="world-map"] .tt-world-map-body>svg',
        );
        if (!root) return false;
        const [x, y, w, h] = root
            .getAttribute("viewBox")
            .split(/\s+/)
            .map(Number),
          d = window.__graphics.engine.model.district,
          b = d.bounds;
        return (
          x <= b.minX / 4 + 500 &&
          x + w >= b.maxX / 4 + 500 &&
          y <= b.minZ / 4 + 600 &&
          y + h >= b.maxZ / 4 + 600
        );
      });
      const expected = await page.evaluate(() =>
        window.__graphics.engine.model.district.riverPolygon
          .map(
            (r) =>
              "M" +
              r.map((p) => `${p.x / 4 + 500},${p.z / 4 + 600}`).join("L") +
              "Z",
          )
          .join(""),
      );
      const river = page
        .getByTestId("world-map")
        .getByTestId("map-river-surface");
      assert.equal(await river.getAttribute("d"), expected);
      assert.equal(await river.getAttribute("fill-rule"), "evenodd");
      const map = await page.getByTestId("world-map").boundingBox();
      assert(map && map.width <= width + 0.5 && map.height <= height + 0.5);
      assert(await river.isVisible());
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert(!overflow, "Horizontal viewport overflow");
      const file = `${label}-map-${width}x${height}.jpg`;
      await page.screenshot({
        path: `${out}/browser/${file}`,
        type: "jpeg",
        quality: 88,
      });
      report.layouts.push({
        width,
        height,
        map,
        overflow,
        canonicalRiverPath: true,
        wholePlayableBoundaryVisible: true,
        file,
      });
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await page
      .getByRole("button", { name: "Back to driving", exact: true })
      .click();
    // Actual production inspection followed by restart; no QA camera is allowed
    // to survive. Stable progress is checked during geography-only recovery.
    for (let i = 0; i < 3; i++) {
      const state = await page.evaluate(() => {
        const g = window.__graphics,
          e = g.engine,
          d = e.model.district,
          l = d.landmarks.find((l) => l.id === "icon"),
          n = d.nodes.find((n) => n.id === l.accessNode);
        e.restart();
        e.model.traffic.length = 0;
        Object.assign(e.model.player, {
          x: n.x,
          z: n.z,
          heading: Math.atan2(l.plot.x - n.x, l.plot.z - n.z),
          speed: 0,
        });
        const inspected = e.viewLandmark("icon");
        e.restart();
        e.pause();
        return {
          inspected,
          override: !!window.__artCamera,
          viewing: e.model.snapshot.viewingLandmark,
          pose: { ...e.model.player },
        };
      });
      assert(state.inspected);
      assert(!state.override && !state.viewing);
      const f = await page.evaluate(() => window.__graphics.frameId);
      await page.waitForFunction((f) => window.__graphics.frameId > f + 4, f);
      await cdp.send("HeapProfiler.collectGarbage");
      const memory = await cdp.send("Runtime.getHeapUsage");
      const stats = await page.evaluate(() => ({
        ...window.__graphics.stats,
        glError: window.__graphics.gl.getContext().getError(),
        camera: window.__graphics.camera.position.toArray(),
      }));
      assert.equal(stats.glError, 0);
      report.resets.push({ i, state, stats, memory });
    }
    assert.equal(
      report.resets[1].stats.geometries,
      report.resets[2].stats.geometries,
    );
    assert.equal(
      report.resets[1].stats.textures,
      report.resets[2].stats.textures,
    );
    report.recovery = await page.evaluate(() => {
      const e = window.__graphics.engine,
        d = e.model.district,
        p = d.river[Math.floor(d.river.length * 0.55)];
      e.pause();
      const progress = JSON.stringify(e.career.profile),
        mission = e.model.mission,
        deliveries = e.model.snapshot.deliveries;
      Object.assign(e.model.player, { x: p.x, z: p.z, speed: 12 });
      const old = { x: p.x, z: p.z };
      e.resume();
      e.pause();
      return {
        old,
        recovered: { ...e.model.player },
        sameProgress: progress === JSON.stringify(e.career.profile),
        sameMission: mission === e.model.mission,
        sameDeliveries: deliveries === e.model.snapshot.deliveries,
        cameraReset: !window.__artCamera,
      };
    });
    assert(
      report.recovery.sameProgress &&
        report.recovery.sameMission &&
        report.recovery.sameDeliveries &&
        report.recovery.cameraReset,
    );
    assert(
      Math.hypot(
        report.recovery.old.x - report.recovery.recovered.x,
        report.recovery.old.z - report.recovery.recovered.z,
      ) > 5,
    );
  }

  if (label === "after" && process.env.RIVER_QA_PERF_ONLY !== "1") {
    report.drivingControls = [];
    for (const [width, height] of [
      [375, 812],
      [430, 932],
      [844, 390],
      [1280, 800],
    ]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => window.__graphics.engine.start("free"));
      const portrait = height > width;
      await page.waitForFunction((p) => {
        const hint = document.querySelector("[data-testid=hint-rotate]");
        return (getComputedStyle(hint).display !== "none") === p;
      }, portrait);
      if (!portrait)
        await page.getByTestId("button-gas").waitFor({ state: "visible" });
      const controls = await page.evaluate(() =>
        ["button-gas", "button-brake", "control-steer"].map((id) => {
          const el = document.querySelector(`[data-testid="${id}"]`);
          const r = el?.getBoundingClientRect();
          return {
            id,
            box: r
              ? { x: r.x, y: r.y, width: r.width, height: r.height }
              : null,
          };
        }),
      );
      for (const c of controls.filter(() => !portrait))
        assert(
          c.box &&
            c.box.x >= -0.5 &&
            c.box.y >= -0.5 &&
            c.box.x + c.box.width <= width + 0.5 &&
            c.box.y + c.box.height <= height + 0.5,
          "Driving controls fit viewport",
        );
      let pointer = false;
      if (!portrait) {
        const gas = page.getByTestId("button-gas"),
          r = await gas.boundingBox();
        await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
        await page.mouse.down();
        pointer = await page.evaluate(
          () => window.__graphics.engine.model.input.gas,
        );
        assert(pointer, "Production gas pointer handler");
        await page.mouse.up();
        assert(
          !(await page.evaluate(
            () => window.__graphics.engine.model.input.gas,
          )),
        );
        const brake = page.getByTestId("button-brake"),
          b = await brake.boundingBox();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.down();
        assert(
          await page.evaluate(() => window.__graphics.engine.model.input.brake),
        );
        await page.mouse.up();
        assert(
          !(await page.evaluate(
            () => window.__graphics.engine.model.input.brake,
          )),
        );
      }
      const file = `after-driving-${width}x${height}.jpg`;
      await page.screenshot({
        path: `${out}/browser/${file}`,
        type: "jpeg",
        quality: 88,
      });
      report.drivingControls.push({
        width,
        height,
        controls,
        pointer,
        portraitRotateGuard: portrait,
        file,
      });
    }
    // Match the baseline benchmark with a fresh context and a fresh GPU scene.
    await page.close();
    page = await browser.newPage({
      viewport: { width: 640, height: 360 },
      hasTouch: true,
    });
    page.setDefaultTimeout(600000);
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/?qa=1`);
    await page.waitForFunction(() => window.__graphics?.frameId > 2);
    await page.getByTestId("button-free-roam").click();
    cdp = await page.context().newCDPSession(page);
  }
  await page.setViewportSize({ width: 640, height: 360 });
  await page.addStyleTag({
    content:
      ".tt-ui,[data-testid=button-city-inspector]{visibility:hidden!important}",
  });
  const scenes = JSON.parse(
    await fs.readFile(`${out}/performance-scenes.json`, "utf8"),
  );
  for (const id of ["icon-street", "taksin-driving", "oriental-river"]) {
    const s = scenes.find((s) => s.id === id);
    await page.evaluate((s) => {
      const e = window.__graphics.engine;
      e.pause();
      e.model.traffic.length = 0;
      e.setQuality("medium");
      e.frameTime = -100000;
      e.model.snapshot.elapsed = 40;
      e.cameraRevision++;
      Object.assign(e.model.player, {
        x: s.look[0],
        z: s.look[2],
        heading: 0,
        speed: 0,
      });
      Object.defineProperty(window, "__artCamera", {
        configurable: true,
        get: () => ({ position: [...s.camera], look: [...s.look] }),
      });
    }, s);
    const samples = await page.evaluate(async () => {
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      for (let i = 0; i < 8; i++) await frame();
      const samples = [];
      for (let i = 0; i < 24; i++) {
        await frame();
        samples.push({ ...window.__graphics.stats });
      }
      return samples;
    });
    const submission = await page.evaluate(async () => {
      const g = window.__graphics,
        records = [];
      const saved = [];
      g.scene.traverse((o) => {
        if (o.isMesh) {
          const old = o.onBeforeRender;
          saved.push([o, old]);
          o.onBeforeRender = function (...args) {
            old?.apply(this, args);
            records.push({
              frame: g.frameId,
              name: this.parent?.name || this.name,
              triangles:
                ((this.geometry.index?.count ??
                  this.geometry.attributes.position.count) /
                  3) *
                (this.isInstancedMesh ? this.count : 1),
            });
          };
        }
      });
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      for (const [o, old] of saved) o.onBeforeRender = old;
      return records;
    });
    await cdp.send("HeapProfiler.collectGarbage");
    const memory = await cdp.send("Runtime.getHeapUsage");
    report.performance.push({
      id,
      scene: s,
      viewport: [640, 360],
      quality: "medium",
      elapsed: 40,
      warmupFrames: 8,
      samples,
      memory,
      submission,
    });
  }
} finally {
  let saved = report;
  if (label === "after" && process.env.RIVER_QA_PERF_ONLY === "1") {
    saved = JSON.parse(
      await fs.readFile(`${out}/browser/after-qa.json`, "utf8"),
    );
    saved.performance = report.performance;
    saved.performanceSourceCommit = report.sourceCommit;
    saved.performanceProtocol =
      "Fresh browser context, 3 matched cameras, no prior layout/restart warmup";
    saved.errors.push(...report.errors);
  }
  await fs.writeFile(
    `${out}/browser/${label}-qa.json`,
    JSON.stringify(saved, null, 2) + "\n",
  );
  await browser.close();
  server.kill();
}
assert.equal(report.errors.length, 0, report.errors.join("\n"));
console.log(
  JSON.stringify({
    label,
    layouts: report.layouts.length,
    resets: report.resets.length,
    performance: report.performance.map((p) => ({
      id: p.id,
      calls: p.samples.at(-1).calls,
      triangles: p.samples.at(-1).triangles,
    })),
    errors: report.errors,
  }),
);
