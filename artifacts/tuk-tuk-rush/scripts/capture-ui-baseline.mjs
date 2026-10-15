import { chromium } from "playwright";
import fs from "node:fs/promises";
const out = new URL("../../../docs/ui/night-drive/before/", import.meta.url)
  .pathname;
await fs.mkdir(out, { recursive: true });
import { startQaServer } from "./browser-vite.mjs";
const server = await startQaServer(24230);
const browser = await chromium.launch({
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
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
  });
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const begun = Date.now();
  await page.goto("http://127.0.0.1:24230");
  await page.waitForFunction(() => window.__graphics);
  const ready = Date.now() - begun;
  const shot = async (name) => {
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${out}/${name}.jpg`,
      type: "jpeg",
      quality: 80,
    });
  };
  await shot("title");
  await page.getByTestId("button-start-shift").click();
  await page.evaluate(() => {
    const e = window.__graphics.engine;
    e.setQuality("low");
    e.frameTime = -100000;
  });
  await shot("driving");
  await shot("compact");
  await shot("expanded");
  await page.evaluate(() => {
    const e = window.__graphics.engine,
      p = e.model.player,
      t = e.model.snapshot.target;
    Object.assign(p, { x: t.x + 70, z: t.z, speed: 0 });
  });
  await shot("approach");
  await page.evaluate(() => {
    const e = window.__graphics.engine,
      t = e.model.snapshot.target;
    Object.assign(e.model.player, { x: t.x, z: t.z, speed: 0 });
    e.model.snapshot.boarding = 0.2;
    e.model.snapshot.phase = "paused";
  });
  await shot("arrival");
  await page.getByTestId("button-open-map").click();
  await shot("map");
  await page
    .getByTestId("world-map")
    .locator("aside .tt-map-places button")
    .first()
    .click();
  await shot("map-selected");
  await page
    .getByTestId("world-map")
    .locator('[data-testid^="map-station-"]')
    .first()
    .click();
  await shot("map-bts");
  await page.getByTestId("button-close-map").click();
  await shot("pause");
  await shot("settings");
  await page.evaluate(() => {
    const e = window.__graphics.engine;
    Object.assign(e.model.snapshot, {
      phase: "ended",
      earnings: 1240,
      score: 6940,
      deliveries: 4,
    });
  });
  await shot("results");
  await page.evaluate(() => {
    const e = window.__graphics.engine;
    e.restart();
    const d = e.model.district,
      a = d.destinations.find((a) => a.id === "pho"),
      n = d.nodes.find((n) => n.id === a.arrivalNode);
    Object.assign(e.model.player, { x: n.x, z: n.z, speed: 0, collision: 0 });
    e.viewLandmark("pho");
  });
  await shot("inspection");
  await page.getByTestId("inspection-return").click();
  await page.evaluate(() => {
    const e = window.__graphics.engine;
    e.restart();
    e.model.snapshot.elapsed = 300;
  });
  await shot("night");
  await fs.writeFile(
    `${out}/metrics.json`,
    JSON.stringify(
      {
        readyMs: ready,
        stats: await page.evaluate(() => window.__graphics.stats),
        errors,
        physicalIPhone: false,
      },
      null,
      2,
    ),
  );
  console.log("Baseline captured", ready, errors);
} finally {
  await browser.close();
  server.kill();
}
