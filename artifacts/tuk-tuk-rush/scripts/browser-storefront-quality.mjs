import { inspectSignDepth } from "./webgl-sign-depth.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
process.chdir(new URL("../", import.meta.url).pathname);
const out = new URL("../../../docs/qa/storefront-quality/", import.meta.url)
    .pathname,
  label = process.env.VISUAL_LABEL ?? "after",
  port = Number(process.env.VISUAL_PORT ?? 24681);
await fs.mkdir(out + label, { recursive: true });
await fs.mkdir(out + "validation", { recursive: true });
const files = [];
async function walk(dir) {
  for (const n of await fs.readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, n.name);
    if (n.isDirectory()) await walk(f);
    else
      files.push([
        path.relative("src/game", f),
        createHash("sha256")
          .update(await fs.readFile(f))
          .digest("hex"),
      ]);
  }
}
await walk("src/game");
const report = {
  label,
  checkoutCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  runtimeSourceSha256: createHash("sha256")
    .update(JSON.stringify(files.sort()))
    .digest("hex"),
  physicalSafari: false,
  protocol:
    "Production world, actual engine/controller/38 production vehicles, seed982; fixed 30 ticks at 60Hz, then freeze simulation for pixel matching; normal chase camera on drive views. No traffic removed. Medium/DPR1. Static views use QA art camera only.",
  scenes: [],
  errors: [],
  consoleErrors: [],
};
const server = await startQaServer(port),
  browser = await chromium.launch({
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
const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 1,
  hasTouch: true,
});
page.setDefaultTimeout(180000);
page.on("console", (m) => {
  if (m.type() === "error") report.consoleErrors.push(m.text());
});
page.on("pageerror", (e) => {
  report.errors.push(e.stack ?? e.message);
  console.error(e.message);
});
await page.addInitScript(() =>
  localStorage.setItem(
    "ttr-interface-v1",
    JSON.stringify({ quality: "medium", motion: "reduced" }),
  ),
);
try {
  await page.goto(`http://127.0.0.1:${port}/?qa=1`);
  await page.waitForFunction(() => window.__graphics?.frameId > 1);
  await page.getByTestId("button-free-roam").click();
  await page.addStyleTag({
    content:
      ".tt-ui,[data-testid=button-city-inspector]{visibility:hidden!important}",
  });
  const specs = JSON.parse(await fs.readFile(out + "scenes.json", "utf8"));
  const scenes = [
    ...specs,
    ...[
      [375, 812],
      [430, 932],
      [1280, 800],
    ].map((v) => ({ ...specs[2], id: `night-${v[0]}x${v[1]}`, viewport: v })),
  ];
  for (const s of scenes.filter(
    (s) =>
      !process.env.VISUAL_SCENES ||
      process.env.VISUAL_SCENES.split(",").includes(s.id),
  )) {
    const [width, height] = s.viewport ?? [844, 390];
    await page.setViewportSize({ width, height });
    const replay = await page.evaluate(async (s) => {
      const e = window.__graphics.engine,
        d = e.model.district;
      if (!window.__captureUpdate) {
        window.__captureUpdate = e.update.bind(e);
        e.update = () => {};
      }
      e.start("free");
      e.setQuality("medium");
      e.frameTime = -1e8;
      delete window.__artCamera;
      const { TrafficSystem, lanePoint } = await import("/src/game/traffic.ts");
      let pose = {
        x: s.look?.[0] ?? -85,
        z: s.look?.[2] ?? -188,
        heading: -1.89,
      };
      if (s.road) {
        const ns = new Map(d.nodes.map((n) => [n.id, n]));
        const r = d.roads
          .filter((r) => r.corridor === s.road)
          .sort((a, b) => {
            const mid = (r) => {
              const p = ns.get(r.a),
                q = ns.get(r.b);
              return Math.hypot(
                (p.x + q.x) / 2 - s.near[0],
                (p.z + q.z) / 2 - s.near[1],
              );
            };
            return mid(a) - mid(b);
          })[0];
        const a = ns.get(r.a),
          b = ns.get(r.b);
        pose = {
          ...lanePoint(a, b, r, 0.3),
          heading: Math.atan2(b.x - a.x, b.z - a.z),
        };
      }
      Object.assign(e.model.player, pose, { speed: 0 });
      e.trafficSystem = new TrafficSystem(d, 982);
      e.model.traffic = e.trafficSystem.create(e.model.player);
      e.model.snapshot.elapsed = s.elapsed - 0.5;
      e.model.input.gas = s.mode === "drive";
      let contactFrames = 0;
      for (let i = 0; i < 30; i++) {
        window.__captureUpdate(1 / 60);
        if (e.model.player.collision) contactFrames++;
      }
      e.model.snapshot.elapsed = s.elapsed;
      e.pause();
      e.cameraRevision++;
      if (s.mode === "inspect")
        Object.defineProperty(window, "__artCamera", {
          configurable: true,
          get: () => ({ position: [...s.camera], look: [...s.look] }),
        });
      return {
        player: { ...e.model.player },
        traffic: e.model.traffic.map((t) => ({
          id: t.id,
          x: t.x,
          z: t.z,
          speed: t.speed,
          from: t.from,
          to: t.to,
        })),
        contactFrames,
      };
    }, s);
    const samples = await page.evaluate(async () => {
      const f = () => new Promise((r) => requestAnimationFrame(r));
      for (let i = 0; i < 8; i++) await f();
      const a = [];
      for (let i = 0; i < 3; i++) {
        await f();
        a.push({ ...window.__graphics.stats });
      }
      return a;
    });
    await page.screenshot({
      path: out + label + "/" + s.id + ".jpg",
      type: "jpeg",
      quality: 91,
    });
    const signDepth = await inspectSignDepth(page);
    report.scenes.push({
      signDepth,
      ...s,
      viewport: [width, height],
      quality: "medium",
      dpr: 1,
      replay,
      cameraPose: await page.evaluate(() => ({
        position: window.__graphics.camera.position.toArray(),
        quaternion: window.__graphics.camera.quaternion.toArray(),
        fov: window.__graphics.camera.fov,
      })),
      samples,
    });
    console.log(label, s.id, JSON.stringify(samples.at(-1)));
  }
  assert.equal(report.errors.length, 0);
  assert(
    !report.consoleErrors.some((m) =>
      /WebGLProgram|GL_INVALID|VALIDATE_STATUS|ERROR: 0:/.test(m),
    ),
    report.consoleErrors.join("\n"),
  );
  report.pass = true;
} finally {
  await fs.writeFile(
    out + label + "/capture.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
  server.kill();
}
