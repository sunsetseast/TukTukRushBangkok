import fs from "node:fs/promises";
import { chromium } from "playwright";
import { startQaServer } from "./browser-vite.mjs";
const out = new URL("../../../docs/ui/night-drive/after/", import.meta.url)
  .pathname;
await fs.mkdir(out, { recursive: true });
const server = await startQaServer(24236),
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
const evidence = {
  physicalIPhone: false,
  reducedMotion: true,
  simulationFrozenForRepeatableStills: true,
  manualBannerKeptOpenByRepeatedTaps: true,
  screens: [],
  errors: [],
};
try {
  const p = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  p.setDefaultTimeout(120000);
  p.on("pageerror", (e) => evidence.errors.push(e.message));
  await p.goto("http://127.0.0.1:24236");
  await p.waitForFunction(() => window.__graphics);
  await p.evaluate(() => {
    window.__captureTick = window.__graphics.engine.update.bind(
      window.__graphics.engine,
    );
    window.__graphics.engine.update = () => {};
  });
  console.log("Capture renderer ready");
  const shot = async (name) => {
    if (process.env.CAPTURE_GROUP === "map" && !name.startsWith("map")) return;
    if (
      process.env.CAPTURE_GROUP === "all-discovered" &&
      name !== "map-all-discovered"
    )
      return;
    await p.waitForTimeout(220);
    await p.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await p.evaluate(() =>
      document.getAnimations().forEach((a) => {
        if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
      }),
    );
    await p.screenshot({
      path: `${out}/${name}.jpg`,
      type: "jpeg",
      quality: 84,
      animations: "disabled",
    });
    evidence.screens.push({
      name,
      ...p.viewportSize(),
      state: await p.evaluate(() => ({
        phase: window.__graphics.engine.model.snapshot.phase,
        target: window.__graphics.engine.model.snapshot.target.name,
      })),
    });
    console.log("Captured", name);
  };
  const far = () =>
    p.evaluate(() => {
      const e = window.__graphics.engine;
      e.restart();
      e.setQuality("low");
      for (let i = 0; i < 8; i++) window.__captureTick(0.05);
      const t = e.model.district.nodes.find(
        (n) =>
          n.name &&
          Math.hypot(n.x - e.model.player.x, n.z - e.model.player.z) > 500,
      );
      e.model.snapshot.target = t;
      e.model.snapshot.distance = Math.hypot(
        t.x - e.model.player.x,
        t.z - e.model.player.z,
      );
      e.model.snapshot.message = "";
    });
  await shot("title");
  await p.getByTestId("button-start-shift").click();
  await far();
  await shot("driving");
  await shot("compact");
  await p.getByTestId("text-mission").click();
  const keep = setInterval(
    () =>
      p
        .getByTestId("text-mission")
        .dispatchEvent("click")
        .catch(() => {}),
    1500,
  );
  try {
    await shot("expanded");
  } finally {
    clearInterval(keep);
  }
  await p.evaluate(async () => {
    const e = window.__graphics.engine,
      d = e.model.district,
      a = d.destinations.find((a) => a.id === "pho"),
      t = d.nodes.find((n) => n.id === a.arrivalNode),
      nav = await import("/src/game/navigation.ts"),
      path = nav.navigationPath(d, d.spawn, t);
    let remaining = 70,
      position = t;
    for (let i = path.length - 1; i > 0; i--) {
      const end = path[i],
        start = path[i - 1],
        length = Math.hypot(start.x - end.x, start.z - end.z);
      if (length >= remaining) {
        position = {
          x: end.x + ((start.x - end.x) * remaining) / length,
          z: end.z + ((start.z - end.z) * remaining) / length,
        };
        break;
      }
      remaining -= length;
    }
    e.model.snapshot.target = t;
    Object.assign(e.model.player, { ...position, speed: 0 });
    e.model.snapshot.distance = Math.hypot(position.x - t.x, position.z - t.z);
    e.model.snapshot.message = "";
  });
  await shot("approach");
  await p.evaluate(() => {
    const e = window.__graphics.engine,
      t = e.model.snapshot.target;
    Object.assign(e.model.player, { x: t.x, z: t.z, speed: 0 });
    Object.assign(e.model.snapshot, { distance: 0, boarding: 0.45 });
  });
  await shot("arrival");
  await far();
  await p.getByTestId("button-open-map").click();
  await shot("map");
  await p.getByTestId("button-whole-city").click();
  await shot("map-city");
  if (process.env.CAPTURE_GROUP === "all-discovered") {
    await p.evaluate(() => {
      const e = window.__graphics.engine;
      e.model.snapshot.discoveredDistricts = e.model.district.regions.map(
        (r) => r.id,
      );
      e.model.snapshot.discoveredLandmarks = e.model.district.landmarks.map(
        (l) => l.id,
      );
      e.setQuality("medium");
      e.setQuality("low");
    });
    await shot("map-all-discovered");
  }

  await p
    .locator('[data-testid^="map-landmark-"]')
    .first()
    .dispatchEvent("click");
  await shot("map-selected");
  await p.getByRole("button", { name: "Close place details" }).click();
  await p.getByTestId("button-nearby-stations").click();
  await p.locator('[data-testid^="map-station-"]').first().click();
  await shot("map-bts");
  await p.getByTestId("button-close-map").click();
  await p.getByTestId("button-pause").click();
  await shot("pause");
  await p.getByTestId("button-pause-settings").click();
  await shot("settings");
  await p.getByRole("button", { name: "Back to pause menu" }).click();
  await p.getByTestId("button-resume").click();
  const look = () =>
    p.evaluate(() => {
      const e = window.__graphics.engine;
      e.restart();
      const d = e.model.district,
        a = d.destinations.find((a) => a.id === "pho"),
        n = d.nodes.find((n) => n.id === a.arrivalNode);
      Object.assign(e.model.player, { x: n.x, z: n.z, speed: 0, collision: 0 });
      e.viewLandmark("pho");
    });
  await look();
  await shot("inspection");
  await p.getByTestId("inspection-return").click();
  await far();
  await p.evaluate(
    () => (window.__graphics.engine.model.snapshot.elapsed = 300),
  );
  await shot("night");
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    Object.assign(e.model.snapshot, {
      phase: "ended",
      earnings: 1240,
      score: 6940,
      deliveries: 4,
    });
    e.publish();
  });
  await shot("results");
  for (const [width, height] of [
    [375, 812],
    [430, 932],
  ]) {
    await p.setViewportSize({ width, height });
    await p.evaluate(() => {
      const e = window.__graphics.engine;
      e.restart();
      e.pause();
    });
    await p.getByTestId("button-pause-map").click();
    await shot(`map-${width}x${height}`);
    await p.getByTestId("button-close-map").click();
    if (width === 375) {
      await p.getByTestId("button-pause-settings").click();
      await shot(`settings-${width}x${height}`);
      await p.getByRole("button", { name: "Back to pause menu" }).click();
      await look();
      await shot(`inspection-${width}x${height}`);
      await p.getByTestId("inspection-return").click();
    }
  }
  for (const [width, height] of [
    [932, 430],
    [1280, 800],
  ]) {
    await p.setViewportSize({ width, height });
    await far();
    await shot(`driving-${width}x${height}`);
  }
  if (process.env.CAPTURE_GROUP) {
    const previous = JSON.parse(
      await fs.readFile(`${out}/capture.json`, "utf8"),
    );
    evidence.screens = [
      ...previous.screens.filter(
        (s) => !evidence.screens.some((n) => n.name === s.name),
      ),
      ...evidence.screens,
    ];
  }
  await fs.writeFile(`${out}/capture.json`, JSON.stringify(evidence, null, 2));
  console.log("Capture complete", evidence.errors);
} finally {
  await browser.close();
  server.kill();
}
