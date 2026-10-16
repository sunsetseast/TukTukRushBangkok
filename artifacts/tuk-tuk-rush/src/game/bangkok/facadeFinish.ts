import * as T from "three";
/** Original eight-finish library, with no image or decoder requests. */
export function facadeFinishes() {
  const w = 512,
    h = 256,
    albedo = new Uint8Array(w * h * 4),
    pbr = new Uint8Array(w * h * 4),
    height = new Float32Array(w * h);
  const rough = [0.93, 0.94, 0.96, 0.48, 0.83, 0.36, 0.97, 0.23],
    metal = [0, 0, 0, 0.03, 0, 0.75, 0, 0.18];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x % 128,
        v = y % 128,
        tile = Math.floor(x / 128) + Math.floor(y / 128) * 4,
        i = (y * w + x) * 4;
      const hash =
          (Math.imul(u + 19, 73856093) ^ Math.imul(v + 37, 19349663)) >>> 0,
        n = (hash % 101) / 100;
      const cloud =
        Math.sin(u * 0.081 + Math.sin(v * 0.04)) * Math.sin(v * 0.071) * 0.5 +
        0.5;
      let value = 0.91 + n * 0.04,
        relief = n * 0.03,
        r = rough[tile]!;
      if (tile === 0) {
        value -= cloud * 0.065;
        relief += cloud * 0.04;
      }
      if (tile === 1) {
        const joint = u < 2 || v < 2;
        value -= joint ? 0.16 : cloud * 0.07;
        relief += joint ? -0.18 : 0;
      }
      if (tile === 2) {
        const mortar =
          v % 16 < 1.8 || (u + (Math.floor(v / 16) % 2) * 16) % 32 < 1.7;
        value = mortar ? 0.67 : 0.87 + n * 0.08;
        relief = mortar ? -0.3 : n * 0.08;
      }
      if (tile === 3) {
        const joint = u % 32 < 1.5 || v % 32 < 1.5;
        value = joint ? 0.65 : 0.95 + n * 0.025;
        relief = joint ? -0.28 : 0.03;
        r = joint ? 0.91 : 0.46 + n * 0.08;
      }
      if (tile === 4) {
        const gap = u % 24 < 1.5;
        value = gap
          ? 0.58
          : 0.83 + n * 0.04 + Math.sin(u * 0.72 + Math.sin(v * 0.12)) * 0.045;
        relief = gap ? -0.25 : Math.sin(u * 0.72 + v * 0.05) * 0.09;
      }
      if (tile === 5) {
        const rib = 0.5 + 0.5 * Math.cos((v * Math.PI) / 5);
        value = 0.79 + rib * 0.17;
        relief = rib * 0.17;
        r = 0.33 + n * 0.12;
      }
      if (tile === 6) {
        value = 0.91 + Math.sin((u * Math.PI) / 16) * 0.04 + n * 0.025;
        relief = Math.sin((u * Math.PI) / 16) * 0.06;
        r = 0.96;
      }
      if (tile === 7) {
        const frame = u < 2 || v < 2;
        value = frame
          ? 0.52
          : 0.88 + Math.sin(u * 0.032) * 0.07 + Math.sin(v * 0.05) * 0.025;
        relief = frame ? -0.1 : 0;
        r = frame ? 0.65 : 0.2 + n * 0.04;
      }
      const c = Math.round(T.MathUtils.clamp(value, 0, 1) * 255);
      albedo[i] = albedo[i + 1] = albedo[i + 2] = c;
      albedo[i + 3] = 255;
      pbr[i] = 255;
      pbr[i + 1] = Math.round(r * 255);
      pbr[i + 2] = Math.round(metal[tile]! * 255);
      pbr[i + 3] = 255;
      height[y * w + x] = relief;
    }
  const normals = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const tx = Math.floor(x / 128) * 128,
        ty = Math.floor(y / 128) * 128,
        u = x % 128,
        v = y % 128;
      const at = (a: number, b: number) =>
        height[(ty + ((b + 128) % 128)) * w + tx + ((a + 128) % 128)]!;
      const dx = (at(u - 1, v) - at(u + 1, v)) * 1.7,
        dy = (at(u, v - 1) - at(u, v + 1)) * 1.7,
        l = Math.hypot(dx, dy, 1),
        i = (y * w + x) * 4;
      normals[i] = Math.round(((dx / l) * 0.5 + 0.5) * 255);
      normals[i + 1] = Math.round(((dy / l) * 0.5 + 0.5) * 255);
      normals[i + 2] = Math.round(((1 / l) * 0.5 + 0.5) * 255);
      normals[i + 3] = 255;
    }
  const texture = (data: Uint8Array, name: string, color = false) => {
    const t = new T.DataTexture(data, w, h);
    t.name = name;
    t.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
    t.generateMipmaps = true;
    t.minFilter = T.LinearMipmapLinearFilter;
    t.magFilter = T.LinearFilter;
    t.anisotropy = 2;
    t.needsUpdate = true;
    return t;
  };
  return {
    albedo: texture(albedo, "Bangkok finishes / color", true),
    pbr: texture(pbr, "Bangkok finishes / roughness-metalness"),
    normal: texture(normals, "Bangkok finishes / normal"),
  };
}
/** Repeat inside padded tiles in the fragment stage, at four world metres. */
export function installFacadeFinish(m: T.MeshStandardMaterial) {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
      varying vec2 finishMetric; varying float finishTile; varying vec2 finishEdge;
      #ifdef USE_INSTANCING
      attribute float artSurface;
      #endif`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <uv_vertex>",
      `#include <uv_vertex>
      finishTile=-1.;finishMetric=vec2(0.);finishEdge=uv;
      #ifdef USE_INSTANCING
      vec3 extent=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
      vec2 faceExtent=abs(normal.x)>.5?extent.zy:(abs(normal.y)>.5?extent.xz:extent.xy);
      finishMetric=uv*faceExtent/4.;finishTile=artSurface;
      #endif`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
      varying vec2 finishMetric; varying float finishTile; varying vec2 finishEdge;
      vec2 finishUV(vec2 fallbackUV){if(finishTile<-.5)return fallbackUV;return (vec2(mod(finishTile,4.),floor(finishTile/4.))+vec2(.025)+fract(finishMetric)*.95)/vec2(4.,2.);}`,
    );
    for (const key of [
      "map_fragment",
      "roughnessmap_fragment",
      "metalnessmap_fragment",
      "normal_fragment_maps",
    ] as const) {
      const chunk = T.ShaderChunk[key].replace(
        /texture2D\( (map|roughnessMap|metalnessMap|normalMap), (v\w+Uv) \)/g,
        "texture2D( $1, finishUV($2) )",
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <${key}>`,
        chunk,
      );
    }
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <aomap_fragment>",
      `#include <aomap_fragment>
      if(finishTile>=0.){vec2 edge=min(finishEdge,1.-finishEdge);float rim=smoothstep(0.,.055,min(edge.x,edge.y));reflectedLight.indirectDiffuse*=mix(.76,1.,rim);}`,
    );
  };
  m.customProgramCacheKey = () => "bangkok-metric-finishes-v1";
}
