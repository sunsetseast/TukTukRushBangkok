import assert from 'node:assert/strict';
import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import * as T from 'three';
import {decodeCompiledChunk} from '../src/game/bangkok/geographic/compiledBuildings';
import {prepareChinatown,geographicFacades,decorativeRoadClearance,GEO_SHOP_SIGNS} from '../src/game/bangkok/geographic/chinatownFacades';
import {CHINATOWN_SITES} from '../src/game/bangkok/geographic/chinatownSites';
import {buildChinatownDecoration,updateChinatownLOD} from '../src/game/bangkok/geographic/chinatownRendering';
import {updateChinatownLife,lifePose} from '../src/game/bangkok/geographic/chinatownLife';
import {disposeGeographicChunk} from '../src/game/bangkok/geographic/rendering';
import {chunkTransferables} from '../src/game/bangkok/geographic/chunkPreparation';
const dir=new URL('../public/assets/geography/',import.meta.url),m=JSON.parse(gunzipSync(fs.readFileSync(new URL('gameplay.v2.json.gz',dir))).toString()),records:any[]=[],ids=new Set<string>();
for(const ref of m.chunks.filter((c:any)=>['2048:0','3072:0','2048:-1024','3072:-1024'].includes(c.id))){
 const raw=gunzipSync(fs.readFileSync(new URL(`compiled/${ref.id.replace(':','_')}.bin.pack`,dir))),c=decodeCompiledChunk(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),ref),before=JSON.stringify(c.buildings),started=performance.now(),data=prepareChinatown(c)!;
 assert.equal(JSON.stringify(c.buildings),before);assert.deepEqual(data,prepareChinatown(c));assert(data.bytes<12e6);assert(data.life.length<=27);
 for(const f of data.facades){assert(!ids.has(f.id));ids.add(f.id);const b=c.buildings!.find(b=>b.id===f.buildingId)!;assert(b);assert(b.edges.some(e=>e.edge===f.edge.edge&&e.polygon===f.edge.polygon&&e.collision));assert.equal(f.height,b.height);assert.equal(f.chunk,ref.id);}
 for(const a of data.life){const x=a.x+c.origin[0],z=a.z+c.origin[1];assert(ids.has(a.sourceId));assert(decorativeRoadClearance(x,z,.68+a.travel*2,.7,a.yaw)>=.18);for(let t=0;t<20;t+=.03){const p=lifePose(a,t,{x,z});assert(Math.abs(p.along)<=a.travel+1e-9);assert(Number.isFinite(p.arm));}}
 const materials={facade:new T.MeshBasicMaterial(),windows:new T.MeshBasicMaterial(),h:new T.MeshBasicMaterial(),v:new T.MeshBasicMaterial()} as any,root=buildChinatownDecoration(data,materials);root.position.set(...[c.origin[0],0,c.origin[1]] as [number,number,number]);root.updateMatrixWorld(true);
 if(data.life.length){const a=data.life[0]!,cam=new T.Vector3(c.origin[0]+a.x,2,c.origin[1]+a.z),player={x:cam.x,z:cam.z},mesh=root.userData.life.mesh as T.InstancedMesh;
 assert.equal(updateChinatownLife(root,1,'low',cam,player),0);assert(!mesh.visible);assert.equal(updateChinatownLife(root,1,'medium',cam,player),1);assert(mesh.visible);const first=mesh.instanceMatrix.array.slice();assert.equal(updateChinatownLife(root,1.01,'medium',cam,player),0);assert.equal(updateChinatownLife(root,1.5,'medium',cam,player),1);assert.notDeepEqual(mesh.instanceMatrix.array,first);assert.equal(updateChinatownLife(root,2,'medium',cam,player,false),0);assert(!mesh.visible);assert.equal(updateChinatownLife(root,2,'medium',new T.Vector3(1e6,0,1e6),player),0);}
 let geometries=0,released=0;root.traverse(o=>{if(o instanceof T.Mesh){geometries++;o.geometry.addEventListener('dispose',()=>released++);assert([materials.facade,materials.windows,materials.h,materials.v].includes(o.material));}});disposeGeographicChunk(root);assert.equal(released,geometries);assert.equal(root.children.length,0);Object.values(materials).forEach((m:any)=>m.dispose());
 c.decoration=data;const transfers=chunkTransferables(c);assert.equal(transfers.length,new Set(transfers).size);
 records.push({chunk:ref.id,facades:data.facades.length,songwat:data.facades.filter(f=>f.style==='songwat').length,frontageMeters:data.facades.reduce((n,f)=>n+f.width,0),pieces:data.pieces,bytes:data.bytes,batches:data.batches.length,life:data.life.map(a=>({source:a.sourceId,kind:a.kind,travel:a.travel})),prepareTwiceAndTestMs:performance.now()-started});
}
assert(ids.size>=202);assert(records.reduce((n,r)=>n+r.songwat,0)>=35);for(const s of CHINATOWN_SITES){assert(ids.has(s.source),s.name+' must match an admitted source edge');if(s.real){assert(s.reference);assert.equal(s.confidence,'source-identity');}}
assert.equal(CHINATOWN_SITES.filter(s=>s.real).length,3);assert(CHINATOWN_SITES.filter(s=>!s.real).length>=8);assert.equal(new Set(CHINATOWN_SITES.map(s=>s.source)).size,CHINATOWN_SITES.length);assert.equal(GEO_SHOP_SIGNS.length,12+CHINATOWN_SITES.length);
const report={pass:true,baseline:'0c84000d896922ba512d54f4c52d90881be0f105',facades:ids.size,records};fs.mkdirSync(new URL('../../../docs/qa/yaowarat-alive/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../../../docs/qa/yaowarat-alive/source-tests.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
