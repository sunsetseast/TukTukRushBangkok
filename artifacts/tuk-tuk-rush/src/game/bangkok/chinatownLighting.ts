import type * as T from "three";
/** Per-piece colored shop bounce stays in the existing opaque architectural
 * batches. Zero lights, texture requests, transparent overlays or frame work. */
export function installChinatownLight(
  material: T.MeshStandardMaterial,
  night: { value: number },
) {
  const finish = material.onBeforeCompile,
    key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    finish(shader, renderer);
    shader.uniforms.chinatownNight = night;
    shader.vertexShader =
      "attribute vec3 artGlow; varying vec3 shopEmission;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nshopEmission=artGlow;",
      );
    shader.fragmentShader =
      "uniform float chinatownNight; varying vec3 shopEmission;\n" +
      shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance+=shopEmission*(.06+chinatownNight*2.15);",
      );
  };
  material.customProgramCacheKey = () => key + "-chinatown-piece-light-v1";
}
