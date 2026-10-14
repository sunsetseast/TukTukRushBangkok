import type { District } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import { obstacleDistance } from "../world";
import { stableHash } from "./buildingGrammar";
/** Sagged bundles terminate at real frontage posts; no low roadway wires. */
export function emitCables(d:District,emit:(p:ArtPiece)=>void){
  const row=d.buildings.filter(b=>!b.artRole&&["chinatown","talatnoi"].includes(b.regionId??""));
  for(let i=0;i<row.length;i++){
    const a=row[i]!,yaw=a.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw),b=row.slice(i+1).find(b=>Math.abs((b.yaw??0)-yaw)<.1&&Math.abs((b.x-a.x)*s+(b.z-a.z)*c)<1&&Math.hypot(b.x-a.x,b.z-a.z)<31);
    if(!b||stableHash(`${a.x}:${a.z}`)%3===0)continue;
    const p={x:a.x+s*(a.d/2+1.1),z:a.z+c*(a.d/2+1.1)},q={x:b.x+s*(b.d/2+1.1),z:b.z+c*(b.d/2+1.1)},samples=Array.from({length:9},(_,j)=>({x:p.x+(q.x-p.x)*j/8,z:p.z+(q.z-p.z)*j/8}));
    if(samples.some(p=>d.buildings.some(o=>o.height>7&&obstacleDistance(p,o)<.35)))continue;
    for(const end of [a,b])emit({x:end.x+s*(end.d/2-.3),y:4.1,z:end.z+c*(end.d/2-.3),w:.12,h:8.2,d:.12,color:"#485850",yaw,shape:"cylinder",surface:"metal"});
    for(let j=1;j<samples.length;j++)for(const band of [0,.16]){const a=samples[j-1]!,b=samples[j]!,ya=8.3-Math.sin((j-1)/8*Math.PI)*.7+band,yb=8.3-Math.sin(j/8*Math.PI)*.7+band,len=Math.hypot(b.x-a.x,b.z-a.z);emit({x:(a.x+b.x)/2,y:(ya+yb)/2,z:(a.z+b.z)/2,w:.045,h:.045,d:Math.hypot(len,yb-ya),yaw:Math.atan2(b.x-a.x,b.z-a.z),pitch:-Math.atan2(yb-ya,len),color:"#394942",surface:"metal"});}
  }
}
