import * as T from "three";
import { buildSignAtlas } from "../../signArt";
import { GEO_SHOP_SIGNS, type ChinatownDecoration } from "./chinatownFacades";
export function chinatownMaterials() {
  const atlas = buildSignAtlas(GEO_SHOP_SIGNS, true), night = { value: 0 };
  // Palette lighting is evaluated per vertex in this bounded decorative layer.
  // Shared production world lighting remains unchanged. Avoid per-fragment PBR
  // and array texture work on mobile; preserve readable directional profiles.
  const facade = new T.MeshBasicMaterial({ vertexColors: true });
  facade.onBeforeCompile = shader => {
    shader.uniforms.shopNight=night;
    shader.vertexShader="uniform float shopNight;\n"+shader.vertexShader.replace('#include <color_vertex>',`#include <color_vertex>
      vec3 litNormal=normal;vec4 washPosition=vec4(position,1.);
      #ifdef USE_INSTANCING
      litNormal=mat3(instanceMatrix)*litNormal;washPosition=instanceMatrix*washPosition;
      #endif
      litNormal=normalize(mat3(modelMatrix)*litNormal);
      float direct=max(0.,dot(litNormal,normalize(vec3(.4,.8,.2))));
      float wash=clamp(1.-max(0.,washPosition.y-1.)*.2,0.,1.);
      vColor.rgb*=mix(vec3(.72+direct*.4),mix(vec3(.19,.24,.34),vec3(.92,.49,.20),wash),shopNight);`);
  };
  facade.customProgramCacheKey=()=>"geographic-palette-lighting-v1";
  const windows=new T.MeshBasicMaterial({vertexColors:true,color:'#ffffff'});
  const h=new T.MeshBasicMaterial({map:atlas.h.tex}),v=h.clone();v.map=atlas.v.tex;
  return {
    facade,
    windows,
    h,
    v,
    night,
    setNight(value: number) {
      night.value = value;
      windows.color.setScalar(.85+value*.45);
      h.color.setScalar(.9+value*.25);
      v.color.setScalar(.9+value*.35);
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
    // Primary opaque skins reject the source mass behind them early. Volumetric
    // props keep ordinary ordering so source buildings occlude rear shop clutter.
    mesh.renderOrder = b.layer === "BangkokArchitecture" || b.layer === "CommercialSigns" ? -1 : 0;
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
  player?: {x:number;z:number},
) {
  root.getWorldPosition(point);
  root.traverse((o) => {
    if (!(o instanceof T.Mesh) || !o.userData.chinatown) return;
    const center = o.userData.center as number[];
    const d = Math.hypot(
      camera.x - point.x - center[0]!,
      camera.z - point.z - center[2]!,
    );
    const layer = o.userData.layer;
    // Counter colliders remain visible around the vehicle even when the chase
    // camera is on the far side of a batch cell or looking away.
    const nearPlayer = player && Math.hypot(player.x-point.x-center[0]!,player.z-point.z-center[2]!)<55;
    o.visible =
      layer === "BangkokDetail"
        ? quality === "medium" && d < 30
        : layer === "BangkokFacade"
          ? nearPlayer || d < (quality === "low" ? 55 : 65)
          : layer === "BangkokNight"
            ? d < (quality === "low" ? 80 : 110)
            : d < (quality === "low" ? 110 : 150);
  });
}
