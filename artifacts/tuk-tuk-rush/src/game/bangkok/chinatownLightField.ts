import * as T from "three";
import type { District } from "../types";
import type { ParcelDesign } from "./buildingGrammar";
import { planEnvironment } from "./environmentPlan";
/** Original low-resolution, world-space approximation of reflected shop light.
 * One shared opaque-material sample, no lights, reflection pass or alpha quads.
 * Generated once from the production frontages, never from camera position. */
export function chinatownLightField(
  d: District,
  designs: ParcelDesign[],
  night: { value: number },
) {
  const width = 256,
    height = 384,
    minX = -500,
    minZ = -480,
    sizeX = 780,
    sizeZ = 1360;
  const field = new Float32Array(width * height * 3);
  const source = (
    x: number,
    z: number,
    color: string,
    power: number,
    radius: number,
  ) => {
    const col = new T.Color(color),
      px = ((x - minX) / sizeX) * width,
      pz = ((z - minZ) / sizeZ) * height;
    for (
      let j = Math.max(0, Math.floor(pz - (radius / sizeZ) * height));
      j < Math.min(height, Math.ceil(pz + (radius / sizeZ) * height));
      j++
    )
      for (
        let i = Math.max(0, Math.floor(px - (radius / sizeX) * width));
        i < Math.min(width, Math.ceil(px + (radius / sizeX) * width));
        i++
      ) {
        const dist =
          Math.hypot(
            ((i + 0.5 - px) / width) * sizeX,
            ((j + 0.5 - pz) / height) * sizeZ,
          ) / radius;
        if (dist >= 1) continue;
        const w = power * Math.pow(1 - dist * dist, 2),
          at = (j * width + i) * 3;
        field[at]! += col.r * w;
        field[at + 1]! += col.g * w;
        field[at + 2]! += col.b * w;
      }
  };
  for (const p of designs) {
    const b = p.parcel,
      ct = b.chinatown;
    if (!ct || ct.role) continue;
    const a = p.bays[0]!;
    if (["residence", "closed"].includes(a.trade)) continue;
    const c = Math.cos(b.yaw ?? 0),
      s = Math.sin(b.yaw ?? 0),
      yao = ct.character === "yaowarat",
      quiet = ["songwat", "talatnoi"].includes(ct.character);
    const color =
      a.trade === "gold"
        ? "#ffc365"
        : a.trade === "tea" && yao
          ? "#e881bb"
          : a.trade === "noodle" && a.seed % 3 === 0
            ? "#54cbb6"
            : "#efbc82";
    source(
      b.x + s * (b.d / 2 + 0.3),
      b.z + c * (b.d / 2 + 0.3),
      color,
      quiet ? 0.26 : yao ? 0.72 : 0.44,
      quiet ? 9 : 18,
    );
  }
  for (const site of planEnvironment(d))
    if (
      site.region === "chinatown" &&
      ["noodle", "grill", "wok", "dessert", "tea", "fruit"].includes(site.kind)
    )
      source(site.body.x, site.body.z, "#ffc678", 0.8, 7);
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    for (let k = 0; k < 3; k++)
      data[i * 4 + k] = Math.round(Math.min(1, field[i * 3 + k]!) * 255);
    data[i * 4 + 3] = 255;
  }
  const texture = new T.DataTexture(data, width, height);
  texture.name = "Original Chinatown reflected shop light";
  texture.magFilter = texture.minFilter = T.LinearFilter;
  texture.flipY = false;
  texture.needsUpdate = true;
  const install = (mat: T.MeshStandardMaterial) => {
    const old = mat.onBeforeCompile,
      key = mat.customProgramCacheKey();
    // Direct texture ownership is understood by the existing disposal/inventory.
    (
      mat as T.MeshStandardMaterial & { chinatownLightMap: T.Texture }
    ).chinatownLightMap = texture;
    mat.onBeforeCompile = (shader, renderer) => {
      old(shader, renderer);
      shader.uniforms.chinatownField = { value: texture };
      shader.uniforms.chinatownFieldNight = night;
      shader.vertexShader =
        "varying vec3 chinatownWorld;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
    vec4 ctWorld=vec4(transformed,1.);
    #ifdef USE_INSTANCING
    ctWorld=instanceMatrix*ctWorld;
    #endif
    chinatownWorld=(modelMatrix*ctWorld).xyz;`,
        );
      shader.fragmentShader =
        "uniform sampler2D chinatownField;uniform float chinatownFieldNight;varying vec3 chinatownWorld;\n" +
        shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
    vec2 ctUV=(chinatownWorld.xz-vec2(${minX}.,${minZ}.))/vec2(${sizeX}.,${sizeZ}.);
    float ctBounds=step(0.,ctUV.x)*step(ctUV.x,1.)*step(0.,ctUV.y)*step(ctUV.y,1.);
    vec3 ctLight=texture2D(chinatownField,ctUV).rgb*ctBounds;
    float ctHeight=1.-smoothstep(.5,7.,chinatownWorld.y);
    totalEmissiveRadiance+=ctLight*chinatownFieldNight*ctHeight*(vec3(.075)+diffuseColor.rgb*.30);`,
        );
    };
    mat.customProgramCacheKey = () => key + "-chinatown-world-light-v1";
  };
  return { texture, install };
}
