import * as T from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";

/** Bake repeated prop pieces into a few indexed PBR batches per spatial cell. */
export class StaticBatch {
  constructor(private cellOrigin=0) {}
  private buckets = new Map<
    string,
    { geos: T.BufferGeometry[]; mat: T.Material; center: T.Vector3 }
  >();
  // One owned clone per source identity; spatial cells share it. Root disposal
  // deduplicates shared materials/maps while retaining each cell geometry.
  private outputMats = new Map<string,T.MeshStandardMaterial>();
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
    // Material identity preserves all render state, including emissiveMap,
    // transparency, depthWrite and blending. Similar roughness is not ownership.
    const style = mat.uuid;
    matrices.forEach((matrix, i) => {
      p.setFromMatrixPosition(matrix);
      const cx = Math.floor((p.x + this.cellOrigin) / 80),
        cz = Math.floor((p.z + this.cellOrigin) / 80),
        key = `${cx}:${cz}:${style}`;
      let b = this.buckets.get(key);
      if (!b) {
        let material=this.outputMats.get(style);if(!material){material=mat.clone() as T.MeshStandardMaterial;this.outputMats.set(style,material);
        material.color.set("#ffffff");
        material.vertexColors = true;
        material.onBeforeCompile=mat.onBeforeCompile;
        material.customProgramCacheKey=mat.customProgramCacheKey;}
        b = {
          geos: [],
          mat: material,
          center: new T.Vector3((cx + 0.5) * 80 - this.cellOrigin, 0, (cz + 0.5) * 80 - this.cellOrigin),
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
    this.buckets.clear();this.outputMats.clear();this.sourceGeos.clear();this.sourceMats.clear();
    return groups;
  }
}
