import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { TrafficCar } from "./types";
import { disposeObject } from "./assets";

/** Shared shape per silhouette. Colour is per vertex; material class is retained. */
export function buildTrafficModel(
  kind: TrafficCar["kind"] | "van",
  color: string,
  detailed = true,
) {
  const g = new T.Group();
  const paint = new T.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.2,
    }),
    glass = new T.MeshStandardMaterial({
      color: "#496977",
      roughness: 0.2,
      metalness: 0.3,
    }),
    rubber = new T.MeshStandardMaterial({ color: "#23323c", roughness: 0.92 }),
    trim = new T.MeshStandardMaterial({
      color: "#d8d9c3",
      roughness: 0.3,
      metalness: 0.7,
    });
  const headlights = new T.MeshStandardMaterial({
      color: "#fff1cb",
      emissive: "#ffe6aa",
      emissiveIntensity: 0.1,
      roughness: 0.23,
    }),
    taillights = new T.MeshStandardMaterial({
      color: "#a82f35",
      emissive: "#ff423b",
      emissiveIntensity: 0.12,
      roughness: 0.35,
    });
  g.userData.lamps = [headlights, taillights];
  paint.name = "paint";
  const add = (
    geo: T.BufferGeometry,
    m: T.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const o = new T.Mesh(geo, m);
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  const rb = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    m: T.Material,
  ) =>
    add(
      detailed
        ? new RoundedBoxGeometry(w, h, d, 1, 0.06)
        : new T.BoxGeometry(w, h, d),
      m,
      x,
      y,
      z,
    );
  const wheel = (x: number, z: number, r = 0.32) => {
    if (!detailed) {
      add(
        new T.CylinderGeometry(r, r, 0.2, 8).rotateZ(Math.PI / 2),
        rubber,
        x,
        r,
        z,
      );
      return;
    }
    add(
      new T.TorusGeometry(r - 0.09, 0.09, 6, 16).rotateY(Math.PI / 2),
      rubber,
      x,
      r,
      z,
    );
    add(
      new T.CylinderGeometry(r * 0.58, r * 0.58, 0.21, 12).rotateZ(Math.PI / 2),
      trim,
      x,
      r,
      z,
    );
  };
  if (kind === "motorcycle") {
    rb(0.37, 0.38, 0.56, 0, 0.83, 0.48, paint);
    rb(0.46, 0.24, 1, 0, 0.64, -0.15, paint);
    rb(0.38, 0.09, 0.65, 0, 0.9, -0.18, rubber);
    wheel(0, 0.68, 0.3);
    wheel(0, -0.65, 0.3);
    for (const s of [-1, 1]) {
      rb(0.05, 0.45, 0.05, s * 0.13, 0.59, 0.66, trim);
      rb(0.09, 0.45, 0.09, s * 0.18, 1.02, -0.2, rubber);
      rb(0.3, 0.04, 0.04, s * 0.18, 1.06, 0.39, trim);
    }
    add(new T.CapsuleGeometry(0.18, 0.28, 3, 8), trim, 0, 1.3, -0.15);
    add(new T.SphereGeometry(0.18, 12, 8), paint, 0, 1.73, -0.05);
    rb(0.24, 0.14, 0.05, 0, 0.91, 0.79, headlights);
  } else {
    rb(1.78, 0.48, 3.9, 0, 0.65, 0, paint);
    rb(1.55, 0.55, 1.97, 0, 1.15, -0.15, glass);
    rb(
      1.56,
      0.1,
      1.86,
      0,
      1.46,
      -0.19,
      kind === "taxi"
        ? new T.MeshStandardMaterial({ color: "#edc44b", roughness: 0.38 })
        : paint,
    );
    if (kind === "van") {
      rb(1.73, 0.86, 2.95, 0, 1.43, -0.43, paint);
      rb(1.64, 0.1, 2.9, 0, 1.9, -0.45, paint);
      rb(1.76, 0.44, 1.12, 0, 1.48, 0.7, glass);
    }
    rb(1.64, 0.12, 1.04, 0, 0.94, 1.33, paint);
    rb(1.69, 0.12, 0.85, 0, 0.93, -1.49, paint);
    for (let s of [-1, 1]) {
      wheel(s * 0.86, 1.23);
      wheel(s * 0.86, -1.24);
      rb(0.075, 0.61, 0.1, s * 0.77, 1.13, -0.11, paint);
      rb(0.18, 0.1, 0.24, s * 0.92, 1.09, 0.7, paint);
      rb(0.46, 0.13, 0.05, s * 0.56, 0.82, 1.99, headlights);
      rb(0.43, 0.15, 0.05, s * 0.56, 0.82, -1.99, taillights);
      rb(0.26, 0.035, 0.035, s * 0.88, 0.92, -0.38, trim);
    }
    if (detailed) {
      rb(1.1, 0.055, 0.055, 0, 0.73, 2.03, rubber);
      for (const side of [-1, 1])
        rb(0.045, 0.52, 1.4, side * 0.89, 0.67, -0.1, rubber);
      if (kind === "van")
        for (const side of [-1, 1]) {
          rb(0.025, 0.14, 1.7, side * 0.88, 1.35, -0.55, trim);
          rb(0.04, 0.46, 0.025, side * 0.88, 1.36, 0.35, rubber);
        }
    }
    rb(1.66, 0.11, 0.1, 0, 0.48, 1.98, trim);
    rb(1.66, 0.11, 0.1, 0, 0.48, -1.98, trim);
    rb(0.58, 0.12, 0.04, 0, 0.6, 2.04, rubber);
    if (kind === "taxi") rb(0.63, 0.19, 0.25, 0, 1.58, -0.2, trim);
  }
  // One draw per material class, shared by all vehicles of that appearance.
  const buckets = new Map<T.Material, T.BufferGeometry[]>();
  g.updateMatrixWorld(true);
  g.traverse((o) => {
    if (o instanceof T.Mesh) {
      const geo = (
        o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()
      ).applyMatrix4(o.matrixWorld);
      geo.deleteAttribute("uv");
      const m = o.material as T.Material;
      if (!buckets.has(m)) buckets.set(m, []);
      buckets.get(m)!.push(geo);
    }
  });
  disposeObjectGeometry(g);
  g.clear();
  for (const [m, geos] of buckets) {
    g.add(new T.Mesh(mergeGeometries(geos)!, m));
    geos.forEach((x) => x.dispose());
  }
  if (kind === "motorcycle") taillights.dispose();
  return g;
}
function disposeObjectGeometry(g: T.Group) {
  g.traverse((o) => {
    if (o instanceof T.Mesh) o.geometry.dispose();
  });
}
export class TrafficLayer {
  group = new T.Group();
  private map = new Map<number, T.Group>();
  private templates = new Map<string, T.Group>();
  private lamps = new Set<T.MeshStandardMaterial>();
  sync(cars: TrafficCar[], camera?: T.Vector3, night = 0) {
    const seen = new Set<number>();
    for (const c of cars) {
      let g = this.map.get(c.id);
      if (!g) {
        const kind = c.kind === "car" && c.id % 9 === 0 ? "van" : c.kind;
        const key = kind + c.color;
        let template = this.templates.get(key);
        if (!template) {
          template = new T.Group();
          const lod = new T.LOD(),
            near = buildTrafficModel(kind, c.color),
            far = buildTrafficModel(kind, c.color, false);
          const palette = new Map<string, T.Material>(),
            signature = (m: T.MeshStandardMaterial) =>
              [
                m.color.getHex(),
                m.emissive.getHex(),
                m.roughness,
                m.metalness,
              ].join(":");
          near.traverse((o) => {
            if (o instanceof T.Mesh)
              palette.set(signature(o.material), o.material);
          });
          far.traverse((o) => {
            if (o instanceof T.Mesh) {
              const shared = palette.get(signature(o.material));
              if (shared && shared !== o.material) {
                o.material.dispose();
                o.material = shared;
              }
            }
          });
          delete far.userData.lamps;
          lod.addLevel(near, 0);
          lod.addLevel(far, 85, 0.15);
          template.add(lod);
          template.traverse((o) => {
            for (const m of o.userData.lamps ?? []) this.lamps.add(m);
            delete o.userData.lamps;
          });
          this.templates.set(key, template);
        }
        g = template.clone();
        this.map.set(c.id, g);
        this.group.add(g);
      }
      g.position.set(c.x, 0, c.z);
      g.rotation.y = c.heading;
      if (camera) g.visible = Math.hypot(c.x - camera.x, c.z - camera.z) < 360;
      seen.add(c.id);
    }
    for (const m of this.lamps) m.emissiveIntensity = 0.08 + night * 1.35;
    for (const [id, g] of this.map)
      if (!seen.has(id)) {
        this.group.remove(g);
        this.map.delete(id);
      }
  }
  dispose() {
    const owner = new T.Group();
    for (const g of this.templates.values()) owner.add(g);
    disposeObject(owner);
    this.templates.clear();
    this.lamps.clear();
    this.map.clear();
    this.group.clear();
  }
}
