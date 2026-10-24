import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = new URL("../../../docs/qa/bang-rak/", import.meta.url)
    .pathname,
  server = await startQaServer(24687),
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
await fs.mkdir(out+"ui",{recursive:true});
for(let i=0;i<100;i++){try{if((await fetch("http://127.0.0.1:24687")).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const p = await browser.newPage({
  viewport: { width: 160, height: 90 },
  hasTouch: true,
});
p.setDefaultTimeout(180000);
const r = {
  physicalSafari: false,
  errors: [],
  layouts: [],
  resets: [],
  source:
    "Actual production geometry and engine in the development renderer; QA hook places roadside fixtures, real controls and engine transitions. Separate built-bundle UI replay. Low quality for UI/resource QA; not physical-device performance.",
};
p.on("pageerror", (e) => r.errors.push(e.message));
await p.addInitScript(() =>
  localStorage.setItem(
    "ttr-interface-v1",
    JSON.stringify({ quality: "low", motion: "reduced" }),
  ),
);
try {
  await p.goto("http://127.0.0.1:24687/?qa=1");
  await p.waitForFunction(() => window.__graphics?.frameId > 1);
  await p.getByTestId("button-free-roam").click();
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.frameTime = -1e8;
    e.model.snapshot.elapsed = 350;
    const d=e.model.district,l=d.landmarks.find(l=>l.id==="grand-postal"),n=d.nodes.find(n=>n.id===l.accessNode);
    Object.assign(e.model.player,{x:n.x,z:n.z,heading:0,speed:0,collision:0});e.cameraRevision++;
    for(let i=0;i<120;i++)e.update(1/60);
  });
  for (const [width, height] of [
    [375, 812],
    [430, 932],
    [844, 390],
    [1280, 800],
  ]) {
    await p.setViewportSize({ width, height });
    if (width > height)
      await p.evaluate(() => window.__graphics.engine.resume());
    await p.waitForTimeout(900);
    const layout = await p.evaluate(() => {
      const ids = [
        "text-current-street",
        "destination-banner",
        "button-pause",
        "button-open-map",
        "button-gas",
        "control-steer",
      ];
      return {
        width: innerWidth,
        height: innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        boxes: ids.map((id) => {
          const e = document.querySelector(`[data-testid="${id}"]`),
            b = e?.getBoundingClientRect(),
            s = e && getComputedStyle(e);
          return {
            id,
            visible:
              !!b &&
              b.width > 0 &&
              b.height > 0 &&
              s.visibility !== "hidden" &&
              s.display !== "none",
            box: b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null,
          };
        }),
      };
    });
    assert(!layout.overflow);
    if (width > height) {
      const a = layout.boxes.find((q) => q.id === "text-current-street");
      assert(a.visible);
      for (const q of layout.boxes.filter((q) => q.id !== a.id && q.visible)) {
        const b = a.box,
          c = q.box;
        assert(
          b.x + b.w <= c.x ||
            c.x + c.w <= b.x ||
            b.y + b.h <= c.y ||
            c.y + c.h <= b.y,
          `Street badge overlaps ${q.id}`,
        );
      }
    }
    await p.screenshot({
      path: out + `ui/hud-${width}x${height}.jpg`,
      type: "jpeg",
      quality: 90,
    });
    r.layouts.push(layout);
    console.log("layout", width, height);
  }
  await p.setViewportSize({ width: 844, height: 390 });
  await p.evaluate(() => {
    const e = window.__graphics.engine,
      d = e.model.district,
      n = new Map(d.nodes.map((n) => [n.id, n])),
      road = d.roads.filter((r) => r.corridor === "charoen-krung-30").at(-3),
      a = n.get(road.a),
      b = n.get(road.b);
    e.resume();
    Object.assign(e.model.player, {
      x: (a.x + b.x) / 2,
      z: (a.z + b.z) / 2,
      heading: Math.atan2(b.x - a.x, b.z - a.z),
      speed: 0,
    });
    e.cameraRevision++;
  });
  await p.waitForFunction(() =>
    document
      .querySelector('[data-testid="text-current-street"]')
      ?.textContent.includes("Charoen Krung Soi 30"),
  );
  assert(
    await p
      .getByTestId("text-current-street")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  );
  await p.screenshot({
    path: out + "ui/hud-long-name.jpg",
    type: "jpeg",
    quality: 90,
  });
  r.longName = true;
  await p.getByTestId("button-open-map").click();
  await p.getByTestId("world-map").waitFor();
  await p.screenshot({
    path: out + "ui/world-map.jpg",
    type: "jpeg",
    quality: 90,
  });
  await p.getByRole("button", { name: "Back to driving", exact: true }).click();
  r.mapReturn = true;
  r.newLook=[];
  for(const id of ["grand-postal","warehouse-30"]){
    const record=await p.evaluate(id=>{const e=window.__graphics.engine,d=e.model.district,l=d.landmarks.find(l=>l.id===id),n=d.nodes.find(n=>n.id===l.accessNode);e.resume();Object.assign(e.model.player,{x:n.x,z:n.z,speed:0,collision:0});for(let i=0;i<120;i++)e.update(1/60);e.cameraRevision++;return {id,opened:e.viewLandmark(id),target:e.model.snapshot.viewingLandmark};},id);
    assert(record.opened,`LOOK opens at ${id}'s actual roadside stop`);
    await p.waitForTimeout(900);
    await p.screenshot({path:out+`ui/look-${id}.jpg`,type:"jpeg",quality:90});
    await p.evaluate(()=>window.__graphics.engine.resume());
    assert.equal(await p.evaluate(()=>window.__graphics.engine.model.snapshot.viewingLandmark??null),null);
    r.newLook.push(record);
  }
  const saved=await p.evaluate(()=>{const e=window.__graphics.engine;e.career.flush();return {landmarks:[...e.career.profile.landmarks],wallet:e.career.profile.wallet};});
  assert(saved.landmarks.includes("grand-postal")&&saved.landmarks.includes("warehouse-30"));
  await p.reload();await p.waitForFunction(()=>window.__graphics?.frameId>1);await p.getByTestId("button-free-roam").click();
  const loaded=await p.evaluate(()=>({landmarks:[...window.__graphics.engine.career.profile.landmarks],wallet:window.__graphics.engine.career.profile.wallet}));
  assert.deepEqual(loaded,saved);r.saveLoad={pass:true,mode:"Existing career/discovery ledger; driving position resets by existing game design",landmarks:loaded.landmarks.filter(id=>["grand-postal","warehouse-30"].includes(id))};
  r.icon = await p.evaluate(() => {
    const e = window.__graphics.engine,
      d = e.model.district,
      a = d.destinations.find((a) => a.landmarkId === "icon"),
      q = d.nodes.find((n) => n.id === a.arrivalNode);
    Object.assign(e.model.player, { x: q.x, z: q.z, speed: 0, collision: 0 });
    e.resume();
    return {
      opened: e.viewLandmark("icon"),
      target: e.model.snapshot.viewingLandmark,
    };
  });
  assert(
    r.icon.opened,
    "Actual ICONSIAM LOOK opens at its real destination arrival",
  );
  await p.waitForTimeout(800);
  await p.evaluate(() => window.__graphics.engine.resume());
  await p.waitForTimeout(800);
  for (let i = 0; i < 8; i++) {
    await p.evaluate(() => {
      const e = window.__graphics.engine;
      e.restart();
      e.pause();
    });
    const f = await p.evaluate(() => window.__graphics.frameId);
    await p.waitForFunction((f) => window.__graphics.frameId > f + 2, f);
    r.resets.push(
      await p.evaluate(() => {
        const g = window.__graphics,
          c = g.camera,
          p = g.engine.model.player;
        return {
          stats: g.stats,
          glError: g.gl.getContext().getError(),
          override: !!window.__artCamera,
          inspecting: g.engine.model.snapshot.viewingLandmark ?? null,
          camera: c.position.toArray(),
          player: [p.x, p.z],
          distance: Math.hypot(c.position.x - p.x, c.position.z - p.z),
        };
      }),
    );
  }
  for (const q of r.resets.slice(5)) {
    assert.equal(q.stats.geometries, r.resets.at(-1).stats.geometries);
    assert.equal(q.stats.textures, r.resets.at(-1).stats.textures);
    assert.equal(q.glError, 0);
    assert(!q.override && !q.inspecting);
    assert(q.distance < 20);
  }
  assert.equal(r.errors.length, 0);
  r.pass = true;
} finally {
  await fs.writeFile(
    out + "validation/browser-state.json",
    JSON.stringify(r, null, 2) + "\n",
  );
  await browser.close();
  server.kill();
}
