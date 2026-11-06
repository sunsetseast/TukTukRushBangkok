import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import * as T from 'three';
import {buildChinatownDecoration,updateChinatownLOD} from '../src/game/bangkok/geographic/chinatownRendering';
import {disposeGeographicChunk} from '../src/game/bangkok/geographic/rendering';
import area from '../src/game/bangkok/geographic/chinatownArea.generated.json';
import {decodeCompiledChunk} from '../src/game/bangkok/geographic/compiledBuildings';
import {geographicFacades,prepareChinatown,GEO_SHOP_SIGNS,roadClearance} from '../src/game/bangkok/geographic/chinatownFacades';
const dir=new URL('../public/assets/geography/',import.meta.url),m=JSON.parse(gunzipSync(fs.readFileSync(new URL('gameplay.v2.json.gz',dir))).toString());
assert.equal(area.sourceSha256,createHash('sha256').update(fs.readFileSync(new URL('runtime.v1.json.gz',dir))).digest('hex'));
const records=[];let total=0,song=0;const ids=new Set<string>();
for(const ref of m.chunks.filter((c:any)=>['2048:0','3072:0'].includes(c.id))){const raw=gunzipSync(fs.readFileSync(new URL(`compiled/${ref.id.replace(':','_')}.bin.pack`,dir)));const c=decodeCompiledChunk(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),ref);
 const original=JSON.stringify(c.buildings),f=geographicFacades(c),t=performance.now(),d=prepareChinatown(c)!;
 assert.equal(JSON.stringify(c.buildings),original,'Decorative grammar never changes source edges/collision flags');
 assert.deepEqual(f,geographicFacades(c),'Stable source identity and deterministic selection');assert.deepEqual(d,prepareChinatown(c),'Deterministic variation and buffers');
 for(const facade of f){assert(!ids.has(facade.id));ids.add(facade.id);assert.equal(facade.chunk,ref.id);assert(Math.abs(Math.hypot(facade.nx,facade.nz)-1)<1e-9);assert(facade.outset>=.1);assert(area.segments.some(s=>s.id===facade.street&&area.streets.includes(s.name)));assert(facade.width>=3.2);if(facade.style==='songwat')song++;}
 for(const prop of d.props){assert(roadClearance(prop.x,prop.z)>=Math.hypot(prop.w,prop.d)/2,'Solid decorations remain clear of source road envelopes');assert(prop.sourceId?.startsWith('decor:'));}assert(d.props.length<=128);
 assert(d.pieces<=20000);assert(d.bytes<12e6);for(const b of d.batches){for(const a of Object.values(b.attributes)){assert([...a.array].every(Number.isFinite));if(!a.instanced)assert.equal(a.array.length/(a.stride??a.size),b.attributes.position!.array.length/3,'Packed interleaved attributes retain vertex counts');}const normal=b.attributes.normal;if(normal?.stride)assert.equal(normal.stride,4,'Compacted normals require the original four-byte stride');}
 const material=new T.MeshLambertMaterial(),root=buildChinatownDecoration(d,{facade:material,windows:material,h:material,v:material} as any);
 for(let i=0;i<d.batches.length;i++){const b=d.batches[i]!,mesh=root.children[i] as T.Mesh;for(const [name,raw]of Object.entries(b.attributes)){const decoded=mesh.geometry.getAttribute(name);assert.equal(decoded.count,raw.array.length/(raw.stride??raw.size));assert.equal(decoded.normalized,raw.normalized);}if(b.matrices)assert(mesh instanceof T.InstancedMesh);}
 updateChinatownLOD(root,new T.Vector3(50000,0,50000),'medium');assert(root.children.every(c=>!c.visible),'Far decoration is culled');
 for(const child of root.children){const c=child.userData.center;updateChinatownLOD(root,new T.Vector3(c[0],0,c[2]),'low');if(child.name==='BangkokDetail')assert(!child.visible);updateChinatownLOD(root,new T.Vector3(c[0],0,c[2]),'medium');assert(child.visible);}
 let released=0;root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.addEventListener('dispose',()=>released++);});const owned=root.children.length;disposeGeographicChunk(root);assert.equal(released,owned);assert.equal(root.children.length,0);material.dispose();
 records.push({id:ref.id,facades:f.length,songwat:f.filter(a=>a.style==='songwat').length,pieces:d.pieces,bytes:d.bytes,batches:d.batches.length,prepareMs:performance.now()-t,first:f.slice(0,8)});total+=f.length;
}
assert(total>=30,'A coherent corridor, not isolated decorative sites');assert(song>=5,'A distinct historic block');assert(GEO_SHOP_SIGNS.length>=8);assert(GEO_SHOP_SIGNS.every(s=>s.text&&s.secondary));
const report={pass:true,total,songwat:song,signTypes:GEO_SHOP_SIGNS.length,sourceUnchanged:true,records};fs.mkdirSync(new URL('../../../docs/qa/geographic-chinatown/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../../../docs/qa/geographic-chinatown/facade-tests.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,records:records.map(r=>({...r,first:r.first.slice(0,2)}))},null,2));
