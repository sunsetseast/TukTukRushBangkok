import * as T from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";

/** Bake repeated prop pieces into a few indexed PBR batches per spatial cell. */
export class StaticBatch {
  private buckets = new Map<
    string,
    { geos: T.BufferGeometry[]; mat: T.Material; center: T.Vector3 }
  >();
  private sourceGeos = new Set<T.BufferGeometry>();
  private sourceMats = new Set<T.Material>();
  add = (
    geo: T.BufferGeometry,
    mat: T.Material,
    matrices: T.Matrix4[],
    colors?: T.Color[],
  ) => {
    this.sourceGeos.add(geo);
    this.sourceMats.add(mat);
    const m = mat as T.MeshStandardMaterial,
      p = new T.Vector3();
    const style = `${mat.type}:${m.roughness}:${m.metalness}:${m.side}:${m.map?.uuid ?? ""}:${m.polygonOffset}`;
    matrices.forEach((matrix, i) => {
      p.setFromMatrixPosition(matrix);
      const cx = Math.floor(p.x / 80),
        cz = Math.floor(p.z / 80),
        key = `${cx}:${cz}:${style}`;
      let b = this.buckets.get(key);
      if (!b) {
        const material = mat.clone() as T.MeshStandardMaterial;
        material.color.set("#ffffff");
        material.vertexColors = true;
        b = {
          geos: [],
          mat: material,
          center: new T.Vector3((cx + 0.5) * 80, 0, (cz + 0.5) * 80),
        };
        this.buckets.set(key, b);
      }
      const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(
        matrix,
      );
      if (!m.map) g.deleteAttribute("uv");
      const color = m.color.clone();
      if (colors) color.multiply(colors[i]!);
      const arr = new Float32Array(g.attributes.position.count * 3);
      for (let j = 0; j < arr.length; j += 3) {
        arr[j] = color.r;
        arr[j + 1] = color.g;
        arr[j + 2] = color.b;
      }
      g.setAttribute("color", new T.BufferAttribute(arr, 3));
      b.geos.push(g);
    });
  };
  finish() {
    const groups: T.Group[] = [];
    for (const b of this.buckets.values()) {
      const raw = mergeGeometries(b.geos)!;
      const indexed = mergeVertices(raw);
      raw.dispose();
      b.geos.forEach((g) => g.dispose());
      const group = new T.Group();
      group.userData.center = b.center;
      group.add(new T.Mesh(indexed, b.mat));
      groups.push(group);
    }
    this.sourceGeos.forEach((g) => g.dispose());
    this.sourceMats.forEach((m) => m.dispose());
    this.buckets.clear();
    return groups;
  }
}
