/** Identical native chase scene, fixed simulation steps, and software renderer on either checkout. */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = path.resolve(
  process.env.QA_OUT || "../../docs/qa/cinematic-yaowarat/performance",
);
if (process.env.APP_ROOT) process.chdir(process.env.APP_ROOT);
await fs.mkdir(out, { recursive: true });
const server = await startQaServer(24274),
  browser = await chromium.launch({
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
try {
  const p = await browser.newPage({
      viewport: { width: 844, height: 390 },
      deviceScaleFactor: 1,
      hasTouch: true,
      reducedMotion: "reduce",
    }),
    errors = [];
  p.setDefaultTimeout(120000);
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(() => {
    window.__longTasks = [];
    new PerformanceObserver((l) =>
      window.__longTasks.push(
        ...l.getEntries().map((e) => ({ start: e.startTime, ms: e.duration })),
      ),
    ).observe({ type: "longtask", buffered: true });
  });
  const began = performance.now();
  await p.goto("http://127.0.0.1:24274");
  await p.waitForFunction(() => window.__graphics?.frameId > 2);
  const devWorldReadyMs = performance.now() - began;
  await p.getByTestId("button-free-roam").click();
  await p.locator(".tt-title").waitFor({ state: "detached" });
  await p.addStyleTag({ content: ".tt-ui{visibility:hidden!important}" });
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    window.__nativeStep = e.update.bind(e);
    e.update = () => {};
    e.missionSeed = 87;
    e.sessions = 0;
    e.start("free");
    window.__pose = {
      x: 71.9377565778437,
      z: -65.83146147722181,
      heading: -2.020483893706025,
    };
    window.__graphics.scene.getObjectByName("MissionBeacon").scale.setScalar(0);
  });
  const survey = [];
  for (const quality of ["low", "medium"])
    for (const moving of [false, true]) {
      await p.evaluate(
        ({ quality, moving }) => {
          const e = window.__graphics.engine;
          e.setQuality(quality);
          Object.assign(e.model.player, window.__pose, {
            speed: 0,
            steer: 0,
            collision: 0,
          });
          e.cameraRevision++;
          e.model.snapshot.elapsed = 240;
          e.model.input.gas = moving;
          e.model.input.brake = false;
          e.model.input.steer = 0;
          e.update = moving
            ? () => {
                window.__nativeStep(0.05);
                e.model.snapshot.elapsed = 240;
                e.model.snapshot.quality = quality;
                e.slowTime = -1e6;
              }
            : () => {};
        },
        { quality, moving },
      );
      const r = await p.evaluate(async () => {
        const wait = () => new Promise((r) => requestAnimationFrame(r));
        for (let i = 0; i < 12; i++) await wait();
        const start = performance.now(),
          samples = [];
        for (let i = 0; i < 48; i++) {
          await wait();
          const g = window.__graphics;
          samples.push({
            frameMs: g.stats.frameMs,
            calls: g.stats.calls,
            triangles: g.stats.triangles,
            programs: g.gl.info.programs.length,
          });
        }
        const g = window.__graphics,
          buffers = new Set(),
          geos = new Set(),
          materials = new Set(),
          textures = new Set();
        g.scene.traverse((o) => {
          if (o.geometry && !geos.has(o.geometry)) {
            geos.add(o.geometry);
            for (const a of Object.values(o.geometry.attributes))
              buffers.add(a.array.buffer);
            if (o.geometry.index) buffers.add(o.geometry.index.array.buffer);
          }
          if (o.instanceMatrix) buffers.add(o.instanceMatrix.array.buffer);
          if (o.instanceColor) buffers.add(o.instanceColor.array.buffer);
          for (const m of [].concat(o.material || [])) {
            materials.add(m);
            for (const t of Object.values(m)) if (t?.isTexture) textures.add(t);
          }
        });
        const sorted = samples.map((s) => s.frameMs).sort((a, b) => a - b),
          mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
        return {
          samples,
          meanFrameMs: mean,
          p50: sorted[24],
          p95: sorted[45],
          worst: sorted.at(-1),
          softwareFps: 1000 / mean,
          longTasks: window.__longTasks.filter((t) => t.start > start),
          resident: {
            ...g.gl.info.memory,
            programs: g.gl.info.programs.length,
          },
          scene: {
            geometryCount: geos.size,
            materialCount: materials.size,
            textureCount: textures.size,
            cpuBufferBytes: [...buffers].reduce((n, b) => n + b.byteLength, 0),
            texturePixelEstimate: [...textures].reduce(
              (n, t) =>
                n +
                (t.image?.width || 0) *
                  (t.image?.height || 0) *
                  (t.image?.depth || 1),
              0,
            ),
          },
          gpuTimerAvailable: !!g.gl
            .getContext()
            .getExtension("EXT_disjoint_timer_query_webgl2"),
          glError: g.gl.getContext().getError(),
          player: {
            x: g.engine.model.player.x,
            z: g.engine.model.player.z,
            speed: g.engine.model.player.speed,
          },
          camera: g.camera.position.toArray(),
        };
      });
      survey.push({ quality, moving, ...r });
      console.log("PROFILE", quality, moving, r.meanFrameMs, r.p95, r.resident);
    }
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.update = () => {};
    e.model.snapshot.phase = "playing";
    e.publish();
  });
  await p.addStyleTag({ content: ".tt-ui{visibility:visible!important}" });
  const mapOpenMs = [];
  for (let i = 0; i < 4; i++) {
    const t = performance.now();
    await p.getByTestId("button-open-map").click();
    await p.getByTestId("world-map").waitFor();
    mapOpenMs.push(performance.now() - t);
    await p.getByTestId("button-close-map").click();
  }
  const assets = await p.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((e) => /\/assets\//.test(e.name))
      .map((e) => ({
        name: new URL(e.name).pathname,
        transferBytes: e.transferSize,
        decodedBytes: e.decodedBodySize,
      })),
  );
  if (errors.length || survey.some((s) => s.glError))
    throw Error(JSON.stringify(errors));
  await fs.writeFile(
    out + "/profile.json",
    JSON.stringify(
      {
        renderer: "Chromium / SwiftShader software WebGL; not iPhone",
        viewport: { width: 844, height: 390, dpr: 1 },
        devWorldReadyMs,
        survey,
        mapOpenMs,
        assets,
        errors,
        notes:
          "48 samples after 12 warm frames; native physics at fixed 50ms while moving. Not hardware FPS; DOM automation latency includes scheduling. CPU memory deduplicates backing ArrayBuffers; texture pixels are an estimate, not measured GPU bytes.",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  server.kill();
}
