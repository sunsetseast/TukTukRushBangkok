import * as T from "three";
import { buildSignAtlas } from "../../signArt";
import { GEO_SHOP_SIGNS, type ChinatownDecoration } from "./chinatownFacades";
export function chinatownMaterials() {
  const atlas = buildSignAtlas(GEO_SHOP_SIGNS, true), night = { value: 0 };
  // Shared low-cost diffuse material. The original architectural palette and
  // batched geometry supply detail; four array/PBR samples per fragment doubled
  // the first software-GPU benchmark. No per-shop textures or real-time lights.
  const facade = new T.MeshLambertMaterial({ vertexColors: true });
  facade.onBeforeCompile = (shader) => {
    shader.uniforms.shopNight = night;
    shader.vertexShader = "varying float shopWash;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>", `#include <begin_vertex>
      vec4 washPosition=vec4(transformed,1.);
      #ifdef USE_INSTANCING
      washPosition=instanceMatrix*washPosition;
      #endif
      shopWash=clamp(1.-max(0.,washPosition.y-1.)*.15,0.,1.);`);
    shader.fragmentShader = "varying float shopWash;uniform float shopNight;\n" + shader.fragmentShader.replace(
      "#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      totalEmissiveRadiance+=diffuseColor.rgb*vec3(.38,.16,.055)*shopWash*shopNight;`);
  };
  facade.customProgramCacheKey = () => "geographic-diffuse-shop-wash-v1";
  const windows = new T.MeshLambertMaterial({
    color: "#ffffff",
    vertexColors: true,
    emissive: "#ffffff",
    emissiveIntensity: 0,
  });
  windows.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance*=vColor.rgb;\n#endif",
    );
  };
  windows.customProgramCacheKey = () => "geographic-occupied-windows-v1";
  const h = new T.MeshLambertMaterial({
      map: atlas.h.tex,
      emissiveMap: atlas.h.tex,
      emissive: "#ffffff",
      emissiveIntensity: 0.1,
    }),
    v = h.clone();
  v.map = atlas.v.tex;
  v.emissiveMap = atlas.v.tex;
  return {
    facade,
    windows,
    h,
    v,
    night,
    setNight(value: number) {
      night.value = value;
      windows.emissiveIntensity = value * 1.15;
      h.emissiveIntensity = 0.12 + value * 0.95;
      v.emissiveIntensity = 0.12 + value * 1.1;
    },
    dispose() {
      for (const m of [facade, windows, h, v]) m.dispose();
      for (const t of [atlas.h.tex, atlas.v.tex])
        t.dispose();
    },
  };
}
export type ChinatownMaterials = ReturnType<typeof chinatownMaterials>;
export function buildChinatownDecoration(
  data: ChinatownDecoration,
  materials: ChinatownMaterials,
) {
  const root = new T.Group();
  root.name = "GeographicChinatown";
  root.userData = {
    facadeIds: data.facades.map((f) => f.id),
    bytes: data.bytes,
    pieces: data.pieces,
    facades: data.facades,
  };
  for (const b of data.batches) {
    const g = new T.BufferGeometry();
    for (const [name, a] of Object.entries(b.attributes))
      g.setAttribute(
        name,
        a.stride
          ? new T.InterleavedBufferAttribute(new T.InterleavedBuffer(a.array, a.stride), a.size, a.offset ?? 0, a.normalized)
          : a.instanced
          ? new T.InstancedBufferAttribute(a.array, a.size, a.normalized)
          : new T.BufferAttribute(a.array, a.size, a.normalized),
      );
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    if (b.index) g.setIndex(new T.BufferAttribute(b.index, 1));
    const material = b.sign
      ? materials[b.sign]
      : b.layer === "BangkokNight"
        ? materials.windows
        : materials.facade;
    let mesh: T.Mesh;
    if (b.matrices) {
      const m = new T.InstancedMesh(g, material, b.count!);
      m.instanceMatrix.array.set(b.matrices);
      if (b.colors)
        m.instanceColor = new T.InstancedBufferAttribute(b.colors, 3, true);
      m.computeBoundingSphere();
      mesh = m;
    } else {
      g.computeBoundingSphere();
      mesh = new T.Mesh(g, material);
    }
    // Draw opaque decoration first so the original mass behind the skin benefits
    // from early depth rejection rather than shading the same frontage twice.
    mesh.renderOrder = -1;
    mesh.name = b.layer;
    mesh.userData = { chinatown: true, layer: b.layer, center: b.center };
    root.add(mesh);
  }
  return root;
}
const point = new T.Vector3();
export function updateChinatownLOD(
  root: T.Group,
  camera: T.Vector3,
  quality: "low" | "medium",
) {
  root.traverse((o) => {
    if (!(o instanceof T.Mesh) || !o.userData.chinatown) return;
    const center = o.userData.center as number[];
    root.getWorldPosition(point);
    const d = Math.hypot(
      camera.x - point.x - center[0]!,
      camera.z - point.z - center[2]!,
    );
    const layer = o.userData.layer;
    o.visible =
      layer === "BangkokDetail"
        ? quality === "medium" && d < 40
        : layer === "BangkokFacade"
          ? d < (quality === "low" ? 55 : 85)
          : layer === "BangkokNight"
            ? d < (quality === "low" ? 90 : 135)
            : d < (quality === "low" ? 130 : 180);
  });
}
