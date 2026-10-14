import { startQaServer } from "./browser-vite.mjs";
/** A single controller recording, finalized independently for durable QA. */
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { playableDrive } from "./playable-drive.mjs";
import assert from "node:assert/strict";
const specs = [
  ["first-player", 0, 0, -500, -280, 0, 30],
  ["yaowarat-gate", 270, -210, -400, -290, 600, 25],
  ["talatnoi-songwat", 170, 420, -240, 130, 360, 25],
  ["watpho-oldtown", -980, -980, -740, -450, 0, 25],
  ["siam-ratchaprasong", 760, -900, 1240, -690, 600, 25],
  ["iconsiam-riverfront", -700, 680, -440, 1280, 0, 25],
];
const spec = specs.find((s) => s[0] === process.env.DRIVE_NAME);
assert(spec, "Set DRIVE_NAME to a showcase name");
const out = new URL(
  "../../../docs/graphics/living-cityscapes/browser/",
  import.meta.url,
).pathname;
const rawOut = new URL(
  "../../../generated-artifacts/cityscapes-drives/",
  import.meta.url,
).pathname;
await fs.mkdir(out, { recursive: true });
await fs.mkdir(rawOut, { recursive: true });
const port = 24195;
const server = await startQaServer(port);
console.log("Vite HTTP ready", spec[0]);
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
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  hasTouch: true,
  recordVideo: { dir: rawOut, size: { width: 844, height: 390 } },
});
const epoch = Date.now(),
  page = await context.newPage(),
  errors = [],
  failed = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
});
let drive, progress;
const encode = async (args) =>
  await new Promise((resolve, reject) => {
    const p = spawn(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-y", ...args],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let err = "";
    p.stderr.on("data", (b) => (err += b));
    p.on("error", reject);
    p.on("exit", (c) => (c === 0 ? resolve() : reject(Error(err))));
  });
try {
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.__graphics, null, {
    timeout: 120000,
  });
  await page.getByTestId("button-free-roam").click();
  console.log("Game ready", browser.version());
  let checking = false;
  progress = setInterval(async () => {
    if (checking) return;
    checking = true;
    try {
      console.log(
        "Drive progress",
        await page.evaluate(() => {
          const d = window.__qaDrive;
          return (
            d && {
              elapsed:
                window.__graphics.engine.model.snapshot.elapsed - d.epoch,
              metres: d.metres,
              phase: window.__graphics.engine.model.snapshot.phase,
            }
          );
        }),
      );
    } catch {
    } finally {
      checking = false;
    }
  }, 30000);
  drive = await playableDrive(page, spec, epoch);
  assert(drive.metres > 100);
  assert(drive.elapsed >= spec[6]);
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  await page.screenshot({
    path: `${out}/${spec[0]}-driven.jpg`,
    type: "jpeg",
    quality: 90,
  });
  await fs.writeFile(
    `${out}/${spec[0]}.json`,
    JSON.stringify(
      {
        pass: true,
        drive,
        errors,
        failed,
        quality: "low",
        viewport: [844, 390],
        environment: `${browser.version()} SwiftShader; not iPhone; normal chase camera`,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      name: drive.name,
      metres: drive.metres,
      elapsed: drive.elapsed,
      collisionFrames: drive.collisionFrames,
      wallSeconds: drive.wallVideoDuration,
    }),
  );
} finally {
  clearInterval(progress);
  const video = page.video();
  await context.close();
  try {
    if (video && drive) {
      const raw = `${rawOut}/${spec[0]}.webm`;
      await video.saveAs(raw);
      const trim = [
        "-ss",
        String(drive.wallVideoStart),
        "-t",
        String(drive.wallVideoDuration),
        "-i",
        raw,
      ];
      await encode([
        ...trim,
        "-vf",
        `setpts=${drive.elapsed / drive.wallVideoDuration}*(PTS-STARTPTS),fps=15`,
        "-c:v",
        "libx264",
        "-crf",
        "32",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        `${out}/${spec[0]}.mp4`,
      ]);
      await encode([
        ...trim,
        "-vf",
        "fps=6,scale=676:312",
        "-c:v",
        "libx264",
        "-crf",
        "36",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        `${out}/${spec[0]}-wall.mp4`,
      ]);
    }
  } finally {
    await browser.close();
    server.kill();
  }
}
