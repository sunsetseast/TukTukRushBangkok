import * as T from "three";
/** Original tiny asphalt pattern, mapped at consistent world scale. */
export function asphaltMaterial() {
  const pixels = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0,
        n = hash % 10,
        patch = x > 35 && x < 69 && y > 41 && y < 70 ? 4 : 0,
        crack = Math.abs(x - ((y * 3 + 11) % 128)) < 1 && y % 32 < 12 ? -8 : 0,
        v = 56 + n + patch + crack,
        i = (y * 128 + x) * 4;
      pixels[i] = v;
      pixels[i + 1] = v + 7;
      pixels[i + 2] = v + 10;
      pixels[i + 3] = 255;
    }
  const texture = new T.DataTexture(pixels, 128, 128);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.needsUpdate = true;
  const mat = new T.MeshStandardMaterial({
    map: texture,
    color: "#c3c9c1",
    roughness: 0.95,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec2 roadWorld;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nroadWorld=(modelMatrix*vec4(position,1.)).xz*.12;",
      );
    shader.fragmentShader =
      "varying vec2 roadWorld;\n" +
      shader.fragmentShader.replace(
        "#include <map_fragment>",
        "diffuseColor *= texture2D(map,roadWorld);",
      );
  };
  mat.customProgramCacheKey = () => "living-asphalt-v1";
  return mat;
}
