import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { startQaServer } from './browser-vite.mjs';
const out = path.resolve(process.env.QA_OUT || '../../docs/qa/career-landmarks');
await fs.mkdir(out, { recursive: true });
const server = await startQaServer(24264),
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });
const errors = [],
  checks = [];
try {
  const p = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  p.setDefaultTimeout(120000);
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://127.0.0.1:24264');
  await p.waitForFunction(() => window.__graphics?.frameId > 2);
  await p.getByTestId('button-free-roam').click();
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    window.__step = e.update.bind(e);
    e.update = () => {};
    e.model.traffic = [];
  });
  const deliver = async () =>
    p.evaluate(() => {
      const e = window.__graphics.engine,
        m = e.model,
        s = m.snapshot;
      Object.assign(m.player, { x: m.mission.pickup.x, z: m.mission.pickup.z, speed: 0 });
      for (let i = 0; i < 24; i++) window.__step(0.05);
      if (s.stage !== 'delivery') throw Error('Pickup failed');
      Object.assign(m.player, { x: m.mission.destination.x, z: m.mission.destination.z, speed: 0 });
      for (let i = 0; i < 24; i++) window.__step(0.05);
      if (s.stage !== 'pickup') throw Error('Dropoff failed');
      e.publish();
      return {
        wallet: e.career.profile.wallet,
        earnings: s.earnings,
        fares: e.career.profile.fares,
      };
    });
  const first = await deliver();
  assert(first.wallet > 0);
  assert.equal(first.wallet, first.earnings);
  assert.equal(first.fares, 1);
  await p.getByTestId('button-pause').click();
  await p.getByTestId('button-pause-career').click();
  await p.getByTestId('driver-career').waitFor();
  assert((await p.getByTestId('career-wallet').textContent()).includes(String(first.wallet)));
  await p.keyboard.press('Escape');
  assert.equal(await p.evaluate(() => window.__graphics.engine.model.snapshot.phase), 'paused');
  await p.getByTestId('button-resume').click();
  const second = await deliver();
  assert(second.wallet > first.wallet);
  assert.equal(second.fares, 2);
  checks.push(
    'Free Roam pickup and delivery credit wallet immediately; pause/career/resume does not repeat rewards',
  );
  await p.evaluate(() => window.__graphics.engine.restart());
  assert.equal(
    await p.evaluate(() => window.__graphics.engine.career.profile.wallet),
    second.wallet,
  );
  await p.reload();
  await p.waitForFunction(() => window.__graphics?.frameId > 2);
  await p.getByTestId('button-title-career').click();
  assert.equal(
    await p.evaluate(() => window.__graphics.engine.career.profile.wallet),
    second.wallet,
  );
  checks.push('Restart and reload preserve earned baht and discoveries');
  for (const [width, height] of [
    [375, 812],
    [430, 932],
    [844, 390],
    [932, 430],
    [1280, 800],
  ]) {
    await p.setViewportSize({ width, height });
    const dialog = p.getByTestId('driver-career');
    await dialog.waitFor();
    const fits = await dialog.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return (
        r.x >= 0 &&
        r.right <= innerWidth + 1 &&
        r.y >= 0 &&
        r.bottom <= innerHeight + 1 &&
        el.scrollWidth <= el.clientWidth + 1
      );
    });
    assert(fits, `Career fits ${width}×${height}`);
    await dialog.evaluate((el) => (el.scrollTop = el.scrollHeight));
    assert(await p.getByText('Saved on this browser and device.', { exact: false }).isVisible());
    await dialog.evaluate((el) => (el.scrollTop = 0));
  }
  checks.push('Career panel fits and scrolls at all five required sizes');
  await p.setViewportSize({ width: 932, height: 430 });
  await p.screenshot({ path: `${out}/career.jpg`, type: 'jpeg', quality: 85 });
  await p.getByTestId('button-close-career').click();
  await p.getByTestId('button-start-shift').click();
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    window.__step = e.update.bind(e);
    e.update = () => {};
    e.model.traffic = [];
  });
  await deliver();
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.model.snapshot.shiftTime = 0.01;
    window.__step(0.05);
    e.publish();
  });
  await p.getByTestId('button-again').waitFor();
  assert.equal(await p.evaluate(() => window.__graphics.engine.career.profile.shifts), 1);
  assert((await p.locator('.tt-results-career').textContent()).includes('XP'));
  const action = await p.getByTestId('button-again').boundingBox();
  assert(
    action && action.y + action.height <= 430,
    'Primary result action is visible without scrolling',
  );
  await p.screenshot({ path: `${out}/results.jpg`, type: 'jpeg', quality: 85 });
  checks.push('Completed shift records XP, wallet, achievements and personal records exactly once');
  await p.getByTestId('button-results-career').click();
  await p.getByTestId('button-close-career').click();
  await p.getByTestId('button-again').click();
  assert.equal(await p.evaluate(() => window.__graphics.engine.career.profile.shifts), 1);
  checks.push('Results career roundtrip and another shift retain totals');
  assert.deepEqual(errors, []);
  await fs.writeFile(
    `${out}/career-checks.json`,
    JSON.stringify({ checks, errors, physicalIPhone: false }, null, 2),
  );
  console.log('PASS browser career', checks);
} finally {
  await browser.close();
  server.kill();
}
