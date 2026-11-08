import * as T from 'three';
import plan from './chinatownLightSources.generated.json';
/** One immutable world-space field generated from admitted source frontages.
 * Every chunk samples identical coordinates, including beyond its boundaries.
 * Scene-owned, independent of residency/order/worker cancellation. */
export const COMMERCIAL_FIELD={minX:2000,minZ:-220,sizeX:2000,sizeZ:1400,width:384,height:256} as const;
export function geographicCommercialField(){
 const a=COMMERCIAL_FIELD,linear=new Float32Array(a.width*a.height*3);
 for(const source of plan.sources){
  const radius=source.quiet?8:13,power=source.quiet?.28:.58;
  const color=new T.Color(source.trade===0?'#ffbd56':source.trade===2?'#70c9ba':'#ffd29a');
  const px=(source.x-a.minX)/a.sizeX*a.width,pz=(source.z-a.minZ)/a.sizeZ*a.height;
  const rx=radius/a.sizeX*a.width,rz=radius/a.sizeZ*a.height;
  for(let j=Math.max(0,Math.floor(pz-rz));j<=Math.min(a.height-1,Math.ceil(pz+rz));j++)for(let i=Math.max(0,Math.floor(px-rx));i<=Math.min(a.width-1,Math.ceil(px+rx));i++){
   const dx=(i+.5-px)/a.width*a.sizeX,dz=(j+.5-pz)/a.height*a.sizeZ;
   const along=dx*source.nz-dz*source.nx,front=dx*source.nx+dz*source.nz;
   // Elliptical pools follow actual frontage widths; no uniformly glowing street.
   const distance=Math.hypot(along/Math.min(15,source.width*.5+3),front/radius);
   if(distance>=1||front< -3)continue;const v=power*(1-distance*distance)**2,at=(j*a.width+i)*3;
   linear[at]!+=color.r*v;linear[at+1]!+=color.g*v;linear[at+2]!+=color.b*v;
  }
 }
 const data=new Uint8Array(a.width*a.height*4);for(let i=0;i<a.width*a.height;i++){for(let k=0;k<3;k++)data[i*4+k]=Math.round(Math.min(1,linear[i*3+k]!)*255);data[i*4+3]=255;}
 const texture=new T.DataTexture(data,a.width,a.height);texture.name='Source-backed geographic commercial bounce';texture.minFilter=texture.magFilter=T.LinearFilter;texture.needsUpdate=true;return texture;
}
export function installGeographicCommercialLight(material:T.MeshBasicMaterial|T.MeshStandardMaterial,texture:T.DataTexture,night:{value:number},basic=false){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,renderer)=>{
  previous(shader,renderer);shader.uniforms.geoLightField={value:texture};shader.uniforms.geoFieldNight=night;
  shader.vertexShader='varying vec3 geoLightWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec4 geoLW=vec4(position,1.);
   #ifdef USE_INSTANCING
   geoLW=instanceMatrix*geoLW;
   #endif
   geoLightWorld=(modelMatrix*geoLW).xyz;`);
  shader.fragmentShader='uniform sampler2D geoLightField;uniform float geoFieldNight;varying vec3 geoLightWorld;\n'+shader.fragmentShader.replace(basic?'#include <opaque_fragment>':'#include <emissivemap_fragment>',`${basic?'':'#include <emissivemap_fragment>'}
   vec2 fieldUV=(geoLightWorld.xz-vec2(${COMMERCIAL_FIELD.minX}.,${COMMERCIAL_FIELD.minZ}.))/vec2(${COMMERCIAL_FIELD.sizeX}.,${COMMERCIAL_FIELD.sizeZ}.);
   float inside=step(0.,fieldUV.x)*step(fieldUV.x,1.)*step(0.,fieldUV.y)*step(fieldUV.y,1.);
   vec3 pool=texture2D(geoLightField,fieldUV).rgb*inside*geoFieldNight;
   float heightFall=exp(-max(0.,geoLightWorld.y-.25)*.22);
   ${basic?'outgoingLight+=pool*heightFall*.48;':'totalEmissiveRadiance+=pool*heightFall*.24;'}
   ${basic?'#include <opaque_fragment>':''}
  `);
 };
 material.customProgramCacheKey=()=>key+'-source-field-v1';material.userData.commercialTexture=texture;
}
