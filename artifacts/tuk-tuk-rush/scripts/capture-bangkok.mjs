/** CI-only WebGL/UI QA, using the repository's existing Playwright pipeline.
 * Inspection-camera position changes are not claimed as driven gameplay.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const output = fileURLToPath(new URL('../../../generated-artifacts/compact-bangkok/', import.meta.url));
await fs.mkdir(`${output}/screenshots`, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
const errors = [], failures = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
try {
  await page.goto(process.env.GAME_URL || 'http://localhost:24177/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__graphics?.engine?.model?.district?.worldId === 'bangkok', null, { timeout: 90000 });
  await page.getByTestId('button-free-roam').click();
  await page.getByTestId('button-open-map').click();
  await page.getByTestId('world-map').waitFor({ state: 'visible' });
  const time = await page.evaluate(() => window.__graphics.engine.model.snapshot.elapsed);
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => window.__graphics.engine.model.snapshot.elapsed), time, 'Map must pause simulation');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Whole city', exact: true }).click();
  await page.screenshot({ path: `${output}/screenshots/map-landscape.png` });
  await page.setViewportSize({ width: 430, height: 932 });
  await page.getByTestId('world-map').waitFor({ state: 'visible' });
  assert.equal(await page.getByTestId('hint-rotate').isVisible(), false, 'Portrait map must remain visible');
  await page.screenshot({ path: `${output}/screenshots/map-portrait.png` });
  await page.getByTestId('button-close-map').click();
  assert.equal(await page.evaluate(() => window.__graphics.engine.model.snapshot.phase), 'paused', 'Closing portrait map must not resume behind rotate prompt');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByTestId('button-resume').click();
  for (const id of ['gate', 'arun', 'icon', 'paragon', 'mahanakhon']) {
    await page.evaluate(id => {
      const { engine } = window.__graphics, d = engine.model.district, l = d.landmarks.find(l => l.id === id), n = d.nodes.find(n => n.id === l.accessNode);
      engine.pause(); Object.assign(engine.model.player, { x: n.x, z: n.z, speed: 0 }); engine.recover();
      engine.model.snapshot.elapsed = id === 'mahanakhon' ? 600 : 0;
      window.__artCamera = { position: [l.x + 105, 65, l.z + 120], look: [l.x, 10, l.z] };
    }, id);
    const before = await page.evaluate(() => window.__graphics.frameId);
    await page.waitForFunction(frame => window.__graphics.frameId > frame + 3, before, { timeout: 30000 });
    await page.screenshot({ path: `${output}/screenshots/${id}.png` });
  }
  const stats = await page.evaluate(() => window.__graphics.stats);
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  await fs.writeFile(`${output}/qa.json`, JSON.stringify({ pass: true, mapPauses: true, portraitMap: true, inspectionViews: 5, javascriptErrors: errors, assetFailures: failures, stats, performanceEnvironment: 'Chromium software WebGL; not physical-iPhone performance' }, null, 2));
} finally { await browser.close(); }
