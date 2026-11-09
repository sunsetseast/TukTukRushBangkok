/** Reuses only pinned, admitted source frontages; never imports or changes geography. */
import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {decodeCompiledChunk} from '../src/game/bangkok/geographic/compiledBuildings';
import {geographicFacades,facadeTrade} from '../src/game/bangkok/geographic/chinatownFacades';
const dir=new URL('../public/assets/geography/',import.meta.url),meta=JSON.parse(gunzipSync(fs.readFileSync(new URL('gameplay.v2.json.gz',dir))).toString());
const sources=meta.chunks.filter((c:any)=>['2048:0','3072:0','2048:-1024','3072:-1024'].includes(c.id)).flatMap((ref:any)=>{
 const b=gunzipSync(fs.readFileSync(new URL(`compiled/${ref.id.replace(':','_')}.bin.pack`,dir)));const c=decodeCompiledChunk(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),ref);
 return geographicFacades(c).map(f=>({id:f.id,x:f.x+f.nx*2,z:f.z+f.nz*2,nx:f.nx,nz:f.nz,width:f.width,trade:facadeTrade(f),quiet:f.style==='songwat'}));
});
fs.writeFileSync(new URL('../src/game/bangkok/geographic/chinatownLightSources.generated.json',import.meta.url),JSON.stringify({sourceSha256:meta.sourceSha256,sources})+'\n');console.log({sources:sources.length});
