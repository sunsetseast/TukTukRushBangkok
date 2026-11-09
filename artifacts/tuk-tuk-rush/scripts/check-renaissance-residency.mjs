import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";

const out = new URL(
  "../../../docs/qa/yaowarat-renaissance/eviction-browser.json",
  import.meta.url,
);
const home = JSON.parse(
  fs.readFileSync(
    new URL("./yaowarat-alive-views.json", import.meta.url),
    "utf8",
  ),
)[0];
const server = await startQaServer(24862);
const report = {
  environment: "Linux Chromium SwiftShader",
  samples: [],
  errors: [],
};
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  page.on("pageerror", (error) => report.errors.push(error.message));
  await page.goto(
    "http://127.0.0.1:24862/?world=geographic&geographyQA&geoTime=night",
  );
  await page.getByTestId("button-free-roam").tap({ timeout: 120000 });
  await page.waitForFunction(
    () => window.__geography?.stream.settled,
    undefined,
    { timeout: 120000 },
  );
  await page.evaluate(() =>
    setInterval(() => window.__geographyQA.session.setQuality("medium"), 250),
  );

  for (let cycle = 0; cycle < 3; cycle++) {
    for (const away of [true, false]) {
      const view = away ? { lon: 100.5537913, lat: 13.8025991 } : home;
      const retiredIds = await page.evaluate(
        ({ view, away }) => {
          const qa = window.__geographyQA;
          const oldIds = [...window.__geography.stream.ids];
          const geometry = new Set();
          const instances = new Set();
          for (const root of qa.chunkRoots()) {
            root.traverse((object) => {
              if (object.isMesh) geometry.add(object.geometry);
              if (object.isInstancedMesh) instances.add(object);
            });
          }
          const audit = {
            geometry: geometry.size,
            instances: instances.size,
            releasedGeometry: 0,
            releasedInstances: 0,
          };
          for (const object of geometry)
            object.addEventListener("dispose", () => audit.releasedGeometry++);
          for (const object of instances)
            object.addEventListener("dispose", () => audit.releasedInstances++);
          window.__renaissanceReleaseAudit = audit;
          qa.move(view.lon, view.lat, view.heading ?? 0);
          const p = qa.session.player;
          qa.view(
            away ? [p.x, 12, p.z - 20] : view.camera,
            away ? [p.x, 0, p.z] : view.target,
          );
          return oldIds;
        },
        { view, away },
      );
      await page.waitForFunction(
        ({ view, retiredIds }) => {
          const { stream, coordinate } = window.__geography;
          return (
            stream.settled &&
            stream.active === 9 &&
            retiredIds.every((id) => !stream.ids.includes(id)) &&
            Math.abs(coordinate.lon - view.lon) < 0.0003 &&
            Math.abs(coordinate.lat - view.lat) < 0.0003
          );
        },
        { view, retiredIds },
        { timeout: 90000 },
      );
      const sample = await page.evaluate(() => {
        const state = window.__geography;
        return {
          ids: [...state.stream.ids].sort(),
          geometries: state.geometries,
          textures: state.textures,
          ownedMeshes: state.activeMeshes,
          buildingBytes: state.buildingGPUBytes,
          decorativeBytes: state.chinatown.bytes,
          facades: state.chinatown.facades.length,
          streamErrors: state.stream.errors,
          release: window.__renaissanceReleaseAudit,
          glError: document
            .querySelector("canvas")
            .getContext("webgl2")
            .getError(),
        };
      });
      report.samples.push({ cycle, away, ...sample });
      assert(sample.release.geometry > 0);
      assert.equal(
        sample.release.releasedGeometry,
        sample.release.geometry,
        "Every evicted chunk geometry must release exactly once",
      );
      assert.equal(
        sample.release.releasedInstances,
        sample.release.instances,
        "Every evicted instance stream must release exactly once",
      );
      assert.equal(sample.glError, 0);
      assert.equal(sample.streamErrors, 0);
      // Uploaded counts depend on visibility. Compare exact owned allocations
      // in each region and independently verify disposal of every retired root.
      assert(sample.geometries <= sample.ownedMeshes + 100);
      assert.equal(sample.facades, away ? 0 : 357);
      if (away) assert.equal(sample.decorativeBytes, 0);
      const first = report.samples.find((s) => s.away === away);
      for (const key of [
        "ids",
        "ownedMeshes",
        "buildingBytes",
        "decorativeBytes",
      ])
        assert.deepEqual(sample[key], first[key]);
    }
  }
  assert.deepEqual(report.errors, []);
  report.pass = true;
} catch (error) {
  report.failure = String(error);
  throw error;
} finally {
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  server.kill();
}
