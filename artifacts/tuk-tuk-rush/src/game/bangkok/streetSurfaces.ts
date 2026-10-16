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
      "varying vec2 roadWorld; varying float roadTone;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nroadWorld=(modelMatrix*vec4(position,1.)).xz;roadTone=mix(.93,1.05,smoothstep(.35,.65,.5+.5*sin(roadWorld.x*.032+sin(roadWorld.y*.051))));",
      );
    shader.fragmentShader =
      "varying vec2 roadWorld; varying float roadTone;\n" +
      shader.fragmentShader.replace(
        "#include <map_fragment>",
        `diffuseColor*=texture2D(map,roadWorld*.24);
   diffuseColor.rgb*=roadTone;`,
      );
  };
  mat.customProgramCacheKey = () => "bangkok-dry-asphalt-v2";
  return mat;
}
/** Quiet poured concrete: fine aggregate and broad wear, not a city-wide tile grid. */
export function pavingMaterial() {
  const mat = new T.MeshStandardMaterial({ color: "#dfd2b6", roughness: 0.96 });
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
    vec3 hash=fract(vec3(floor(pavingWorld*7.).xyx)*.1031);hash+=dot(hash,hash.yzx+33.33);float grain=fract((hash.x+hash.y)*hash.z);diffuseColor.rgb*=.97+grain*.035;`,
      );
  };
  mat.customProgramCacheKey = () => "bangkok-quiet-concrete-v2";
  return mat;
}

/** Soft ground color variation reads as landscaped land beyond the built plots. */
export function landscapeMaterial() {
  const size=64,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,v=Math.sin(x*.19)*Math.cos(y*.15)*8;
    pixels[i]=122+v;pixels[i+1]=155+v;pixels[i+2]=93+v*.6;pixels[i+3]=255;
  }
  const texture=new T.DataTexture(pixels,size,size);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(1/32,1/32);texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.needsUpdate=true;
  return new T.MeshStandardMaterial({map:texture,color:'#dfecba',roughness:1});
}
