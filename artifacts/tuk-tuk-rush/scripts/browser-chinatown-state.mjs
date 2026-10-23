import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = new URL("../../../docs/qa/chinatown-visual/", import.meta.url)
    .pathname,
  server = await startQaServer(24687),
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--no-zygote",
      "--single-process",
      "--in-process-gpu",
      "--ignore-gpu-blocklist",
      "--disable-dev-shm-usage",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
const p = await browser.newPage({
  viewport: { width: 160, height: 90 },
  hasTouch: true,
});
p.setDefaultTimeout(180000);
const r = {
  physicalSafari: false,
  errors: [],
  layouts: [],
  resets: [],
  source:
    "Production renderer and controls in Vite development; QA hook places fixtures, no runtime source changes.",
};
p.on("pageerror", (e) => r.errors.push(e.message));
await p.addInitScript(() =>
  localStorage.setItem(
    "ttr-interface-v1",
    JSON.stringify({ quality: "low", motion: "reduced" }),
  ),
);
try {
  await p.goto("http://127.0.0.1:24687/?qa=1");
  await p.waitForFunction(() => window.__graphics?.frameId > 1);
  await p.getByTestId("button-free-roam").click();
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.frameTime = -1e8;
    e.model.snapshot.elapsed = 650;
  });
  for (const [width, height] of [
    [375, 812],
    [430, 932],
    [844, 390],
    [1280, 800],
  ]) {
    await p.setViewportSize({ width, height });
    if (width > height)
      await p.evaluate(() => window.__graphics.engine.resume());
    await p.waitForTimeout(900);
    const layout = await p.evaluate(() => {
      const ids = [
        "text-current-street",
        "destination-banner",
        "button-pause",
        "button-open-map",
        "button-gas",
        "control-steer",
      ];
      return {
        width: innerWidth,
        height: innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        boxes: ids.map((id) => {
          const e = document.querySelector(`[data-testid="${id}"]`),
            b = e?.getBoundingClientRect(),
            s = e && getComputedStyle(e);
          return {
            id,
            visible:
              !!b &&
              b.width > 0 &&
              b.height > 0 &&
              s.visibility !== "hidden" &&
              s.display !== "none",
            box: b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null,
          };
        }),
      };
    });
    assert(!layout.overflow);
    if (width > height) {
      const a = layout.boxes.find((q) => q.id === "text-current-street");
      assert(a.visible);
      for (const q of layout.boxes.filter((q) => q.id !== a.id && q.visible)) {
        const b = a.box,
          c = q.box;
        assert(
          b.x + b.w <= c.x ||
            c.x + c.w <= b.x ||
            b.y + b.h <= c.y ||
            c.y + c.h <= b.y,
          `Street badge overlaps ${q.id}`,
        );
      }
    }
    await p.screenshot({
      path: out + `after-final/hud-${width}x${height}.jpg`,
      type: "jpeg",
      quality: 90,
    });
    r.layouts.push(layout);
    console.log("layout", width, height);
  }
  await p.setViewportSize({ width: 844, height: 390 });
  await p.evaluate(() => {
    const e = window.__graphics.engine,
      d = e.model.district,
      n = new Map(d.nodes.map((n) => [n.id, n])),
      road = d.roads.filter((r) => r.corridor === "mittraphap").at(-3),
      a = n.get(road.a),
      b = n.get(road.b);
    e.resume();
    Object.assign(e.model.player, {
      x: (a.x + b.x) / 2,
      z: (a.z + b.z) / 2,
      heading: Math.atan2(b.x - a.x, b.z - a.z),
      speed: 0,
    });
    e.cameraRevision++;
  });
  await p.waitForFunction(() =>
    document
      .querySelector('[data-testid="text-current-street"]')
      ?.textContent.includes("Mittraphap Thai-China Road"),
  );
  assert(
    await p
      .getByTestId("text-current-street")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  );
  await p.screenshot({
    path: out + "after-final/hud-long-name.jpg",
    type: "jpeg",
    quality: 90,
  });
  r.longName = true;
  await p.getByTestId("button-open-map").click();
  await p.getByTestId("world-map").waitFor();
  await p.screenshot({
    path: out + "after-final/world-map.jpg",
    type: "jpeg",
    quality: 90,
  });
  await p.getByRole("button", { name: "Back to driving", exact: true }).click();
  r.mapReturn = true;
  r.icon = await p.evaluate(() => {
    const e = window.__graphics.engine,
      d = e.model.district,
      a = d.destinations.find((a) => a.landmarkId === "icon"),
      q = d.nodes.find((n) => n.id === a.arrivalNode);
    Object.assign(e.model.player, { x: q.x, z: q.z, speed: 0, collision: 0 });
    e.resume();
    return {
      opened: e.viewLandmark("icon"),
      target: e.model.snapshot.viewingLandmark,
    };
  });
  assert(
    r.icon.opened,
    "Actual ICONSIAM LOOK opens at its real destination arrival",
  );
  await p.waitForTimeout(800);
  await p.evaluate(() => window.__graphics.engine.resume());
  await p.waitForTimeout(800);
  for (let i = 0; i < 8; i++) {
    await p.evaluate(() => {
      const e = window.__graphics.engine;
      e.restart();
      e.pause();
    });
    const f = await p.evaluate(() => window.__graphics.frameId);
    await p.waitForFunction((f) => window.__graphics.frameId > f + 2, f);
    r.resets.push(
      await p.evaluate(() => {
        const g = window.__graphics,
          c = g.camera,
          p = g.engine.model.player;
        return {
          stats: g.stats,
          glError: g.gl.getContext().getError(),
          override: !!window.__artCamera,
          inspecting: g.engine.model.snapshot.viewingLandmark ?? null,
          camera: c.position.toArray(),
          player: [p.x, p.z],
          distance: Math.hypot(c.position.x - p.x, c.position.z - p.z),
        };
      }),
    );
  }
  for (const q of r.resets.slice(5)) {
    assert.equal(q.stats.geometries, r.resets.at(-1).stats.geometries);
    assert.equal(q.stats.textures, r.resets.at(-1).stats.textures);
    assert.equal(q.glError, 0);
    assert(!q.override && !q.inspecting);
    assert(q.distance < 20);
  }
  assert.equal(r.errors.length, 0);
  r.pass = true;
} finally {
  await fs.writeFile(
    out + "validation/browser-state.json",
    JSON.stringify(r, null, 2) + "\n",
  );
  await browser.close();
  server.kill();
}
