/** Real rendered play with browser keyboard/touch events. Individual corridor
 * clips start from stated road positions; no transform edits during each drive. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const out = new URL(
  "../../../docs/graphics/architectural-character/browser/",
  import.meta.url,
).pathname;
const rawOut = new URL(
  "../../../generated-artifacts/bangkok-drives/",
  import.meta.url,
).pathname;
await fs.mkdir(out, { recursive: true });
await fs.mkdir(rawOut, { recursive: true });
const port = 24184,
  server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      env: { ...process.env, PORT: String(port), BASE_PATH: "/" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
let log = "";
server.stdout.on("data", (v) => (log += v));
server.stderr.on("data", (v) => (log += v));
await new Promise((resolve, reject) => {
  const t = setInterval(() => {
    if (log.includes("Local:")) {
      clearInterval(t);
      resolve();
    }
  }, 100);
  server.on("exit", () => {
    clearInterval(t);
    reject(new Error(log));
  });
});
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
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  hasTouch: true,
  recordVideo: { dir: rawOut, size: { width: 844, height: 390 } },
});
const page = await context.newPage();
page.setDefaultTimeout(120000);
const errors = [],
  failed = [],
  drives = [],
  restarts = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
});
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const frames = async (n = 3) => {
  const id = await page.evaluate(() => window.__graphics.frameId);
  await page.waitForFunction(
    ({ id, n }) => window.__graphics.frameId > id + n,
    { id, n },
    { timeout: 120000 },
  );
};
try {
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.__graphics, null, {
    timeout: 120000,
  });
  await page.getByTestId("button-free-roam").click();
  await frames();
  for (const [name, x, z] of [
    ["yaowarat", null, null],
    ["talatnoi", 160, 360],
    ["oldtown", -900, -540],
    ["siam", 850, -690],
    ["riverfront", -680, 910],
  ]) {
    const start = await page.evaluate(
      ({ x, z }) => {
        const e = window.__graphics.engine;
        e.restart();
        e.setQuality("low");
        delete window.__artCamera;
        if (x !== null) {
          const d = e.model.district,
            n = d.nodes.reduce((b, n) =>
              Math.hypot(n.x - x, n.z - z) < Math.hypot(b.x - x, b.z - z)
                ? n
                : b,
            ),
            r =
              d.roads.find((r) => r.a === n.id && !r.bridge && !r.shortcut) ||
              d.roads.find((r) => r.b === n.id && !r.bridge && !r.shortcut),
            next = d.nodes.find((q) => q.id === (r.a === n.id ? r.b : r.a));
          Object.assign(e.model.player, {
            x: n.x,
            z: n.z,
            heading: Math.atan2(next.x - n.x, next.z - n.z),
            speed: 0,
          });
        }
        return { ...e.model.player };
      },
      { x, z },
    );
    await frames(5);
    await page.keyboard.down("ArrowUp");
    await page.waitForFunction(
      ({ x, z }) =>
        Math.hypot(
          window.__graphics.engine.model.player.x - x,
          window.__graphics.engine.model.player.z - z,
        ) > 30,
      { x: start.x, z: start.z },
      { timeout: 120000 },
    );
    await page.keyboard.up("ArrowUp");
    await page.keyboard.down("Space");
    await page.waitForTimeout(1400);
    await page.keyboard.up("Space");
    const end = await page.evaluate(() => ({
      ...window.__graphics.engine.model.player,
      elapsed: window.__graphics.engine.model.snapshot.elapsed,
    }));
    const metres = Math.hypot(end.x - start.x, end.z - start.z);
    console.log(
      "Controller sample",
      name,
      JSON.stringify({ start, end, metres }),
    );
    assert(metres > 10, `Controller did not drive ${name}`);
    drives.push({
      name,
      start,
      end,
      metres,
      inputs:
        "ArrowUp throttle, Space brake; no camera override or position edits during clip",
    });
    console.log("Driven", name, Math.round(metres), "m");
    await page.screenshot({
      path: `${out}/${name}-driven.jpg`,
      type: "jpeg",
      quality: 90,
    });
  }
  // Touch gas must release. The large map pauses and supports mobile gestures.
  await page.evaluate(() => window.__graphics.engine.restart());
  const cdp = await context.newCDPSession(page),
    gas = await page.getByTestId("button-gas").boundingBox();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 1, x: gas.x + gas.width / 2, y: gas.y + gas.height / 2 },
    ],
  });
  await page.waitForFunction(() => window.__graphics.engine.model.input.gas);
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
  await page.waitForTimeout(400);
  assert.equal(
    await page.evaluate(() => window.__graphics.engine.model.snapshot.elapsed),
    time,
  );
  const svg = page.locator(".tt-world-map-body > svg"),
    box = await svg.boundingBox(),
    center = { x: box.x + box.width / 2, y: box.y + box.height * 0.6 },
    initial = await svg.getAttribute("viewBox");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 2, ...center }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ id: 2, x: center.x + 30, y: center.y - 10 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.notEqual(await svg.getAttribute("viewBox"), initial);
  const width = Number((await svg.getAttribute("viewBox")).split(" ")[2]);
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
      { id: 3, x: center.x - 45, y: center.y },
      { id: 4, x: center.x + 45, y: center.y },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert(Number((await svg.getAttribute("viewBox")).split(" ")[2]) < width);
  await page.setViewportSize({ width: 430, height: 932 });
  assert(await page.getByTestId("world-map").isVisible());
  assert(!(await page.getByTestId("hint-rotate").isVisible()));
  await page.screenshot({
    path: `${out}/map-portrait.jpg`,
    type: "jpeg",
    quality: 90,
  });
  await page.getByTestId("button-close-map").click();
  assert.equal(
    await page.evaluate(() => window.__graphics.engine.model.snapshot.phase),
    "paused",
  );
  await page.setViewportSize({ width: 844, height: 390 });
  for (const [width, height] of [
    [932, 430],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.__graphics.engine.resume());
    await frames(5);
    assert(await page.getByTestId("button-gas").isVisible());
    await page.screenshot({
      path: `${out}/landscape-${width}x${height}.jpg`,
      type: "jpeg",
      quality: 90,
    });
  }
  await page.setViewportSize({ width: 844, height: 390 });
  // Engine restarts must reuse the city, not allocate another scene.
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => {
      window.__graphics.engine.restart();
      window.__graphics.engine.pause();
    });
    await frames(5);
    restarts.push(
      await page.evaluate(() => ({
        ...window.__graphics.stats,
        cityId: window.__graphics.scene.getObjectByName("City").uuid,
      })),
    );
  }
  assert(restarts.every((s) => s.cityId === restarts[0].cityId));
  assert(
    restarts.every(
      (s) =>
        s.geometries <= restarts[0].geometries + 1 &&
        s.textures === restarts[0].textures,
    ),
  );
  const supported = await page.evaluate(() => {
    const gl = window.__graphics.gl.getContext(),
      ext = gl.getExtension("WEBGL_lose_context");
    if (!ext) return false;
    window.__qaRestoreContext = ext;
    ext.loseContext();
    return true;
  });
  assert(supported);
  await page.waitForFunction(() =>
    window.__graphics.gl.getContext().isContextLost(),
  );
  await page.waitForFunction(
    () => window.__graphics.engine.model.snapshot.phase === "paused",
  );
  await page.evaluate(() => window.__qaRestoreContext.restoreContext());
  await page.waitForFunction(
    () => !window.__graphics.gl.getContext().isContextLost(),
  );
  await frames(8);
  await page.screenshot({
    path: `${out}/context-restored.jpg`,
    type: "jpeg",
    quality: 90,
  });
  // Original district still builds its full facade and street-life renderer.
  await page.goto(`http://127.0.0.1:${port}/?world=chinatown`);
  await page.waitForFunction(
    () =>
      window.__graphics &&
      window.__graphics.engine.model.district.worldId !== "bangkok",
    null,
    { timeout: 120000 },
  );
  await page.getByTestId("button-free-roam").click();
  await frames(5);
  await page.screenshot({
    path: `${out}/original-chinatown.jpg`,
    type: "jpeg",
    quality: 90,
  });
  const original = await page.evaluate(() => ({
    facades: window.__graphics.scene.getObjectByName("Facades").children.length,
    people: window.__graphics.life.people?.length,
  }));
  assert(original.facades > 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  await fs.writeFile(
    `${out}/qa.json`,
    JSON.stringify(
      {
        pass: true,
        drives,
        touchRelease: true,
        mapPanPinch: true,
        portraitMap: true,
        restarts,
        contextLossAndRecovery: true,
        original,
        errors,
        failed,
        performanceEnvironment:
          "Chromium software WebGL, not device certification",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ pass: true, drives: drives.length, out }));
} finally {
  const video = page.video();
  await context.close();
  try {
    if (video) {
      const raw = `${rawOut}/player-controlled-drives.webm`;
      await video.saveAs(raw);
      const encoder = spawn(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-i",
          raw,
          "-vf",
          "fps=10",
          "-c:v",
          "libx264",
          "-crf",
          "32",
          "-preset",
          "veryfast",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          `${out}/player-controlled-drives.mp4`,
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      let errors = "";
      encoder.stderr.on("data", (b) => (errors += b));
      await new Promise((resolve, reject) => {
        encoder.on("error", reject);
        encoder.on("exit", (code) =>
          code === 0 ? resolve() : reject(new Error(errors)),
        );
      });
    }
  } finally {
    await browser.close();
    server.kill();
  }
}
