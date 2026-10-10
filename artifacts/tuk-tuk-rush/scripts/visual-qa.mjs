/** Run against a Vite dev server. Diagnostics/capture hooks are tree-shaken from production. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--single-process",
    "--no-zygote",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  hasTouch: true,
});
const page = await context.newPage(),
  errors = [],
  failed = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) failed.push(r.url());
});
const url = process.env.GAME_URL || "http://127.0.0.1:5173";
const out = new URL("../../../docs/graphics/", import.meta.url);
await fs.mkdir(new URL("screenshots/", out), { recursive: true });
const shot = async (name) =>
  page.screenshot({
    type: "jpeg",
    quality: 88,
    path: new URL("screenshots/" + name + ".jpg", out).pathname,
  });
const nextFrames = async (n = 2) => {
  const id = await page.evaluate(() => window.__graphics.frameId);
  await page.waitForFunction(
    ({ id, n }) => window.__graphics.frameId >= id + n,
    { id, n },
    { timeout: 60000 },
  );
};
await page.goto(url);
await page.waitForFunction(() => window.__graphics, { timeout: 60000 });
await page.getByTestId("button-free-roam").click();
await nextFrames();
await shot("after-chase");
const samples = {};
for (const quality of ["medium", "low"]) {
  await page.evaluate((q) => window.__graphics.engine.setQuality(q), quality);
  await nextFrames();
  const frames = [];
  for (let i = 0; i < 12; i++) {
    await nextFrames(1);
    frames.push(await page.evaluate(() => ({ ...window.__graphics.stats })));
  }
  const sorted = frames.map((f) => f.frameMs).sort((a, b) => a - b);
  samples[quality] = {
    frames,
    medianFrameMs: sorted[Math.floor(sorted.length / 2)],
    p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
  };
}
await page.evaluate(() => {
  const e = window.__graphics.engine;
  e.setQuality("medium");
  e.start("free");
  Object.assign(e.model.player, { x: -145, z: 40, heading: Math.PI / 2 });
  window.__artCamera = { position: [-160, 4, 48], look: [-123, 3.1, 40] };
});
await nextFrames();
await shot("after-chinatown");
await page.evaluate(() => {
  const p = window.__graphics.engine.model.player;
  window.__artCamera = {
    position: [p.x + 3.4, 2.8, p.z + 4.7],
    look: [p.x, 1.15, p.z],
  };
});
await page.addStyleTag({ content: ".tt-ui {visibility:hidden}" });
await nextFrames();
await shot("after-hero");
await page.evaluate(() =>
  document.querySelectorAll("style").forEach((el) => {
    if (el.textContent === ".tt-ui {visibility:hidden}") el.remove();
  }),
);
await page.evaluate(() => {
  const e = window.__graphics.engine;
  e.start("free");
  for (let i = 0; i < 3600; i++) e.update(1 / 60);
  const car =
    e.model.traffic.find((c) => Math.abs(c.z - 40) < 8) || e.model.traffic[0];
  const n = e.model.district.nodes.find((n) => n.id === car.to);
  Object.assign(e.model.player, {
    x: n.x - 13,
    z: n.z + 1,
    heading: Math.PI / 2,
  });
  window.__artCamera = {
    position: [n.x - 24, 5.5, n.z + 18],
    look: [car.x, 1, car.z],
  };
});
await nextFrames();
const trafficA = await page.evaluate(() =>
  window.__graphics.engine.model.traffic.map((c) => [c.x, c.z]),
);
await nextFrames(4);
const trafficB = await page.evaluate(() =>
  window.__graphics.engine.model.traffic.map((c) => [c.x, c.z]),
);
assert(
  trafficB.some(
    (p, i) => Math.hypot(p[0] - trafficA[i][0], p[1] - trafficA[i][1]) > 0.01,
  ),
  "Traffic must actually move",
);
await shot("after-intersection");
// Mission transitions, actual render visibility, scoring, pause, free/shift clocks.
const mission = await page.evaluate(() => {
  const e = window.__graphics.engine;
  delete window.__artCamera;
  e.start("shift");
  Object.assign(e.model.player, {
    x: e.model.mission.pickup.x,
    z: e.model.mission.pickup.z,
  });
  for (let i = 0; i < 80; i++) e.update(1 / 60);
  return { stage: e.model.snapshot.stage, time: e.model.snapshot.shiftTime };
});
assert.equal(mission.stage, "delivery");
assert(mission.time < 180);
await nextFrames();
assert(
  await page.evaluate(
    () => window.__graphics.hero.getObjectByName("Passenger").visible,
  ),
);
const delivered = await page.evaluate(() => {
  const e = window.__graphics.engine;
  Object.assign(e.model.player, {
    x: e.model.mission.destination.x,
    z: e.model.mission.destination.z,
  });
  for (let i = 0; i < 80; i++) e.update(1 / 60);
  return { ...e.model.snapshot };
});
assert.equal(delivered.deliveries, 1);
assert(delivered.earnings > 0 && delivered.score > 0);
await nextFrames();
assert(
  !(await page.evaluate(
    () => window.__graphics.hero.getObjectByName("Passenger").visible,
  )),
);
const pause = await page.evaluate(() => {
  const e = window.__graphics.engine;
  e.pause();
  const p = { ...e.model.player },
    time = e.model.snapshot.shiftTime;
  for (let i = 0; i < 60; i++) e.update(1 / 60);
  return {
    same:
      p.x === e.model.player.x &&
      p.z === e.model.player.z &&
      time === e.model.snapshot.shiftTime,
    phase: e.model.snapshot.phase,
  };
});
assert(pause.same && pause.phase === "paused");
await page.evaluate(() => {
  const e = window.__graphics.engine;
  e.start("free");
  for (let i = 0; i < 300; i++) e.update(1 / 60);
});
assert.equal(
  await page.evaluate(() => window.__graphics.engine.model.snapshot.shiftTime),
  180,
);
const routeDrive = await page.evaluate(() => {
  const e = window.__graphics.engine;
  e.start("free");
  e.model.input.gas = true;
  let hits = 0;
  for (let i = 0; i < 1400; i++) {
    e.update(1 / 60);
    if (e.model.player.collision) hits++;
    if (e.model.player.x > 325) break;
  }
  const result = {
    x: e.model.player.x,
    hits,
    foodCarts: e.model.district.obstacles.filter(
      (b) => b.color === "#c4281c" && Math.abs(b.z - 40) < 18,
    ).length,
  };
  e.start("free");
  return result;
});
assert(
  routeDrive.x > 325 && routeDrive.hits === 0,
  "Rendered-scene collision traversal",
);
assert(
  routeDrive.foodCarts >= 3,
  "Yaowarat must contain actual collision-checked food carts",
);
const median = (array) =>
  [...array].sort((a, b) => a - b)[Math.floor(array.length / 2)];
assert(
  median(samples.low.frames.map((f) => f.calls)) <
    median(samples.medium.frames.map((f) => f.calls)),
);
assert(
  median(samples.low.frames.map((f) => f.triangles)) <
    median(samples.medium.frames.map((f) => f.triangles)),
);
// Restart reuses templates/scene; compare allocated GPU resources at identical chase pose.
await nextFrames(4);
const resources = [];
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => window.__graphics.engine.restart());
  await nextFrames(3);
  resources.push(
    await page.evaluate(() => ({
      ...window.__graphics.gl.info.memory,
      meshes: window.__graphics.scene.children.length,
      obstacles: window.__graphics.engine.model.district.obstacles.length,
    })),
  );
}
assert(
  resources.every(
    (r) =>
      r.geometries === resources[0].geometries &&
      r.textures === resources[0].textures &&
      r.meshes === resources[0].meshes &&
      r.obstacles === resources[0].obstacles,
  ),
  "Restart resource growth",
);
// Two genuine CDP touch contacts: steering + pedal held concurrently.
await page.setViewportSize({ width: 844, height: 390 });
await nextFrames();
const cdp = await context.newCDPSession(page);
const contacts = [
  { x: 72, y: 285, id: 1 },
  { x: 777, y: 329, id: 2 },
];
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: contacts,
});
contacts[0].x = 119;
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchMove",
  touchPoints: contacts,
});
await page.waitForFunction(
  () =>
    window.__graphics.engine.model.input.gas &&
    window.__graphics.engine.model.input.steer > 0.5,
);
await nextFrames();
assert(
  await page.evaluate(
    () =>
      Math.abs(window.__graphics.hero.getObjectByName("Steering").rotation.y) >
      0.1,
  ),
);
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [contacts[0]],
});
await page.waitForFunction(
  () =>
    window.__graphics.engine.model.input.gas &&
    window.__graphics.engine.model.input.steer === 0,
);
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
await page.waitForFunction(() => !window.__graphics.engine.model.input.gas);
await shot("after-mobile-hud");
await page.setViewportSize({ width: 932, height: 430 });
await nextFrames();
await shot("after-wide-mobile");
await page.setViewportSize({ width: 430, height: 932 });
await page.getByTestId("hint-rotate").waitFor({ state: "visible" });
await page.waitForFunction(
  () => window.__graphics.engine.model.snapshot.phase === "paused",
);
assert.equal(
  await page.evaluate(() => window.__graphics.engine.model.snapshot.phase),
  "paused",
);
// Real WEBGL_lose_context event; renderer restores assets without constructing another city.
await page.setViewportSize({ width: 844, height: 390 });
await page.evaluate(() => {
  window.__graphics.engine.resume();
  window.__lostExtension = window.__graphics.gl
    .getContext()
    .getExtension("WEBGL_lose_context");
  window.__lostExtension.loseContext();
});
await page.getByText("Restoring graphics…").waitFor({ state: "visible" });
assert.equal(
  await page.evaluate(() => window.__graphics.engine.model.snapshot.phase),
  "paused",
);
await page.evaluate(() => window.__lostExtension.restoreContext());
await page
  .getByText("Restoring graphics…")
  .waitFor({ state: "hidden", timeout: 60000 });
await nextFrames(3);
assert.equal(
  await page.evaluate(() => window.__graphics.gl.getContext().getError()),
  0,
);
const buffers = await page.evaluate(() => {
  const d = window.__graphics,
    geos = new Set(),
    textures = new Set();
  d.scene.traverse((o) => {
    if (o.geometry) geos.add(o.geometry);
    for (const m of Array.isArray(o.material)
      ? o.material
      : o.material
        ? [o.material]
        : [])
      for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
  });
  let bytes = 0;
  for (const g of geos) {
    if (g.index) bytes += g.index.array.byteLength;
    for (const a of Object.values(g.attributes)) bytes += a.array.byteLength;
  }
  const gl = d.gl.getContext(),
    ext = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    geometryBytes: bytes,
    textures: textures.size,
    renderer: ext
      ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER),
    version: gl.getParameter(gl.VERSION),
  };
});
assert.equal(errors.length, 0, errors.join("\n"));
assert.equal(failed.length, 0, failed.join("\n"));
// Required model and texture failures surface a retry state, rather than hidden placeholders.
for (const missing of ["hero-tuktuk.glb", "signs.png"]) {
  const p = await context.newPage();
  await p.route("**/" + missing, (r) => r.abort());
  await p.goto(url);
  await p
    .getByText("The Bangkok art assets could not load.")
    .waitFor({ timeout: 60000 });
  assert(
    await p.getByRole("button", { name: "Retry", exact: true }).isVisible(),
  );
  await p.close();
}
await fs.writeFile(
  new URL("measurements.json", out),
  JSON.stringify(
    {
      environment: {
        browser: await browser.version(),
        viewport: "1280x720 @ DPR 1",
        hardware: "Linux software SwiftShader; not an iPhone",
      },
      samples,
      resources,
      buffers,
      checks: [
        "assets load",
        "no JS/HTTP/WebGL errors",
        "traffic movement",
        "pickup/delivery/score",
        "passenger visibility",
        "pause",
        "Free Ride clock",
        "shift clock",
        "five stable restarts",
        "multitouch gas and steering/release",
        "front steering animation",
        "844x390 and 932x430 landscape",
        "portrait auto-pause",
        "WebGL context restoration",
        "model and texture failure/retry",
        "actual scene route and food-cart collisions",
        "quality reduces submissions",
      ],
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      checks: 17,
      resources,
      buffers,
      medians: Object.fromEntries(
        Object.entries(samples).map(([q, s]) => [q, s.medianFrameMs]),
      ),
    },
    null,
    2,
  ),
);
await browser.close();
