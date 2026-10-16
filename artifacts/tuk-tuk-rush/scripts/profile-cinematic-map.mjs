/** Separate actual click-to-map commit from Playwright's GPU-bound actionability waits. */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = path.resolve(
  process.env.QA_OUT || "../../docs/qa/cinematic-yaowarat/map",
);
if (process.env.APP_ROOT) process.chdir(process.env.APP_ROOT);
await fs.mkdir(out, { recursive: true });
const server = await startQaServer(24278),
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
  const p = await browser.newPage({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  p.setDefaultTimeout(120000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:24278");
  await p.waitForFunction(() => window.__graphics?.frameId > 2);
  await p.getByTestId("button-free-roam").click();
  await p.locator(".tt-title").waitFor({ state: "detached" });
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.update = () => {};
    e.setQuality("medium");
    window.__mapTimings = [];
    let pending;
    document.addEventListener(
      "click",
      (event) => {
        if (event.target.closest?.('[data-testid="button-open-map"]'))
          pending = { start: performance.now(), eventStamp: event.timeStamp };
      },
      true,
    );
    new MutationObserver(() => {
      if (pending && document.querySelector('[data-testid="world-map"]')) {
        const t = performance.now(),
          r = {
            commitMs: t - pending.start,
            dispatchAgeMs: pending.start - pending.eventStamp,
            sinceEventMs: t - pending.eventStamp,
          };
        window.__mapTimings.push(r);
        pending = undefined;
        requestAnimationFrame(() => (r.nextFrameMs = performance.now() - t));
      }
    }).observe(document.body, { subtree: true, childList: true });
  });
  const automationMs = [];
  for (let i = 0; i < 4; i++) {
    const start = performance.now();
    await p.getByTestId("button-open-map").click();
    await p.getByTestId("world-map").waitFor();
    await p.waitForFunction(
      () => window.__mapTimings.at(-1)?.nextFrameMs !== undefined,
    );
    automationMs.push(performance.now() - start);
    await p.getByTestId("button-close-map").click();
  }
  const samples = await p.evaluate(() => window.__mapTimings);
  if (samples.length !== 4 || errors.length)
    throw Error(JSON.stringify({ samples, errors }));
  await fs.writeFile(
    out + "/map.json",
    JSON.stringify(
      {
        renderer: "Chromium / SwiftShader, not iPhone",
        samples,
        automationMs,
        errors,
        notes:
          "Commit begins at actual click capture and ends after SVG DOM insertion. nextFrame is a callback, not hardware presentation. Automation includes Playwright actionability and software GPU scheduling.",
      },
      null,
      2,
    ),
  );
  console.log("MAP ACTUAL CLICK", JSON.stringify(samples));
} finally {
  await browser.close();
  server.kill();
}
