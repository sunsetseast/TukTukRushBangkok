import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { startQaServer } from './browser-vite.mjs';
const out = path.resolve(process.env.QA_OUT || '../../docs/qa/career-landmarks/after');
if (process.env.APP_ROOT) process.chdir(process.env.APP_ROOT);
await fs.mkdir(out, { recursive: true });
const server = await startQaServer(Number(process.env.QA_PORT || 24262)),
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
const report = { errors: [], sites: [], physicalIPhone: false };
try {
  const p = await browser.newPage({
    viewport: { width: 932, height: 430 },
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  p.setDefaultTimeout(120000);
  p.on('pageerror', (e) => {
    report.errors.push(e.message);
    console.error('PAGE ERROR', e.message);
  });
  await p.goto(`http://127.0.0.1:${process.env.QA_PORT || 24262}`);
  await p.waitForFunction(() => window.__graphics?.frameId > 2);
  await p.getByTestId('button-free-roam').click();
  await p.evaluate(() => {
    const e = window.__graphics.engine;
    e.setQuality('low');
    e.model.traffic.length = 0;
    e.model.snapshot.elapsed = 105;
    e.update = () => {};
  });
  for (const id of process.env.QA_SELECT?.split(',') ?? [
    'palace',
    'gate',
    'golden',
    'traimit',
    'icon',
    'paknam',
    'khaosan',
    'swing',
    'democracy',
    'hua',
  ]) {
    console.log('LOOK', id);
    await p.evaluate((id) => {
      const e = window.__graphics.engine,
        d = e.model.district,
        l = d.landmarks.find((l) => l.id === id),
        a = d.destinations?.find((a) => a.landmarkId === id),
        n = d.nodes.find((n) => n.id === (a?.arrivalNode ?? l.accessNode));
      if (e.model.snapshot.viewingLandmark) e.resume();
      const site = l.plot ?? l;
      Object.assign(e.model.player, {
        x: n.x,
        z: n.z,
        heading: Math.atan2(site.x - n.x, site.z - n.z),
        speed: 0,
        collision: 0,
      });
      e.model.snapshot.phase = 'playing';
      e.model.snapshot.viewingLandmark = undefined;
      if (!e.viewLandmark(id)) throw Error('Cannot LOOK ' + id);
      e.publish();
    }, id);
    await p.getByTestId('inspection-return').waitFor();
    await p.waitForTimeout(450);

    const f = await p.evaluate(() => window.__graphics.frameId);
    await p.waitForFunction((f) => window.__graphics.frameId > f + 2, f);

    const stats = await p.evaluate(() => {
      const g = window.__graphics;
      g.gl.getContext().finish();
      return {
        calls: g.gl.info.render.calls,
        triangles: g.gl.info.render.triangles,
        geometries: g.gl.info.memory.geometries,
        textures: g.gl.info.memory.textures,
        camera: [...g.camera.position],
      };
    });

    report.sites.push({ id, ...stats });
    if (['palace', 'gate', 'golden', 'traimit', 'icon'].includes(id) || process.env.ALL_SHOTS)
      await p.screenshot({ path: `${out}/${id}.jpg`, type: 'jpeg', quality: 85 });
    await p.getByTestId('inspection-return').click();
    const returned = await p.evaluate(() => window.__graphics.frameId);
    await p.waitForFunction((f) => window.__graphics.frameId > f + 3, returned);
    const drive = await p.evaluate(async () => {
      const samples = [];
      for (let i = 0; i < 18; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        samples.push(window.__graphics.stats.frameMs);
      }
      const g = window.__graphics,
        v = g.engine.model.player,
        projected = new g.three.Vector3(v.x, 1, v.z).project(g.camera);
      return {
        samples,
        calls: g.gl.info.render.calls,
        triangles: g.gl.info.render.triangles,
        height: g.camera.position.y,
        visible: Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1,
      };
    });
    assert(drive.height < 6 && drive.visible, `Chase camera remains playable after ${id}`);
    report.sites.at(-1).driving = drive;
    if (id === 'icon' && !process.env.APP_ROOT)
      await p.screenshot({ path: `${out}/icon-driving.jpg`, type: 'jpeg', quality: 85 });
    console.log('PASS LOOK and chase', id);
  }
  if (!process.env.APP_ROOT) {
    await p.evaluate(() => window.__graphics.engine.returnToTitle());
    await p.getByTestId('button-title-career').click();
    await p.getByTestId('driver-career').waitFor();
    await p.screenshot({ path: `${out}/career.jpg`, type: 'jpeg', quality: 85 });
    await p.getByTestId('button-close-career').click();
  }
  assert.deepEqual(report.errors, []);
  await fs.writeFile(`${out}/checks.json`, JSON.stringify(report, null, 2));
  console.log('PASS actual LOOK views', report.sites.map((s) => s.id).join(', '), out);
} finally {
  await browser.close();
  server.kill();
}
