import fs from "node:fs/promises";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const spec=(id,approach,radius,height)=>({id,approach,radius,height});
const MASTER_PLAN_LOCATIONS=[
 spec('palace',[295,335],310,45),spec('sanam',[304,335],350,12),
 spec('pho',[250,448],210,28),spec('swing',[410,340],165,25),
 spec('golden',[505,330],230,62),spec('democracy',[415,267],190,30),
 spec('hua',[602,550],270,28),spec('traimit',[564,610],170,49),
 spec('gate',[550,610],150,25),spec('yaowarat',[515,581],170,28),
];
const out = process.env.CITY_OUTPUT,
  label = process.env.CITY_LABEL ?? "after",
  port = +(process.env.CITY_PORT ?? 24321),
  selection = process.env.CITY_NAMES?.split(",");
if (!out) throw Error("CITY_OUTPUT must identify the evidence directory");
await fs.mkdir(`${out}/${label}`, { recursive: true });
const server = await startQaServer(port),
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
const viewport={width:+(process.env.CITY_WIDTH??960),height:+(process.env.CITY_HEIGHT??540)};
const records = [],
  errors = [];
const begin = Date.now();
if (process.env.CITY_RESUME === "1") {
  try {
    const prior = JSON.parse(
      await fs.readFile(`${out}/${label}/capture.json`, "utf8"),
    );
    records.push(...prior.records);
  } catch {}
}
try {
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(600000);
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error(e.message);
  });
  await page.goto(`http://127.0.0.1:${port}/?qa=1`);
  console.log(label, "loading");
  await page.waitForFunction(() => window.__graphics?.frameId > 1);
  const startupMs = Date.now() - begin;
  console.log(label, "scene ready", startupMs);
  await page.getByTestId("button-free-roam").click();
  await page.addStyleTag({ content: ".tt-ui{visibility:hidden!important}" });
  await page.evaluate(() => {
    const e = window.__graphics.engine;
    e.pause();
    e.setQuality("medium");
    e.model.traffic.length = 0;
  });
  for (const spec of MASTER_PLAN_LOCATIONS.filter(
    (s) => !selection || selection.includes(s.id),
  )) {
    const world = ([x, z]) => ({ x: (x - 500) * 4, z: (z - 600) * 4 }),
      target = await page.evaluate(id=>{
        const l=window.__graphics.engine.model.district.landmarks.find(l=>l.id===id);
        return l?.plot??l??{x:60,z:-72};
      },spec.id),
      approach = world(spec.approach);
    for (const view of [
      "ground",
      "elevated",
      "driving", ...((process.env.CITY_NIGHT_ALL==='1'||["golden","gate","hua"].includes(spec.id))?["night"]:[]), ...(["palace","pho"].includes(spec.id)?["river"]:[]),
    ].filter(v=>!process.env.CITY_VIEWS||process.env.CITY_VIEWS.split(",").includes(v))) {
      if (
        process.env.CITY_RESUME === "1" &&
        !process.env.CITY_NAMES &&
        records.some(
          (r) =>
            r.id === spec.id &&
            r.view === view &&
            (view === "elevated" || r.pose.roadVerified),
        )
      )
        continue;
      const riverView =
        [
          "arun",
          "icon",
          "oriental",
          "peninsula",
          "hilton",
          "shangri",
          "four-seasons",
          "capella",
          "anantara",
          "river-city",
        ].includes(spec.id) && view !== "driving";
      const legal = await page.evaluate(
        ({ approach, target, id }) => {
          const d = window.__graphics.engine.model.district,
            nodes = new Map(d.nodes.map((n) => [n.id, n]));
          const side = (p) => {
            let best;
            for (let i = 1; i < d.river.length; i++) {
              const a = d.river[i - 1],
                b = d.river[i],
                dx = b.x - a.x,
                dz = b.z - a.z,
                t = Math.max(
                  0,
                  Math.min(
                    1,
                    ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz),
                  ),
                ),
                q = { x: a.x + dx * t, z: a.z + dz * t },
                distance = Math.hypot(q.x - p.x, q.z - p.z);
              if (!best || distance < best.distance) best = { ...q, distance };
            }
            return Math.sign(p.x - best.x);
          };
          return d.roads
            .filter(
              (r) =>
                !r.shortcut &&
                !r.bridge &&
                (id !== "yaowarat" || r.corridor === "yaowarat"),
            )
            .filter(
              (r) =>
                side(nodes.get(r.a)) === side(target) &&
                side(nodes.get(r.b)) === side(target),
            )
            .map((r) => {
              const a = nodes.get(r.a),
                b = nodes.get(r.b),
                dx = b.x - a.x,
                dz = b.z - a.z,
                t = Math.max(
                  0,
                  Math.min(
                    1,
                    ((approach.x - a.x) * dx + (approach.z - a.z) * dz) /
                      (dx * dx + dz * dz),
                  ),
                ),
                p = { x: a.x + dx * t, z: a.z + dz * t };
              return {
                ...p,
                distance: Math.hypot(p.x - approach.x, p.z - approach.z),
                width: r.width,
                corridor: r.corridor,
                oneWay:!!r.oneWay,
                tangent: { x: dx, z: dz },
              };
            })
            .sort((a, b) => a.distance - b.distance)[0];
        },
        { approach, target, id: spec.id },
      );
      if (!legal) throw Error("No legal same-bank street approach: " + spec.id);
      if(view==='river') {
        const water=await page.evaluate(target=>{
          const d=window.__graphics.engine.model.district;
          const points=d.river.slice(1).map((b,i)=>{const a=d.river[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((target.x-a.x)*dx+(target.z-a.z)*dz)/(dx*dx+dz*dz)));const p={x:a.x+t*dx,z:a.z+t*dz};return {...p,distance:Math.hypot(p.x-target.x,p.z-target.z)};});
          const p=points.sort((a,b)=>a.distance-b.distance)[0],off=d.riverWidth/2-8;
          return {x:p.x+(target.x-p.x)/p.distance*off,z:p.z+(target.z-p.z)/p.distance*off};
        },target);
        approach.x=water.x;approach.z=water.z;
      }
      const street = { x: legal.x, z: legal.z },
        observer = (riverView||view==='river') ? approach : street;
      const camera =
        view === "driving"
          ? null
          : view === "elevated"
            ? {
                position: [
                  target.x + spec.radius * 0.64,
                  Math.max(80, spec.radius * 0.8, spec.height * 0.8),
                  target.z + spec.radius * 0.76,
                ],
                look: [target.x, Math.min(32, spec.height * 0.3), target.z],
              }
            : {
                position: [observer.x, 3.4, observer.z],
                look: [
                  target.x,
                  Math.min(35, Math.max(9, spec.height * 0.32)),
                  target.z,
                ],
              };
      if (spec.id === "yaowarat" && camera && view !== "elevated") {
        const len = Math.hypot(legal.tangent.x, legal.tangent.z);
        camera.look = [
          observer.x + (legal.tangent.x / len) * 65,
          4,
          observer.z + (legal.tangent.z / len) * 65,
        ];
      }
      if (spec.id === "hua" && camera && view !== "elevated") {
        camera.position = [405, 3.4, -203];
        camera.look = [400, 12, -258];
      }
      const pose = await page.evaluate(
        ({ camera, approach, target, view }) => {
          const g = window.__graphics,
            e = g.engine;
          e.model.snapshot.elapsed = view === "night" ? 720 : 40;
          e.frameTime = -100000;
          e.cameraRevision++;
          delete window.__artCamera;
          Object.assign(e.model.player, {
            ...approach,
            heading: view==='driving'?Math.atan2(approach.tx,approach.tz):Math.atan2(target.x - approach.x, target.z - approach.z),
            speed: 0,
            collision: 0,
          });
          if (camera) window.__artCamera = structuredClone(camera);
          return { camera, player: { ...e.model.player }, view };
        },
        { camera, approach: {...street,tx:legal.tangent.x,tz:legal.tangent.z}, target, view },
      );
      pose.playerRoadVerified = true;
      pose.roadVerified = view !== 'river' && !riverView;
      pose.publicRoad = {
        x: street.x,
        z: street.z,
        width: legal.width,
        corridor: legal.corridor,
      };
      pose.approachType =
        view === "driving"
          ? "normal driving camera"
          : view === "elevated"
            ? "elevated inspection"
            : riverView || view === 'river'
              ? "river-facing inspection"
              : "road-level inspection";
      pose.cameraSurface = view === 'elevated' ? 'elevated inspection'
        : view === 'river' || riverView ? 'river inspection at boat height' : 'public road';
      const frame = await page.evaluate(() => window.__graphics.frameId);
      await page.waitForFunction(
        (f) => window.__graphics.frameId >= f + 2,
        frame,
      );
      await page.evaluate(() => window.__graphics.gl.getContext().finish());
      const file = `${spec.id}-${view}.jpg`;
      await page.screenshot({
        path: `${out}/${label}/${file}`,
        type: "jpeg",
        quality: 86,
        timeout: 180000,
      });
      const priorIndex = records.findIndex(
        (r) => r.id === spec.id && r.view === view,
      );
      if (priorIndex >= 0) records.splice(priorIndex, 1);
      records.push({
        id: spec.id,
        view,
        file,
        pose,
        stats: await page.evaluate(() => window.__graphics.stats),
      });
      await fs.writeFile(
        `${out}/${label}/capture.json`,
        JSON.stringify(
          {
            label,
            viewport: [viewport.width, viewport.height],
            quality: "medium",
            hudHidden: true,
            cityObjectsHidden: false,
            trafficDisabled: true,
            physicalIPhone: false,
            startupMs,
            captureElapsedMs: Date.now() - begin,
            errors,
            records,
          },
          null,
          2,
        ),
      );
      console.log(label, file);
    }
  }
} finally {
  await browser.close();
  server.kill();
}
if (errors.length) throw Error(errors.join("\n"));
