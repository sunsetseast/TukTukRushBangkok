import * as THREE from 'three';

const geos = new Map<string, THREE.BoxGeometry>();
const mats = new Map<string, THREE.Material>();

export function lamb(c: string): THREE.Material {
  const k = 'l' + c;
  let m = mats.get(k);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); mats.set(k, m); }
  return m;
}
export function glow(c: string): THREE.Material {
  const k = 'g' + c;
  let m = mats.get(k);
  if (!m) { m = new THREE.MeshBasicMaterial({ color: c }); mats.set(k, m); }
  return m;
}
export function box(w: number, h: number, l: number, x: number, y: number, z: number, m: THREE.Material) {
  const k = `${w},${h},${l}`;
  let g = geos.get(k);
  if (!g) { g = new THREE.BoxGeometry(w, h, l); geos.set(k, g); }
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  return mesh;
}
export function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
