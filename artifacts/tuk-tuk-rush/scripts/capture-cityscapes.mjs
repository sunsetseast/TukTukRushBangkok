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
      `../../../docs/graphics/living-cityscapes/${label}/`,
      import.meta.url,
    ).pathname;
await fs.mkdir(out, { recursive: true });
const port = Number(process.env.QA_PORT || 24185);
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
  if (m.type() === "error") {
    errors.push(m.text());
    console.log("WebGL console:", m.text().slice(0, 1500));
  }
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
    ["scala", "food"],
    ["chinatown", "food"],
    ["gate", "gate"],
    ["talatnoi", "hua"],
    ["oldtown", "pho"],
    ["arun", "arun"],
    ["arunriver", "arun"],
    ["siam", "paragon"],
    ["icon", "icon"],
    ["bridge", "arun"],
    ["bridgewater", "arun"],
    ["residential", "victory"],
    ["intersection", "food"],
  ];
  for (const [name, landmark] of scenes.filter(
    (s) =>
      !process.env.CAPTURE_NAMES ||
      process.env.CAPTURE_NAMES.split(",").includes(s[0]),
  ))
    for (const quality of ["low", "medium"])
      for (const elapsed of [0, 360, 600]) {
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
            if (name === "scala")
              n = d.nodes.reduce((best, q) =>
                Math.hypot(q.x - 110, q.z + 50) <
                Math.hypot(best.x - 110, best.z + 50)
                  ? q
                  : best,
              );
            if (name === "arunriver")
              n = d.nodes.reduce((best, q) =>
                Math.hypot(q.x + 1000, q.z + 640) <
                Math.hypot(best.x + 1000, best.z + 640)
                  ? q
                  : best,
              );
            if (name === "residential")
              n = d.nodes.reduce((best, q) =>
                Math.hypot(q.x + 1640, q.z + 900) <
                Math.hypot(best.x + 1640, best.z + 900)
                  ? q
                  : best,
              );
            if (name === "intersection")
              n =
                d.nodes.find(
                  (q) =>
                    d.roads.filter((r) => r.a === q.id || r.b === q.id)
                      .length >= 3 &&
                    Math.hypot(q.x - d.spawn.x, q.z - d.spawn.z) < 250,
                ) || n;
            let bridgeRoad;
            if (name === "bridgewater" || name === "bridge") {
              const dist = (p, a, b) => {
                const dx = b.x - a.x,
                  dz = b.z - a.z,
                  t = Math.max(
                    0,
                    Math.min(
                      1,
                      ((p.x - a.x) * dx + (p.z - a.z) * dz) /
                        (dx * dx + dz * dz),
                    ),
                  );
                return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
              };
              const rd = (p) =>
                Math.min(
                  ...d.river.slice(1).map((b, i) => dist(p, d.river[i], b)),
                );
              const mid = (r) => {
                const a = d.nodes.find((n) => n.id === r.a),
                  b = d.nodes.find((n) => n.id === r.b);
                return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
              };
              bridgeRoad =
                name === "bridgewater"
                  ? d.roads
                      .filter((r) => r.bridge)
                      .sort((a, b) => rd(mid(a)) - rd(mid(b)))[0]
                  : d.roads.find((r) => r.bridge);
              n = d.nodes.find((q) => q.id === bridgeRoad.a);
            }
            const r =
              bridgeRoad ||
              d.roads.find((r) => r.a === n.id && !r.bridge) ||
              d.roads.find((r) => r.b === n.id && !r.bridge) ||
              d.roads.find((r) => r.a === n.id || r.b === n.id);
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
            if (
              ["icon", "siam", "oldtown", "arun", "arunriver", "gate"].includes(
                name,
              )
            )
              heading = Math.atan2(
                (l.plot || l).x - n.x,
                (l.plot || l).z - n.z,
              );
            if (name === "scala")
              heading = Math.atan2(63.11045 - n.x, -45.66192 - n.z);
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
        const file = `${name}-${quality}-${elapsed === 600 ? "night" : elapsed ? "twilight" : "sunset"}.jpg`;
        await page.screenshot({
          path: `${out}/${file}`,
          type: "jpeg",
          quality: 90,
        });
        survey.push({ name, quality, elapsed, pose, file, samples, resource });
        await fs.writeFile(
          `${out}/${process.env.CAPTURE_MANIFEST || "measurements.json"}`,
          JSON.stringify(
            {
              label,
              loadMs,
              survey,
              errors,
              failures,
              environment: "844x390 Chromium SwiftShader, not iPhone",
            },
            null,
            2,
          ),
        );
        console.log("Captured", file);
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
    `${out}/${process.env.CAPTURE_MANIFEST || "measurements.json"}`,
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
