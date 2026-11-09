import * as T from "three";
import plan from "./chinatownLightSources.generated.json";
/** One immutable world-space field generated from admitted source frontages.
 * Every chunk samples identical coordinates, including beyond its boundaries.
 * Scene-owned, independent of residency/order/worker cancellation. */
export const COMMERCIAL_FIELD = {
  minX: 2000,
  minZ: -220,
  sizeX: 2000,
  sizeZ: 1400,
  width: 384,
  height: 256,
} as const;
export function geographicCommercialField() {
  const a = COMMERCIAL_FIELD,
    linear = new Float32Array(a.width * a.height * 3);
  for (const source of plan.sources) {
    const radius = source.quiet ? 8 : 13,
      power = source.quiet ? 0.28 : 0.58;
    const color = new T.Color(
      source.trade === 0
        ? "#ffbd56"
        : source.trade === 2
          ? "#70c9ba"
          : "#ffd29a",
    );
    const px = ((source.x - a.minX) / a.sizeX) * a.width,
      pz = ((source.z - a.minZ) / a.sizeZ) * a.height;
    const rx = (radius / a.sizeX) * a.width,
      rz = (radius / a.sizeZ) * a.height;
    for (
      let j = Math.max(0, Math.floor(pz - rz));
      j <= Math.min(a.height - 1, Math.ceil(pz + rz));
      j++
    )
      for (
        let i = Math.max(0, Math.floor(px - rx));
        i <= Math.min(a.width - 1, Math.ceil(px + rx));
        i++
      ) {
        const dx = ((i + 0.5 - px) / a.width) * a.sizeX,
          dz = ((j + 0.5 - pz) / a.height) * a.sizeZ;
        const along = dx * source.nz - dz * source.nx,
          front = dx * source.nx + dz * source.nz;
        // Elliptical pools follow actual frontage widths; no uniformly glowing street.
        const distance = Math.hypot(
          along / Math.min(15, source.width * 0.5 + 3),
          front / radius,
        );
        if (distance >= 1 || front < -3) continue;
        const v = power * (1 - distance * distance) ** 2,
          at = (j * a.width + i) * 3;
        linear[at]! += color.r * v;
        linear[at + 1]! += color.g * v;
        linear[at + 2]! += color.b * v;
      }
  }
  const data = new Uint8Array(a.width * a.height * 4);
  for (let i = 0; i < a.width * a.height; i++) {
    for (let k = 0; k < 3; k++)
      data[i * 4 + k] = Math.round(Math.min(1, linear[i * 3 + k]!) * 255);
    data[i * 4 + 3] = 255;
  }
  const texture = new T.DataTexture(data, a.width, a.height);
  texture.name = "Source-backed geographic commercial bounce";
  texture.minFilter = texture.magFilter = T.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Local shop pools use world-space sampling. Facades use vertex sampling
 * because their lit shop interiors already carry per-piece emission. The road
 * and land retain smooth pools across larger source triangles. */
export function installGeographicCommercialLight(
  material: T.MeshBasicMaterial,
  texture: T.DataTexture,
  night: { value: number },
  sampleAtVertices = false,
) {
  const previous = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  const uniforms = `
    uniform sampler2D geoLightField;
    uniform float geoFieldNight;
    vec3 commercialPool(vec3 world) {
      vec2 uv = (world.xz-vec2(${COMMERCIAL_FIELD.minX}.,${COMMERCIAL_FIELD.minZ}.))
        /vec2(${COMMERCIAL_FIELD.sizeX}.,${COMMERCIAL_FIELD.sizeZ}.);
      if (geoFieldNight < .001 || any(lessThan(uv,vec2(0.))) || any(greaterThan(uv,vec2(1.)))) return vec3(0.);
      float height = max(0.,world.y-.25)*.24;
      return texture2D(geoLightField,uv).rgb * (geoFieldNight/(1.+height*height));
    }
  `;
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    shader.uniforms.geoLightField = { value: texture };
    shader.uniforms.geoFieldNight = night;
    shader.vertexShader =
      (sampleAtVertices ? uniforms : "") +
      "varying vec3 geoFieldValue;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        vec4 positionOnStreet = vec4(position,1.);
        #ifdef USE_INSTANCING
        positionOnStreet = instanceMatrix * positionOnStreet;
        #endif
        vec3 geoWorldPoint = (modelMatrix * positionOnStreet).xyz;
        geoFieldValue = ${sampleAtVertices ? "commercialPool(geoWorldPoint)" : "geoWorldPoint"};
      `,
      );
    shader.fragmentShader =
      (sampleAtVertices ? "" : uniforms) +
      "varying vec3 geoFieldValue;\n" +
      shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `
        outgoingLight += ${sampleAtVertices ? "geoFieldValue * .16" : "commercialPool(geoFieldValue) * .24"};
        #include <opaque_fragment>
      `,
      );
  };
  material.customProgramCacheKey = () =>
    key + (sampleAtVertices ? "-vertex-shop-field" : "-pixel-shop-field");
  material.userData.commercialTexture = texture;
}
