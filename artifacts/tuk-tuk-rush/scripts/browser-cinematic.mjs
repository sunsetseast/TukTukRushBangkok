import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = path.resolve(
    process.env.QA_OUT || "../../docs/qa/cinematic-yaowarat/browser",
  ),
  server = await startQaServer(24273);
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (process.env.CI ? chromium.executablePath() : undefined),
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const checks = [],
  errors = [];
try {
  const p = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  p.setDefaultTimeout(120000);
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error" || /GL_INVALID|WebGL: INVALID/.test(m.text()))
      errors.push(m.text());
  });
  await p.goto("http://127.0.0.1:24273");
  await p.waitForFunction(() => window.__graphics?.frameId > 2);
  const frames = async () => {
    const f = await p.evaluate(() => window.__graphics.frameId);
    await p.waitForFunction((f) => window.__graphics.frameId > f + 3, f);
  };
  for (const [width, height] of [
    [375, 812],
    [430, 932],
    [844, 390],
    [932, 430],
    [1280, 800],
  ]) {
    await p.setViewportSize({ width, height });
    await frames();
    const layout = await p.evaluate(() => {
      const r = (el) => {
        const b = el.getBoundingClientRect();
        return {
          x: b.x,
          y: b.y,
          w: b.width,
          h: b.height,
          right: b.right,
          bottom: b.bottom,
        };
      };
      const buttons = [
        ...document.querySelectorAll(
          ".tt-cinematic-title button,.tt-cinematic-title a",
        ),
      ].map((el) => ({ name: el.textContent.trim(), ...r(el) }));
      const g = window.__graphics,
        hero = new g.three.Vector3();
      g.hero.getWorldPosition(hero);
      hero.y += 1.2;
      hero.project(g.camera);
      return {
        buttons,
        hero: [hero.x, hero.y],
        covered: [
          ...document.querySelectorAll(
            ".tt-arcade-logo,.tt-cinematic-tagline,.tt-arcade-actions,.tt-arcade-secondary,.tt-arcade-profile,.tt-yaowarat-plaque",
          ),
        ]
          .filter((el) => {
            const b = el.getBoundingClientRect(),
              x = ((hero.x + 1) * innerWidth) / 2,
              y = ((1 - hero.y) * innerHeight) / 2;
            return (
              b.width > 0 &&
              b.height > 0 &&
              x > b.left &&
              x < b.right &&
              y > b.top &&
              y < b.bottom
            );
          })
          .map((el) => el.className),
        canvas: r(document.querySelector("canvas")),
        scroll: [
          document.documentElement.scrollWidth,
          document.documentElement.scrollHeight,
        ],
        width: innerWidth,
        height: innerHeight,
      };
    });
    assert.deepEqual(
      layout.covered,
      [],
      "Live vehicle stays visible between the logo and actions",
    );
    for (const b of layout.buttons) {
      assert(
        b.x >= 0 && b.y >= 0 && b.right <= width + 1 && b.bottom <= height + 1,
        `${width}×${height} clipped ${b.name}`,
      );
      assert(b.h >= 44, `Accessible target ${b.name}`);
    }
    assert(
      Math.abs(layout.hero[0]) < 0.9 && Math.abs(layout.hero[1]) < 0.95,
      "Visible live vehicle",
    );
    if (width > height)
      assert(layout.hero[0] > 0.15, "Live tuk stays clear of menu");
    assert(
      layout.scroll[0] <= width && layout.scroll[1] <= height,
      "No accidental document scroll",
    );
    checks.push(
      `Title controls, safe viewport, live vehicle and 44px targets at ${width}×${height}`,
    );
  }
  await p.setViewportSize({ width: 844, height: 390 });
  await p.evaluate(() => {
    const e = window.__graphics.engine,
      step = e.update.bind(e);
    e.update = (dt) => {
      e.slowTime = -1e6;
      step(dt);
    };
  });
  await p.getByTestId("button-title-settings").click();
  await p.getByTestId("settings").waitFor();
  await p.getByTestId("button-quality-medium").click();
  await p.keyboard.press("Escape");
  assert(await p.getByTestId("button-free-roam").isVisible());
  await p.getByTestId("button-title-career").click();
  await p.getByTestId("driver-career").waitFor();
  await p.keyboard.press("Escape");
  assert(await p.getByTestId("button-free-roam").isVisible());
  checks.push(
    "Settings, quality choice, persisted career and Escape return to title",
  );
  await p.getByTestId("button-free-roam").click();
  await p.locator(".tt-title").waitFor({ state: "detached" });
  await frames();
  let state = await p.evaluate(() => {
    const g = window.__graphics,
      p = g.engine.model.player;
    return {
      phase: g.engine.model.snapshot.phase,
      height: g.camera.position.y,
      distance: Math.hypot(g.hero.position.x - p.x, g.hero.position.z - p.z),
      revision: g.engine.cameraRevision,
    };
  });
  assert.equal(state.phase, "playing");
  assert(
    state.height < 6 && state.distance < 0.001,
    "Title composition cannot leak into driving",
  );
  await p.getByTestId("button-pause").click();
  await p.getByTestId("button-restart").click();
  await p.getByTestId("button-confirm-leave").click();
  await frames();
  state = await p.evaluate(() => ({
    height: window.__graphics.camera.position.y,
    phase: window.__graphics.engine.model.snapshot.phase,
  }));
  assert(state.height < 6 && state.phase === "playing");
  checks.push(
    "Start and confirmed restart restore the actual player chase camera",
  );
  assert.equal(
    await p.evaluate(() => window.__graphics.gl.getContext().getError()),
    0,
  );
  await p.evaluate(() => {
    const g = window.__graphics;
    window.__qaLostContext = g.gl
      .getContext()
      .getExtension("WEBGL_lose_context");
    window.__qaLostContext?.loseContext();
  });
  await p.getByText("Restoring graphics…").waitFor();
  // Chromium's explicit test extension is the only supported way to force context loss.
  await p.evaluate(() => window.__qaLostContext?.restoreContext());
  await p.getByText("Restoring graphics…").waitFor({ state: "hidden" });
  await frames();
  assert.equal(
    await p.evaluate(() => window.__graphics.engine.model.snapshot.phase),
    "paused",
    "Context recovery must never resume held controls",
  );
  await p.getByTestId("button-resume").click();
  await frames();
  assert.equal(
    await p.evaluate(() => window.__graphics.gl.getContext().getError()),
    0,
  );
  assert.equal(
    await p.evaluate(() => window.__graphics.engine.model.snapshot.quality),
    "medium",
  );
  assert.equal(
    await p.evaluate(() => window.__graphics.gl.shadowMap.enabled),
    false,
  );
  assert(await p.evaluate(() => window.__graphics.gl.info.render.calls > 50));
  checks.push(
    "Explicit WebGL loss/restore returns rendering with simulation safely paused, then resumes",
  );
  assert.deepEqual(errors, []);
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(
    `${out}/checks.json`,
    JSON.stringify({ checks, errors, physicalIPhone: false }, null, 2),
  );
  console.log("PASS", JSON.stringify(checks));
} finally {
  await browser.close();
  server.kill();
}
