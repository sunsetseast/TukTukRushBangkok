import { startQaServer } from "./browser-vite.mjs";
/** Sequential warm-frame comparison without screenshot/video encoding. */
import fs from "node:fs/promises";
import { chromium } from "playwright";
const root =
    process.env.PROFILE_ROOT ||
    new URL("../../../docs/graphics/living-cityscapes/", import.meta.url)
      .pathname,
  label = process.env.PROFILE_LABEL || "after",
  port = 24192;
await fs.mkdir(`${root}/${label}`, { recursive: true });
const baseline = JSON.parse(
  await fs.readFile(`${root}/before/measurements.json`, "utf8"),
);
const server = await startQaServer(port);
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
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const started = performance.now();
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.__graphics, null, {
    timeout: 120000,
  });
  const loadMs = performance.now() - started;
  await page.getByTestId("button-free-roam").click();
  await page.evaluate(() => window.__graphics.engine.pause());
  await page.addStyleTag({ content: ".tt-ui{visibility:hidden!important}" });
  const scenes = baseline.survey.filter(
      (s) =>
        ["chinatown", "talatnoi", "oldtown", "siam", "icon"].includes(s.name) &&
        s.elapsed === 600,
    ),
    survey = [];
  for (const scene of scenes) {
    await page.evaluate(({ pose, quality, elapsed }) => {
      const e = window.__graphics.engine;
      e.pause();
      e.setQuality(quality);
      e.frameTime = -100000;
      Object.assign(e.model.player, { ...pose, speed: 0 });
      e.model.snapshot.elapsed = elapsed;
      const x = Math.sin(pose.heading),
        z = Math.cos(pose.heading);
      window.__artCamera = {
        position: [pose.x - x * 10, 4.5, pose.z - z * 10],
        look: [pose.x + x * 35, 6, pose.z + z * 35],
      };
    }, scene);
    const result = await page.evaluate(async () => {
      const wait = () => new Promise((r) => requestAnimationFrame(r));
      for (let i = 0; i < 12; i++) await wait();
      const samples = [];
      for (let i = 0; i < 40; i++) {
        await wait();
        samples.push({ ...window.__graphics.stats });
      }
      const g = window.__graphics,
        geos = new Set(),
        textures = new Set(),
        materials = new Set();
      let bytes = 0,
        instanceBytes = 0;
      g.scene.traverse((o) => {
        if (o.geometry && !geos.has(o.geometry)) {
          geos.add(o.geometry);
          for (const a of Object.values(o.geometry.attributes))
            bytes += a.array.byteLength;
          if (o.geometry.index) bytes += o.geometry.index.array.byteLength;
        }
        if (o.instanceMatrix)
          instanceBytes += o.instanceMatrix.array.byteLength;
        if (o.instanceColor) instanceBytes += o.instanceColor.array.byteLength;
        for (const m of [].concat(o.material || [])) {
          materials.add(m);
          for (const t of Object.values(m)) if (t?.isTexture) textures.add(t);
        }
      });
      return {
        samples,
        actualQuality: g.engine.model.snapshot.quality,
        gpuError: g.gl.getContext().getError(),
        resource: {
          geometries: geos.size,
          materials: materials.size,
          textureObjects: textures.size,
          cpuGeometryBytes: bytes,
          cpuInstanceBytes: instanceBytes,
          cpuSceneBufferBytes: bytes + instanceBytes,
          texturePixels: [...textures].reduce(
            (n, t) => n + (t.image?.width || 0) * (t.image?.height || 0),
            0,
          ),
          heapBytes: performance.memory?.usedJSHeapSize,
        },
      };
    });
    survey.push({
      name: scene.name,
      quality: scene.quality,
      elapsed: scene.elapsed,
      pose: scene.pose,
      ...result,
    });
    console.log("Profile", label, scene.name, scene.quality);
    await fs.writeFile(
      `${root}/${label}/isolated-profile.json`,
      JSON.stringify(
        { label, loadMs, survey, errors, incomplete: true },
        null,
        2,
      ),
    );
  }
  const restarts = [];
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => {
      const e = window.__graphics.engine;
      e.restart();
      e.pause();
      e.setQuality("low");
      delete window.__artCamera;
    });
    const id = await page.evaluate(() => window.__graphics.frameId);
    await page.waitForFunction((f) => window.__graphics.frameId > f + 8, id);
    restarts.push(await page.evaluate(() => ({ ...window.__graphics.stats })));
  }
  if (
    errors.length ||
    survey.some((s) => s.gpuError || s.actualQuality !== s.quality)
  )
    throw Error(
      JSON.stringify({
        errors,
        issues: survey.filter(
          (s) => s.gpuError || s.actualQuality !== s.quality,
        ),
      }),
    );
  await fs.writeFile(
    `${root}/${label}/isolated-profile.json`,
    JSON.stringify(
      {
        label,
        loadMs,
        survey,
        restarts,
        errors,
        environment:
          "Chromium 133 SwiftShader; versions sequential; 12 warm-up + 40 sampled frames per scene; no recording/encoding; not iPhone",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ label, loadMs, scenes: survey.length, errors }));
} finally {
  await browser.close();
  server.kill();
}
