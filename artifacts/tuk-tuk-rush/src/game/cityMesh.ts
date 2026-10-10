import * as THREE from 'three';
import type { District, Road, RoadNode } from './types';
import { box, lamb } from './meshUtil';

export type City = { group: THREE.Group; dispose: () => void };
type Seg = { r: Road; a: RoadNode; b: RoadNode; dx: number; dz: number; len: number };

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FAM = "'Thonburi','Sukhumvit Set','Noto Sans Thai','Leelawadee UI','Tahoma',sans-serif";

export function textTexture(text: string, bg: string, fg: string, accent: string, w = 512, h = 160) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = accent; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
  g.lineWidth = 2; g.strokeRect(22, 22, w - 44, h - 44);
  let size = 104;
  g.font = `bold ${size}px ${FAM}`;
  const m = g.measureText(text).width;
  if (m > w - 80) { size = Math.floor((size * (w - 80)) / m); g.font = `bold ${size}px ${FAM}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2;
  return t;
}

const SIGNS: [string, string, string, string][] = [
  ['เยาวราช', '#b3201a', '#ffd23f', '#ffd23f'],
  ['อาหาร', '#12705f', '#fff0d2', '#fff0d2'],
  ['กาแฟ', '#4a2a22', '#ffe2b0', '#f7b733'],
  ['วัดไตรมิตร', '#5a1530', '#ffd23f', '#ffd23f'],
  ['ก๋วยเตี๋ยว', '#e8452c', '#fff7e0', '#fff7e0'],
  ['ร้านทอง', '#2a0f1e', '#ffc83a', '#ffc83a'],
  ['ชา', '#2a7a58', '#f4ffe6', '#f4ffe6'],
];

const tmp = new THREE.Object3D();
function M(x: number, y: number, z: number, ry: number, sx = 1, sy = 1, sz = 1) {
  tmp.position.set(x, y, z); tmp.rotation.set(0, ry, 0); tmp.scale.set(sx, sy, sz); tmp.updateMatrix();
  return tmp.matrix.clone();
}

export function buildCity(d: District): City {
  const group = new THREE.Group();
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const segs: Seg[] = [];
  for (const r of d.roads) {
    const a = nodes.get(r.a), b = nodes.get(r.b);
    if (!a || !b) continue;
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
    segs.push({ r, a, b, dx: dx / len, dz: dz / len, len });
  }

  const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, ms: THREE.Matrix4[], cols?: THREE.Color[]) => {
    if (!ms.length) return;
    const im = new THREE.InstancedMesh(geo, mat, ms.length);
    ms.forEach((m, i) => im.setMatrixAt(i, m));
    if (cols) cols.forEach((c, i) => im.setColorAt(i, c));
    im.frustumCulled = false;
    group.add(im);
  };

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), lamb('#3a2a35'));
  ground.position.y = -0.02;
  group.add(ground);

  // roads
  const roadMat = new THREE.MeshLambertMaterial({ color: '#ffffff', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const boxUnit = new THREE.BoxGeometry(1, 0.1, 1);
  const roadCol = (r: Road) => new THREE.Color(r.shortcut ? '#7a5a48' : r.width >= 12 ? '#4b4350' : '#574c58');
  inst(boxUnit, roadMat, segs.map((s) => M((s.a.x + s.b.x) / 2, 0.05, (s.a.z + s.b.z) / 2, Math.atan2(s.dx, s.dz), s.r.width, 1, s.len)), segs.map((s) => roadCol(s.r)));

  const discGeo = new THREE.CylinderGeometry(1, 1, 0.1, 20);
  const nodeW = new Map<string, Seg>();
  for (const s of segs) for (const n of [s.a.id, s.b.id]) { const o = nodeW.get(n); if (!o || o.r.width < s.r.width) nodeW.set(n, s); }
  const discM: THREE.Matrix4[] = [], discC: THREE.Color[] = [];
  for (const [id, s] of nodeW) { const n = nodes.get(id)!; discM.push(M(n.x, 0.05, n.z, 0, s.r.width / 2, 1, s.r.width / 2)); discC.push(roadCol(s.r)); }
  inst(discGeo, roadMat, discM, discC);

  // center dashes
  const dashM: THREE.Matrix4[] = [];
  const dashGeo = new THREE.BoxGeometry(1, 0.04, 1);
  for (const s of segs) {
    if (s.r.width < 9 || s.r.shortcut) continue;
    for (let t = 14; t < s.len - 14; t += 9) dashM.push(M(s.a.x + s.dx * t, 0.12, s.a.z + s.dz * t, Math.atan2(s.dx, s.dz), 0.35, 1, 4));
  }
  inst(dashGeo, new THREE.MeshBasicMaterial({ color: '#f3d98b', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), dashM);

  // lamps + lanterns
  const poleM: THREE.Matrix4[] = [], lanM: THREE.Matrix4[] = [], wire: number[] = [];
  for (const s of segs) {
    if (s.len < 50) continue;
    let side = 1;
    let last: { x: number; z: number } | null = null;
    for (let t = 20; t < s.len - 20; t += 26) {
      const off = s.r.width / 2 + 1.2;
      const x = s.a.x + s.dx * t - s.dz * side * off, z = s.a.z + s.dz * t + s.dx * side * off;
      poleM.push(M(x, 2.5, z, 0)); lanM.push(M(x, 5.1, z, 0, 1, 1.25, 1)); side = -side;
      if (last) { const mx = (last.x + x) / 2, mz = (last.z + z) / 2; wire.push(last.x, 4.9, last.z, mx, 4.2, mz, mx, 4.2, mz, x, 4.9, z); }
      last = { x, z };
    }
  }
  inst(new THREE.CylinderGeometry(0.08, 0.11, 5, 6), lamb('#201a24'), poleM);
  inst(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff5a36' }), lanM);
  if (wire.length) {
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
    const ls = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#1a1218' }));
    ls.frustumCulled = false; group.add(ls);
  }

  // nearest road helper
  const nearest = (x: number, z: number) => {
    let best = { d: 1e9, cx: x, cz: z, dx: 1, dz: 0, w: 10 };
    for (const s of segs) {
      const t = Math.max(0, Math.min(s.len, (x - s.a.x) * s.dx + (z - s.a.z) * s.dz));
      const cx = s.a.x + s.dx * t, cz = s.a.z + s.dz * t, dd = Math.hypot(x - cx, z - cz);
      if (dd < best.d) best = { d: dd, cx, cz, dx: s.dx, dz: s.dz, w: s.r.width };
    }
    return best;
  };

  // buildings, roofs, windows, awnings, signs
  const rand = rng(7);
  const bM: THREE.Matrix4[] = [], bC: THREE.Color[] = [], rM: THREE.Matrix4[] = [], rC: THREE.Color[] = [];
  const wM: THREE.Matrix4[] = [], wC: THREE.Color[] = [], aM: THREE.Matrix4[] = [], aC: THREE.Color[] = [];
  const signM: THREE.Matrix4[][] = SIGNS.map(() => []);
  const winCols = ['#ffd27a', '#ffe9a8', '#bfe9ff', '#3a2a35', '#2a1d2c', '#ffb36b'];
  const awn = ['#d9371f', '#2bb39a', '#f7b733', '#ec3f8a', '#3a6ea5'];
  for (const b of d.buildings) {
    const col = new THREE.Color(b.color);
    bM.push(M(b.x, b.height / 2, b.z, 0, b.w, b.height, b.d)); bC.push(col);
    rM.push(M(b.x, b.height + 0.3, b.z, 0, b.w + 0.8, 0.6, b.d + 0.8)); rC.push(col.clone().multiplyScalar(0.5));
    const n = nearest(b.x, b.z);
    const ex = n.cx - b.x, ez = n.cz - b.z;
    const ax = Math.abs(ex) / (b.w / 2) > Math.abs(ez) / (b.d / 2);
    const nx = ax ? Math.sign(ex) || 1 : 0, nz = ax ? 0 : Math.sign(ez) || 1;
    const fw = ax ? b.d : b.w;
    const fx = b.x + nx * b.w / 2, fz = b.z + nz * b.d / 2;
    const ry = Math.atan2(nx, nz);
    const tx = nz !== 0 ? 1 : 0, tz = nx !== 0 ? 1 : 0;
    const cols = Math.max(1, Math.min(8, Math.floor(fw / 3.2)));
    const rows = Math.max(1, Math.min(7, Math.floor((b.height - 9) / 3.4) + 1));
    for (let c = 0; c < cols; c++) {
      const o = (c - (cols - 1) / 2) * (fw / cols);
      for (let r = 0; r < rows; r++) {
        wM.push(M(fx + tx * o + nx * 0.06, 8 + r * 3.4, fz + tz * o + nz * 0.06, ry, 1.4, 1.8, 1));
        wC.push(new THREE.Color(winCols[Math.floor(rand() * winCols.length)]));
      }
    }
    aM.push(M(fx + nx * 0.8, 3.4, fz + nz * 0.8, ry, fw * 0.9, 0.22, 1.6)); aC.push(new THREE.Color(awn[Math.floor(rand() * awn.length)]));
    if (fw >= 5 && rand() < 0.55) signM[Math.floor(rand() * SIGNS.length)].push(M(fx + nx * 0.2, 5.5, fz + nz * 0.2, ry, 1.15, 1.15, 1));
  }
  inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), bM, bC);
  inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), rM, rC);
  inst(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial(), wM, wC);
  inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), aM, aC);
  const signGeo = new THREE.PlaneGeometry(3.6, 1.125);
  SIGNS.forEach((s, i) => inst(signGeo, new THREE.MeshBasicMaterial({ map: textTexture(s[0], s[1], s[2], s[3]) }), signM[i]));

  // Props: parked cars, stalls and trees. Colliders are appended to district.obstacles once.
  buildProps(d, segs, nodes, nearest, inst);

  // landmarks
  const label = (text: string, bg: string, fg: string, y: number, x: number, z: number, s = 14) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(text, bg, fg, fg), depthWrite: false, fog: false }));
    sp.scale.set(s, s * 0.3125, 1); sp.position.set(x, y, z); group.add(sp);
  };
  const red = lamb('#c4281c'), gold = lamb('#f7b733'), jade = lamb('#1f8f78'), cream = lamb('#f1e2c0'), maroon = lamb('#6a1d34');
  for (const l of d.landmarks) {
    const g = new THREE.Group();
    g.position.set(l.x, 0, l.z);
    if (l.kind === 'gate') {
      // Axis-aligned, matching parent colliders: pillars 5x7 at x=l.x-19 / l.x+19, height 15.
      const hw = 19;
      for (const sx of [-hw, hw]) { g.add(box(5, 15, 7, sx, 7.5, 0, red)); g.add(box(6.4, 1, 8.4, sx, 15.5, 0, gold)); g.add(box(6.4, 1, 8.4, sx, 0.5, 0, gold)); }
      g.add(box(hw * 2 + 5, 2.4, 6, 0, 13.6, 0, red));
      g.add(box(hw * 2 + 9, 0.8, 8.6, 0, 15.2, 0, jade));
      g.add(box(hw * 1.5, 0.8, 7, 0, 16, 0, gold));
      g.add(box(hw * 0.9, 0.8, 5.6, 0, 16.8, 0, jade));
      g.add(box(3, 2, 3, 0, 18, 0, gold));
      const plaza = new THREE.Mesh(new THREE.RingGeometry(26, 34, 40).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#8f6f5c', polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      plaza.position.y = 0.11; g.add(plaza);
      label('เยาวราช', '#b3201a', '#ffd23f', 12.2, l.x, l.z + 4.4, 14);
    } else if (l.kind === 'temple') {
      g.add(box(40, 3, 42, 0, 1.5, 0, cream));
      g.add(box(30, 9, 32, 0, 7.5, 0, maroon));
      const cone = (r: number, h: number, y: number, m: THREE.Material) => {
        const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4), m); c.rotation.y = Math.PI / 4; c.position.y = y; g.add(c);
      };
      cone(26, 5, 14.5, gold); cone(19, 5, 18.5, red); cone(12, 6, 23, gold);
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.9, 8, 8), gold); sp.position.y = 30; g.add(sp);
      label('วัดไตรมิตร', '#5a1530', '#ffd23f', 38, l.x, l.z, 18);
    } else {
      g.add(box(84, 12, 46, 0, 6, 0, cream));
      const vault = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 80, 18, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), lamb('#2b8f86'));
      vault.position.y = 12; g.add(vault);
      g.add(box(6, 14, 6, 0, 19, 24, red));
      g.add(box(4, 4, 0.4, 0, 22, 27.2, lamb('#fff0d2')));
      label('หัวลำโพง', '#12705f', '#fff0d2', 30, l.x, l.z, 18);
    }
    group.add(g);
  }

  const dispose = () => {
    group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      const arr = Array.isArray(mat) ? mat : mat ? [mat] : [];
      arr.forEach((x) => { const mm = x as THREE.MeshBasicMaterial; if (mm.map) mm.map.dispose(); x.dispose(); });
    });
  };
  return { group, dispose };
}

export function buildSky() {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(900, 24, 16);
  const stops = [[-1, '#b8605a'], [0, '#ff9a5a'], [0.12, '#ea6a78'], [0.4, '#8a3f8e'], [1, '#2a1a4f']] as const;
  const cs = stops.map((s) => new THREE.Color(s[1]));
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 900;
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const f = Math.max(0, Math.min(1, (t - stops[k][0]) / (stops[k + 1][0] - stops[k][0])));
    c.copy(cs[k]).lerp(cs[k + 1], f);
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
  const sunDir = new THREE.Vector3(-120, 40, 60).normalize().multiplyScalar(820);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(190, 24), new THREE.MeshBasicMaterial({ color: '#ff8a5c', transparent: true, opacity: 0.3, fog: false, depthWrite: false }));
  const sun = new THREE.Mesh(new THREE.CircleGeometry(62, 24), new THREE.MeshBasicMaterial({ color: '#ffd27a', fog: false, depthWrite: false }));
  halo.position.copy(sunDir).multiplyScalar(0.99); sun.position.copy(sunDir).multiplyScalar(0.98);
  halo.lookAt(0, 0, 0); sun.lookAt(0, 0, 0);
  g.add(halo, sun);
  g.renderOrder = -10;
  return g;
}


const propDone = new WeakSet<District>();
const propPlacementObstacles = new WeakMap<District, District['obstacles']>();
type Inst = (geo: THREE.BufferGeometry, mat: THREE.Material, ms: THREE.Matrix4[], cols?: THREE.Color[]) => void;

function buildProps(
  d: District, segs: Seg[], nodes: Map<string, RoadNode>,
  nearest: (x: number, z: number) => { d: number; w: number },
  inst: Inst,
) {
  const fresh = !propDone.has(d);
  propDone.add(d);
  if (!propPlacementObstacles.has(d)) propPlacementObstacles.set(d, [...d.obstacles]);
  const staticObstacles = propPlacementObstacles.get(d)!;
  const rand = rng(99);
  const carM: THREE.Matrix4[] = [], carC: THREE.Color[] = [], cabM: THREE.Matrix4[] = [];
  const stM: THREE.Matrix4[] = [], awM: THREE.Matrix4[] = [], awC: THREE.Color[] = [];
  const trM: THREE.Matrix4[] = [], leM: THREE.Matrix4[] = [], leC: THREE.Color[] = [];
  const placed: { x: number; z: number; w: number; d: number }[] = [];
  const carCols = ['#ec3f8a', '#e8e0d0', '#2bb39a', '#3a6ea5', '#f7b733', '#8a2a2a'];
  const leaf = ['#2f8a4a', '#3da35a', '#237a45'];
  const free = (x: number, z: number, hw: number, hd: number, roadClear: number) => {
    if (nearest(x, z).d < roadClear) return false;
    if (Math.hypot(x + 270, z - 40) < 20 || Math.hypot(x - 225, z - 100) < 36) return false;
    for (const n of d.nodes) if (Math.hypot(n.x - x, n.z - z) < 18) return false;
    for (const o of staticObstacles) if (Math.abs(o.x - x) < o.w / 2 + hw + 1 && Math.abs(o.z - z) < o.d / 2 + hd + 1) return false;
    for (const o of placed) if (Math.abs(o.x - x) < o.w / 2 + hw + 0.8 && Math.abs(o.z - z) < o.d / 2 + hd + 0.8) return false;
    return true;
  };
  segs.forEach((s, si) => {
    let side = si % 2 ? 1 : -1;
    for (let t = 30; t < s.len - 30; t += 17) {
      const roll = rand();
      const along = roll < 0.4 ? 'car' : roll < 0.7 ? 'stall' : 'tree';
      const off = s.r.width / 2 + (along === 'car' ? 2.0 : along === 'stall' ? 2.4 : 2.6);
      const x = s.a.x + s.dx * t - s.dz * side * off, z = s.a.z + s.dz * t + s.dx * side * off;
      side = -side;
      const eastWest = Math.abs(s.dx) > Math.abs(s.dz);
      if (along === 'car') {
        const w = eastWest ? 4.4 : 2.2, dd = eastWest ? 2.2 : 4.4;
        if (!free(x, z, w / 2, dd / 2, s.r.width / 2 + 1.5)) continue;
        placed.push({ x, z, w, d: dd });
        if (fresh) d.obstacles.push({ x, z, w, d: dd, height: 1.8, color: '#888888' });
        const ry = eastWest ? Math.PI / 2 : 0;
        carM.push(M(x, 0.65, z, ry, 1.8, 0.7, 4.2)); carC.push(new THREE.Color(carCols[Math.floor(rand() * carCols.length)]));
        cabM.push(M(x, 1.25, z, ry, 1.55, 0.6, 2.2));
      } else if (along === 'stall') {
        if (!free(x, z, 1.3, 1.3, s.r.width / 2 + 1.6)) continue;
        placed.push({ x, z, w: 2.6, d: 2.6 });
        if (fresh) d.obstacles.push({ x, z, w: 2.6, d: 2.6, height: 2.6, color: '#c4281c' });
        stM.push(M(x, 0.6, z, 0, 2.2, 1.2, 2.2));
        awM.push(M(x, 2.5, z, 0, 2.8, 0.2, 2.8)); awC.push(new THREE.Color(awn2[Math.floor(rand() * awn2.length)]));
      } else {
        if (!free(x, z, 0.8, 0.8, s.r.width / 2 + 1.5)) continue;
        placed.push({ x, z, w: 1.6, d: 1.6 });
        trM.push(M(x, 1.2, z, 0, 1, 1, 1));
        const sc = 1.6 + rand() * 0.9;
        leM.push(M(x, 3.2 + sc * 0.6, z, 0, sc, sc, sc)); leC.push(new THREE.Color(leaf[Math.floor(rand() * leaf.length)]));
      }
    }
  });
  void nodes;
  const lm = () => new THREE.MeshLambertMaterial();
  inst(new THREE.BoxGeometry(1, 1, 1), lm(), carM, carC);
  inst(new THREE.BoxGeometry(1, 1, 1), lamb('#2a3040'), cabM);
  inst(new THREE.BoxGeometry(1, 1, 1), lamb('#e8d6b0'), stM);
  inst(new THREE.BoxGeometry(1, 1, 1), lm(), awM, awC);
  inst(new THREE.CylinderGeometry(0.18, 0.25, 2.4, 6), lamb('#5a3a2a'), trM);
  inst(new THREE.IcosahedronGeometry(1.2, 0), lm(), leM, leC);
}
const awn2 = ['#d9371f', '#2bb39a', '#f7b733', '#ec3f8a'];
