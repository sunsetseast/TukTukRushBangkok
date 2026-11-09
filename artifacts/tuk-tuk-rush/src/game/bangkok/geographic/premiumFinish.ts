import * as T from "three";
/** Eight original tactile finishes adapted from facadeFinish.ts. One sample
 * packs albedo, tangent relief (RG normal), roughness: 512KiB + mipmaps total.
 * No URLs, normal/PBR companion maps, env maps, lights or extra draws. */
export function geographicFinishTexture() {
  const size = 128,
    layers = 8,
    data = new Uint8Array(size * size * layers * 4),
    height = new Float32Array(size * size);
  const rough = [0.94, 0.97, 0.91, 0.42, 0.79, 0.32, 0.96, 0.21];
  for (let layer = 0; layer < layers; layer++) {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const n =
          (((Math.imul(x + 19, 73856093) ^ Math.imul(y + 37, 19349663)) >>> 0) %
            101) /
          100;
        const cloud =
          Math.sin((x * Math.PI) / 32 + Math.sin((y * Math.PI) / 32)) *
            Math.sin((y * Math.PI) / 64) *
            0.5 +
          0.5;
        let a = 0.94 + n * 0.035,
          h = n * 0.025,
          r = rough[layer]!;
        if (layer === 0) {
          a -= cloud * 0.04;
          h += cloud * 0.04;
        }
        if (layer === 1) {
          a -= cloud * 0.065;
          h += cloud * 0.025;
        }
        if (layer === 2) {
          const joint =
            y % 16 < 1.3 || (x + (Math.floor(y / 16) % 2) * 16) % 32 < 1.4;
          a = joint ? 0.61 : 0.88 + n * 0.09;
          h = joint ? -0.2 : n * 0.05;
        }
        if (layer === 3) {
          const joint = x % 32 < 1.2 || y % 32 < 1.2;
          a = joint ? 0.7 : 0.97;
          h = joint ? -0.12 : 0.01;
          r = joint ? 0.9 : 0.42;
        }
        if (layer === 4) {
          const grain = Math.sin(
            (x * Math.PI) / 8 + Math.sin((y * Math.PI) / 32),
          );
          a = 0.84 + n * 0.03 + grain * 0.07;
          h = grain * 0.09;
        }
        if (layer === 5) {
          const rib = 0.5 + 0.5 * Math.cos((y * Math.PI) / 4);
          a = 0.79 + rib * 0.19;
          h = rib * 0.2;
        }
        if (layer === 6) {
          a = 0.91 + Math.sin((x * Math.PI) / 8) * 0.035 + n * 0.025;
          h = Math.sin((x * Math.PI) / 8) * 0.04;
        }
        if (layer === 7) {
          a = 0.92 + Math.sin((x * Math.PI) / 64) * 0.04;
          h = 0;
        }
        const at = ((layer * size + y) * size + x) * 4;
        data[at] = Math.round(a * 255);
        data[at + 3] = Math.round(r * 255);
        height[y * size + x] = h;
      }
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const at = (xx: number, yy: number) =>
          height[((yy + size) % size) * size + ((xx + size) % size)]!;
        const dx = (at(x - 1, y) - at(x + 1, y)) * 1.5,
          dy = (at(x, y - 1) - at(x, y + 1)) * 1.5,
          l = Math.hypot(dx, dy, 1),
          i = ((layer * size + y) * size + x) * 4;
        data[i + 1] = Math.round(((dx / l) * 0.5 + 0.5) * 255);
        data[i + 2] = Math.round(((dy / l) * 0.5 + 0.5) * 255);
      }
  }
  const texture = new T.DataArrayTexture(data, size, size, layers);
  texture.name = "Geographic architectural finishes / albedo-relief-roughness";
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.minFilter = T.LinearMipmapNearestFilter;
  texture.magFilter = T.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export type GeographicFinishState = {
  night: { value: number };
  dusk: { value: number };
  detail: { value: number };
};

const paletteLighting = `
  uniform float geoNight, geoDusk;
  vec3 facadeLight(float direct) {
    vec3 ambient = mix(vec3(.56,.64,.76), vec3(.38,.43,.62), geoDusk);
    vec3 key = mix(vec3(.92,.87,.70), vec3(1.32,.78,.38), geoDusk);
    return mix(ambient + key * direct, vec3(.095,.135,.23) + vec3(.12,.17,.26)*direct, geoNight);
  }
  vec3 facadeSun() { return normalize(mix(vec3(-.45,.82,-.35), vec3(-.895,.31,-.435), geoDusk)); }
`;

