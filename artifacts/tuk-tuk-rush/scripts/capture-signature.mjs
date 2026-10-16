/**
 * Real WebGL/Chromium render capture of the named Yaowarat showcase plots.
 * Captures are art-inspection camera views, not purported player walkthroughs
 * or proof of on-device iPhone performance / survey-accurate architecture.
 */
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const dest = process.env.QA_OUTPUT_DIR ||
  fileURLToPath(new URL('../../../generated-artifacts/yaowarat-signature/', import.meta.url));
await fs.mkdir(dest + '/screenshots', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || (process.env.CI ? chromium.executablePath() : '/repl/tools/bin/chromium'),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true });
const errors = [], failures = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) failures.push(r.status() + ' ' + r.url()); });
try {
  await page.addInitScript(() => { if(location.protocol.startsWith('http')){const u=new URL(location.href);u.searchParams.set('qa','1');history.replaceState(null,'',u);} });
  await page.goto(process.env.GAME_URL || 'http://localhost:24177/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__graphics?.engine?.model?.district, null, { timeout: 90000 });
  await page.getByTestId('button-free-roam').click();
  // Camera comparison must show artwork, not huge mission beacons/HUD panels.
  await page.addStyleTag({ content: '.tt-hud, .tt-controls, .tt-msg, .tt-joystick, .tt-pedal { visibility: hidden !important; }' });
  await page.evaluate(() => {
    const beacon = window.__graphics.scene.getObjectByName('MissionBeacon');
    if (beacon) beacon.visible = false;
  });
  await page.evaluate(() => {
    window.__artQuality = 'medium';
    const e = window.__graphics.engine, previous = e.update.bind(e);
    e.update = dt => { e.slowTime = -1e6; previous(dt); e.model.snapshot.quality = window.__artQuality; };
  });
  const cameraData = await page.evaluate(() => {
    const d = window.__graphics.engine.model.district;
    const find = id => {
      const b = d.buildings.find(x => x.signatureId === id);
      if (!b) throw new Error('Missing hero building: ' + id);
      return b;
    };
    const hero = ['hua418','nai442','thong444','so456'].map(find);
    const shot = (b, distance = 15, along = 0) => {
      const nx = Math.sin(b.yaw), nz = Math.cos(b.yaw);
      const tx = Math.cos(b.yaw), tz = -Math.sin(b.yaw);
      // Stay closer to the same-side curb. Previously large 38m camera
      // offsets put the visual inspection camera INSIDE opposite buildings.
      return { position: [b.x + nx * distance + tx * along, 6.0, b.z + nz * distance + tz * along],
        look: [b.x, 8.5, b.z] };
    };
    const start = hero[0], finish = hero[3];
    const center = { x: (start.x + finish.x) / 2, z: (start.z + finish.z) / 2 };
    const normal = { x: Math.sin(start.yaw), z: Math.cos(start.yaw) };
    return {
      'hua-418': shot(hero[0], 16),
      'nai-442': shot(hero[1], 15),
      'thong-444': shot(hero[2], 16),
      'so-456': shot(hero[3], 17),
      'street-overview': { position: [center.x + normal.x * 21, 26, center.z + normal.z * 21],
        look: [center.x, 8, center.z] },
      'street-perspective': shot(hero[0], 16.5, -18),
    };
  });
  const ready = async () => {
    const initial = await page.evaluate(() => window.__graphics.frameId);
    await page.waitForFunction(frame => window.__graphics.frameId > frame + 2, initial, { timeout: 90000 });
  };
  const shots = [];
  for (const [name, camera] of Object.entries(cameraData)) {
    await page.evaluate(c => { window.__artCamera = c; }, camera);
    await ready();
    await page.screenshot({ path: dest + '/screenshots/' + name + '.jpg', type: 'jpeg', quality: 89 });
    shots.push({ name, camera, stats: await page.evaluate(() => ({ ...window.__graphics.stats })) });
  }
  // Most important comparison: actual in-game following camera ON the
  // drivable Yaowarat centreline. A facade screenshot alone says little about
  // whether the player can recognize Chinatown while driving.
  const drivingPose = await page.evaluate(() => {
    const model = window.__graphics.engine.model, d = model.district;
    const shop = d.buildings.find(b => b.signatureId === 'so456');
    if (!shop) throw new Error('So Seng Heng hero facade missing');
    const nodes = new Map(d.nodes.map(n => [n.id, n]));
    const road = d.roads.filter(r => r.name === 'Yaowarat Road' && r.a.startsWith('yaowarat:'));
    let best = null;
    for (const r of road) {
      const a = nodes.get(r.a), b = nodes.get(r.b);
      const dx = b.x-a.x, dz = b.z-a.z, len2 = dx*dx+dz*dz;
      const t = Math.max(0, Math.min(1, ((shop.x-a.x)*dx+(shop.z-a.z)*dz)/len2));
      const pt = { x:a.x+t*dx, z:a.z+t*dz };
      const score = Math.hypot(pt.x-shop.x, pt.z-shop.z);
      if (!best || score < best.score) best = { score, x:pt.x, z:pt.z, heading:Math.atan2(dx,dz) };
    }
    return best;
  });
  if (!drivingPose || !Number.isFinite(drivingPose.x + drivingPose.z)) {
    throw new Error('Could not locate a valid driveable Yaowarat camera pose');
  }
  await page.evaluate(p => {
    delete window.__artCamera;
    const car = window.__graphics.engine.model.player;
    car.x=p.x; car.z=p.z; car.heading=p.heading; car.speed=0;
    window.__graphics.engine.model.input.gas=false;
    window.__graphics.engine.model.input.brake=false;
    window.__graphics.engine.model.input.steer=0;
  }, drivingPose);
  await ready();
  await page.screenshot({ path: dest + '/screenshots/chase-on-yaowarat.jpg',
    type:'jpeg', quality:90 });
  shots.push({ name:'chase-on-yaowarat', camera:drivingPose,
    stats:await page.evaluate(() => ({ ...window.__graphics.stats })) });
  await page.evaluate(p => {
    window.__graphics.engine.model.player.heading = p.heading + Math.PI;
  }, drivingPose);
  await ready();
  await page.screenshot({ path: dest + '/screenshots/chase-reverse-yaowarat.jpg',
    type:'jpeg', quality:90 });
  shots.push({ name:'chase-reverse-yaowarat', camera:drivingPose,
    stats:await page.evaluate(() => ({ ...window.__graphics.stats })) });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(c => { window.__artCamera = c; }, cameraData['street-perspective']);
  await ready();
  await page.screenshot({ path: dest + '/screenshots/landscape-844x390.jpg', type: 'jpeg', quality: 88 });
  const glStatus = await page.evaluate(() => window.__graphics.gl.getContext().getError());
  await fs.writeFile(dest + '/report.json', JSON.stringify({
    renderer: 'Linux Chromium / SwiftShader (not iPhone)',
    mode: 'landmark art-inspection cameras plus two real chase-camera views; not physical iPhone testing',
    shots, glStatus, errors, failures,
    claims: 'Named shops and street block are art-directed location approximations, not surveyed elevations.',
  }, null, 2));
  if (glStatus || errors.length || failures.length) throw new Error(JSON.stringify({ glStatus, errors, failures }));
  console.log('PASS Yaowarat actual WebGL screenshots: ' + (shots.length + 1));
} finally {
  await browser.close();
}
