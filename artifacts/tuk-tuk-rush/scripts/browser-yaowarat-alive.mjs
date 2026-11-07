import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const before = !!process.env.GEOGRAPHY_QA_BASELINE_REF,
  out = new URL("../../../docs/qa/yaowarat-alive/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
const fixtures = JSON.parse(
  fs.readFileSync(
    new URL("./yaowarat-alive-views.json", import.meta.url),
    "utf8",
  ),
);
const route = JSON.parse(
  fs.readFileSync(
    new URL("./yaowarat-alive-benchmark-route.json", import.meta.url),
    "utf8",
  ),
);
const report = {
  cameraRoute: route,
  before,
  baseline: process.env.GEOGRAPHY_QA_BASELINE_REF,
  environment: "Linux Chromium 156 / SwiftShader; 844x390 touch simulation",
  physicalIPhone: false,
  errors: [],
  views: [],
  samples: [],
  residency: [],
};
const server = await startQaServer(24861);
let browser;
try {
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
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
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      /WebGLProgram|VALIDATE_STATUS|ERROR: 0:/.test(m.text())
    )
      report.errors.push(m.text());
  });
  const t = performance.now();
  await page.goto(
    "http://127.0.0.1:24861/?world=geographic&geographyQA&geoTime=day",
  );
  await page.getByTestId("button-free-roam").tap({ timeout: 120000 });
  await page.waitForFunction(
    () => window.__geography?.snapshot.phase === "playing",
  );
  report.playableMs = performance.now() - t;
  await page.waitForFunction(
    () =>
      window.__geography?.stream.settled &&
      window.__geography.stream.active >= 9,
    undefined,
    { timeout: 120000 },
  );
  report.startupMs = performance.now() - t;
  report.startup = await page.evaluate(() => window.__geography);
  const settings = async (time, quality, traffic = true) => {
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByLabel("Time of day").selectOption(time);
    await page.getByLabel("Graphics quality").selectOption(quality);
    const toggle = page.getByTestId("geographic-traffic-toggle");
    if ((await toggle.getAttribute("aria-pressed")) !== String(traffic))
      await toggle.click();
    await page
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Resume drive", exact: true })
      .click();
    await page.evaluate((q) => {
      clearInterval(window.__holdQuality);
      window.__geographyQA.session.setQuality(q);
      window.__holdQuality = setInterval(
        () => window.__geographyQA.session.setQuality(q),
        500,
      );
    }, quality);
  };
  const pose = async (v) => {
    await page.evaluate((v) => {
      window.__geographyQA.move(v.lon, v.lat, v.heading ?? 0);
      window.__geographyQA.view(
        v.camera ?? [3300, 4, 500],
        v.target ?? [3279, 5, 507],
      );
    }, v);
    await page.waitForFunction(
      () => window.__geography.stream.settled,
      undefined,
      { timeout: 90000 },
    );
    await page.waitForTimeout(1200);
    await page.waitForFunction(
      () => window.__geography.stream.settled,
      undefined,
      { timeout: 90000 },
    );
  };
  for (const v of fixtures) {
    await settings(v.time, v.quality);
    await pose(v);
    if (v.animationDelay) await page.waitForTimeout(v.animationDelay);
    const hide = v.hud
      ? null
      : await page.addStyleTag({
          content:
            ".geo-toolbar,.geo-street-banner,.geo-status,.geo-speed,.tt-controls{visibility:hidden!important}",
        });
    await page.screenshot({
      path: new URL(`${before ? "before" : "after"}-${v.name}.png`, out)
        .pathname,
    });
    await hide?.evaluate((e) => e.remove());
    report.views.push({
      name: v.name,
      pose: v,
      stats: await page.evaluate(() => ({
        drawCalls: window.__geography.drawCalls,
        triangles: window.__geography.triangles,
        geometries: window.__geography.geometries,
        chinatown: window.__geography.chinatown,
      })),
    });
  }
  // Fixed source-road camera path, same gas input/frame count; traffic contacts can affect the player, never the benchmark camera.
  for (const time of ["day", "night"])
    for (const quality of ["low", "medium"])
      for (const traffic of [false, true]) {
        await settings(time, quality, traffic);
        await pose({
          ...fixtures[0],
          lon: 100.51087153478528,
          lat: 13.739924807620946,
          heading: 1.0489713159807854,
        });
        const sample = await page.evaluate(
          async ({ quality, poses }) => {
            const q = window.__geographyQA,
              s = q.session,
              p = s.player,
              n = q.network.nearest(p);
            p.heading = n.heading;
            s.clearInput();
            s.model.input.gas = true;
            const start = { x: p.x, z: p.z },
              frames = [],
              stats = [];
            let last = performance.now();
            return new Promise((resolve) => {
              const tick = (now) => {
                frames.push(now - last);
                last = now;
                s.setQuality(quality);
                const v = poses[frames.length];
                q.view(
                  [v.x - v.dx * 9, 3.8, v.z - v.dz * 9],
                  [v.x + v.dx * 12, 2, v.z + v.dz * 12],
                );
                if (frames.length % 15 === 0)
                  stats.push({
                    calls: window.__geography.drawCalls,
                    triangles: window.__geography.triangles,
                  });
                if (frames.length < 120) requestAnimationFrame(tick);
                else {
                  s.clearInput();
                  const a = [...frames].sort((a, b) => a - b);
                  resolve({
                    frames,
                    stats,
                    p50Ms: a[59],
                    p95Ms: a[113],
                    worstMs: a.at(-1),
                    stalls50: a.filter((x) => x > 50).length,
                    drivenMeters: Math.hypot(p.x - start.x, p.z - start.z),
                  });
                }
              };
              requestAnimationFrame(tick);
            });
          },
          { quality, poses: route.poses },
        );
        if (quality === "medium" && traffic) {
          await page.evaluate(() => {
            const q = window.__geographyQA,
              p = q.session.player,
              dx = Math.sin(p.heading),
              dz = Math.cos(p.heading);
            q.view(
              [p.x - dx * 9, 3.8, p.z - dz * 9],
              [p.x + dx * 12, 2, p.z + dz * 12],
            );
          });
          await page.waitForTimeout(250);
          await page.screenshot({
            path: new URL(
              `${before ? "before" : "after"}-drive-${time}.png`,
              out,
            ).pathname,
          });
        }
        report.samples.push({
          time,
          quality,
          traffic,
          ...sample,
          diagnostics: await page.evaluate(() => window.__geography),
        });
      }
  await settings("night", "medium");
  for (const v of [
    { lon: 100.5537913, lat: 13.8025991 },
    fixtures[0],
    { lon: 100.5537913, lat: 13.8025991 },
    fixtures[0],
  ]) {
    await pose(v);
    report.residency.push(
      await page.evaluate(() => ({
        geometries: window.__geography.geometries,
        bytes: window.__geography.chinatown?.bytes ?? 0,
        facades: window.__geography.chinatown?.facades.length ?? 0,
        stream: window.__geography.stream,
      })),
    );
  }
  assert.equal(report.residency[0].bytes, 0);
  assert.equal(report.residency[2].bytes, 0);
  assert.equal(report.residency[1].bytes, report.residency[3].bytes);
  assert(report.residency[3].geometries <= report.residency[1].geometries + 5);
  assert(report.residency.every((r) => r.stream.errors === 0));
  assert.deepEqual(report.errors, []);
} catch (e) {
  report.failure = String(e);
  throw e;
} finally {
  fs.writeFileSync(
    new URL(before ? "baseline.json" : "final.json", out),
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser?.close();
  server.kill();
}
