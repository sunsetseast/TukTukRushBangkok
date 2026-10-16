/** Production first completed world frame. Fast; no development hooks in the bundle. */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
const out = path.resolve(
  process.env.QA_OUT || "../../docs/qa/cinematic-yaowarat/startup",
);
if (process.env.APP_ROOT) process.chdir(process.env.APP_ROOT);
await fs.mkdir(out, { recursive: true });
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "24279",
  ],
  { env: { ...process.env, PORT: "24279", BASE_PATH: "/" }, stdio: "ignore" },
);
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:24279")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
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
  const p = await browser.newPage({
      viewport: { width: 844, height: 390 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem(
      "ttr-interface-v1",
      JSON.stringify({ quality: "low", audio: false, motion: "reduced" }),
    );
    for (const name of [
      "drawArrays",
      "drawElements",
      "drawArraysInstanced",
      "drawElementsInstanced",
    ]) {
      const native = WebGL2RenderingContext.prototype[name];
      WebGL2RenderingContext.prototype[name] = function (...args) {
        const r = native.apply(this, args);
        if (
          !window.__framePending &&
          this.canvas.isConnected &&
          this.getParameter(this.FRAMEBUFFER_BINDING) === null
        ) {
          window.__framePending = true;
          queueMicrotask(() => {
            this.finish();
            window.__firstWorldFrame = performance.now();
          });
        }
        return r;
      };
    }
  });
  const start = performance.now();
  await p.goto("http://127.0.0.1:24279", { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => window.__firstWorldFrame > 0, null, {
    timeout: 120000,
  });
  const firstWorldFrameMs = await p.evaluate(() => window.__firstWorldFrame),
    observedReadyMs = performance.now() - start;
  await p.getByTestId("button-free-roam").click();
  await p.locator(".tt-title").waitFor({ state: "detached" });
  const info = await p.evaluate(() => ({
    developmentHooksExposed: !!window.__graphics,
    glError: document.querySelector("canvas").getContext("webgl2").getError(),
    assets: performance
      .getEntriesByType("resource")
      .filter((e) => /\/assets\//.test(e.name))
      .map((e) => ({
        name: new URL(e.name).pathname,
        bytes: e.decodedBodySize,
      })),
  }));
  if (errors.length || info.glError || info.developmentHooksExposed)
    throw Error(JSON.stringify({ errors, ...info }));
  await fs.writeFile(
    out + "/startup.json",
    JSON.stringify(
      {
        firstWorldFrameMs,
        observedReadyMs,
        viewport: { width: 844, height: 390, dpr: 1 },
        requestedQuality: "Fast",
        environment:
          "Local production preview, Chromium/SwiftShader; not physical iPhone or network certification",
        ...info,
        errors,
      },
      null,
      2,
    ),
  );
  console.log("PRODUCTION FIRST WORLD FRAME", firstWorldFrameMs);
} finally {
  await browser?.close();
  server.kill();
}
