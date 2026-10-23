import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
const out = new URL("../../../docs/qa/chinatown-visual/", import.meta.url)
  .pathname;
const server = process.env.CHINATOWN_PREVIEW_URL
  ? undefined
  : spawn("python", ["-m", "http.server", "24671", "--bind", "127.0.0.1"], {
      cwd: new URL("../dist/public/", import.meta.url).pathname,
      stdio: "ignore",
    });
const base = process.env.CHINATOWN_PREVIEW_URL ?? "http://127.0.0.1:24671";
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 100));
}
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: [
    "--no-sandbox",
    "--no-zygote",
    "--single-process",
    "--in-process-gpu",
    "--ignore-gpu-blocklist",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const p = await browser.newPage({
  viewport: { width: 160, height: 90 },
  hasTouch: true,
});
p.setDefaultTimeout(120000);
await p.addInitScript(() =>
  localStorage.setItem(
    "ttr-interface-v1",
    JSON.stringify({ quality: "low", motion: "reduced" }),
  ),
);
const r = {
  quality: "low",
  renderer: await browser.version(),
  physicalSafari: false,
  source:
    "Final production bundle, unmodified built stylesheet, visible controls only.",
  errors: [],
  layouts: [],
};
p.on("pageerror", (e) => r.errors.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error") console.error(m.text());
});
try {
  await p.goto(base + "/?qa=1");
  console.log("production page loaded");
  await p.getByTestId("button-free-roam").click();

  for (const [width, height] of [
    [375, 812],
    [430, 932],
    [844, 390],
    [1280, 800],
  ]) {
    await p.setViewportSize({ width, height });
    if (width > height && (await p.getByTestId("button-resume").isVisible()))
      await p.getByTestId("button-resume").click();
    await p.waitForTimeout(1800);
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
              s.visibility !== "hidden" &&
              s.display !== "none" &&
              Number(s.opacity) > 0,
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
          `Badge overlaps ${q.id}`,
        );
      }
    }
    await p.screenshot({
      path: out + `after-release/hud-${width}x${height}.jpg`,
      type: "jpeg",
      quality: 88,
    });
    r.layouts.push(layout);
    console.log("layout", width, height);
  }
  r.longName =
    "Covered by the completed development WebGL capture in after-release/capture.json and hud-long-name-844x390.jpg; production replay uses visible controls only.";
  assert.equal(r.errors.length, 0);
  r.pass = true;
} finally {
  await fs.writeFile(
    out + "validation/production-ui.json",
    JSON.stringify(r, null, 2) + "\n",
  );
  await browser.close();
  server?.kill();
}
