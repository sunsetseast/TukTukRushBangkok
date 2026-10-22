import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out =
  process.env.QA_OUT ??
  new URL("../../../docs/qa/landmark-accuracy/browser/", import.meta.url)
    .pathname;
await fs.mkdir(out, { recursive: true });
const port = 24323,
  server = await startQaServer(port),
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
  pass: false,
  physicalIPhone: false,
  errors: [],
  rays: [],
  viewports: [],
  restarts: [],
};
try {
  const p = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
  });
  p.setDefaultTimeout(900000);
  p.on("pageerror", (e) => {
    report.errors.push(e.message);
    console.error("PAGE", e.message);
  });
  await p.goto(`http://127.0.0.1:${port}/?qa=1`);
  await p.waitForFunction(() => window.__graphics?.frameId > 1);
  await p.getByTestId("button-free-roam").click();
  const frames = async (n = 2) => {
    const f = await p.evaluate(() => window.__graphics.frameId);
    await p.waitForFunction(({ f, n }) => window.__graphics.frameId >= f + n, {
      f,
      n,
    });
  };
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.pause();
    e.setQuality("low");
    Object.assign(e.model.player, {
      x: 405,
      z: -203,
      heading: Math.PI,
      speed: 0,
    });
    e.cameraRevision++;
    window.__artCamera = { position: [405, 3.4, -203], look: [400, 12, -258] };
  });
  await frames();
  report.rays = await p.evaluate(() => {
    const g = window.__graphics,
      T = g.three,
      from = new T.Vector3(405, 3.4, -203),
      root = g.scene.getObjectByName("BangkokLandmark:hua");
    if (!root) throw Error("Actual Hua mesh missing");
    g.scene.updateMatrixWorld(true);
    const targets = [
      ["clock", 400, 19.2, -257.5],
      ["entrance", 402.25, 3.5, -259.9],
      ["arch-west", 383, 18, -257.8],
      ["arch-east", 417, 18, -257.8],
    ];
    const visible = (o) => {
      for (let q = o; q; q = q.parent) if (!q.visible) return false;
      return true;
    };
    return targets.map(([id, x, y, z]) => {
      const target = new T.Vector3(x, y, z),
        direction = target.clone().sub(from),
        distance = direction.length(),
        ray = new T.Raycaster(from, direction.normalize(), 0.1, distance + 2);
      const hit = ray
        .intersectObjects(g.scene.children, true)
        .find((h) => visible(h.object));
      let owner = hit?.object;
      while (owner && owner !== root) owner = owner.parent;
      return {
        id,
        hitHua: owner === root,
        distanceToFeature: hit ? hit.point.distanceTo(target) : null,
        firstObject: hit?.object.name,
      };
    });
  });
  assert(
    report.rays.every((r) => r.hitHua && r.distanceToFeature < 3),
    JSON.stringify(report.rays),
  );
  console.log("PASS actual rendered facade rays", report.rays);
  await fs.writeFile(`${out}/rays.json`, JSON.stringify(report.rays, null, 2));
  for (const [width, height] of [
    [375, 812],
    [430, 932],
    [844, 390],
    [1280, 800],
  ]) {
    console.log("Resize", width, height);
    await p.setViewportSize({ width, height });
    console.log('Resized',width,height);
    await p.evaluate(() => {
      delete window.__artCamera;
      const e = window.__graphics.engine;
      e.restart();
      e.setQuality("low");
      const d = e.model.district,
        a = d.destinations.find((a) => a.id === "icon"),
        n = d.nodes.find((n) => n.id === a.arrivalNode);
      Object.assign(e.model.player, { x: n.x, z: n.z, speed: 0, collision: 0 });
      e.frameTime = -100000;
      if (!e.viewLandmark("icon"))
        throw Error(
          "ICONSIAM inspection unavailable: " + e.model.snapshot.phase,
        );
    });
    console.log('Opened inspection',width,height);
    await p.getByTestId('inspection-gesture').waitFor();
    await p.waitForTimeout(650);
    await frames();
    console.log('Inspection frames ready',width,height);
    for (const id of [
      "inspection-return",
      "inspection-reset",
      "inspection-view-riverfront",
    ]) {
      const b = await p.getByTestId(id).boundingBox();
      assert(
        b &&
          b.x >= 0 &&
          b.y >= 0 &&
          b.x + b.width <= width + 1 &&
          b.y + b.height <= height + 1,
        `${id} outside ${width}x${height}`,
      );
    }
    console.log('Bounds checked',width,height);
    await p.screenshot({path:`${out}/inspection-${width}x${height}.jpg`,type:'jpeg',quality:80});
    await p.getByTestId("inspection-reset").click();
    console.log('Reset clicked',width,height);
    await p.getByTestId("inspection-return").click();
    console.log('Return clicked',width,height);
    await frames();
    const result = await p.evaluate(() => {
      const g = window.__graphics;
      return {
        inspection: !!g.engine.inspection.subject,
        cameraY: g.camera.position.y,
        artOverride: !!window.__artCamera,
      };
    });
    assert(!result.inspection && !result.artOverride && result.cameraY < 6);
    report.viewports.push({ width, height, ...result, pass: true });
    console.log("PASS viewport", width, height);
  }
  await p.setViewportSize({ width: 844, height: 390 });
  for (let i = 0; i < 3; i++) {
    await p.evaluate(() => {
      const e = window.__graphics.engine;
      e.restart();
      const d = e.model.district,
        a = d.destinations.find((a) => a.id === "icon"),
        n = d.nodes.find((n) => n.id === a.arrivalNode);
      Object.assign(e.model.player, { x: n.x, z: n.z, speed: 0, collision: 0 });
      if (!e.viewLandmark("icon"))
        throw Error("Restart inspection unavailable");
      window.__artCamera = { position: [2000, 200, 2000], look: [0, 20, 0] };
      e.restart();
      e.pause();
    });
    await frames(3);
    const result = await p.evaluate(() => {
      const g = window.__graphics,
        pl = g.engine.model.player;
      return {
        artOverride: !!window.__artCamera,
        inspection: !!g.engine.inspection.subject,
        cameraY: g.camera.position.y,
        playerDistance: Math.hypot(
          g.camera.position.x - pl.x,
          g.camera.position.z - pl.z,
        ),
        stats: { ...g.stats },
      };
    });
    assert(
      !result.artOverride &&
        !result.inspection &&
        result.cameraY < 6 &&
        result.playerDistance < 15,
    );
    report.restarts.push(result);
  }
  assert.equal(
    report.restarts[0].stats.textures,
    report.restarts[2].stats.textures,
  );
  assert.equal(
    report.restarts[0].stats.geometries,
    report.restarts[2].stats.geometries,
  );
  assert.deepEqual(report.errors, []);
  await p.setViewportSize({width:1280,height:800});
  await p.getByTestId('button-city-inspector').click();
  await p.getByTestId('city-inspector').waitFor();
  await p.getByLabel('Select destination').selectOption('swing');
  const inspectorText=await p.getByTestId('city-inspector').innerText();
  assert(inspectorText.includes('263.0')&&inspectorText.includes('13.75181'));
  await p.screenshot({path:`${out}/inspector.jpg`,type:'jpeg',quality:85});
  report.inspector={pass:true,source:'live generated District',selected:'swing',projectionResidual:263};
  await p.getByRole('button',{name:'Close',exact:true}).click();
  report.pass = true;
  await fs.writeFile(`${out}/checks.json`, JSON.stringify(report, null, 2));
  console.log(
    "PASS browser facade, mobile layouts and repeated ICONSIAM restart checks",
  );
} finally {
  await browser.close();
  server.kill();
}
