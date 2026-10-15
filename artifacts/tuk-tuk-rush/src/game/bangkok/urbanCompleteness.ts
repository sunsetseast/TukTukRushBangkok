import type { District, Obstacle, Point } from '../types';
import { regionAt, riverDistance } from './world';
import { placementIndex } from './environmentPlan';
import { stableHash } from './buildingGrammar';
import { distanceToSegment, orientedFootprintsOverlap } from '../world';
import { inDestinationGrounds } from './destinationAccess';
export type CompletenessReport={frontage:number;rear:number;screened:number;rejected:number};
/** Fit smaller real parcels first, then rear courts. No scenery is placed inside
 * a road, waterway, public park, landmark plot or its viewing approach. */
export function completeUrbanFabric(d:District):CompletenessReport{
  const index=placementIndex(d),nodes=new Map(d.nodes.map(n=>[n.id,n])),report={frontage:0,rear:0,screened:0,rejected:0};
  const approaches=d.landmarks.filter(l=>l.plot&&['pho','arun','icon','paragon','paknam'].includes(l.id!)).map(l=>{
    const a=nodes.get(l.accessNode!)!,p=l.plot!,len=Math.hypot(p.x-a.x,p.z-a.z);
    return {x:(p.x+a.x)/2,z:(p.z+a.z)/2,w:22,d:Math.max(0,len-l.size!*.45),yaw:Math.atan2(p.x-a.x,p.z-a.z),height:1,color:'#aaa'};
  });
  const clear=(b:Obstacle)=>{
    const rad=Math.hypot(b.w,b.d)/2,bd=d.bounds!;
    return !inDestinationGrounds(d,b)&&b.x>bd.minX+rad&&b.x<bd.maxX-rad&&b.z>bd.minZ+rad&&b.z<bd.maxZ-rad&&
      !approaches.some(a=>a.d>1&&orientedFootprintsOverlap(a,b,1))&&index.clear(b);
  };
  const add=(p:Point,yaw:number,w:number,depth:number,role:'frontage'|'rear'|'screened')=>{
    const region=regionAt(d,p)?.id??'connector',seed=stableHash(`${Math.round(p.x)}:${Math.round(p.z)}`),modern=['siam','silom','sukhumvit','icon'].includes(region);
    const b:Obstacle={...p,w,d:depth,yaw,height:modern?24+seed%6*8:7+seed%4*3.5,color:'#b7baa2',regionId:region,artRole:role==='frontage'?undefined:'background',environmentId:`infill:${role}:${seed}`};
    if(!clear(b))return false;d.buildings.push(b);d.obstacles.push(b);index.insert(b);report[role]++;return true;
  };
  for(const r of d.roads){if(r.destinationId||r.bridge||r.roundabout||r.shortcut)continue;
    const a=nodes.get(r.a)!,b=nodes.get(r.b)!,len=Math.hypot(b.x-a.x,b.z-a.z),ux=(b.x-a.x)/len,uz=(b.z-a.z)/len;
    for(const t of [len*.25,len*.7])for(const side of [-1,1]){
      const yaw=Math.atan2(-uz*side,ux*side),point=(off:number)=>({x:a.x+ux*t+uz*side*off,z:a.z+uz*t-ux*side*off});
      let fit=false;
      for(const [w,depth] of [[12,14],[8,10],[5.8,7.5]]){
        if(add(point(r.width/2+8+depth!/2),yaw,w!,depth!,'frontage')){fit=true;break;}
      }
      if(!fit)report.rejected++;
    }
  }
  // Irregular rear silhouettes close the exposed ground beyond shallow rows.
  const frontage=[...d.buildings];
  for(const b of frontage){const seed=stableHash(`${b.x}:${b.z}`);if(seed%3===0)continue;
    const yaw=b.yaw??0,region=regionAt(d,b)?.id??'connector',modern=['siam','silom','sukhumvit'].includes(region);
    for(const distance of [36,70,115]){
      const p={x:b.x-Math.sin(yaw)*(b.d/2+distance)+Math.cos(yaw)*((seed%19)-9),z:b.z-Math.cos(yaw)*(b.d/2+distance)-Math.sin(yaw)*((seed%19)-9)};
      const w=modern?28+seed%3*8:18+seed%4*3,depth=modern?28:16+seed%3*4;
      if(add(p,yaw,w,depth,'rear'))break;
    }
  }
  // Sparse screened service plots, kept close to streets rather than random map fill.
  for(const r of d.roads.filter(r=>!r.bridge&&!r.roundabout&&!r.shortcut)){
    const a=nodes.get(r.a)!,b=nodes.get(r.b)!,seed=stableHash(`${r.a}:${r.b}`);if(seed%4)continue;
    const yaw=Math.atan2(b.x-a.x,b.z-a.z),side=seed%2?1:-1,p={x:(a.x+b.x)/2+Math.cos(yaw)*65*side,z:(a.z+b.z)/2-Math.sin(yaw)*65*side};
    if(riverDistance(d,p)<d.riverWidth!/2+20)continue;
    add(p,yaw+side*Math.PI/2,14,12,'screened');
  }
  for(let i=1;i<d.river!.length;i++){
    const a=d.river![i-1]!,b=d.river![i]!,len=Math.hypot(b.x-a.x,b.z-a.z),ux=(b.x-a.x)/len,uz=(b.z-a.z)/len;
    for(let t=25;t<len-20;t+=70)for(const side of [-1,1]){
      const off=d.riverWidth!/2+23,p={x:a.x+ux*t+uz*off*side,z:a.z+uz*t-ux*off*side};
      add(p,Math.atan2(-uz*side,ux*side),18,13,'rear');
    }
  }
  return report;  return report;
}
