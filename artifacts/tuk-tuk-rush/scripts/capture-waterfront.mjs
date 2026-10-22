import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out =
    process.env.RIVER_OUTPUT ??
    new URL("../../../docs/qa/waterfront-certification/", import.meta.url)
      .pathname,
  label = process.env.RIVER_LABEL ?? "after",
  port = +(process.env.RIVER_PORT ?? 24636);
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
const report = {
  label,
  sourceState: "Matched PR36 baseline and PR37 runtime; source hashes retained",
  sourceDiff: execFileSync("git", ["diff", "--stat", "--", "src"], {
    encoding: "utf8",
  }),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  viewport: [768, 432],
  quality: "medium",
  renderer: `Chromium ${browser.version()} / SwiftShader`,
  physicalIPhone: false,
  cityObjectsHidden: false,
  records: [],
  errors: [],
};
try {
  const p = await browser.newPage({ viewport: { width: 768, height: 432 } });
  p.setDefaultTimeout(900000);
  p.on("pageerror", (e) => report.errors.push(e.message));
  await p.goto(`http://127.0.0.1:${port}/?qa=1`);
  await p.waitForFunction(() => window.__graphics?.frameId > 1);
  await p.getByTestId("button-free-roam").click();
  await p.addStyleTag({
    content:
      ".tt-ui,[data-testid=button-city-inspector]{visibility:hidden!important}",
  });
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.pause();
    e.setQuality("medium");
    e.model.traffic.length = 0;
    e.frameTime = -100000;
  });
  // Raised geographic inspections need the app's actual meshes beyond its
  // normal 800m driving clip plane. Both sides use the same explicit inspection
  // override. Normal driving/riverfront captures keep production clipping/fog.
  await p.evaluate(() => {
    const g = window.__graphics;
    g.scene.onBeforeRender = () => {
      if (!window.__riverOverview) return;
      g.camera.far = 20000;
      g.camera.updateProjectionMatrix();
      g.scene.fog.near = 18000;
      g.scene.fog.far = 20000;
      if (window.__riverOverview === "full")
        g.scene.traverse((o) => {
          if (o.name === "BangkokFacade" || o.name === "BangkokDetail")
            o.visible = false;
          else if (
            ["BangkokSector", "BangkokCoarse"].includes(o.name) ||
            o.name.startsWith("BangkokLandmark:")
          )
            o.visible = true;
        });
    };
  });
  const scenes = JSON.parse(await fs.readFile(`${out}/scenes.json`, "utf8"));
  for (const s of scenes.filter(
    (s) =>
      process.env.RIVER_WARM_ALL === "1" ||
      !process.env.RIVER_SCENES ||
      process.env.RIVER_SCENES.split(",").includes(s.id),
  ))
    for (const light of s.lights) {
      await p.evaluate(
        ({ s, light }) => {
          const e = window.__graphics.engine;
          window.__riverOverview =
            (s.camera?.[1] ?? 0) >= 700
              ? s.id === "full-river-overview"
                ? "full"
                : "local"
              : false;
          Object.assign(
            e.model.player,
            s.player
              ? { ...s.player, speed: 0, collision: 0 }
              : {
                  x: s.look[0],
                  z: s.look[2],
                  heading: 0,
                  speed: 0,
                  collision: 0,
                },
          );
          e.model.snapshot.elapsed = light === "night" ? 720 : 40;
          e.model.snapshot.target = { x: 2000, z: -2000 };
          e.cameraRevision++;
          e.frameTime = -100000;
          delete window.__artCamera;
          if (s.camera)
            Object.defineProperty(window, "__artCamera", {
              configurable: true,
              get: () => ({ position: [...s.camera], look: [...s.look] }),
            });
        },
        { s, light },
      );
      const f = await p.evaluate(() => window.__graphics.frameId);
      await p.waitForFunction((f) => window.__graphics.frameId > f + 2, f);
      await p.evaluate(() => window.__graphics.gl.getContext().finish());
      const stats = await p.evaluate((changed) => {
        const g = window.__graphics,
          T = g.three,
          root = changed
            ? g.scene.getObjectByName("BangkokLandmark:" + changed)
            : null,
          frustum = new T.Frustum().setFromProjectionMatrix(
            new T.Matrix4().multiplyMatrices(
              g.camera.projectionMatrix,
              g.camera.matrixWorldInverse,
            ),
          ),
          changedLandmarkVisible =
            !!root &&
            root.visible &&
            frustum.intersectsBox(new T.Box3().setFromObject(root));
        return {
          ...g.stats,
          camera: g.camera.position.toArray(),
          fov: g.camera.fov,
          elapsed: g.engine.model.snapshot.elapsed,
          quality: g.engine.model.snapshot.quality,
          glError: g.gl.getContext().getError(),
          changedLandmarkVisible,
        };
      }, process.env.RIVER_CHANGED_LANDMARK ?? null);
      if (
        stats.glError ||
        stats.quality !== "medium" ||
        stats.elapsed !== (light === "night" ? 720 : 40)
      )
        throw Error("Render state drift");
      if (
        process.env.RIVER_SCENES &&
        !process.env.RIVER_SCENES.split(",").includes(s.id) &&
        !stats.changedLandmarkVisible
      ) {
        (report.warmedOnly ??= []).push({
          id: s.id,
          light,
          changedLandmarkVisible: false,
        });
        await fs.writeFile(
          `${out}/${label}/capture.json`,
          JSON.stringify(report, null, 2) + "\n",
        );
        continue;
      }
      const file = `${s.id}-${light}.jpg`;
      await p.screenshot({
        path: `${out}/${label}/${file}`,
        type: "jpeg",
        quality: 88,
        timeout: 180000,
      });
      report.records.push({
        id: s.id,
        light,
        file,
        scene: s,
        stats,
        geographicInspection: (s.camera?.[1] ?? 0) >= 700,
        extendedClipAndFog: (s.camera?.[1] ?? 0) >= 700,
        sourceCommit: report.sourceCommit,
      });
      await fs.writeFile(
        `${out}/${label}/capture.json`,
        JSON.stringify(report, null, 2) + "\n",
      );
      console.log(label, file);
    }
} finally {
  await fs.writeFile(
    `${out}/${label}/capture.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
  server.kill();
}
if (report.errors.length) throw Error(report.errors.join("\n"));
