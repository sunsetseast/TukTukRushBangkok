import type {GeographicChunkData} from './dataset';
import type {Facade} from './chinatownFacades';
import {renaissanceFrontage} from './renaissancePlan';
/** Only visual wall indices are omitted. Pinned source body, footprints, IDs,
 * roof triangles and collision edges are never changed. The worker substitutes
 * a complete opening-aware wall grammar on those exact source edges. */
export function prepareSourceOpenings(chunk:GeographicChunkData,facades:Facade[]){
 const data=chunk.buildingGeometry,selected=facades.filter(renaissanceFrontage);if(!data||!selected.length)return;
 const grid=new Map<string,Facade[]>();for(const f of selected){
  const ax=f.edge.a[0],az=f.edge.a[1],bx=f.edge.b[0],bz=f.edge.b[1];
  for(let x=Math.floor(Math.min(ax,bx)/32);x<=Math.floor(Math.max(ax,bx)/32);x++)for(let z=Math.floor(Math.min(az,bz)/32);z<=Math.floor(Math.max(az,bz)/32);z++){const key=`${x}:${z}`,list=grid.get(key)??[];list.push(f);grid.set(key,list);}
 }
 data.frontageIndices={};let omitted=0;
 data.batches.forEach((batch,bi)=>{
  const a=batch.attributes.find(a=>a.name==='position')!,p=new Float32Array(data.body,a.offset,a.count),idx=batch.index,original=idx.width===2?new Uint16Array(data.body,idx.offset,idx.count):new Uint32Array(data.body,idx.offset,idx.count),kept:number[]=[];
  for(let i=0;i<original.length;i+=3){
   const ids=[original[i]!,original[i+1]!,original[i+2]!],xs=ids.map(v=>p[v*3]!),ys=ids.map(v=>p[v*3+1]!),zs=ids.map(v=>p[v*3+2]!);
   const candidates=grid.get(`${Math.floor((xs[0]!+xs[1]!+xs[2]!)/96)}:${Math.floor((zs[0]!+zs[1]!+zs[2]!)/96)}`);
   const remove=candidates?.some(f=>{
    if(Math.max(...ys)-Math.min(...ys)<.05||Math.max(...ys)>f.height+.03)return false;
    const fx=f.x-chunk.origin[0],fz=f.z-chunk.origin[1];
    return ids.every((_,k)=>Math.abs((xs[k]!-fx)*f.nx+(zs[k]!-fz)*f.nz)<.065&&Math.abs((xs[k]!-fx)*f.nz-(zs[k]!-fz)*f.nx)<=f.width/2+.025);
   });
   if(remove)omitted++;else kept.push(...ids);
  }
  if(kept.length!==original.length)data.frontageIndices![bi]=idx.width===2?new Uint16Array(kept):new Uint32Array(kept);
 });
 return omitted;
}
