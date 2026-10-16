/** Matched baseline/after art captures. Run from repository root against a Vite dev server. */
import fs from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--single-process",
    "--no-zygote",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = process.env.GAME_URL || "http://127.0.0.1:5173";
for (let i = 0; i < 50; i++) {
  try {
    await fetch(url);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}
await page.addInitScript(() => { if(location.protocol.startsWith('http')){const u=new URL(location.href);u.searchParams.set('qa','1');history.replaceState(null,'',u);} });
  await page.goto(url);
await page.waitForFunction(() => window.__graphics, null, { timeout: 60000 });
await page.getByTestId("button-free-roam").click();
// The software renderer can trigger adaptation; lock capture quality to make comparisons fair.
await page.evaluate(() => {
  const e = window.__graphics.engine,
    update = e.update.bind(e);
  window.__captureQuality = "medium";
  e.update = (dt) => {
    e.slowTime = 0;
    update(dt);
    e.model.snapshot.quality = window.__captureQuality;
  };
});
const next = async (n = 3) => {
  const id = await page.evaluate(() => window.__graphics.frameId);
  await page.waitForFunction(
    ({ id, n }) => window.__graphics.frameId > id + n,
    { id, n },
    { timeout: 60000 },
  );
};
const out = "docs/graphics/living-chinatown/",
  prefix = process.env.CAPTURE_PREFIX || "after";
for (const [name, override] of [
  ["chase", null],
  ["street", { position: [-160, 3.2, 44], look: [-125, 2.4, 28] }],
  ["gate", { position: [218, 5, 139], look: [225, 11, 100] }],
  ["temple", { position: [115, 8, 31], look: [100, 13, -20] }],
  ["station", { position: [235, 7, -188], look: [230, 13, -240] }],
]) {
  await page.evaluate((o) => (window.__artCamera = o), override);
  await next();
  await page.screenshot({
    path: out + `screenshots/${prefix}-${name}.jpg`,
    type: "jpeg",
    quality: 88,
  });
}
await page.evaluate(() => {
  delete window.__artCamera;
  window.__graphics.engine.start("free");
});
const samples = {};
for (const q of ["medium", "low"]) {
  await page.evaluate((q) => (window.__captureQuality = q), q);
  await next();
  const frames = [];
  for (let k = 0; k < 12; k++) {
    await next(0);
    frames.push(await page.evaluate(() => ({ ...window.__graphics.stats })));
  }
  samples[q] = frames;
}
await fs.writeFile(
  out + `${prefix}-profile.json`,
  JSON.stringify(
    {
      environment: {
        browser: await browser.version(),
        viewport: "1280x720 DPR1",
        renderer: "SwiftShader software; not iPhone",
      },
      samples,
      errors,
    },
    null,
    2,
  ),
);
if (errors.length) throw new Error(errors.join("\n"));
await browser.close();
