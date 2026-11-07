import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import {decodeCompiledChunk} from '../src/game/bangkok/geographic/compiledBuildings';import {geographicFacades} from '../src/game/bangkok/geographic/chinatownFacades';import {CHINATOWN_SITES} from '../src/game/bangkok/geographic/chinatownSites';import {metersToGeographic} from '../src/game/bangkok/geographic/projection';import area from '../src/game/bangkok/geographic/chinatownArea.generated.json';
const dir=new URL('../public/assets/geography/',import.meta.url),m=JSON.parse(gunzipSync(fs.readFileSync(new URL('gameplay.v2.json.gz',dir))).toString()),all=m.chunks.filter((r:any)=>['3072:0','2048:0','2048:-1024','3072:-1024'].includes(r.id)).flatMap((r:any)=>{const b=gunzipSync(fs.readFileSync(new URL(`compiled/${r.id.replace(':','_')}.bin.pack`,dir)));return geographicFacades(decodeCompiledChunk(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),r));});
const fixtures=JSON.parse(fs.readFileSync(new URL('./geographic-chinatown-views.json',import.meta.url),'utf8'));
for(const id of ['tang-to-kang','grand-china','chinatown-hotel','wok-house','western-tea','songwat-merchant','songwat-cafe']){
 const s=CHINATOWN_SITES.find(s=>s.id===id)!,f=all.find(f=>f.id===s.source)!;
 const road=area.segments.filter(r=>r.id===f.street).map(r=>{const dx=r.b[0]!-r.a[0]!,dz=r.b[1]!-r.a[1]!,t=Math.max(0,Math.min(1,((f.x-r.a[0]!)*dx+(f.z-r.a[1]!)*dz)/(dx*dx+dz*dz))),x=r.a[0]!+t*dx,z=r.a[1]!+t*dz;return{x,z,d:Math.hypot(x-f.x,z-f.z)};}).sort((a,b)=>a.d-b.d)[0]!;
 fixtures.push({name:`${fixtures.length+1}-${id}`,time:id.includes('songwat')||id==='tang-to-kang'?'day':'night',quality:'medium',source:f.id,style:f.style,...metersToGeographic(road),heading:Math.atan2(f.nz,-f.nx),camera:[road.x-f.nz*3,2.2,road.z+f.nx*3],target:[f.x,3.1,f.z]});
 if(id==='wok-house')fixtures.push({...fixtures.at(-1),name:'vendor-frame-b',animationDelay:800});
}
fixtures.push({...fixtures[0],name:'20-wide-continuity',camera:[3180,65,490],target:[3300,0,600]});
fs.writeFileSync(new URL('./yaowarat-alive-views.json',import.meta.url),JSON.stringify(fixtures,null,2)+'\n');
