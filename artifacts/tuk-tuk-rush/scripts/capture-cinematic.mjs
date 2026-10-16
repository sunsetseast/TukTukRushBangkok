/** Repeatable actual-game corridor comparison. APP_ROOT can point at current-main baseline. */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = path.resolve(
  process.env.QA_OUT || "../../docs/qa/cinematic-yaowarat/after",
);
if (process.env.APP_ROOT) process.chdir(process.env.APP_ROOT);
await fs.mkdir(out, { recursive: true });
const port = Number(process.env.QA_PORT || 24271),
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
const report = {
  renderer: "Chromium / SwiftShader software WebGL; physical iPhone unverified",
  shots: [],
  errors: [],
};
try {
  const p = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  p.setDefaultTimeout(120000);
  p.on("pageerror", (e) => report.errors.push(e.message));
  const start = performance.now();
  await p.goto(`http://127.0.0.1:${port}/?qa=1`);
  await p.waitForFunction(() => window.__graphics?.frameId > 3);
  report.worldInteractiveMs = performance.now() - start;
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.missionSeed = 87;
    e.sessions = 0;
    e.setQuality("medium");
    const step = e.update.bind(e);
    e.update = (dt) => {
      e.slowTime = -1e6;
      step(dt);
    };
  });
  const frames = async (n = 6) => {
    const f = await p.evaluate(() => window.__graphics.frameId);
    await p.waitForFunction(({ f, n }) => window.__graphics.frameId >= f + n, {
      f,
      n,
    });
  };
  const shot = async (name, sample = false) => {
    if (
      process.env.QA_SELECT &&
      !process.env.QA_SELECT.split(",").includes(name)
    )
      return;
    sample = sample && !!process.env.QA_PROFILE;
    await frames();
    const data = await p.evaluate(async (sample) => {
      const g = window.__graphics,
        ms = [];
      if (sample)
        for (let i = 0; i < 36; i++) {
          await new Promise((r) => requestAnimationFrame(r));
          ms.push(window.__graphics.stats.frameMs);
        }
      g.gl.getContext().finish();
      const geos = new Set(),
        materials = new Set(),
        textures = new Set();
      let bufferBytes = 0;
      g.scene.traverse((o) => {
        if (o.geometry && !geos.has(o.geometry)) {
          geos.add(o.geometry);
          for (const a of Object.values(o.geometry.attributes))
            bufferBytes += a.array.byteLength;
          if (o.geometry.index)
            bufferBytes += o.geometry.index.array.byteLength;
        }
        if (o.instanceMatrix) bufferBytes += o.instanceMatrix.array.byteLength;
        if (o.instanceColor) bufferBytes += o.instanceColor.array.byteLength;
        for (const m of [].concat(o.material || [])) {
          materials.add(m);
          for (const t of Object.values(m)) if (t?.isTexture) textures.add(t);
        }
      });
      return {
        camera: {
          position: g.camera.position.toArray(),
          quaternion: g.camera.quaternion.toArray(),
          fov: g.camera.fov,
        },
        player: { ...g.engine.model.player },
        time: g.engine.model.snapshot.elapsed,
        quality: g.engine.model.snapshot.quality,
        stats: { ...g.stats },
        frameMs: ms,
        resources: {
          geometryCount: geos.size,
          materialCount: materials.size,
          textureCount: textures.size,
          bufferBytes,
          texturePixels: [...textures].reduce(
            (n, t) =>
              n +
              (t.image?.width || 0) *
                (t.image?.height || 0) *
                (t.image?.depth || 1),
            0,
          ),
        },
        glError: g.gl.getContext().getError(),
      };
    }, sample);
    if (name.startsWith("title-"))
      await p.screenshot({
        path: `${out}/${name}.jpg`,
        type: "jpeg",
        quality: 87,
      });
    else {
      const jpeg = await p.evaluate(() => {
        const g = window.__graphics;
        g.gl.render(g.scene, g.camera);
        g.gl.getContext().finish();
        return g.gl.domElement.toDataURL("image/jpeg", 0.9).split(",")[1];
      });
      await fs.writeFile(`${out}/${name}.jpg`, Buffer.from(jpeg, "base64"));
    }
    report.shots.push({ name, ...data });
    console.log("Captured", name, data.stats.calls, data.stats.triangles);
  };
  await shot("title-landscape");
  await p.setViewportSize({ width: 430, height: 932 });
  await shot("title-portrait");
  await p.setViewportSize({ width: 1280, height: 800 });
  await p.getByTestId("button-free-roam").click();
  await p.locator(".tt-title").waitFor({ state: "detached" });
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.update = () => {};
    e.model.snapshot.phase = "playing";
    e.setQuality("medium");
    e.model.snapshot.elapsed = 0;
    const d = e.model.district;
    const a = d.nodes.find((n) => n.id === "bkk:505"),
      b = d.nodes.find((n) => n.id === "bkk:506"),
      heading = Math.atan2(b.x - a.x, b.z - a.z);
    Object.assign(e.model.player, {
      x: (a.x + b.x) / 2 + Math.cos(heading) * 2,
      z: (a.z + b.z) / 2 - Math.sin(heading) * 2,
      heading,
      speed: 0,
      collision: 0,
    });
    e.cameraRevision++;
    e.model.traffic = e.model.traffic.filter(
      (t) => Math.hypot(t.x - e.model.player.x, t.z - e.model.player.z) > 20,
    );
    e.publish();
  });
  await shot("golden", true);
  await p.evaluate(() => {
    window.__graphics.engine.model.snapshot.elapsed = 130;
  });
  await shot("twilight");
  await p.evaluate(() => {
    window.__graphics.engine.model.snapshot.elapsed = 240;
  });
  await shot("night", true);
  await p.evaluate(() => {
    window.__graphics.engine.model.snapshot.elapsed = 0;
    window.__graphics.engine.setQuality("low");
  });
  await p.setViewportSize({ width: 844, height: 390 });
  await shot("fast", true);
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.setQuality("medium");
    const a = e.model.district.nodes.find((n) => n.id === "bkk:508"),
      b = e.model.district.nodes.find((n) => n.id === "bkk:509"),
      heading = Math.atan2(b.x - a.x, b.z - a.z);
    Object.assign(e.model.player, {
      x: (a.x + b.x) / 2 + Math.cos(heading) * 2,
      z: (a.z + b.z) / 2 - Math.sin(heading) * 2,
      heading,
      speed: 0,
    });
    e.cameraRevision++;
  });
  await p.setViewportSize({ width: 1280, height: 800 });
  await shot("driving");
  await p.evaluate(() => {
    const g = window.__graphics,
      p = g.engine.model.player,
      fx = Math.sin(p.heading),
      fz = Math.cos(p.heading);
    window.__artCamera = {
      position: [p.x + fx * 6 + fz * 4, 3.5, p.z + fz * 6 - fx * 4],
      look: [p.x + fx * 15 - fz * 11, 5.1, p.z + fz * 15 + fx * 11],
    };
  });
  await shot("storefront");
  await p.evaluate(() => {
    delete window.__artCamera;
    const e = window.__graphics.engine,
      d = e.model.district,
      l = d.landmarks.find((l) => l.id === "swing"),
      n = d.nodes.find((n) => n.id === l.accessNode);
    Object.assign(e.model.player, {
      x: n.x,
      z: n.z,
      heading: Math.atan2(l.x - n.x, l.z - n.z),
      speed: 0,
    });
    e.cameraRevision++;
    e.model.snapshot.elapsed = 130;
  });
  await shot("old-town");
  await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  if (report.errors.length || report.shots.some((s) => s.glError))
    throw Error(JSON.stringify(report.errors));
} finally {
  await browser.close();
  server.kill();
}
