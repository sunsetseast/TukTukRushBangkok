import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {decodeCompiledChunk} from '../src/game/bangkok/geographic/compiledBuildings';
import {geographicFacades,prepareChinatown,GEO_SHOP_SIGNS} from '../src/game/bangkok/geographic/chinatownFacades';
const dir=new URL('../public/assets/geography/',import.meta.url),m=JSON.parse(gunzipSync(fs.readFileSync(new URL('gameplay.v2.json.gz',dir))).toString());
const records=[];let total=0,song=0;const ids=new Set<string>();
for(const ref of m.chunks.filter((c:any)=>['2048:0','3072:0'].includes(c.id))){const raw=gunzipSync(fs.readFileSync(new URL(`compiled/${ref.id.replace(':','_')}.bin.pack`,dir)));const c=decodeCompiledChunk(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),ref);
 const original=JSON.stringify(c.buildings),f=geographicFacades(c),t=performance.now(),d=prepareChinatown(c)!;
 assert.equal(JSON.stringify(c.buildings),original,'Decorative grammar never changes source edges/collision flags');
 assert.deepEqual(f,geographicFacades(c),'Stable source identity and deterministic selection');assert.deepEqual(d,prepareChinatown(c),'Deterministic variation and buffers');
 for(const facade of f){assert(!ids.has(facade.id));ids.add(facade.id);assert.equal(facade.chunk,ref.id);assert(Math.abs(Math.hypot(facade.nx,facade.nz)-1)<1e-9);assert(facade.outset>=.1);assert(facade.edge.street===facade.street);assert(facade.width>=3.2);if(facade.style==='songwat')song++;}
 assert(d.pieces<=14000);assert(d.bytes<12e6);for(const b of d.batches)for(const a of Object.values(b.attributes))assert([...a.array].every(Number.isFinite));
 records.push({id:ref.id,facades:f.length,songwat:f.filter(a=>a.style==='songwat').length,pieces:d.pieces,bytes:d.bytes,batches:d.batches.length,prepareMs:performance.now()-t,first:f.slice(0,8)});total+=f.length;
}
assert(total>=30,'A coherent corridor, not isolated decorative sites');assert(song>=5,'A distinct historic block');assert(GEO_SHOP_SIGNS.length>=8);assert(GEO_SHOP_SIGNS.every(s=>s.text&&s.secondary));
const report={pass:true,total,songwat:song,signTypes:GEO_SHOP_SIGNS.length,sourceUnchanged:true,records};fs.mkdirSync(new URL('../../../docs/qa/geographic-chinatown/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../../../docs/qa/geographic-chinatown/facade-tests.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,records:records.map(r=>({...r,first:r.first.slice(0,2)}))},null,2));
