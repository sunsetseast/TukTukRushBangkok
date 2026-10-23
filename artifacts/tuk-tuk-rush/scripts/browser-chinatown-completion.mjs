import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = new URL("../../../docs/qa/chinatown-completion/", import.meta.url)
  .pathname;
const label = process.env.COMPLETION_LABEL ?? "after";
const perfOnly = process.env.COMPLETION_PERF_ONLY === "1";
const port = Number(process.env.COMPLETION_PORT ?? 24679);
const server = await startQaServer(port);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: [
    "--no-sandbox",
    "--no-zygote",
    "--single-process",
    "--in-process-gpu",
    "--ignore-gpu-blocklist",
    "--disable-dev-shm-usage",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
page.setDefaultTimeout(120000);
async function hashRuntime(dir) {
  const rows = [];
  async function walk(p) {
    for (const n of await fs.readdir(p, { withFileTypes: true })) {
      const f = path.join(p, n.name);
      if (n.isDirectory()) await walk(f);
      else
        rows.push([
          path.relative(dir, f),
          createHash("sha256")
            .update(await fs.readFile(f))
            .digest("hex"),
        ]);
    }
  }
  await walk(dir);
  return createHash("sha256").update(JSON.stringify(rows.sort())).digest("hex");
}
const report = {
  label,
  runtimeSourceSha256: await hashRuntime(path.resolve("src/game")),
  checkoutCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  renderer: (await browser.version()) + " / SwiftShader",
  physicalSafari: false,
  errors: [],
  scenes: [],
  layouts: [],
  resets: [],
};
page.on("pageerror", (e) => {
  report.errors.push(e.stack ?? e.message);
  console.error(e.stack ?? e.message);
});
const scenes = JSON.parse(await fs.readFile(out + "scenes.json", "utf8"));
try {
  await page.goto(`http://127.0.0.1:${port}/?qa=1`);
  await page.waitForFunction(() => window.__graphics?.frameId > 1);
  await page.getByTestId("button-free-roam").click();
  await page.addStyleTag({
    content:
      ".tt-ui,[data-testid=button-city-inspector]{visibility:hidden!important}",
  });
  for (const raw of scenes.filter(
    (s) =>
      !process.env.COMPLETION_SCENES ||
      process.env.COMPLETION_SCENES.split(",").includes(s.id),
  )) {
    const s =
      label === "after"
        ? {
            ...raw,
            camera: raw.afterCamera ?? raw.camera,
            look: raw.afterLook ?? raw.look,
          }
        : raw;
    await page.evaluate((s) => {
      const e = window.__graphics.engine;
      e.pause();
      e.model.traffic.length = 0;
      e.setQuality("medium");
      e.frameTime = -1e8;
      e.model.snapshot.elapsed = s.night ? 650 : 40;
      e.cameraRevision++;
      Object.assign(e.model.player, { x: s.look[0], z: s.look[2], speed: 0 });
      Object.defineProperty(window, "__artCamera", {
        configurable: true,
        get: () => ({ position: [...s.camera], look: [...s.look] }),
      });
    }, s);
    const samples = await page.evaluate(async (perfOnly) => {
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      for (let i = 0; i < (perfOnly ? 24 : 4); i++) await frame();
      const a = [];
      for (let i = 0; i < (perfOnly ? 32 : 8); i++) {
        await frame();
        a.push({ ...window.__graphics.stats });
      }
      return a;
    }, perfOnly);
    if (!perfOnly)
      await page.screenshot({
        path: out + label + "/" + s.id + ".jpg",
        type: "jpeg",
        quality: 86,
      });
    report.scenes.push({
      id: s.id,
      runtimeSourceSha256: report.runtimeSourceSha256,
      camera: s.camera,
      look: s.look,
      matchMethod: s.matchMethod,
      quality: "medium",
      viewport: [844, 390],
      samples,
    });
    console.log(label, s.id, samples.at(-1));
  }
  if (
    label === "after" &&
    process.env.COMPLETION_SKIP_UI !== "1" &&
    !perfOnly
  ) {
    await page.addStyleTag({
      content:
        ".tt-ui,[data-testid=button-city-inspector]{visibility:visible!important}",
    });
    await page.evaluate(() => {
      delete window.__artCamera;
      const e = window.__graphics.engine;
      e.start("free");
      e.frameTime = -1e8;
      e.model.traffic.length = 0;
    });
    for (const [width, height] of [
      [375, 812],
      [430, 932],
      [844, 390],
      [1280, 800],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(200);
      if (width > height)
        await page.evaluate(() => window.__graphics.engine.resume());
      console.log("layout", width, height);
      if (width > height)
        await page
          .getByTestId("text-current-street")
          .waitFor({ state: "visible" });
      const boxes = await page.evaluate(() =>
        [
          "text-current-street",
          "destination-banner",
          "button-pause",
          "button-open-map",
          "button-gas",
          "control-steer",
        ].map((id) => {
          const e = document.querySelector(`[data-testid="${id}"]`),
            b = e?.getBoundingClientRect(),
            s = e && getComputedStyle(e);
          return {
            id,
            visible:
              !!b &&
              b.width > 0 &&
              s.visibility !== "hidden" &&
              s.display !== "none",
            box: b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null,
          };
        }),
      );
      if (width > height) {
        const street = boxes.find((b) => b.id === "text-current-street");
        assert(street.visible);
        for (const other of boxes.filter(
          (b) => b.id !== "text-current-street" && b.visible,
        )) {
          const a = street.box,
            b = other.box;
          assert(
            a.x + a.w <= b.x ||
              b.x + b.w <= a.x ||
              a.y + a.h <= b.y ||
              b.y + b.h <= a.y,
            `Street badge overlaps ${other.id}`,
          );
        }
      }
      assert(
        !(await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        )),
      );
      await page.screenshot({
        path: out + `after/hud-${width}x${height}.jpg`,
        type: "jpeg",
        quality: 86,
      });
      report.layouts.push({ width, height, boxes });
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => {
      const e = window.__graphics.engine,
        d = e.model.district,
        n = new Map(d.nodes.map((n) => [n.id, n])),
        r = d.roads.filter((r) => r.corridor === "mittraphap").at(-3),
        a = n.get(r.a),
        b = n.get(r.b);
      Object.assign(e.model.player, {
        x: (a.x + b.x) / 2,
        z: (a.z + b.z) / 2,
        heading: Math.atan2(b.x - a.x, b.z - a.z),
        speed: 0,
      });
      e.resume();
    });
    await page.waitForFunction(() =>
      document
        .querySelector('[data-testid="text-current-street"]')
        ?.textContent.includes("Mittraphap Thai-China Road"),
    );
    assert(
      await page
        .getByTestId("text-current-street")
        .evaluate(
          (e) =>
            e.scrollWidth <= e.clientWidth &&
            e.getBoundingClientRect().bottom < innerHeight - 140,
        ),
      "Long road name must wrap within its badge above controls",
    );
    await page.screenshot({
      path: out + "after/hud-long-name-844x390.jpg",
      type: "jpeg",
      quality: 86,
    });
    await page.getByTestId("button-open-map").click();
    await page.getByTestId("world-map").waitFor();
    await page.screenshot({
      path: out + "after/world-map.jpg",
      type: "jpeg",
      quality: 88,
    });
    await page
      .getByRole("button", { name: "Back to driving", exact: true })
      .click();
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => {
        const e = window.__graphics.engine;
        e.restart();
        e.pause();
      });
      const f = await page.evaluate(() => window.__graphics.frameId);
      await page.waitForFunction((f) => window.__graphics.frameId > f + 2, f);
      report.resets.push(
        await page.evaluate(() => ({
          stats: window.__graphics.stats,
          glError: window.__graphics.gl.getContext().getError(),
          override: !!window.__artCamera,
        })),
      );
    }
    for (const r of report.resets.slice(5)) {
      assert.equal(r.stats.geometries, report.resets.at(-1).stats.geometries);
      assert.equal(r.stats.textures, report.resets.at(-1).stats.textures);
      assert.equal(r.glError, 0);
    }
  }
} finally {
  let saved = report;
  if (process.env.COMPLETION_SCENES && !perfOnly) {
    try {
      const old = JSON.parse(
        await fs.readFile(out + label + "/capture.json", "utf8"),
      );
      saved = {
        ...report,
        resetsRuntimeSourceSha256: report.resets.length
          ? report.runtimeSourceSha256
          : (old.resetsRuntimeSourceSha256 ?? old.runtimeSourceSha256),
        scenes: [
          ...old.scenes.filter(
            (s) => !report.scenes.some((q) => q.id === s.id),
          ),
          ...report.scenes,
        ],
        layouts: report.layouts.length ? report.layouts : old.layouts,
        resets: report.resets.length ? report.resets : old.resets,
      };
    } catch {}
  }
  await fs.writeFile(
    perfOnly
      ? out + `validation/performance-${label}.json`
      : out + label + "/capture.json",
    JSON.stringify(saved, null, 2) + "\n",
  );
  await browser.close();
  server.kill();
}
assert.equal(report.errors.length, 0, report.errors.join("\n"));
