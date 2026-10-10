import * as THREE from 'three';
import { box, glow, lamb } from './meshUtil';

const tireGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.16, 14).rotateZ(Math.PI / 2);
const hubGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.2, 8).rotateZ(Math.PI / 2);
const headGeo = new THREE.SphereGeometry(0.17, 10, 8);
const lanternGeo = new THREE.SphereGeometry(0.1, 8, 6);

export type Tuk = {
  root: THREE.Group; lean: THREE.Group; steerPivot: THREE.Group; bars: THREE.Group;
  spins: THREE.Group[]; passenger: THREE.Group;
};

function wheel(x: number, y: number, z: number) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const spin = new THREE.Group();
  spin.add(new THREE.Mesh(tireGeo, lamb('#17141b')));
  spin.add(new THREE.Mesh(hubGeo, lamb('#f7b733')));
  spin.add(box(0.22, 0.5, 0.05, 0, 0, 0, lamb('#e8e0d0')));
  spin.add(box(0.22, 0.05, 0.5, 0, 0, 0, lamb('#e8e0d0')));
  pivot.add(spin);
  return { pivot, spin };
}

function person(shirt: string, cap: string | null) {
  const g = new THREE.Group();
  g.add(box(0.42, 0.5, 0.28, 0, 0, 0, lamb(shirt)));
  const head = new THREE.Mesh(headGeo, lamb('#c98f64'));
  head.position.y = 0.42;
  g.add(head);
  if (cap) g.add(box(0.34, 0.08, 0.34, 0, 0.55, 0.03, lamb(cap)));
  g.add(box(0.12, 0.34, 0.16, -0.14, -0.4, 0.14, lamb('#2a2f4a')));
  g.add(box(0.12, 0.34, 0.16, 0.14, -0.4, 0.14, lamb('#2a2f4a')));
  return g;
}

export function buildTuk(): Tuk {
  const root = new THREE.Group();
  const lean = new THREE.Group();
  lean.scale.setScalar(1.3);
  root.add(lean);

  const pink = lamb('#ec3f8a'), dpink = lamb('#a81e5e'), gold = lamb('#f7b733'), dark = lamb('#1d1a22');
  const red = lamb('#d9371f'), cream = lamb('#fff0d2'), jade = lamb('#2bb39a');

  // blob shadow
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1.5, 16), new THREE.MeshBasicMaterial({ color: '#150a14', transparent: true, opacity: 0.35, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.06; sh.scale.set(0.85, 1.15, 1);
  root.add(sh);

  // chassis + cowl
  lean.add(box(1.2, 0.4, 2.0, 0, 0.55, -0.1, pink));
  lean.add(box(1.24, 0.1, 2.04, 0, 0.36, -0.1, dpink));
  lean.add(box(0.8, 0.55, 0.7, 0, 0.78, 0.85, pink));
  lean.add(box(0.5, 0.08, 0.5, 0, 1.08, 0.85, gold));
  lean.add(box(0.36, 0.08, 0.62, 0, 0.66, 0.95, dpink)); // fender
  const hl = new THREE.Mesh(lanternGeo, glow('#fff3c0'));
  hl.position.set(0, 0.85, 1.22); hl.scale.setScalar(1.3); lean.add(hl);
  lean.add(box(0.14, 0.1, 0.05, -0.5, 0.7, -1.12, glow('#ff3030')));
  lean.add(box(0.14, 0.1, 0.05, 0.5, 0.7, -1.12, glow('#ff3030')));
  // stripe + side flames
  lean.add(box(1.24, 0.07, 1.4, 0, 0.62, -0.35, gold));

  // seats
  lean.add(box(1.2, 0.16, 0.7, 0, 0.9, -0.62, red));
  lean.add(box(1.2, 0.55, 0.12, 0, 1.25, -1.0, red));
  lean.add(box(0.5, 0.14, 0.4, 0, 0.9, 0.18, dark));

  // roof and posts
  lean.add(box(1.7, 0.1, 2.0, 0, 2.2, -0.3, gold));
  lean.add(box(1.5, 0.05, 1.8, 0, 2.27, -0.3, jade));
  lean.add(box(1.74, 0.14, 0.08, 0, 2.08, 0.72, pink));
  for (const sx of [-0.78, 0.78]) {
    lean.add(box(0.07, 1.3, 0.07, sx, 1.5, 0.55, dark));
    lean.add(box(0.07, 1.3, 0.07, sx, 1.5, -1.1, dark));
    const l = new THREE.Mesh(lanternGeo, glow('#ff5a36'));
    l.position.set(sx, 2.0, 0.75); lean.add(l);
  }

  // handlebar
  const bars = new THREE.Group();
  bars.position.set(0, 1.12, 0.62);
  bars.add(box(0.9, 0.05, 0.05, 0, 0, 0, dark));
  bars.add(box(0.09, 0.3, 0.09, -0.45, -0.05, 0, dark));
  bars.add(box(0.09, 0.3, 0.09, 0.45, -0.05, 0, dark));
  lean.add(bars);

  // driver
  const driver = person('#2bb39a', '#d9371f');
  driver.position.set(0, 1.36, 0.16);
  lean.add(driver);
  lean.add(box(0.1, 0.1, 0.38, -0.22, 1.28, 0.38, lamb('#c98f64')));
  lean.add(box(0.1, 0.1, 0.38, 0.22, 1.28, 0.38, lamb('#c98f64')));

  // passenger
  const passenger = person('#f7b733', null);
  passenger.position.set(0, 1.35, -0.62);
  passenger.visible = false;
  lean.add(passenger);

  // wheels
  const spins: THREE.Group[] = [];
  const front = wheel(0, 0.3, 1.0);
  const bl = wheel(-0.76, 0.3, -0.7);
  const br = wheel(0.76, 0.3, -0.7);
  lean.add(front.pivot, bl.pivot, br.pivot);
  spins.push(front.spin, bl.spin, br.spin);
  lean.add(box(0.04, 0.04, 0.04, 0, 0, 0, cream));

  return { root, lean, steerPivot: front.pivot, bars, spins, passenger };
}
