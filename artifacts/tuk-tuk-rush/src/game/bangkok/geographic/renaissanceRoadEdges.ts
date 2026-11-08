import area from './chinatownArea.generated.json';import type {GeographicChunkData} from './dataset';import type {ArchitecturalBatch} from '../architecturalBatch';
/** White pavement-edge paint only. No guessed lane divisions, turns, stop bars
 * or directions. Source carriageway widths/geometry and traffic remain exact.
 * Intersection mouths are left open; each span has one source-chunk owner. */
export function emitRenaissanceRoadEdges(chunk:GeographicChunkData,batch:ArchitecturalBatch){
 const degree=new Map<string,number>(),key=(p:number[])=>p.map(v=>v.toFixed(3)).join(':');
 for(const s of area.segments){for(const p of [s.a,s.b])degree.set(key(p),(degree.get(key(p))??0)+1);}
 for(const s of area.segments){if(s.name!=='Yaowarat Road'||s.bridge)continue;
  const dx=s.b[0]!-s.a[0]!,dz=s.b[1]!-s.a[1]!,l=Math.hypot(dx,dz),cx=(s.a[0]!+s.b[0]!)/2,cz=(s.a[1]!+s.b[1]!)/2;
  if(Math.floor(cx/1024)*1024!==chunk.origin[0]||Math.floor(cz/1024)*1024!==chunk.origin[1])continue;
  const a=(degree.get(key(s.a))??0)>2?Math.min(9,s.width*.6):.25,b=(degree.get(key(s.b))??0)>2?Math.min(9,s.width*.6):.25,length=l-a-b;if(length<2)continue;
  const mx=s.a[0]!+dx*(a+length/2)/l,mz=s.a[1]!+dz*(a+length/2)/l;
  for(const side of [-1,1])batch.add({x:mx+side*dz/l*(s.width/2-.2)-chunk.origin[0],z:mz-side*dx/l*(s.width/2-.2)-chunk.origin[1],y:.122,w:.10,h:length,d:.01,pitch:-Math.PI/2,yaw:Math.atan2(dx,dz),color:'#b9beb0',surface:'concrete',shape:'panel',layer:'core'});
 }
}
