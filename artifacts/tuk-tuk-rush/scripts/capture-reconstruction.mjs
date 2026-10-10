/** Reproducible actual WebGL captures, not mockups. Software renderer is not iPhone evidence. */
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const output = process.env.QA_OUTPUT_DIR || fileURLToPath(new URL('../../../generated-artifacts/bangkok-reconstruction/', import.meta.url));
await fs.mkdir(`${output}/screenshots`, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true });
const errors = [], failed = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
await page.goto(process.env.GAME_URL || 'http://localhost:80/');
await page.waitForFunction(() => window.__graphics, null, { timeout: 120000 });
await page.getByTestId('button-free-roam').click();
await page.evaluate(() => {
  window.__captureQuality = 'medium';
  const e = window.__graphics.engine, original = e.update.bind(e);
  // Disable the software-GPU watchdog for repeatable quality-mode captures only.
  e.update = dt => { e.slowTime = -1e6; original(dt); e.model.snapshot.quality = window.__captureQuality; };
});
const next = async (count = 2) => {
  const frame = await page.evaluate(() => window.__graphics.frameId);
  await page.waitForFunction(({ frame, count }) => window.__graphics.frameId > frame + count, { frame, count }, { timeout: 120000 });
};
const shots = await page.evaluate(() => {
  const d = window.__graphics.engine.model.district;
  const rb = d.roundabout;
  const gold = d.buildings.find(b => b.sign === 'ฮั่วเซ่งเฮง') || d.buildings.find(b => b.showcase && b.style === 'gold');
  const food = d.buildings.find(b => b.showcase && b.style === 'noodle');
  const view = (b, along = 0, distance = 16) => {
    const nx = Math.sin(b.yaw), nz = Math.cos(b.yaw), tx = Math.cos(b.yaw), tz = -Math.sin(b.yaw);
    return { position: [b.x + nx * distance + tx * along, 5, b.z + nz * distance + tz * along], look: [b.x, 9, b.z] };
  };
  return [
    ['chase', null],
    ['signage', view(gold)],
    ['shops', view(food, 5, 20)],
    ['curve', { position: [-80, 175, 80], look: [-70, 0, -60] }],
    ['gate', { position: [rb.x + 18, 13, rb.z + 72], look: [rb.x, 10, rb.z] }],
    ['intersection', { position: [80, 8, -25], look: [10, 5, 18] }],
    ['street-life', view(food, -12, 14)],
    ['miniature', { position: [-25, 28, 75], look: [-100, 10, -20] }],
  ];
});
const samples = {};
for (const [name, camera] of shots) {
  await page.evaluate(c => { window.__artCamera = c; }, camera);
  await next();
  await page.screenshot({ path: `${output}/screenshots/after-${name}.jpg`, type: 'jpeg', quality: 88 });
  samples[name] = await page.evaluate(() => ({ ...window.__graphics.stats }));
}
await page.setViewportSize({ width: 844, height: 390 });
await page.evaluate(() => { delete window.__artCamera; });
await next();
await page.screenshot({ path: `${output}/screenshots/after-mobile-landscape.jpg`, type: 'jpeg', quality: 90 });
await page.setViewportSize({ width: 932, height: 430 });
await next();
await page.screenshot({ path: `${output}/screenshots/after-wide-mobile.jpg`, type: 'jpeg', quality: 88 });
const qualitySamples = {};
for (const q of ['medium', 'low', 'medium', 'low']) {
  await page.evaluate(q => { window.__captureQuality = q; window.__graphics.engine.setQuality(q); }, q);
  await next();
  qualitySamples[q] = await page.evaluate(() => ({ ...window.__graphics.stats }));
}
// Real UI checks for the remaining pause/recovery/restart journey. Never force
// clicks past overlays: the fullscreen preview must leave these controls usable.
await page.getByTestId('button-pause').click();
const frozen = await page.evaluate(() => {
  const m = window.__graphics.engine.model;
  return { player: [m.player.x, m.player.z], traffic: m.traffic.map(c => [c.x, c.z]), phase: m.snapshot.phase };
});
await next();
const still = await page.evaluate(() => {
  const m = window.__graphics.engine.model;
  return { player: [m.player.x, m.player.z], traffic: m.traffic.map(c => [c.x, c.z]), phase: m.snapshot.phase };
});
if (frozen.phase !== 'paused' || JSON.stringify(frozen) !== JSON.stringify(still)) throw new Error('Pause did not freeze player and traffic');
for (const q of ['medium', 'low']) {
  await page.evaluate(q => { window.__captureQuality = q; }, q);
  await page.getByTestId(`button-quality-${q}`).click();
  if (await page.evaluate(() => window.__graphics.engine.model.snapshot.quality) !== q) throw new Error('Quality UI did not change mode');
}
await page.getByTestId('button-resume').click();
if (await page.evaluate(() => window.__graphics.engine.model.snapshot.phase) !== 'playing') throw new Error('Resume failed');
await page.getByTestId('button-pause').click();
await page.getByTestId('button-pause-recover').click();
const recovered = await page.evaluate(() => {
  const m = window.__graphics.engine.model;
  return { finite: Number.isFinite(m.player.x + m.player.z + m.player.heading), speed: m.player.speed, phase: m.snapshot.phase };
});
if (!recovered.finite || recovered.speed !== 0) throw new Error('Recovery failed');
if (recovered.phase === 'playing') await page.getByTestId('button-pause').click();
await page.getByTestId('button-restart').click();
const restart = await page.evaluate(() => {
  const m = window.__graphics.engine.model;
  return { phase: m.snapshot.phase, mode: m.snapshot.mode, stage: m.snapshot.stage, deliveries: m.snapshot.deliveries };
});
if (restart.phase !== 'playing' || restart.mode !== 'free' || restart.stage !== 'pickup' || restart.deliveries !== 0) throw new Error('Restart failed');
await page.setViewportSize({ width: 390, height: 844 });
const portrait = await page.locator('.tt-rotate').isVisible();
if (!portrait) throw new Error('Portrait rotate guidance missing');
await page.setViewportSize({ width: 844, height: 390 });
if (await page.locator('.tt-rotate').isVisible()) throw new Error('Rotate guidance covers landscape');
const interfaceChecks = { pauseFreeze: true, qualityButtons: true, resume: true, recovery: true, restart, portraitGuidance: portrait, landscapeRestored: true };
const gpu = await page.evaluate(() => {
  const g = window.__graphics;
  const gl = g.gl.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
  return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), error: gl.getError(), fontsLoaded: document.fonts.check('16px "Rush Thai"') && document.fonts.check('16px "Rush Chinese"') };
});
const cleanup = await page.evaluate(() => {
  const g = window.__graphics, before = g.gl.info.memory.geometries;
  g.life.dispose();
  return { before, after: g.gl.info.memory.geometries, released: before - g.gl.info.memory.geometries };
});
await fs.writeFile(`${output}/visual-measurements.json`, JSON.stringify({ environment: 'Linux Chromium SwiftShader, not physical iPhone', samples, qualitySamples, interfaceChecks, cleanup, gpu, errors, failed }, null, 2));
await browser.close();
if (errors.length || failed.length || gpu.error || !gpu.fontsLoaded || cleanup.released <= 0) throw new Error(JSON.stringify({ errors, failed, gpu, cleanup }));
console.log(JSON.stringify({ screenshots: 10, gpu, samples, qualitySamples, interfaceChecks, cleanup, errors, failed }));
