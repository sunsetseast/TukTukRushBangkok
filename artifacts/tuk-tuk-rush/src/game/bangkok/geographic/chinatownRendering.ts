import * as T from 'three';
import {facadeFinishes,installFacadeFinish} from '../facadeFinish';
import {installShopLight} from '../shopLighting';
import {buildSignAtlas} from '../../signArt';
import {GEO_SHOP_SIGNS,type ChinatownDecoration} from './chinatownFacades';
export function chinatownMaterials(){
 const finishes=facadeFinishes(),atlas=buildSignAtlas(GEO_SHOP_SIGNS,true),night={value:0};
 const facade=new T.MeshStandardMaterial({map:finishes.albedo,roughnessMap:finishes.pbr,metalnessMap:finishes.pbr,normalMap:finishes.normal,normalScale:new T.Vector2(.28,.28),roughness:1,metalness:1,vertexColors:true});
 installFacadeFinish(facade);installShopLight(facade,night);
 const windows=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,emissive:'#ffffff',emissiveIntensity:0,roughness:.6});
 windows.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance*=vColor.rgb;\n#endif');};
 windows.customProgramCacheKey=()=> 'geographic-occupied-windows-v1';
 const h=new T.MeshStandardMaterial({map:atlas.h.tex,emissiveMap:atlas.h.tex,emissive:'#ffffff',emissiveIntensity:.1,roughness:.65}),v=h.clone();v.map=atlas.v.tex;v.emissiveMap=atlas.v.tex;
 return {facade,windows,h,v,night,setNight(value:number){night.value=value;windows.emissiveIntensity=value*1.15;h.emissiveIntensity=.12+value*.95;v.emissiveIntensity=.12+value*1.1;},dispose(){for(const m of [facade,windows,h,v])m.dispose();for(const t of [...Object.values(finishes),atlas.h.tex,atlas.v.tex])t.dispose();}};
}
export type ChinatownMaterials=ReturnType<typeof chinatownMaterials>;
export function buildChinatownDecoration(data:ChinatownDecoration,materials:ChinatownMaterials){
 const root=new T.Group();root.name='GeographicChinatown';root.userData={facadeIds:data.facades.map(f=>f.id),bytes:data.bytes,pieces:data.pieces,facades:data.facades};
 for(const b of data.batches){
  const g=new T.BufferGeometry();for(const [name,a] of Object.entries(b.attributes))g.setAttribute(name,a.instanced?new T.InstancedBufferAttribute(a.array,a.size,a.normalized):new T.BufferAttribute(a.array,a.size,a.normalized));
  if(b.index)g.setIndex(new T.BufferAttribute(b.index,1));
  const material=b.sign?materials[b.sign]:b.layer==='BangkokNight'?materials.windows:materials.facade;
  let mesh:T.Mesh;
  if(b.matrices){const m=new T.InstancedMesh(g,material,b.count!);m.instanceMatrix.array.set(b.matrices);if(b.colors)m.instanceColor=new T.InstancedBufferAttribute(b.colors,3,true);m.computeBoundingSphere();mesh=m;}
  else {g.computeBoundingSphere();mesh=new T.Mesh(g,material);}
  mesh.name=b.layer;mesh.userData={chinatown:true,layer:b.layer,center:b.center};root.add(mesh);
 }
 return root;
}
const point=new T.Vector3();
export function updateChinatownLOD(root:T.Group,camera:T.Vector3,quality:'low'|'medium'){
 root.traverse(o=>{if(!(o instanceof T.Mesh)||!o.userData.chinatown)return;const center=o.userData.center as number[];root.getWorldPosition(point);const d=Math.hypot(camera.x-point.x-center[0]!,camera.z-point.z-center[2]!);const layer=o.userData.layer;
  o.visible=layer==='BangkokDetail'?quality==='medium'&&d<72:layer==='BangkokFacade'?d<(quality==='low'?90:135):layer==='BangkokNight'?d<(quality==='low'?130:190):d<(quality==='low'?190:260);
 });
}
