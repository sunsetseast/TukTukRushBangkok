import fs from "node:fs/promises";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out =
    process.env.DISTRICT_OUTPUT ||
    new URL("../../../docs/qa/authored-landmark-districts/", import.meta.url)
      .pathname,
  label = process.env.DISTRICT_LABEL || "after";
await fs.mkdir(`${out}/performance`, { recursive: true });
const server = await startQaServer(24293),
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
try {
  const p = await browser.newPage({ viewport: { width: 844, height: 390 } }),
    errors = [];
  p.setDefaultTimeout(600000);
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:24293/?qa=1");
  await p.waitForFunction(() => window.__graphics);
  await p.getByTestId("button-free-roam").click();
  const source = JSON.parse(
    await fs.readFile(
      new URL(
        "../../../docs/qa/real-bangkok-architecture/performance/after/profile.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const poses = source.survey
      .filter((s) => s.requestedQuality === "low")
      .map((s) => s.pose),
    survey = [];
  for (const q of ["low", "medium"])
    for (const pose of poses) {
      await p.evaluate(
        ({ q, pose }) => {
          const e = window.__graphics.engine;
          e.pause();
          e.setQuality(q);
          e.frameTime = -100000;
          e.model.snapshot.elapsed = 240;
          Object.assign(e.model.player, {
            x: pose.x,
            z: pose.z,
            heading: pose.heading,
            speed: 0,
          });
          delete window.__artCamera;
        },
        { q, pose },
      );
      let f = await p.evaluate(() => window.__graphics.frameId);
      await p.waitForFunction((f) => window.__graphics.frameId > f + 4, f);
      const samples = [];
      for (let i = 0; i < 5; i++) {
        f = await p.evaluate(() => window.__graphics.frameId);
        await p.waitForFunction((f) => window.__graphics.frameId > f, f);
        samples.push(await p.evaluate(() => window.__graphics.stats));
      }
      survey.push({ pose, quality: q, samples });
      console.log(
        label,
        pose.name,
        q,
        samples.at(-1).calls,
        samples.at(-1).triangles,
      );
    }
  const resources = await p.evaluate(() => {
    const gs = new Set(),
      ms = new Set(),
      ts = new Set(),
      arrays = new Set();
    let texturePixels = 0;
    window.__graphics.scene.traverse((o) => {
      if (o.geometry) gs.add(o.geometry);
      for (const m of (Array.isArray(o.material)
        ? o.material
        : [o.material]
      ).filter(Boolean)) {
        ms.add(m);
        for (const v of Object.values(m)) if (v?.isTexture) ts.add(v);
      }
      if (o.instanceMatrix) arrays.add(o.instanceMatrix.array);
      if (o.instanceColor) arrays.add(o.instanceColor.array);
    });
    for (const g of gs) {
      for (const a of Object.values(g.attributes)) arrays.add(a.array);
      if (g.index) arrays.add(g.index.array);
    }
    for (const t of ts) {
      const im = t.image;
      texturePixels += (im?.width ?? 0) * (im?.height ?? 0);
    }
    return {
      geometryBuffersBytes: [...arrays].reduce((n, a) => n + a.byteLength, 0),
      geometries: gs.size,
      materials: ms.size,
      textures: ts.size,
      texturePixels,
      approxTextureRGBABytes: texturePixels * 4,
    };
  });
  await fs.writeFile(
    `${out}/performance/${label}.json`,
    JSON.stringify(
      {
        label,
        base: "199321d",
        viewport: [844, 390],
        renderer:
          "Chromium 133 / SwiftShader software WebGL; no physical iPhone test; wall frame times not hardware FPS",
        survey,
        resources,
        errors,
      },
      null,
      2,
    ),
  );
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser.close();
  server.kill();
}
