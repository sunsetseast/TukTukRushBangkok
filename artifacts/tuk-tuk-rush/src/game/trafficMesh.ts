import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { TrafficCar } from './types';
import { box, glow, lamb } from './meshUtil';

const hGeo = new THREE.SphereGeometry(0.16, 8, 6);

function build(kind: TrafficCar['kind'], color: string) {
  const g = new THREE.Group();
  const body = lamb(color);
  const dark = lamb('#18151c');
  if (kind === 'motorcycle') {
    g.add(box(0.35, 0.45, 1.5, 0, 0.7, 0, body));
    g.add(box(0.14, 0.6, 0.6, 0, 0.32, 0.75, dark));
    g.add(box(0.14, 0.6, 0.6, 0, 0.32, -0.7, dark));
    g.add(box(0.4, 0.5, 0.3, 0, 1.2, -0.1, lamb('#e8e0d0')));
    const h = new THREE.Mesh(hGeo, lamb('#c98f64'));
    h.position.set(0, 1.6, -0.05); g.add(h);
    g.add(box(0.2, 0.15, 0.1, 0, 0.95, 0.8, glow('#fff3c0')));
    return g;
  }
  g.add(box(1.8, 0.65, 4.2, 0, 0.65, 0, body));
  g.add(box(1.55, 0.6, 2.2, 0, 1.25, -0.2, lamb(kind === 'taxi' ? '#ffd34d' : '#cfd6e6')));
  g.add(box(1.57, 0.3, 2.0, 0, 1.3, -0.2, lamb('#232a3a')));
  for (const sx of [-0.92, 0.92]) for (const sz of [-1.3, 1.3]) g.add(box(0.25, 0.62, 0.62, sx, 0.31, sz, dark));
  g.add(box(0.4, 0.15, 0.08, -0.6, 0.75, 2.1, glow('#fff3c0')));
  g.add(box(0.4, 0.15, 0.08, 0.6, 0.75, 2.1, glow('#fff3c0')));
  g.add(box(0.4, 0.15, 0.08, -0.6, 0.75, -2.1, glow('#ff3030')));
  g.add(box(0.4, 0.15, 0.08, 0.6, 0.75, -2.1, glow('#ff3030')));
  if (kind === 'taxi') g.add(box(0.7, 0.22, 0.3, 0, 1.68, -0.2, glow('#fff3c0')));
  return g;
}

export class TrafficLayer {
  group = new THREE.Group();
  private map = new Map<number, THREE.Group>();
  sync(cars: TrafficCar[]) {
    const seen = new Set<number>();
    for (const c of cars) {
      let g = this.map.get(c.id);
      if (!g) {
        // Bake the simple colored pieces into one draw call per traffic vehicle.
        const pieces = build(c.kind, c.color);
        pieces.updateMatrixWorld(true);
        const geometries: THREE.BufferGeometry[] = [];
        pieces.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
          const color = (object.material as THREE.MeshLambertMaterial).color;
          const colors = new Float32Array(geometry.getAttribute('position').count * 3);
          for (let i = 0; i < colors.length; i += 3) {
            colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b;
          }
          geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          geometries.push(geometry);
        });
        const merged = mergeGeometries(geometries);
        if (!merged) throw new Error('Could not build traffic vehicle geometry');
        geometries.forEach(geometry => geometry.dispose());
        g = new THREE.Group();
        g.add(new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true })));
        this.map.set(c.id, g); this.group.add(g);
      }
      g.position.set(c.x, 0, c.z);
      g.rotation.y = c.heading;
      seen.add(c.id);
    }
    if (this.map.size > seen.size) {
      for (const [id, g] of this.map) if (!seen.has(id)) { this.group.remove(g); this.map.delete(id); }
    }
  }
}
