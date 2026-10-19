import fs from "node:fs/promises";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
import {
  CITY_COMPLETION_LOCATIONS,
  designToWorld,
  inspectionPose,
} from "./city-completion-poses.mjs";
const output =
    process.env.CITY_OUTPUT ||
    new URL("../../../docs/qa/city-completion/", import.meta.url).pathname,
  label = process.env.CITY_LABEL || "after",
  port = Number(process.env.CITY_PORT || 24317),
  width = Number(process.env.CITY_WIDTH || 844),
  height = Number(process.env.CITY_HEIGHT || 480);
const selection = process.env.CITY_NAMES?.split(","),
  views = process.env.CITY_VIEWS?.split(",");
const locations = process.env.CITY_POSES
  ? (await import(new URL(process.env.CITY_POSES, import.meta.url))).MASTER_PLAN_LOCATIONS
  : CITY_COMPLETION_LOCATIONS;
await fs.mkdir(`${output}/${label}`, { recursive: true });
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
try {
  const page = await browser.newPage({ viewport: { width, height } }),
    errors = [];
  page.setDefaultTimeout(600000);
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error("PAGE ERROR", e.message);
  });
  console.log("Loading city", label);
  await page.goto(`http://127.0.0.1:${port}/?qa=1`);
  await page.waitForFunction(() => window.__graphics);
  console.log("Graphics ready");
  await page.getByTestId("button-free-roam").click();
  console.log("Free roam ready");
  await page.addStyleTag({ content: ".tt-ui{visibility:hidden!important}" });
  const survey = [];
  for (const spec of locations.filter(
    (s) => !selection || selection.includes(s.id),
  ))
    for (const view of spec.views.filter((v) => !views || views.includes(v))) {
      if (label === "after" && spec.id.startsWith("seven-")) {
        const store = await page.evaluate(
          async ({ region, target }) => {
            const { planConvenienceStores } =
              await import("/src/game/bangkok/convenienceStores.ts");
            const stores = planConvenienceStores(
              window.__graphics.engine.model.district,
            ).filter((s) => s.region === region);
            return stores.sort(
              (a, b) =>
                Math.hypot(a.front.x - target.x, a.front.z - target.z) -
                Math.hypot(b.front.x - target.x, b.front.z - target.z),
            )[0];
          },
          {
            region: spec.id === "seven-chinatown" ? "chinatown" : "siam",
            target: designToWorld(spec.target),
          },
        );
        if (store) {
          spec.target = [store.front.x / 4 + 500, store.front.z / 4 + 600];
          spec.approach = [
            store.publicStop.x / 4 + 500,
            store.publicStop.z / 4 + 600,
          ];
          spec.storeYaw = store.yaw;
        }
      }
      const target = designToWorld(spec.target),
        approach = designToWorld(spec.approach),
        camera = view === "road" ? null : inspectionPose(spec, view);
      if (view === "road" || view === "night") {
        const legal = await page.evaluate((point) => {
          const d = window.__graphics.engine.model.district,
            nodes = new Map(d.nodes.map((n) => [n.id, n]));
          return d.roads
            .filter((r) => !r.shortcut)
            .map((r) => {
              const a = nodes.get(r.a),
                b = nodes.get(r.b),
                dx = b.x - a.x,
                dz = b.z - a.z,
                t = Math.max(
                  0,
                  Math.min(
                    1,
                    ((point.x - a.x) * dx + (point.z - a.z) * dz) /
                      (dx * dx + dz * dz),
                  ),
                ),
                p = { x: a.x + dx * t, z: a.z + dz * t };
              return {
                ...p,
                distance: Math.hypot(p.x - point.x, p.z - point.z),
              };
            })
            .sort((a, b) => a.distance - b.distance)[0];
        }, approach);
        approach.x = legal.x;
        approach.z = legal.z;
        if (view === "night" && spec.storeYaw === undefined && camera) {
          camera.position = [approach.x, 6, approach.z];
          camera.look = [target.x, Math.min(24, spec.height * 0.4), target.z];
        }
      }
      if (spec.id === "lumphini-entrance" && view === "elevated" && camera) {
        const p = designToWorld([859, 680]);
        camera.position = [p.x, 58, p.z];
        camera.look = [target.x, 2, target.z];
      }
      if (spec.id === "lumphini-lakes" && view === "ground" && camera) {
        const p = designToWorld([798, 698]),
          q = designToWorld([784, 688]);
        camera.position = [p.x, 4.8, p.z];
        camera.look = [q.x, 2.5, q.z];
      }
      if (spec.id === "suthat" && view === "ground" && camera) {
        const p = designToWorld([410, 420]);
        camera.position = [p.x, 4, p.z];
        camera.look = [target.x, 7, target.z];
      }
      if (spec.storeYaw !== undefined && camera) {
        const front = designToWorld(spec.target);
        camera.position = [
          front.x + Math.sin(spec.storeYaw) * 18,
          5,
          front.z + Math.cos(spec.storeYaw) * 18,
        ];
        camera.look = [front.x, 2.8, front.z];
      }
      const pose = await page.evaluate(
        ({ target, approach, camera, view }) => {
          const e = window.__graphics.engine;
          e.pause();
          e.setQuality("medium");
          e.frameTime = -100000;
          e.cameraRevision++;
          e.model.snapshot.elapsed = view === "night" ? 600 : 40;
          Object.assign(e.model.player, {
            ...approach,
            heading: Math.atan2(target.x - approach.x, target.z - approach.z),
            speed: 0,
            collision: 0,
          });
          clearInterval(window.__cityCameraTimer);
          delete window.__artCamera;
          if (camera) {
            window.__artCamera = structuredClone(camera);
            window.__cityCameraTimer = setInterval(() => {
              window.__artCamera = structuredClone(camera);
            }, 1000);
          }
          return {
            player: { ...e.model.player },
            camera,
            mode: camera
              ? "fixed inspection camera"
              : "normal gameplay chase camera",
          };
        },
        { target, approach, camera, view },
      );
      const frame = await page.evaluate(() => window.__graphics.frameId);
      await page.waitForFunction(
        (f) => window.__graphics.frameId >= f + 3,
        frame,
      );
      const file = `${spec.id}-${view}.jpg`;
      await page.screenshot({
        path: `${output}/${label}/${file}`,
        type: "jpeg",
        quality: 82,
        timeout: 180000,
      });
      survey.push({
        id: spec.id,
        viewport: [width, height],
        title: spec.title,
        view,
        file,
        pose,
        stats: await page.evaluate(() => window.__graphics.stats),
      });
      console.log(label, spec.id, view);
    }
  let previous = [];
  try {
    previous =
      JSON.parse(await fs.readFile(`${output}/${label}/survey.json`, "utf8"))
        .survey ?? [];
  } catch {}
  await fs.writeFile(
    `${output}/${label}/survey.json`,
    JSON.stringify(
      {
        label,
        viewport: [width, height],
        renderer:
          "Chromium / SwiftShader software WebGL; not physical iPhone Safari",
        cameraPolicy:
          "Fixed paired camera poses. No obstruction removal, object hiding, or screenshot-only geometry. Road views use the normal chase camera.",
        survey: [
          ...previous.filter(
            (s) => !survey.some((n) => n.id === s.id && n.view === s.view),
          ),
          ...survey,
        ],
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser.close();
  server.kill();
}