/** Keep a single filtered finish sample per pixel. Directional light, metal
 * highlights and glass reflections are interpolated from the facade vertices. */
export function installGeographicFinish(
  material: T.MeshBasicMaterial,
  texture: T.DataArrayTexture,
  state: GeographicFinishState,
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.geoFinish = { value: texture };
    shader.uniforms.geoNight = state.night;
    shader.uniforms.geoDusk = state.dusk;
    shader.uniforms.geoDetail = state.detail;
    shader.vertexShader =
      paletteLighting +
      `
      attribute vec3 artGlow;
      varying vec3 geoGlow, geoLight;
      varying vec2 geoMetric, geoEdge;
      varying float geoLayer;
      uniform float geoDetail;
      #ifdef USE_INSTANCING
      attribute float artSurface;
      #endif
    ` +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
      #include <begin_vertex>
      vec4 world = vec4(position, 1.);
      vec3 surfaceNormal = normal;
      vec2 tile = floor(uv * vec2(4.,2.));
      geoLayer = tile.x + tile.y*4.;
      geoEdge = (uv*vec2(4.,2.)-tile-vec2(.025))/.95;
      #ifdef USE_INSTANCING
      world = instanceMatrix * world;
      mat3 rotationScale = mat3(instanceMatrix);
      vec3 scaleSquared = vec3(dot(rotationScale[0],rotationScale[0]),
        dot(rotationScale[1],rotationScale[1]),dot(rotationScale[2],rotationScale[2]));
      surfaceNormal = rotationScale * (surfaceNormal / max(scaleSquared, vec3(.0001)));
      geoLayer = artSurface;
      geoEdge = uv;
      #endif
      vec3 worldPoint = (modelMatrix*world).xyz;
      vec3 n = normalize(mat3(modelMatrix)*surfaceNormal);
      vec3 axis = abs(n);
      geoMetric = (axis.y>.6 ? worldPoint.xz : (axis.x>axis.z ? worldPoint.zy : worldPoint.xy))/1.8;
      vec3 sun = facadeSun();
      geoLight = facadeLight(max(0.,dot(n,sun)));
      geoGlow = artGlow * geoNight;
      if (geoLayer > 6.5 || (geoLayer > 4.5 && geoLayer < 5.5)) {
        vec3 viewDirection = normalize(cameraPosition - worldPoint);
        if (geoLayer > 6.5) {
          float facing = 1.-abs(dot(n,viewDirection));
          geoGlow += (vec3(.065,.13,.18)*facing*facing*facing + vec3(.02,.035,.045))*(1.-geoNight*.8);
        }
        if (geoDetail > .5) {
          float highlight = pow(max(0.,dot(n,normalize(sun+viewDirection))),24.);
          geoGlow += vec3(1.,.82,.54)*highlight*.24*(1.-geoNight*.7);
        }
      }
    `,
      );
    shader.fragmentShader =
      `
      uniform highp sampler2DArray geoFinish;
      uniform float geoDetail;
      varying vec3 geoGlow, geoLight;
      varying vec2 geoMetric, geoEdge;
      varying float geoLayer;
    ` +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `
      #include <color_fragment>
      vec4 finish = texture(geoFinish, vec3(geoMetric, geoLayer));
      float edge = smoothstep(0.,.08,min(min(geoEdge.x,1.-geoEdge.x),min(geoEdge.y,1.-geoEdge.y)));
      float relief = (finish.g-.5)*.16*geoDetail;
      diffuseColor.rgb = diffuseColor.rgb*geoLight*(finish.r+relief)*mix(.84,1.,edge)+geoGlow;
    `,
      );
  };
  material.customProgramCacheKey = () => "geographic-premium-packed-finish-v2";
  material.userData.finishTexture = texture;
}

/** The source shell shares the street palette through its existing vertex
 * colours. Roofs and undeveloped sides need neither a finish nor PBR pass. */
export function installGeographicMassing(
  material: T.MeshBasicMaterial,
  state: Pick<GeographicFinishState, "night" | "dusk">,
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.geoNight = state.night;
    shader.uniforms.geoDusk = state.dusk;
    shader.vertexShader =
      paletteLighting +
      shader.vertexShader.replace(
        "#include <color_vertex>",
        `
      #include <color_vertex>
      vec3 n = normalize(mat3(modelMatrix)*normal);
      vColor.rgb *= facadeLight(max(0.,dot(n,facadeSun()))) * .95;
    `,
      );
  };
  material.customProgramCacheKey = () =>
    "geographic-cohesive-source-massing-v1";
}
