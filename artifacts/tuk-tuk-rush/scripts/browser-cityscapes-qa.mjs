import { startQaServer } from "./browser-vite.mjs";
import { playableDrive } from "./playable-drive.mjs";
/** Real rendered play with browser keyboard/touch events. Individual corridor
 * clips start from stated road positions; no transform edits during each drive. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const out = new URL(
  "../../../docs/graphics/living-cityscapes/browser/",
  import.meta.url,
).pathname;
const rawOut = new URL(
  "../../../generated-artifacts/cityscapes-drives/",
  import.meta.url,
).pathname;
await fs.mkdir(out, { recursive: true });
await fs.mkdir(rawOut, { recursive: true });
const port = 24190,
  server = await startQaServer(port);
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
const videoEpoch = Date.now();
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
  const specs = [
    ["first-player", null, null, -440, -300, 0, 30],
    ["yaowarat-gate", 270, -210, -400, -290, 600, 25],
    ["talatnoi-songwat", 170, 420, -240, 130, 360, 25],
    ["watpho-oldtown", -980, -980, -740, -450, 0, 25],
    ["siam-ratchaprasong", 760, -900, 1240, -690, 600, 25],
    ["iconsiam-riverfront", -700, 680, -440, 1280, 0, 25],
  ];
  for (const spec of specs.filter(
    (s) =>
      !process.env.UI_ONLY &&
      (!process.env.DRIVE_NAMES ||
        process.env.DRIVE_NAMES.split(",").includes(s[0])),
  )) {
    const result = await playableDrive(page, spec, videoEpoch);
    assert(result.metres > 100);
    assert(result.elapsed >= spec[6]);
    drives.push(result);
    console.log(
      "Driven",
      spec[0],
      Math.round(result.metres),
      "m",
      result.elapsed,
      "simulation seconds",
    );
    await fs.writeFile(
      `${out}/partial-qa.json`,
      JSON.stringify({ drives, errors, failed }, null, 2),
    );
    await page.screenshot({
      path: `${out}/${spec[0]}-driven.jpg`,
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
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({
    path: `${out}/portrait-375x812.jpg`,
    type: "jpeg",
    quality: 90,
  });
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
      for (const d of drives) {
        await new Promise((resolve, reject) => {
          const e = spawn(
            "ffmpeg",
            [
              "-hide_banner",
              "-loglevel",
              "error",
              "-y",
              "-ss",
              String(d.wallVideoStart),
              "-t",
              String(d.wallVideoDuration),
              "-i",
              raw,
              "-vf",
              `setpts=${d.elapsed / d.wallVideoDuration}*(PTS-STARTPTS),fps=15`,
              "-c:v",
              "libx264",
              "-crf",
              "28",
              "-preset",
              "veryfast",
              "-pix_fmt",
              "yuv420p",
              "-movflags",
              "+faststart",
              `${out}/${d.name}.mp4`,
            ],
            { stdio: ["ignore", "ignore", "pipe"] },
          );
          let error = "";
          e.stderr.on("data", (b) => (error += b));
          e.on("error", reject);
          e.on("exit", (c) => (c === 0 ? resolve() : reject(new Error(error))));
        });
      }
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
          "fps=6,scale=676:312",
          "-c:v",
          "libx264",
          "-crf",
          "36",
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
