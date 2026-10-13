import * as T from "three";
import type { Surface } from "./buildingGrammar";
export type Shape = "box" | "gable" | "arch" | "cylinder" | "orb";
export type Layer = "core" | "near" | "coarse" | "detail" | "night";
export type ArtPiece = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  yaw: number;
  color: string;
  surface?: Surface;
  shape?: Shape;
  layer?: Layer;
};
/** Direct indexed vertex writer: no Mesh, transformed geometry, Matrix4 clone,
 * mergeVertices hash table, or material clone per architectural piece. */
export class ArchitecturalBatch {
  private buckets = new Map<
    string,
    {
      p: number[];
      n: number[];
      uv: number[];
      c: number[];
      ix: number[];
      layer: Layer;
      cell: T.Vector3;
    }
  >();
  private templates = new Map<Shape, T.BufferGeometry>();
  private instances = new Map<
    string,
    {
      matrices: number[];
      colors: number[];
      tiles: number[];
      layer: Layer;
      cell: T.Vector3;
    }
  >();
  pieces = 0;
  constructor(
    private material: T.Material,
    private night: T.Material,
  ) {}
  add(o: ArtPiece) {
    const shape = o.shape ?? "box",
      layer = o.layer ?? "core",
      cx = Math.floor(o.x / 120),
      cz = Math.floor(o.z / 120),
      key = `${cx}:${cz}:${layer}`;
    if (shape === "box") {
      let bucket = this.instances.get(key);
      if (!bucket) {
        bucket = {
          matrices: [],
          colors: [],
          tiles: [],
          layer,
          cell: new T.Vector3((cx + 0.5) * 120, 0, (cz + 0.5) * 120),
        };
        this.instances.set(key, bucket);
      }
      const c = Math.cos(o.yaw),
        s = Math.sin(o.yaw),
        color = new T.Color(o.color);
      // Matrices contain world transforms. A custom per-instance surface tile
      // selects the shared material atlas in the vertex shader.
      bucket.matrices.push(
        c * o.w,
        0,
        -s * o.w,
        0,
        0,
        o.h,
        0,
        0,
        s * o.d,
        0,
        c * o.d,
        0,
        o.x,
        o.y,
        o.z,
        1,
      );
      bucket.colors.push(color.r, color.g, color.b);
      bucket.tiles.push(
        [
          "plaster",
          "concrete",
          "brick",
          "tile",
          "wood",
          "metal",
          "cloth",
          "panel",
        ].indexOf(o.surface ?? "plaster"),
      );
      this.pieces++;
      return;
    }
    let b = this.buckets.get(key);
    if (!b) {
      b = {
        p: [],
        n: [],
        uv: [],
        c: [],
        ix: [],
        layer,
        cell: new T.Vector3((cx + 0.5) * 120, 0, (cz + 0.5) * 120),
      };
      this.buckets.set(key, b);
    }
    let geo = this.templates.get(shape);
    if (!geo) {
      if (shape === "gable") {
        const s = new T.Shape([
          new T.Vector2(-0.5, 0),
          new T.Vector2(0.5, 0),
          new T.Vector2(0, 1),
        ]);
        geo = new T.ExtrudeGeometry(s, {
          depth: 1,
          bevelEnabled: false,
        }).translate(0, 0, -0.5);
      } else if (shape === "arch")
        geo = new T.TorusGeometry(0.5, 0.095, 3, 10, Math.PI).translate(
          0,
          -0.05,
          0,
        );
      else if (shape === "cylinder")
        geo = new T.CylinderGeometry(0.5, 0.5, 1, 8);
      else if (shape === "orb") geo = new T.SphereGeometry(0.5, 8, 5);
      else geo = new T.BoxGeometry(1, 1, 1);
      this.templates.set(shape, geo);
    }
    const p = geo.attributes.position!,
      n = geo.attributes.normal!,
      uv = geo.attributes.uv!,
      base = b.p.length / 3,
      c = Math.cos(o.yaw),
      s = Math.sin(o.yaw),
      color = new T.Color(o.color);
    const surfaces: Surface[] = [
      "plaster",
      "concrete",
      "brick",
      "tile",
      "wood",
      "metal",
      "cloth",
      "panel",
    ];
    const tile = surfaces.indexOf(o.surface ?? "plaster"),
      tx = tile % 4,
      ty = Math.floor(tile / 4);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) * o.w,
        y = p.getY(i) * o.h,
        z = p.getZ(i) * o.d;
      b.p.push(o.x + c * x + s * z, o.y + y, o.z - s * x + c * z);
      let nx = n.getX(i) / o.w,
        ny = n.getY(i) / o.h,
        nz = n.getZ(i) / o.d,
        l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      b.n.push(c * nx + s * nz, ny, -s * nx + c * nz);
      b.c.push(color.r, color.g, color.b);
      b.uv.push(
        (tx + 0.025 + T.MathUtils.clamp(uv.getX(i), 0, 1) * 0.95) / 4,
        (ty + 0.025 + T.MathUtils.clamp(uv.getY(i), 0, 1) * 0.95) / 2,
      );
    }
    if (geo.index)
      for (let i = 0; i < geo.index.count; i++)
        b.ix.push(base + geo.index.getX(i));
    else for (let i = 0; i < p.count; i++) b.ix.push(base + i);
    this.pieces++;
  }
  finish() {
    const roots: T.Group[] = [];
    for (const b of this.instances.values()) {
      const geo = new T.BoxGeometry(1, 1, 1); // One geometry per cell carries tile ids.
      geo.setAttribute(
        "color",
        new T.Float32BufferAttribute(
          new Float32Array(geo.attributes.position.count * 3).fill(1),
          3,
        ),
      );
      geo.setAttribute(
        "artSurface",
        new T.InstancedBufferAttribute(new Float32Array(b.tiles), 1),
      );
      const mesh = new T.InstancedMesh(
        geo,
        b.layer === "night" ? this.night : this.material,
        b.tiles.length,
      );
      mesh.instanceMatrix.array.set(b.matrices);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor = new T.InstancedBufferAttribute(
        new Float32Array(b.colors),
        3,
      );
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      const root = new T.Group();
      root.name =
        b.layer === "core"
          ? "BangkokArchitecture"
          : b.layer === "near"
            ? "BangkokFacade"
            : b.layer === "coarse"
              ? "BangkokCoarse"
              : b.layer === "detail"
                ? "BangkokDetail"
                : "BangkokNight";
      root.userData.center = b.cell;
      root.add(mesh);
      roots.push(root);
    }
    this.instances.clear();
    for (const b of this.buckets.values()) {
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(b.p, 3));
      g.setAttribute("normal", new T.Float32BufferAttribute(b.n, 3));
      g.setAttribute("color", new T.Float32BufferAttribute(b.c, 3));
      if (b.layer !== "night")
        g.setAttribute("uv", new T.Float32BufferAttribute(b.uv, 2));
      g.setIndex(b.ix);
      g.computeBoundingSphere();
      g.computeBoundingBox();
      const root = new T.Group();
      root.name =
        b.layer === "core"
          ? "BangkokArchitecture"
          : b.layer === "near"
            ? "BangkokFacade"
            : b.layer === "coarse"
              ? "BangkokCoarse"
              : b.layer === "detail"
                ? "BangkokDetail"
                : "BangkokNight";
      root.userData.center = b.cell;
      root.add(new T.Mesh(g, b.layer === "night" ? this.night : this.material));
      roots.push(root);
    }
    this.templates.forEach((g) => g.dispose());
    this.templates.clear();
    this.buckets.clear();
    return roots;
  }
}
/** Original 512x256 eight-surface atlas, generated once; no photographic sources. */
export function installSurfaceAtlas(material: T.MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      "#include <common>\n#ifdef USE_INSTANCING\nattribute float artSurface;\n#endif",
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <uv_vertex>",
      "#include <uv_vertex>\n#if defined(USE_INSTANCING) && defined(USE_MAP)\nvMapUv = vec2((mod(artSurface,4.0)+0.025+uv.x*0.95)/4.0,(floor(artSurface/4.0)+0.025+uv.y*0.95)/2.0);\n#ifdef USE_ROUGHNESSMAP\nvRoughnessMapUv=vMapUv;\n#endif\n#ifdef USE_METALNESSMAP\nvMetalnessMapUv=vMapUv;\n#endif\n#endif",
    );
  };
  material.customProgramCacheKey = () => "bangkok-surface-atlas-v2";
}
export function architecturalTexture() {
  const W = 512,
    H = 256,
    data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const tile = Math.floor(x / 128) + Math.floor(y / 128) * 4,
        u = x % 128,
        v = y % 128,
        noise =
          ((Math.imul(x + 17, 73856093) ^ Math.imul(y + 31, 19349663)) >>> 0) %
          17;
      let shade = 235 + noise;
      if (tile === 0) shade -= v > 106 ? 12 : 0;
      if (tile === 1) shade -= (u + v) % 61 < 2 ? 12 : 0;
      if (tile === 2)
        shade =
          v % 21 < 2 || (u + (Math.floor(v / 21) % 2) * 32) % 64 < 2
            ? 180
            : 225 + noise;
      if (tile === 3) shade = u % 32 < 2 || v % 32 < 2 ? 180 : 240 + noise / 2;
      if (tile === 4)
        shade = u % 16 < 2 ? 173 : 218 + noise + Math.sin(u * 0.6) * 7;
      if (tile === 5) shade = v % 10 < 2 ? 179 : 235 + noise;
      if (tile === 6) shade = Math.floor(u / 16) % 2 ? 213 + noise : 249;
      if (tile === 7) shade = u < 3 || v < 3 ? 198 : 244 + noise / 3;
      const i = (y * W + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = Math.min(255, shade);
      data[i + 3] = 255;
    }
  const tex = new T.DataTexture(data, W, H);
  tex.colorSpace = T.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = T.LinearMipmapLinearFilter;
  tex.magFilter = T.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Linear PBR masks share the eight material tiles with the color atlas. */
export function architecturalSurfaceMap() {
  const data = new Uint8Array(512 * 256 * 4),
    rough = [0.92, 0.9, 0.96, 0.5, 0.78, 0.44, 0.95, 0.27],
    metal = [0, 0, 0, 0.05, 0, 0.7, 0, 0.16];
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 512; x++) {
      const tile = Math.floor(x / 128) + Math.floor(y / 128) * 4,
        i = (y * 512 + x) * 4;
      data[i] = 255;
      data[i + 1] = Math.round(rough[tile]! * 255);
      data[i + 2] = Math.round(metal[tile]! * 255);
      data[i + 3] = 255;
    }
  const tex = new T.DataTexture(data, 512, 256);
  tex.generateMipmaps = true;
  tex.minFilter = T.LinearMipmapLinearFilter;
  tex.magFilter = T.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
