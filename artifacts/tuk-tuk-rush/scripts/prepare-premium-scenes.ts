import fs from 'node:fs';
import {createBangkokWorld} from '../src/game/bangkok/world';
const d=createBangkokWorld(),nodes=new Map(d.nodes.map(n=>[n.id,n])),scenes:any[]=[];
function roadPoint(at:{x:number;z:number},corridor?:string){return d.roads.filter(r=>!r.destinationId&&!r.bridge&&(!corridor||r.corridor===corridor)).map(r=>{const a=nodes.get(r.a)!,b=nodes.get(r.b)!,dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((at.x-a.x)*dx+(at.z-a.z)*dz)/(dx*dx+dz*dz))),x=a.x+t*dx,z=a.z+t*dz;return{x,z,road:r.name??r.corridor,distance:Math.hypot(x-at.x,z-at.z)};}).sort((a,b)=>a.distance-b.distance)[0]!;}
for(const id of ['terminal','icon','mahanakhon','hilton','peninsula','oriental']){
 const l=d.landmarks.find(l=>l.id===id)!,q=l.plot!,n=nodes.get(l.accessNode!)!,yaw=l.yaw??0;
 const pose=(at:any)=>({x:at.x,z:at.z,heading:Math.atan2(q.x-at.x,q.z-at.z),road:at.road??'approved destination access'}),add=(suffix:string,at:any,camera?:number[],look?:number[])=>scenes.push({id:id+'-'+suffix,pose:pose(at),normalDriving:!camera,...camera?{camera,look}:{}});
 add('arrival',n);
 if(id==='terminal'){add('street',roadPoint({x:q.x+30,z:q.z+100}));add('asok',roadPoint({x:q.x+110,z:q.z-10},'asok-north'));add('overview',n,[q.x+150,110,q.z+160],[q.x,30,q.z]);}
 if(id==='icon'){add('street',roadPoint({x:q.x-140,z:q.z+90},'charoen_nakhon'));add('goldline',roadPoint({x:q.x-120,z:q.z-100},'charoen_nakhon'));add('river',n,[q.x+120,8,q.z],[q.x,15,q.z]);}
 if(id==='mahanakhon'){add('street',roadPoint({x:q.x-360,z:q.z-180}));add('silhouette',n,[q.x-175,65,q.z+200],[q.x,75,q.z]);}
 if(['hilton','peninsula','oriental'].includes(id)){const dx=Math.sin(yaw),dz=Math.cos(yaw);add('river',n,[q.x+dx*120,32,q.z+dz*120],[q.x,38,q.z]);if(id!=='oriental')add('river-full',n,[q.x+dx*120,32,q.z+dz*120],[q.x,55,q.z]);}
}
fs.writeFileSync(new URL('../../../docs/qa/premium-landmarks/scenes.json',import.meta.url),JSON.stringify(scenes,null,2)+'\n');console.log('Prepared',scenes.length,'immutable matched poses');
