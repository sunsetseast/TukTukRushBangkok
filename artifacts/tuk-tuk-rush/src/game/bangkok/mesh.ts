import * as T from 'three';
import type { District, Landmark } from '../types';
import type { City } from '../cityMesh';
import { StaticBatch } from '../staticBatch';
import { disposeObject } from '../assets';
import { buildLandmarkArt } from '../landmarkArt';

/** Blockout massing for layout testing, deliberately separate from the finished Chinatown kit. */
export function buildBangkokGraybox(d: District): City {
  const group = new T.Group(); group.name = 'CompactBangkokGraybox';
  const ground = new T.Mesh(new T.PlaneGeometry(14000, 14000).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: '#53645c', roughness: 1 }));
  ground.position.y = -.25; group.add(ground);
  const batch = new StaticBatch(), unit = new T.BoxGeometry(1, 1, 1), temp = new T.Object3D();
  const material = new T.MeshStandardMaterial({ roughness: .9 });
  const add = (x: number, y: number, z: number, w: number, h: number, depth: number, color: string, yaw = 0) => {
    temp.position.set(x, y, z); temp.rotation.set(0, yaw, 0); temp.scale.set(w, h, depth); temp.updateMatrix();
    batch.add(unit, material, [temp.matrix.clone()], [new T.Color(color)]);
  };
  const nodes = new Map(d.nodes.map(n => [n.id, n])), widths = new Map<string, number>(), degrees = new Map<string, number>();
  for (const r of d.roads) {
    const a = nodes.get(r.a)!, b = nodes.get(r.b)!, dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
    const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
    for (const id of [r.a, r.b]) { widths.set(id, Math.max(widths.get(id) ?? 0, r.width)); degrees.set(id, (degrees.get(id) ?? 0) + 1); }
    add(x, -.02, z, r.width + 4, .16, len + .5, r.bridge ? '#bbcbc9' : '#aaa79b', yaw);
    add(x, .08, z, r.width, .12, len + .7, r.shortcut ? '#796857' : '#343e49', yaw);
    if (!r.shortcut) for (let t = 8; t < len - 4; t += 12) add(a.x + dx * t / len, .155, a.z + dz * t / len, .22, .02, 4, '#e6dba1', yaw);
    if (r.bridge) {
      add(x, -.9, z, r.width + 2, 1.4, len + .5, '#778b93', yaw);
      for (const side of [-1, 1]) {
        const off = r.width / 2 + 1;
        add(x + Math.cos(yaw) * off * side, 1.05, z - Math.sin(yaw) * off * side, .4, 1.6, len + .5, '#68c1c4', yaw);
      }
    }
  }
  const disc = new T.CylinderGeometry(1, 1, .12, 20);
  for (const [id, degree] of degrees) if (degree > 2) {
    const n = nodes.get(id)!, width = widths.get(id)!;
    temp.position.set(n.x, .08, n.z); temp.rotation.set(0, 0, 0); temp.scale.set(width / 2, 1, width / 2); temp.updateMatrix();
    batch.add(disc, material, [temp.matrix.clone()], [new T.Color('#343e49')]);
  }
  const water = new T.MeshBasicMaterial({ color: '#285877' }), waterDisc = new T.CylinderGeometry(1, 1, .04, 32);
  for (let i = 1; i < d.river!.length; i++) {
    const a = d.river![i - 1]!, b = d.river![i]!, len = Math.hypot(b.x - a.x, b.z - a.z);
    temp.position.set((a.x + b.x) / 2, -.15, (a.z + b.z) / 2); temp.rotation.set(0, Math.atan2(b.x - a.x, b.z - a.z), 0); temp.scale.set(d.riverWidth!, .04, len); temp.updateMatrix();
    batch.add(unit, water, [temp.matrix.clone()]);
    for (const p of [a, b]) {
      temp.position.set(p.x, -.15, p.z); temp.rotation.set(0, 0, 0); temp.scale.set(d.riverWidth! / 2, 1, d.riverWidth! / 2); temp.updateMatrix();
      batch.add(waterDisc, water, [temp.matrix.clone()]);
    }
  }
  for (const o of d.obstacles.filter(o => o.protected)) {
    add(o.x, -.06, o.z, o.w, .25, o.d, '#2f7755');
    for (let x = o.x - o.w / 2 + 20; x < o.x + o.w / 2 - 10; x += 45) for (let z = o.z - o.d / 2 + 20; z < o.z + o.d / 2 - 10; z += 55) {
      add(x, 3, z, 1.2, 6, 1.2, '#706052'); add(x, 8, z, 9, 7, 9, '#49785d');
    }
  }
  for (const b of d.buildings) {
    add(b.x, b.height / 2, b.z, b.w, b.height, b.d, b.color, b.yaw);
    add(b.x, b.height + .5, b.z, b.w + 1, 1, b.d + 1, '#657484', b.yaw);
  }
  for (let i = 0; i < 42; i++) {
    const angle = i * Math.PI * 2 / 42, x = Math.cos(angle) * 3600, z = Math.sin(angle) * 3900, h = 50 + i % 7 * 18;
    add(x, h / 2, z, 65, h, 65, '#657584');
  }
  batch.finish().forEach(chunk => { chunk.name = 'BangkokSector'; group.add(chunk); });
  const heroes = d.landmarks.map(l => { const root = blockout(l); root.position.set(l.x, 0, l.z); root.name = `BangkokLandmark:${l.id}`; group.add(root); return root; });
  const chunks = group.children.filter(c => c.name === 'BangkokSector');
  let lastX = Infinity, lastZ = Infinity, lastQuality = '';
  return { group, update(camera, quality) {
    if (Math.hypot(camera.x - lastX, camera.z - lastZ) < 16 && quality === lastQuality) return;
    lastX = camera.x; lastZ = camera.z; lastQuality = quality;
    const radius = quality === 'low' ? 420 : 650;
    for (const chunk of chunks) { const center = chunk.userData.center as T.Vector3; chunk.visible = Math.hypot(center.x - camera.x, center.z - camera.z) < radius; }
    for (const hero of heroes) hero.visible = Math.hypot(hero.position.x - camera.x, hero.position.z - camera.z) < radius + 180;
  }, dispose() { disposeObject(group); } };
}
function blockout(l: Landmark) {
  if (l.kind === 'park') return new T.Group();
  const g = new T.Group(), size = l.size ?? 20;
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({ color, roughness: .85 })); m.position.set(x, y, z); g.add(m);
  };
  if (l.kind === 'gate' || l.kind === 'station' || l.kind === 'temple' && l.id !== 'arun') {
    const model = buildLandmarkArt({ ...l, x: 0, z: 0 }); model.scale.setScalar(Math.min(1, size / (l.kind === 'station' ? 85 : 55))); g.add(model); return g;
  }
  if (l.kind === 'temple') {
    for (let i = 0; i < 7; i++) { const width = size * (1 - i / 9); box(width, 5, width, 0, 2.5 + i * 5, 0, '#eee3c9'); }
  } else if (l.kind === 'tower') {
    for (let i = 0; i < 10; i++) box(size - i % 4 * 2, 10, size - i % 3 * 2, (i % 3 - 1) * 2, 5 + i * 10, 0, '#7196b6');
  } else if (l.kind === 'palace') {
    box(size, 6, size, 0, 3, 0, '#eee3c9');
    for (const side of [-1, 1]) { box(size * .28, 16, size * .38, side * size * .28, 14, 0, '#bf6f49'); box(size * .34, 2, size * .44, side * size * .28, 23, 0, '#e5c071'); }
  } else if (l.kind === 'wheel') {
    const radius = Math.min(size / 2, 22);
    box(2, radius, 2, 0, radius / 2, 0, '#ead7a6');
    const wheel = new T.Mesh(new T.TorusGeometry(radius, .6, 5, 32), new T.MeshBasicMaterial({ color: '#f1bf94' })); wheel.position.y = radius + 2; g.add(wheel);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI * 2 / 12; box(2, 2, 2, Math.cos(a) * radius, radius + 2 + Math.sin(a) * radius, 0, '#e6a487'); }
  } else {
    const height = l.kind === 'monument' ? 12 : 16;
    box(size, height, size, 0, height / 2, 0, l.kind === 'mall' ? '#86a7b6' : '#d2b884'); box(size * .9, 2, size * .9, 0, height + 1, 0, '#dec595');
  }
  return g;
}
export function shiftLighting(elapsed: number) {
  const blue = T.MathUtils.smoothstep(elapsed, 0, 4 * 60), night = T.MathUtils.smoothstep(elapsed, 4 * 60, 9 * 60);
  const sky = new T.Color('#c99585').lerp(new T.Color('#576482'), blue).lerp(new T.Color('#17263d'), night);
  return { sky, night, ambient: 1.15 - night * .35, sun: 1.8 - blue * .7 - night * .85, exposure: .9 + night * .12 };
}
