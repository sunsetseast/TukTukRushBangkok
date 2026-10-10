import * as THREE from "three";

export function lamb(c: string): THREE.Material {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.78 });
}
export function glow(c: string): THREE.Material {
  return new THREE.MeshBasicMaterial({ color: c });
}
export function box(
  w: number,
  h: number,
  l: number,
  x: number,
  y: number,
  z: number,
  m: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m);
  mesh.position.set(x, y, z);
  return mesh;
}
export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
