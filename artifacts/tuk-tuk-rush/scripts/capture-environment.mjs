/** Matched normal-height camera survey. Repositioned surveys are art inspection.
 * Software WebGL metrics do not certify physical iPhone performance. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const label = process.env.CAPTURE_LABEL || "after";
const out = process.env.CAPTURE_ROOT
  ? `${process.env.CAPTURE_ROOT}/${label}`
  : new URL(
      `../../../docs/graphics/architectural-character/${label}/`,
      import.meta.url,
    ).pathname;
await fs.mkdir(out, { recursive: true });
const port = 24183;
const server = spawn(
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
server.stdout.on("data", (b) => (log += b));
server.stderr.on("data", (b) => (log += b));
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
const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  hasTouch: true,
});
page.setDefaultTimeout(120000);
const errors = [],
  failures = [],
  survey = [];
page.on("console", (m) => {
  if (m.type() === "error")
    console.log("WebGL console:", m.text().slice(0, 1500));
});
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
});
const frames = async (n = 5) => {
  const id = await page.evaluate(() => window.__graphics.frameId);
  await page.waitForFunction(
    ({ id, n }) => window.__graphics.frameId > id + n,
    { id, n },
    { timeout: 90000 },
  );
};
try {
  const start = performance.now();
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.__graphics, null, {
    timeout: 120000,
  });
  const loadMs = performance.now() - start;
  await page.getByTestId("button-free-roam").click();
  await frames();
  await page.evaluate(() => window.__graphics.engine.pause());
  await page.addStyleTag({
    content: ".tt-ui { visibility: hidden !important; }",
  });
  console.log(
    "Scene ready",
    JSON.stringify(await page.evaluate(() => window.__graphics.stats)),
  );
  await page.screenshot({
    path: `${out}/first-drive.jpg`,
    type: "jpeg",
    quality: 90,
  });
  const scenes = [
    ["chinatown", "food"],
    ["talatnoi", "hua"],
    ["oldtown", "pho"],
    ["siam", "paragon"],
    ["icon", "icon"],
    ["silom", "mahanakhon"],
    ["residential", "victory"],
  ];
  for (const [name, landmark] of scenes)
    for (const quality of ["low", "medium"])
      for (const elapsed of [0, 600]) {
        const pose = await page.evaluate(
          ({ landmark, name, quality, elapsed }) => {
            const g = window.__graphics,
              e = g.engine,
              d = e.model.district,
              l = d.landmarks.find((l) => l.id === landmark);
            let n = d.nodes.find((n) => n.id === l.accessNode);
            if (name === "chinatown")
              n = d.nodes.reduce((best, n) =>
                Math.hypot(n.x - d.spawn.x, n.z - d.spawn.z) <
                Math.hypot(best.x - d.spawn.x, best.z - d.spawn.z)
                  ? n
                  : best,
              );
            const r =
              d.roads.find((r) => r.a === n.id && !r.bridge) ||
              d.roads.find((r) => r.b === n.id && !r.bridge);
            let next = d.nodes.find((q) => q.id === (r.a === n.id ? r.b : r.a));
            if (name === "residential")
              n = d.nodes.reduce((best, q) =>
                Math.hypot(q.x + 1640, q.z + 900) <
                Math.hypot(best.x + 1640, best.z + 900)
                  ? q
                  : best,
              );
            if (name === "talatnoi")
              n = d.nodes.reduce((best, q) =>
                Math.hypot(q.x - 160, q.z - 360) <
                Math.hypot(best.x - 160, best.z - 360)
                  ? q
                  : best,
              );
            if (name === "residential") {
              const road =
                d.roads.find((r) => r.a === n.id && !r.bridge && !r.shortcut) ||
                d.roads.find((r) => r.b === n.id && !r.bridge && !r.shortcut);
              next = d.nodes.find(
                (q) => q.id === (road.a === n.id ? road.b : road.a),
              );
            }
            let heading = Math.atan2(next.x - n.x, next.z - n.z);
            if (name === "talatnoi") heading = Math.atan2(-0.65, -0.75);
            if (name === "icon" || name === "siam")
              heading = Math.atan2(
                (l.plot || l).x - n.x,
                (l.plot || l).z - n.z,
              );
            const fx = Math.sin(heading),
              fz = Math.cos(heading);
            e.pause();
            e.setQuality(quality);
            e.frameTime = -100000;
            Object.assign(e.model.player, {
              x: n.x,
              z: n.z,
              heading,
              speed: 0,
            });
            e.model.snapshot.elapsed = elapsed;
            window.__artCamera = {
              position: [n.x - fx * 10, 4.5, n.z - fz * 10],
              look: [n.x + fx * 35, 6, n.z + fz * 35],
            };
            return { x: n.x, z: n.z, heading };
          },
          { landmark, name, quality, elapsed },
        );
        await frames(7);
        const samples = [];
        for (let i = 0; i < 8; i++) {
          await frames(1);
          samples.push(
            await page.evaluate(() => ({ ...window.__graphics.stats })),
          );
        }
        const resource = await page.evaluate(() => {
          const g = window.__graphics,
            geos = new Set(),
            textures = new Set();
          let bytes = 0;
          g.scene.traverse((o) => {
            if (o.geometry && !geos.has(o.geometry)) {
              geos.add(o.geometry);
              for (const a of Object.values(o.geometry.attributes))
                bytes += a.array.byteLength;
              if (o.geometry.index) bytes += o.geometry.index.array.byteLength;
              if (o.instanceMatrix) bytes += o.instanceMatrix.array.byteLength;
              if (o.instanceColor) bytes += o.instanceColor.array.byteLength;
            }
            for (const m of [].concat(o.material || []))
              for (const t of Object.values(m))
                if (t?.isTexture) textures.add(t);
          });
          return {
            actualQuality: g.engine.model.snapshot.quality,
            cpuGeometryBytes: bytes,
            texturePixels: [...textures].reduce(
              (s, t) => s + (t.image?.width || 0) * (t.image?.height || 0),
              0,
            ),
            heapBytes: performance.memory?.usedJSHeapSize,
          };
        });
        const file = `${name}-${quality}-${elapsed ? "night" : "sunset"}.jpg`;
        await page.screenshot({
          path: `${out}/${file}`,
          type: "jpeg",
          quality: 90,
        });
        survey.push({ name, quality, elapsed, pose, file, samples, resource });
        if (
          quality === "medium" &&
          !elapsed &&
          ["chinatown", "talatnoi", "oldtown", "siam", "icon"].includes(name)
        ) {
          await page.evaluate(() => {
            const c = window.__artCamera,
              p = window.__graphics.engine.model.player,
              fx = Math.sin(p.heading),
              fz = Math.cos(p.heading);
            c.position = [p.x - fx * 5 + fz * 3, 3.3, p.z - fz * 5 - fx * 3];
            c.look = [p.x + fx * 15 - fz * 12, 7, p.z + fz * 15 + fx * 12];
          });
          await frames();
          await page.screenshot({
            path: `${out}/${name}-corner.jpg`,
            type: "jpeg",
            quality: 90,
          });
        }
      }
  await fs.writeFile(
    `${out}/measurements.json`,
    JSON.stringify(
      {
        label,
        loadMs,
        survey,
        errors,
        failures,
        environment:
          "844x390 Chromium SwiftShader, software WebGL, not physical iPhone",
      },
      null,
      2,
    ),
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  console.log(
    JSON.stringify({
      label,
      loadMs,
      scenes: survey.length,
      errors,
      failures,
      out,
    }),
  );
} finally {
  await browser.close();
  server.kill();
}
