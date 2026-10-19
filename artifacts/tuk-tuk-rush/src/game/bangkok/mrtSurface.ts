import type { District, Obstacle } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import { MRT_ENTRANCES, planPoint } from "./masterPlan";
import { distanceToSegment, orientedFootprintsOverlap } from "../world";
export type MrtEntrance=typeof MRT_ENTRANCES[number] & {x:number;z:number;yaw:number};
const cache=new WeakMap<District,MrtEntrance[]>();
export function planMrtEntrances(d:District){
  const old=cache.get(d);if(old)return old;
  const nodes=new Map(d.nodes.map(n=>[n.id,n])),result:MrtEntrance[]=[];
  for(const spec of MRT_ENTRANCES){
    const target=planPoint(spec.design),road=d.roads.filter(r=>!r.destinationId&&!r.shortcut).map(r=>({r,a:nodes.get(r.a)!,b:nodes.get(r.b)!})).sort((u,v)=>distanceToSegment(target,u.a,u.b).distance-distanceToSegment(target,v.a,v.b).distance)[0]!;
    const yaw=Math.atan2(road.b.x-road.a.x,road.b.z-road.a.z);
    let chosen:Obstacle|undefined;
    for(const [along,side] of [[0,0],[0,18],[0,-18],[0,26],[0,-26],[8,18],[-8,-18],[12,26],[-12,-26]]){
      const o:Obstacle={x:target.x+Math.sin(yaw)*along!+Math.cos(yaw)*side!,z:target.z+Math.cos(yaw)*along!-Math.sin(yaw)*side!,w:3.6,d:7,height:3.2,yaw,color:"#375d85",environmentId:spec.id};
      if(d.obstacles.some(q=>orientedFootprintsOverlap(o,q,1)))continue;
      if(d.roads.some(r=>{const a=nodes.get(r.a)!,b=nodes.get(r.b)!;return distanceToSegment(o,a,b).distance<r.width/2+5;}))continue;
      chosen=o;break;
    }
    if(!chosen)throw Error(`MRT surface entrance parcel is obstructed: ${spec.id}`);
    d.obstacles.push(chosen);result.push({...spec,x:chosen.x,z:chosen.z,yaw});
  }
  cache.set(d,result);return result;
}
export function emitMrtEntrances(d:District,emit:(p:ArtPiece)=>void){
  for(const s of planMrtEntrances(d)){
    const put=(x:number,y:number,z:number,w:number,h:number,depth:number,color:string)=>emit({x:s.x+Math.cos(s.yaw)*x+Math.sin(s.yaw)*z,z:s.z-Math.sin(s.yaw)*x+Math.cos(s.yaw)*z,y,w,h,d:depth,yaw:s.yaw,color,surface:"metal",siteId:s.id});
    put(0,.18,0,3.6,.35,7,"#a2b5b7");put(0,.4,0,2.6,.25,5.8,"#243e55");
    for(const side of [-1,1]){put(side*1.7,1.6,0,.14,3.2,7,"#587b91");put(side*1.6,1,0,.15,1.7,6.7,"#a3bec1");}
    put(0,3.15,0,3.6,.25,7,"#345e89");put(0,2.75,3.55,3.4,.65,.12,"#254e88");
  }
}
