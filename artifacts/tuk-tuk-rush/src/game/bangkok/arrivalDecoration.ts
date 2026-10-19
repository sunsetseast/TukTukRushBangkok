import type { District, DestinationAccess, Obstacle, Point } from "../types";
import { distanceToSegment, orientedFootprintsOverlap } from "../world";
const cache=new WeakMap<District,Map<string,Point>>();
/** Reconstruct tight forecourt furnishings as complete assemblies. Wall caps,
 * columns and trees move with their physical footprint; none is hidden or made
 * non-solid to pass the road check. Offsets are bounded to 32 game metres. */
export function arrivalFurniturePoint(d:District,a:DestinationAccess,p:Point):Point {
  const c=Math.cos(a.yaw),s=Math.sin(a.yaw),dx=p.x-a.origin.x,dz=p.z-a.origin.z;
  let x=Math.round((dx*c-dz*s)*1000)/1000,z=Math.round((dx*s+dz*c)*1000)/1000;
  let w=1.8,depth=1.8;
  if(Math.abs(x)===28){z=0;w=2.2;depth=45;}
  else if(Math.abs(x)===25){z=0;w=5;depth=30;}
  else if(Math.abs(x)===5&&Math.abs(z)===3){w=5.2;depth=5.2;}
  else if(x===0&&z===0){w=16;depth=8;}
  else if(Math.abs(x)===23&&z===23){w=4.2;depth=4.2;}
  else if(Math.abs(x)===9&&z===0){w=1.2;depth=1.2;}
  const key=`${a.id}:${x}:${z}`,prior=cache.get(d)??new Map<string,Point>();cache.set(d,prior);
  let offset=prior.get(key);
  if(!offset){
    const center={x:a.origin.x+c*x+s*z,z:a.origin.z-s*x+c*z};
    const nodes=new Map(d.nodes.map(n=>[n.id,n]));
    const roads=d.roads.map(r=>{const u=nodes.get(r.a)!,v=nodes.get(r.b)!;return {r,u,v,box:{x:(u.x+v.x)/2,z:(u.z+v.z)/2,w:r.width+1,d:Math.hypot(v.x-u.x,v.z-u.z)+.2,yaw:Math.atan2(v.x-u.x,v.z-u.z),height:0,color:"#fff"} as Obstacle};});
    const nearest=roads.reduce((u,v)=>distanceToSegment(center,u.u,u.v).distance<distanceToSegment(center,v.u,v.v).distance?u:v);
    const q=distanceToSegment(center,nearest.u,nearest.v).point,nx=center.x-q.x,nz=center.z-q.z,len=Math.hypot(nx,nz)||1;
    const options:Point[]=[{x:0,z:0}];
    for(const distance of [2,4,6,8,12,16,24,32])for(const sign of [1,-1]){
      options.push({x:nx/len*distance*sign,z:nz/len*distance*sign});
      options.push({x:s*distance*sign,z:c*distance*sign});
      options.push({x:c*distance*sign,z:-s*distance*sign});
    }
    offset=options.find(o=>roads.every(r=>!orientedFootprintsOverlap({...center,x:center.x+o.x,z:center.z+o.z,w,d:depth,yaw:a.yaw,height:1,color:"#fff"},r.box)));
    if(!offset)throw Error(`No road-safe forecourt assembly: ${key}`);
    prior.set(key,offset);
  }
  return {x:p.x+offset.x,z:p.z+offset.z};
}
