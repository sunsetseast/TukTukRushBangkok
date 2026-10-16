import type * as T from "three";
/** Restrained occupied-shop bounce: one varying/uniform, no point lights or screen pass. */
export function installShopLight(
  material: T.MeshStandardMaterial,
  night: { value: number },
) {
  const finish = material.onBeforeCompile,
    key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    finish(shader, renderer);
    shader.uniforms.shopNight = night;
    shader.vertexShader =
      "varying float shopWash;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
   vec4 washPosition=vec4(transformed,1.);
   #ifdef USE_INSTANCING
   washPosition=instanceMatrix*washPosition;
   #endif
   washPosition=modelMatrix*washPosition;
   shopWash=clamp(1.-max(0.,washPosition.y-1.)*.15,0.,1.)*mix(1.,.4,abs(normal.y));`,
      );
    shader.fragmentShader =
      "varying float shopWash;uniform float shopNight;\n" +
      shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
   totalEmissiveRadiance+=diffuseColor.rgb*vec3(.62,.24,.075)*shopWash*shopNight;`,
      );
  };
  material.customProgramCacheKey = () => key + "-occupied-shop-bounce-v1";
}
