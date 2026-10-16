/** Matched actual WebGL survey. Repositioned fixtures are not claimed driven journeys. */
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = path.resolve(
  process.env.OUT_DIR || "../../docs/graphics/living-bangkok/after",
);
await fs.mkdir(out, { recursive: true });
if (process.env.APP_ROOT) process.chdir(process.env.APP_ROOT);
const server = await startQaServer(24239),
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
const report = {
  environment: "Chromium 138 / SwiftShader software WebGL; not physical iPhone",
  viewport: [844, 390],
  errors: [],
  captures: [],
  maps: [],
};
try {
  const p = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  p.setDefaultTimeout(90000);
  p.on("pageerror", (e) => report.errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") {
      report.errors.push(m.text().slice(0, 2500));
      console.error(m.text().slice(0, 2500));
    }
  });
  await p.addInitScript(() => {
    window.__stalls = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        window.__stalls.push({ start: e.startTime, duration: e.duration });
    }).observe({ type: "longtask", buffered: true });
  });
  const start = Date.now();
  await p.goto("http://127.0.0.1:24239");
  await p.waitForFunction(() => window.__graphics?.frameId > 2);
  report.startupMs = Date.now() - start;
  await p.getByTestId("button-free-roam").click();
  report.interactiveMs = Date.now() - start;
  console.log("interactive", report.interactiveMs);
  if (process.env.PROFILE_ONLY) {
    await p.evaluate(() => {
      const e = window.__graphics.engine;
      e.setQuality("low");
      e.model.snapshot.elapsed = 300;
      e.clearInput();
    });
    report.resources = await p.evaluate(() => {
      const g = window.__graphics,
        arrays = new Set(),
        geos = new Set(),
        mats = new Set(),
        tex = new Set();
      g.scene.traverse((o) => {
        if (o.geometry) {
          geos.add(o.geometry);
          for (const a of Object.values(o.geometry.attributes))
            arrays.add(a.isInterleavedBufferAttribute ? a.data.array : a.array);
          if (o.geometry.index) arrays.add(o.geometry.index.array);
        }
        for (const a of [o.instanceMatrix, o.instanceColor])
          if (a) arrays.add(a.array);
        for (const m of [o.material].flat().filter(Boolean)) {
          mats.add(m);
          for (const t of Object.values(m)) if (t?.isTexture) tex.add(t);
        }
      });
      return {
        geometryBytes: [...arrays].reduce((n, a) => n + a.byteLength, 0),
        pose: {
          x: g.engine.model.player.x,
          z: g.engine.model.player.z,
          heading: g.engine.model.player.heading,
        },
        camera: g.camera.position.toArray(),
        quality: g.engine.model.snapshot.quality,
        geometries: geos.size,
        materials: mats.size,
        programs: g.gl.info.programs.length,
        textures: [...tex].map((t) => ({
          name: t.name,
          width: t.image?.width,
          height: t.image?.height,
          bytes: t.image?.data?.byteLength,
          mipmaps: t.generateMipmaps,
        })),
        gpuMemoryAvailable: false,
        gpuTimerAvailable: !!g.gl
          .getContext()
          .getExtension("EXT_disjoint_timer_query_webgl2"),
        heapBytes: performance.memory?.usedJSHeapSize,
      };
    });
    report.frames = await p.evaluate(
      async ({ duration, maxSamples }) => {
        const samples = [];
        let previous = performance.now(),
          start = previous;
        for (
          let i = 0;
          i < maxSamples && performance.now() - start < duration;
          i++
        ) {
          await new Promise(requestAnimationFrame);
          const now = performance.now();
          samples.push({
            ...window.__graphics.stats,
            intervalMs: now - previous,
          });
          previous = now;
        }
        return samples;
      },
      {
        duration: Number(process.env.PROFILE_SECONDS || 30) * 1000,
        maxSamples: process.env.PROFILE_SECONDS ? 10000 : 120,
      },
    );
    report.warmResources = await p.evaluate(() => ({
      memory: window.__graphics.gl.info.memory,
      programs: window.__graphics.gl.info.programs.length,
    }));
    for (let i = 0; i < 7; i++) {
      report.maps.push(
        await p.evaluate(
          () =>
            new Promise((resolve) => {
              const start = performance.now();
              let mount;
              const observer = new MutationObserver(() => {
                if (document.querySelector(".tt-world-map-body>svg")) {
                  observer.disconnect();
                  mount = performance.now() - start;
                  requestAnimationFrame(() =>
                    resolve({
                      mountMs: mount,
                      rafMs: performance.now() - start,
                      dom: document.querySelectorAll("*").length,
                      svgNodes: document
                        .querySelector(".tt-world-map-body>svg")
                        .querySelectorAll("*").length,
                    }),
                  );
                }
              });
              observer.observe(document.body, {
                childList: true,
                subtree: true,
              });
              document.querySelector('[data-testid="button-open-map"]').click();
              setTimeout(() => {
                observer.disconnect();
                resolve({ mountMs: mount, timeout: true });
              }, 15000);
            }),
        ),
      );
      console.log("map", i, report.maps.at(-1));
      await p.getByTestId("button-close-map").click();
    }
  } else {
    await p.evaluate(() => {
      const e = window.__graphics.engine;
      window.__surveyTick = e.update.bind(e);
      e.update = () => {};
    });
    const cases = [
      ...[
        "gate",
        "traimit",
        "pho",
        "arun",
        "palace",
        "paknam",
        "khaosan",
        "talatnoi",
        "paragon",
        "terminal",
        "mahanakhon",
        "chongnonsi",
        "taksin",
        "icon",
        "asiatique",
      ].map((id) => [id, 90, "medium"]),
      ["yaowarat", 0, "medium"],
      ["yaowarat", 150, "medium"],
      ["yaowarat", 300, "medium"],
      ["yaowarat", 300, "low"],
      ["residential", 0, "low"],
      ["bridge", 150, "medium"],
      ["silom", 300, "medium"],
      ["sukhumvit", 300, "medium"],
    ];
    for (const [id, elapsed, quality] of cases.filter(
      (c) =>
        !process.env.CASE_FILTER ||
        process.env.CASE_FILTER.split(",").includes(c[0]),
    )) {
      const pose = await p.evaluate(
        ({ id, elapsed, quality }) => {
          const e = window.__graphics.engine,
            d = e.model.district,
            l = d.landmarks.find((l) => l.id === id),
            station = d.transit?.lines
              .flatMap((l) => l.stations)
              .find((s) =>
                id === "chongnonsi"
                  ? s.name.includes("Chong Nonsi")
                  : id === "taksin"
                    ? s.name.includes("Saphan Taksin")
                    : false,
              );
          const target =
            station ||
            {
              talatnoi: { x: 160, z: 360 },
              residential: { x: -1640, z: -900 },
              silom: d.landmarks.find((l) => l.id === "mahanakhon"),
              sukhumvit: d.landmarks.find((l) => l.id === "terminal"),
            }[id] ||
            d.spawn;
          const nearest = d.nodes.reduce((best, n) =>
            Math.hypot(n.x - target.x, n.z - target.z) <
            Math.hypot(best.x - target.x, best.z - target.z)
              ? n
              : best,
          );
          const n = l
            ? d.nodes.find((n) => n.id === l.accessNode)
            : id === "bridge"
              ? d.nodes.find((n) => n.id === d.roads.find((r) => r.bridge).a)
              : nearest;
          let heading = l
            ? Math.atan2((l.plot?.x ?? l.x) - n.x, (l.plot?.z ?? l.z) - n.z)
            : Math.atan2(target.x - n.x, target.z - n.z);
          if (!l && !station) {
            const r = d.roads.find(
                (r) => (r.a === n.id || r.b === n.id) && !r.shortcut,
              ),
              q = d.nodes.find((q) => q.id === (r?.a === n.id ? r.b : r?.a));
            if (q) heading = Math.atan2(q.x - n.x, q.z - n.z);
          }
          e.clearInput();
          e.setQuality(quality);
          Object.assign(e.model.player, {
            x: n.x,
            z: n.z,
            heading,
            speed: 0,
            collision: 0,
          });
          window.__surveyTick(1 / 60);
          e.model.snapshot.elapsed = elapsed;
          e.model.snapshot.message = "";
          e.messageTime = 0;
          e.publish();
          return { x: n.x, z: n.z, heading, landmark: l?.name };
        },
        { id, elapsed, quality },
      );
      const f = await p.evaluate(() => window.__graphics.frameId);
      await p.waitForFunction((f) => window.__graphics.frameId > f + 5, f);
      const filename = `${id}-${elapsed}-${quality}.jpg`;
      await p.screenshot({
        path: `${out}/${filename}`,
        type: "jpeg",
        quality: 84,
        timeout: 90000,
      });
      assert.deepEqual(report.errors, []);
      report.captures.push({
        filename,
        pose,
        elapsed,
        quality,
        stats: await p.evaluate(() => ({
          ...window.__graphics.stats,
          camera: window.__graphics.camera.position.toArray(),
        })),
      });
      await fs.writeFile(`${out}/survey.json`, JSON.stringify(report, null, 2));
      console.log("captured", filename);
    }
  }
  report.stalls = await p.evaluate(() => window.__stalls);
  report.endResources = await p.evaluate(() => ({
    memory: window.__graphics.gl.info.memory,
    programs: window.__graphics.gl.info.programs.length,
    heapBytes: performance.memory?.usedJSHeapSize,
  }));
  assert.deepEqual(report.errors, []);
  await fs.writeFile(
    `${out}/${process.env.PROFILE_ONLY ? "profile" : "survey"}.json`,
    JSON.stringify(report, null, 2),
  );
} finally {
  await browser.close();
  server.kill();
}
