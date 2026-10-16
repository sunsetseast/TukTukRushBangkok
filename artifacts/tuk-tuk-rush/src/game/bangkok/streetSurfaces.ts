import * as T from "three";
/** Original dry aggregate; world scale and mipmaps prevent grain shimmering. */
export function asphaltMaterial() {
  const size = 256,
    pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const hash =
        (Math.imul(x + 7, 73856093) ^ Math.imul(y + 11, 19349663)) >>> 0;
      const cloud =
          Math.sin(x * 0.026 + Math.sin(y * 0.041)) * Math.cos(y * 0.032),
        v = 64 + (hash % 13) + cloud * 3,
        i = (y * size + x) * 4;
      pixels[i] = v;
      pixels[i + 1] = v + 4;
      pixels[i + 2] = v + 6;
      pixels[i + 3] = 255;
    }
  const texture = new T.DataTexture(pixels, size, size);
  texture.name = "Dry asphalt aggregate";
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.anisotropy = 2;
  texture.needsUpdate = true;
  const mat = new T.MeshStandardMaterial({
    map: texture,
    color: "#aab4b8",
    roughness: 0.96,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec2 roadWorld;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nroadWorld=(modelMatrix*vec4(position,1.)).xz;",
      );
    shader.fragmentShader =
      "varying vec2 roadWorld;\n" +
      shader.fragmentShader.replace(
        "#include <map_fragment>",
        `diffuseColor*=texture2D(map,roadWorld*.24);
   float resurfacing=.5+.5*sin(roadWorld.x*.032+sin(roadWorld.y*.051));diffuseColor.rgb*=mix(.93,1.05,smoothstep(.35,.65,resurfacing));`,
      );
  };
  mat.customProgramCacheKey = () => "bangkok-dry-asphalt-v2";
  return mat;
}
/** Derivative-antialiased scored concrete, without thousands of paving meshes. */
export function pavingMaterial() {
  const mat = new T.MeshStandardMaterial({ color: "#b4b4a6", roughness: 0.93 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec2 pavingWorld;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\npavingWorld=(modelMatrix*vec4(position,1.)).xz;",
      );
    shader.fragmentShader =
      "varying vec2 pavingWorld;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
    vec2 cell=pavingWorld*1.15;vec2 seam=min(fract(cell),1.-fract(cell));vec2 aa=max(fwidth(cell),vec2(.001));vec2 grout=smoothstep(vec2(.016),vec2(.016)+aa,seam);float tile=fract(sin(dot(floor(cell),vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=mix(.76,.96+tile*.07,min(grout.x,grout.y));`,
      );
  };
  mat.customProgramCacheKey = () => "bangkok-scored-paving-v1";
  return mat;
}
