import type {District,Obstacle} from '../types';
import type {ArtPiece} from './architecturalBatch';
import {placementIndex} from './environmentPlan';
import {regionAt} from './world';
import {obstacleDistance,orientedFootprintsOverlap} from '../world';
import {stableHash,buildingIdentity,type ParcelDesign} from './buildingGrammar';
import {auditStreetEdges,streetFaces,type StreetFace,type StreetEdge} from './streetEdges';
const cache=new WeakMap<District,{before:StreetEdge[];after:StreetEdge[];infill:Obstacle[];pockets:Obstacle[];faces:StreetFace[]}>();
/** Runs after BTS reserves station/track envelopes, before pedestrians and props.
 * These are real physical parcels, shared by renderer, map and collision index. */
export function completeStreetFabric(d:District){
  const prior=cache.get(d);if(prior)return prior;
  const before=auditStreetEdges(d),index=placementIndex(d),infill:Obstacle[]=[],pockets:Obstacle[]=[],rail=d.transit?.lines.flatMap(l=>l.samples.filter((_,i)=>i%2===0))??[],stations=d.transit?.lines.flatMap(l=>l.stations)??[];
  for(const sample of before){
    if(sample.kind!=='open'||sample.road.destinationId)continue;
    const {point,outward,road}=sample,yaw=Math.atan2(-outward.x,-outward.z);let fitted=false;
    for(const along of [0,5,-5]){if(fitted)break;
      for(const [w,depth] of [[18,12],[13,10],[8,8],[5.5,7]]){
        const off=8+depth!/2,p={x:point.x+outward.x*off-outward.z*along,z:point.z+outward.z*off+outward.x*along},region=regionAt(d,p)?.id??'connector',seed=stableHash(`${road.corridor}:${Math.round(p.x)}:${Math.round(p.z)}`),modern=['siam','silom','sukhumvit','icon'].includes(region),
          parcel:Obstacle={...p,w:w!,d:depth!,yaw,height:modern?15.5:11.5,color:'#e3c99c',regionId:region,environmentId:`street-infill:${seed}`},radius=Math.hypot(parcel.w,parcel.d)/2,bd=d.bounds!;
        if(p.x<bd.minX+radius||p.x>bd.maxX-radius||p.z<bd.minZ+radius||p.z>bd.maxZ-radius||!index.clear(parcel,true))continue;
        if(rail.some(p=>obstacleDistance(p,parcel)<6))continue;
        if(stations.some(s=>orientedFootprintsOverlap(parcel,{...s,w:s.id==='siam'?24:s.line==='gold'?17:20,d:s.length+10,height:26,color:'#fff'},1)))continue;
        d.buildings.push(parcel);d.obstacles.push(parcel);index.insert(parcel);infill.push(parcel);fitted=true;break;
      }
    }
  }
  const after=auditStreetEdges(d),faces=streetFaces(d,after);
  for(const sample of after){
    if(sample.kind!=='open'&&sample.kind!=='station')continue;
    const {point,outward}=sample,p={x:point.x+outward.x*6.5,z:point.z+outward.z*6.5},seed=stableHash(`${Math.round(p.x)}:${Math.round(p.z)}`),
      o:Obstacle={...p,w:6,d:4,yaw:Math.atan2(-outward.x,-outward.z),height:.8,color:'#72a56a',artRole:'furniture',regionId:regionAt(d,p)?.id,environmentId:`street-garden:${seed}`},bd=d.bounds!;
    if(p.x<bd.minX+5||p.x>bd.maxX-5||p.z<bd.minZ+5||p.z>bd.maxZ-5||!index.clear(o,true)||pockets.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<18))continue;
    pockets.push(o);d.obstacles.push(o);index.insert(o);
  }
  const value={before,after,infill,pockets,faces};cache.set(d,value);return value;
}
/** Thin, articulated frontage on the EXISTING mass. No duplicate shell, hidden
 * party-wall detail, relocated hero building or change to vehicle clearance. */
