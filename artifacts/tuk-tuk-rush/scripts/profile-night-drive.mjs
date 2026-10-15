import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const out = new URL(
  "../../../docs/ui/night-drive/performance/",
  import.meta.url,
).pathname;
await fs.mkdir(out, { recursive: true });
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
const root = new URL("../", import.meta.url).pathname;
async function serve(cwd, port) {
  const s = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd,
      env: { ...process.env, PORT: String(port), BASE_PATH: "/" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let log = "";
  s.stdout.on("data", (b) => (log += b));
  s.stderr.on("data", (b) => (log += b));
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}`)).ok) return s;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  s.kill();
  throw Error(log);
}
const results = {
  hardware: "Chromium 138 / SwiftShader software WebGL; not iPhone",
  viewport: "844x390",
  browserVersion: browser.version(),
  runs: [],
};
try {
  for (const [name, cwd, port] of [
    ["main", process.env.BASELINE_APP, 24234],
    ["branch", root, 24235],
  ]) {
    const server = await serve(cwd, port);
    const context = await browser.newContext({
        viewport: { width: 844, height: 390 },
        hasTouch: true,
        reducedMotion: "reduce",
      }),
      p = await context.newPage();
    p.setDefaultTimeout(120000);
    const t = Date.now();
    await p.goto(`http://127.0.0.1:${port}`);
    await p.waitForFunction(() => window.__graphics);
    const startupMs = Date.now() - t;
    await p.getByTestId("button-free-roam").click();
    await p.evaluate(() => {
      const e = window.__graphics.engine;
      e.setQuality("low");
      e.frameTime = -100000;
      e.model.snapshot.elapsed = 300;
      e.model.input.gas = false;
    });
    const stats = await p.evaluate(async () => {
      const g = window.__graphics,
        e = g.engine,
        samples = [];
      for (let i = 0; i < 12; i++) {
        await new Promise(requestAnimationFrame);
        samples.push({ ...window.__graphics.stats });
      }
      const arrays = new Set(),
        mats = new Set(),
        geoms = new Set();
      g.scene.traverse((o) => {
        if (o.geometry) {
          geoms.add(o.geometry);
          for (const a of Object.values(o.geometry.attributes))
            arrays.add(a.isInterleavedBufferAttribute ? a.data.array : a.array);
          if (o.geometry.index) arrays.add(o.geometry.index.array);
        }
        if (o.instanceMatrix?.array) arrays.add(o.instanceMatrix.array);
        if (o.instanceColor?.array) arrays.add(o.instanceColor.array);
        for (const m of Array.isArray(o.material)
          ? o.material
          : o.material
            ? [o.material]
            : [])
          mats.add(m);
      });
      return {
        samples,
        geometryBytes: [...arrays].reduce((s, a) => s + a.byteLength, 0),
        materialObjects: mats.size,
        geometryObjects: geoms.size,
        domNodes: document.querySelectorAll("*").length,
        controls: [...document.querySelectorAll(".tt-pedal,.tt-boost")].map(
          (el) => {
            const b = el.getBoundingClientRect();
            return {
              name: el.dataset.testid,
              width: b.width,
              height: b.height,
            };
          },
        ),
        phase: e.model.snapshot.phase,
      };
    });
    const clickMs = await p.evaluate(
      () =>
        new Promise((resolve) => {
          const b = document.querySelector('[data-testid="button-open-map"]'),
            start = performance.now();
          b.click();
          requestAnimationFrame(() => resolve(performance.now() - start));
        }),
    );
    await p.getByTestId("world-map").waitFor();
    const mapNodes = await p.locator("*").count();
    results.runs.push({
      name,
      startupMs,
      ...stats,
      mapOpenToRafMs: clickMs,
      mapDomNodes: mapNodes,
      mapCanvasWidth: (await p.locator(".tt-world-map-body>svg").boundingBox())
        .width,
    });
    console.log(
      name,
      startupMs,
      stats.geometryBytes,
      stats.materialObjects,
      clickMs,
    );
    await context.close();
    server.kill();
  }
  await fs.writeFile(
    `${out}/comparison.json`,
    JSON.stringify(results, null, 2),
  );
} finally {
  await browser.close();
}
