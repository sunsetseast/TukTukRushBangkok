import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const stage = process.argv[2] ?? "after",
  out = new URL(
    `../../../docs/qa/geographic-buildings/${stage}/`,
    import.meta.url,
  );
fs.mkdirSync(out, { recursive: true });
const views = [
  ["yaowarat-drive", 100.5095, 13.7401, 100.5109, 13.7393, 4],
  ["yaowarat-overview", 100.5104, 13.7396, 100.5098, 13.7398, 190],
  ["chinatown-soi", 100.51, 13.741, 100.5098, 13.7404, 4],
  ["song-wat-talat-noi", 100.5097, 13.7359, 100.5111, 13.735, 60],
  ["charoen-krung-drive", 100.5168, 13.7286, 100.5163, 13.7295, 4],
  ["bang-rak-overview", 100.5161, 13.7253, 100.5156, 13.7275, 210],
  ["si-phraya-frontage", 100.5167, 13.7307, 100.5177, 13.7309, 4],
  ["silom-skyline", 100.5273, 13.7259, 100.5314, 13.7284, 100],
  ["riverfront-block", 100.511, 13.7301, 100.5144, 13.7303, 180],
  ["heritage-modern-transition", 100.5195, 13.7243, 100.5176, 13.725, 100],
];
const server = await startQaServer(24818);
let browser;
const report = {
  stage,
  environment:
    "Linux headless Chromium / ANGLE SwiftShader software WebGL; no physical iPhone or Safari",
  errors: [],
  views: [],
  travel: [],
};
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
      "--js-flags=--expose-gc",
      "--enable-precise-memory-info",
    ],
  });
  report.browser = browser.version();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  const heapSession = await page.context().newCDPSession(page);
  page.on("pageerror", (e) => report.errors.push(e.message));
  const started = performance.now();
  if (process.env.GEOGRAPHY_ASSET_ROOT)
    await page.route("**/assets/geography/**", async (route) => {
      const asset = new URL(route.request().url()).pathname.split(
        "/assets/geography/",
      )[1];
      await route.fulfill({
        status: 200,
        contentType: "application/octet-stream",
        body: fs.readFileSync(`${process.env.GEOGRAPHY_ASSET_ROOT}/${asset}`),
      });
    });
  await page.goto("http://127.0.0.1:24818/?world=geographic&geographyQA");
  await page.waitForFunction(
    () =>
      window.__geography?.stream.settled &&
      window.__geography.stream.active >= 9,
    undefined,
    { timeout: 120000 },
  );
  report.travelCameraMode = process.env.QA_KEEP_GALLERY_CAMERA
    ? "fixed gallery camera"
    : "follow active district";
  report.assetOverride = process.env.GEOGRAPHY_ASSET_ROOT ?? null;
  report.firstResidentMs = performance.now() - started;
  report.initial = await page.evaluate(() => window.__geography);
  await page.getByTestId("button-free-roam").click();
  for (const [name, lon, lat, tlon, tlat, height] of process.env.QA_TRAVEL_ONLY
    ? []
    : views.filter(
        (v) =>
          !process.env.QA_VIEWS ||
          process.env.QA_VIEWS.split(",").includes(v[0]),
      )) {
    await page.evaluate(
      ({ name, lon, lat, tlon, tlat, height }) => {
        const qa = window.__geographyQA;
        qa.move(lon, lat);
        const p = qa.session.player,
          n = qa.network;
        let alignedTarget;
        if (height === 4) {
          const pattern =
            name === "yaowarat-drive"
              ? "Yaowarat Road"
              : name === "chinatown-soi"
                ? "Phadung Dao Road"
                : name === "charoen-krung-drive"
                  ? "Charoen Krung Road"
                  : "Si Phraya Road";
          let best = Infinity,
            edge = -1;
          for (let i = 0; i < n.a.length; i++)
            if (n.metadata.ways[n.way[i]].name === pattern) {
              const a = n.a[i],
                b = n.b[i],
                x = (n.x[a] + n.x[b]) / 2,
                z = (n.z[a] + n.z[b]) / 2,
                d = Math.hypot(x - p.x, z - p.z);
              if (d < best) {
                best = d;
                edge = i;
              }
            }
          if (edge < 0) throw Error("Missing named source street " + pattern);
          const a = n.a[edge],
            b = n.b[edge];
          p.x = (n.x[a] + n.x[b]) / 2;
          p.z = (n.z[a] + n.z[b]) / 2;
          n.reset(p);
          if (name === "charoen-krung-drive" || name === "chinatown-soi") {
            const dx = n.x[b] - n.x[a],
              dz = n.z[b] - n.z[a],
              length = Math.hypot(dx, dz),
              sign = dx * (tlon - lon) - dz * (tlat - lat) >= 0 ? 1 : -1;
            alignedTarget = [
              p.x + (dx / length) * sign * 100,
              2,
              p.z + (dz / length) * sign * 100,
            ];
          }
        }
        if (name === "riverfront-block") {
          const eye = qa.project({ lon, lat }),
            target = qa.project({ lon: tlon, lat: tlat });
          qa.view([eye.x, height, eye.z], [target.x, 12, target.z]);
          return;
        }
        qa.view(
          [p.x, height, p.z],
          alignedTarget ?? [
            p.x + (tlon - lon) * 108120,
            height > 20 ? 0 : 2,
            p.z - (tlat - lat) * 110650,
          ],
        );
      },
      { name, lon, lat, tlon, tlat, height },
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.waitForFunction(
      () => window.__geography.stream.settled,
      undefined,
      { timeout: 120000 },
    );
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(async () => {
      const frames = [],
        qualities = new Set();
      const started = performance.now();
      let last = started;
      await new Promise((resolve) => {
        const tick = (now) => {
          frames.push(now - last);
          qualities.add(window.__geography.quality);
          last = now;
          if (frames.length < 45 && now - started < 2500)
            requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      frames.sort((a, b) => a - b);
      return {
        ...window.__geography,
        heap: performance.memory?.usedJSHeapSize,
        sampleQualities: [...qualities],
        frameMs: {
          p50: frames[Math.floor(frames.length * 0.5)],
          p95: frames[
            Math.min(frames.length - 1, Math.floor(frames.length * 0.95))
          ],
          samples: frames.length,
        },
      };
    });
    report.views.push({ name, lon, lat, tlon, tlat, height, ...metrics });
    await page.screenshot({ path: new URL(`${name}.png`, out).pathname });
    console.log(
      stage,
      name,
      metrics.drawCalls,
      metrics.triangles,
      metrics.frameMs,
    );
  }
  for (
    let i = 0;
    i <
    Number(
      process.env.QA_TRAVEL_CYCLES ?? (process.env.QA_SCREENSHOTS_ONLY ? 0 : 4),
    );
    i++
  )
    for (const [lon, lat] of [
      [100.5538, 13.8026],
      [100.5104, 13.7396],
      [100.5273, 13.7259],
    ]) {
      await page.evaluate(
        ([lon, lat, follow]) => {
          const qa = window.__geographyQA;
          qa.move(lon, lat);
          if (follow) {
            const p = qa.session.player;
            qa.view([p.x - 45, 100, p.z + 80], [p.x, 0, p.z]);
          }
        },
        [lon, lat, !process.env.QA_KEEP_GALLERY_CAMERA],
      );
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      await page.waitForFunction(
        () => window.__geography.stream.settled,
        undefined,
        { timeout: 120000 },
      );
      await heapSession.send("HeapProfiler.collectGarbage");
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(resolve)),
      );
      await heapSession.send("HeapProfiler.collectGarbage");
      const heapUsage = await heapSession.send("Runtime.getHeapUsage");
      report.travel.push({
        heapUsage,
        ...(await page.evaluate(() => {
          window.gc?.();
          return {
            ...window.__geography,
            heap: performance.memory?.usedJSHeapSize,
          };
        })),
      });
    }
  for (const quality of process.env.QA_SCREENSHOTS_ONLY
    ? []
    : ["low", "medium"]) {
    await page.evaluate(
      (q) => window.__geographyQA.session.setQuality(q),
      quality,
    );
    await page.waitForTimeout(1000);
    report[quality] = await page.evaluate(async () => {
      const frames = [],
        qualities = new Set();
      const started = performance.now();
      let last = started;
      await new Promise((resolve) => {
        const tick = (now) => {
          frames.push(now - last);
          qualities.add(window.__geography.quality);
          last = now;
          if (frames.length < 45 && now - started < 2500)
            requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      frames.sort((a, b) => a - b);
      return {
        ...window.__geography,
        sampleQualities: [...qualities],
        frameMs: {
          p50: frames[Math.floor(frames.length * 0.5)],
          p95: frames[
            Math.min(frames.length - 1, Math.floor(frames.length * 0.95))
          ],
          samples: frames.length,
        },
      };
    });
  }
  fs.writeFileSync(
    new URL("metrics.json", out),
    JSON.stringify(report, null, 2) + "\n",
  );
  if (report.travel.length >= 9)
    for (let offset = 0; offset < 3; offset++) {
      const stops = report.travel.filter((_, i) => i % 3 === offset).slice(1),
        back = stops.map((s) => s.heapUsage.backingStorageSize);
      assert(
        Math.max(...back) - Math.min(...back) < 1024 * 1024,
        "No per-cycle backing-store accumulation after warmup",
      );
      assert(
        new Set(stops.map((s) => s.activeMeshes)).size === 1,
        "Evicted model roots cannot accumulate in the scene",
      );
    }
  assert.deepEqual(report.errors, []);
  assert(report.travel.every((t) => t.stream.active <= 25));
  assert(
    report.travel.every((t) => t.geometries <= t.activeMeshes + 100),
    "GPU residency bounded by live scenery meshes",
  );
  if (report.travel.length) assert(report.travel.at(-1).stream.disposed > 50);
  fs.writeFileSync(
    new URL("metrics.json", out),
    JSON.stringify(report, null, 2) + "\n",
  );
} finally {
  await browser?.close();
  server.kill();
}