export function emitStreetFrontages(d:District,designs:ParcelDesign[],emit:(p:ArtPiece)=>void){
  const byParcel=new Map(designs.map(p=>[p.parcel,p]));
  for(const face of completeStreetFabric(d).faces){
    const design=byParcel.get(face.parcel);if(!design)continue;
    const b=face.parcel,bay=design.bays[0]!,modern=['siam','silom','sukhumvit','icon'].includes(design.region),c=Math.cos(face.yaw),s=Math.sin(face.yaw),W=face.width-.4,F=face.depth/2+.025,
      H=b.artRole==='background'?Math.min(modern?b.height:bay.height,modern?80:31):Math.min(...design.bays.map(a=>a.height)),count=Math.max(1,Math.floor(W/(modern?6.5:5))),bw=W/count;
    const put=(u:number,y:number,v:number,w:number,h:number,depth:number,color:string,surface:ArtPiece['surface']=bay.surface,layer:ArtPiece['layer']='core')=>emit({x:b.x+c*u+s*v,z:b.z-s*u+c*v,y,w,h,d:depth,color,surface,layer,yaw:face.yaw,siteId:`street-face:${buildingIdentity(b)}:${face.face}`});
    put(0,.24,F-.04,W,.48,.12,bay.trim,'concrete');put(0,H-.16,F+.11,W+.12,.3,.32,bay.trim);
    for(let i=0;i<count;i++){
      const u=(i+.5)*bw-W/2,seed=stableHash(`${design.id}:${face.face}:${i}`);
      put(u,1.75,F,bw-.48,2.8,.08,modern?'#477d88':'#405e57',modern?'panel':'wood');put(u,1.75,F+.05,.1,2.8,.12,bay.trim,'metal');put(u,3.35,F+.14,bw-.2,.32,.4,bay.accent);
      if(bay.trade!=='residence'&&bay.trade!=='closed')put(u,3.95,F+.13,bw-.35,.8,.26,bay.accent,'metal');
      for(const side of [-1,1])put(u+side*(bw/2-.13),1.9,F+.08,.24,3.6,.22,bay.wall);
      const floors=Math.min(modern?5:3,Math.floor((H-3.8)/3.4));
      for(let f=0;f<floors;f++){
        const y=5.1+f*(H-4.5)/Math.max(1,floors),ww=Math.min(2.7,bw*.62);
        put(u,y,F,ww+.3,2,.08,bay.trim,'wood');put(u,y,F+.055,ww,1.68,.06,modern?'#588f9b':seed%2?'#66897c':'#9b7855',modern?'panel':'wood');put(u,y-1.05,F+.14,ww+.45,.18,.32,bay.wall);put(u,y,F+.105,.1,1.7,.14,bay.wall);
        if((seed+f)%3)put(u,y,F+.11,ww*.82,1.35,.04,modern?'#afdcd8':'#edbf88','panel','night');
      }
      if(!modern||seed%2){put(u,3.1,F+.38,bw-.25,.13,.9,bay.accent,'cloth');put(u,2.95,F+.78,bw-.25,.28,.12,bay.accent,'cloth');}
      if(seed%3===0)for(const side of [-1,1])put(u+side*bw*.25,1.9,F+.13,.07,2.6,.08,bay.accent,'metal','detail');
    }
  }
}
export function emitStreetGardens(d:District,emit:(p:ArtPiece)=>void){
  for(const o of completeStreetFabric(d).pockets){
    const yaw=o.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw),seed=stableHash(o.environmentId!),heritage=['oldtown','paknam','westbank'].includes(o.regionId??''),
      put=(u:number,y:number,v:number,w:number,h:number,depth:number,color:string,shape:ArtPiece['shape']='box',surface:ArtPiece['surface']='concrete',layer:ArtPiece['layer']='core')=>emit({x:o.x+c*u+s*v,z:o.z-s*u+c*v,y,w,h,d:depth,color,yaw,shape,surface,layer,siteId:o.environmentId});
    put(0,.16,0,6,.26,4,heritage?'#decda3':'#c7bc9c');put(-1.25,.6,-.6,2.6,.7,2.4,heritage?'#e5d6b2':'#9aaf9b');put(-1.25,1.35,-.6,2.3,1.15,2.1,'#65a766','orb');put(-1.25,2.4,-.6,.32,3.5,.32,'#927451','cylinder','wood');put(-1.25,4.45,-.6,3.4,3.1,3.2,seed%2?'#6bb56f':'#459b70','orb');put(-.4,4.8,-.7,2.3,2.1,2.3,'#8acb71','orb');put(1.55,.7,.3,2,.18,.75,'#ac8051','box','wood');
    for(const side of [-1,1])put(1.55+side*.7,.4,.3,.16,.6,.6,'#536c66','box','metal');
    if(seed%4===0){put(2.3,2.3,-1,.16,4.4,.16,'#607b70','cylinder','metal');put(2.3,4.5,-1,.65,.45,.65,'#f8ce88','box','panel','night');}
  }
}
