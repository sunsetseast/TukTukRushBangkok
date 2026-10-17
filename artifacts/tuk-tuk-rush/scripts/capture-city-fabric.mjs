/** Matched native-chase survey; runs against either checkout, one browser at a time. */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = path.resolve(
  process.env.QA_OUT || "../../docs/qa/city-fabric/after",
);
if (process.env.APP_ROOT) process.chdir(process.env.APP_ROOT);
await fs.mkdir(out, { recursive: true });
const port = Number(process.env.QA_PORT || 24279),
  server = await startQaServer(port);
let browser;
const report = {
  renderer: "Chromium / SwiftShader, not physical iPhone Safari",
  errors: [],
  shots: [],
};
try {
  report.shots =
    JSON.parse(await fs.readFile(`${out}/report.json`, "utf8")).shots ?? [];
} catch {}
try {
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
  const p = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  p.setDefaultTimeout(120000);
  p.on("pageerror", (e) => {
    report.errors.push(e.message);
    console.log("ERROR", e.message);
  });
  const began = performance.now();
  await p.goto(`http://127.0.0.1:${port}/?qa=1`);
  await p.waitForFunction(() => window.__graphics?.frameId > 3);
  report.devReadyMs = performance.now() - began;
  console.log("World ready", report.devReadyMs);
  await p.evaluate(() => {
    window.__graphics.engine.missionSeed = 87;
    window.__graphics.engine.sessions = 0;
  });
  await p.getByTestId("button-free-roam").click();
  await p.locator(".tt-title").waitFor({ state: "detached" });
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.update = () => {};
    e.setQuality("medium");
    window.__graphics.scene.getObjectByName("MissionBeacon").scale.setScalar(0);
  });
  await p.addStyleTag({
    content:
      ".tt-ui{visibility:hidden!important}.tt-world-map{visibility:visible!important}",
  });
  const scenes = [
    { name: "diagonal", road: 531, reverse: true },
    { name: "fast", road: 531, reverse: true, quality: "low" },
    { name: "chinatown", corridor: "yaowarat", near: "gate" },
    { name: "old-town", corridor: "old_w", near: "pho" },
    { name: "siam", corridor: "phaya", near: "paragon" },
    { name: "riverfront", corridor: "charoen_nakhon", near: "icon" },
    { name: "bts", corridor: "silom", near: "mahanakhon" },
    { name: "market", corridor: "khaosan", near: "khaosan", time: 160 },
    { name: "talat-noi", corridor: "songwat", near: "gate" },
    { name: "sukhumvit", corridor: "sukhumvit", near: "terminal" },
  ];
  for (const s of scenes) {
    if (
      process.env.QA_SELECT &&
      !process.env.QA_SELECT.split(",").includes(s.name)
    )
      continue;
    const pose = await p.evaluate((s) => {
      const e = window.__graphics.engine,
        d = e.model.district,
        nodes = new Map(d.nodes.map((n) => [n.id, n]));
      let r = d.roads[s.road];
      if (!r) {
        const l = d.landmarks.find((l) => l.id === s.near);
        r = d.roads
          .filter(
            (r) =>
              r.corridor === s.corridor &&
              Math.hypot(
                nodes.get(r.a).x - nodes.get(r.b).x,
                nodes.get(r.a).z - nodes.get(r.b).z,
              ) > 22,
          )
          .reduce(
            (best, r) => {
              const a = nodes.get(r.a),
                b = nodes.get(r.b),
                q = Math.hypot((a.x + b.x) / 2 - l.x, (a.z + b.z) / 2 - l.z);
              return q < best.q ? { r, q } : best;
            },
            { q: Infinity },
          ).r;
      }
      let a = nodes.get(r.a),
        b = nodes.get(r.b);
      if (s.reverse) [a, b] = [b, a];
      const heading = Math.atan2(b.x - a.x, b.z - a.z),
        pose = {
          x: (a.x + b.x) / 2 + Math.cos(heading) * Math.min(3, r.width / 4),
          z: (a.z + b.z) / 2 - Math.sin(heading) * Math.min(3, r.width / 4),
          heading,
          speed: 0,
          steer: 0,
          lean: 0,
          collision: 0,
        };
      Object.assign(e.model.player, pose);
      e.cameraRevision++;
      e.model.snapshot.elapsed = s.time ?? 75;
      e.slowTime = -1e6;
      e.publish();
      return { pose, roadIndex: d.roads.indexOf(r), corridor: r.corridor };
    }, s);
    const f = await p.evaluate(() => window.__graphics.frameId);
    await p.waitForFunction((f) => window.__graphics.frameId > f + 5, f);
    const data = await p.evaluate(async () => {
      const g = window.__graphics,
        frames = [];
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        frames.push({ ...g.stats });
      }
      const geos = new Set(),
        materials = new Set();
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
        for (const m of [].concat(o.material || [])) materials.add(m);
      });
      g.gl.render(g.scene, g.camera);
      g.gl.getContext().finish();
      return {
        jpeg: g.gl.domElement.toDataURL("image/jpeg", 0.85).split(",")[1],
        camera: {
          position: g.camera.position.toArray(),
          quaternion: g.camera.quaternion.toArray(),
        },
        frames,
        glError: g.gl.getContext().getError(),
        quality: g.engine.model.snapshot.quality,
        time: g.engine.model.snapshot.elapsed,
        resources: {
          ...g.gl.info.memory,
          programs: g.gl.info.programs.length,
          bufferBytes,
          materials: materials.size,
        },
      };
    });
    await fs.writeFile(
      `${out}/${s.name}.jpg`,
      Buffer.from(data.jpeg, "base64"),
    );
    delete data.jpeg;
    report.shots = report.shots.filter((x) => x.name !== s.name);
    report.shots.push({ name: s.name, ...pose, ...data });
    await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
    console.log("Captured", s.name, data.frames.at(-1).calls);
  }
  if (!process.env.QA_SELECT || process.env.QA_SELECT.includes("map")) {
    await p.evaluate(() => {
      const e = window.__graphics.engine,
        d = e.model.district,
        a = d.nodes.find((n) => n.id === d.roads[531].a),
        b = d.nodes.find((n) => n.id === d.roads[531].b),
        heading = Math.atan2(a.x - b.x, a.z - b.z);
      Object.assign(e.model.player, {
        x: (a.x + b.x) / 2 + Math.cos(heading) * 3,
        z: (a.z + b.z) / 2 - Math.sin(heading) * 3,
        heading,
      });
      e.cameraRevision++;
      e.model.snapshot.discoveredDistricts = [
        "chinatown",
        "talatnoi",
        "oldtown",
        "siam",
        "silom",
        "icon",
      ];
      e.model.snapshot.discoveredLandmarks = e.model.district.landmarks.map(
        (l) => l.id,
      );
      e.publish();
      document.querySelector('[data-testid="button-open-map"]').click();
    });
    await p.getByTestId("world-map").waitFor();
    await p.getByTestId("button-whole-city").click();
    await p.screenshot({ path: `${out}/map.jpg`, type: "jpeg", quality: 87 });
  }
  await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  if (report.errors.length || report.shots.some((s) => s.glError))
    throw Error(JSON.stringify(report.errors));
} finally {
  await browser?.close();
  server.kill();
}
