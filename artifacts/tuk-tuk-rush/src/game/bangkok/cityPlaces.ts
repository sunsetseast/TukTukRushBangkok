import type {District,Obstacle,Point} from '../types';
import {designBuildings,type ParcelDesign} from './buildingGrammar';
import {riverPiers} from './riverfront';
import {regionAt} from './world';
import type {ArtPiece} from './architecturalBatch';
export type CityPlace=Point&{id:string;name:string;kind:'pier'|'hotel';region?:string;parcel?:Obstacle;note:string};
const cache=new WeakMap<District,CityPlace[]>();
/** Pins are backed by the same physical pier geometry or existing hotel parcel.
 * Generic property names describe original stylized hotels, not real replicas. */
export function cityPlaces(d:District,designs?:ParcelDesign[]){
  const prior=cache.get(d);if(prior)return prior;
  const result:CityPlace[]=riverPiers(d).map(p=>({...p,id:`pier:${p.id}`,kind:'pier',region:regionAt(d,p)?.id,note:'Covered river landing on the Chao Phraya. Approach from the public streets.'}));
  const candidates=(designs??designBuildings(d)).filter(p=>!p.parcel.artRole&&p.bays.some(a=>a.type==='guesthouse'||a.type==='apartment')),used=new Set<Obstacle>();
  for(const [id,anchor,name,regions] of [['river','state','Riverside hotel',['silom','talatnoi','south']],['siam','paragon','Siam city hotel',['siam']],['khao','khaosan','Banglamphu guesthouse',['khaosan']]] as const){
    const l=d.landmarks.find(l=>l.id===anchor)!,p=candidates.filter(p=>regions.some(r=>r===p.region)&&!used.has(p.parcel)).sort((a,b)=>Math.hypot(a.parcel.x-l.x,a.parcel.z-l.z)-Math.hypot(b.parcel.x-l.x,b.parcel.z-l.z))[0];
    if(!p)continue;used.add(p.parcel);result.push({...p.parcel,id:`hotel:${id}`,name,kind:'hotel',region:p.region,parcel:p.parcel,note:'Neighborhood hotel frontage and covered lobby. Explore its exterior from the city streets.'});
  }
  cache.set(d,result);return result;
}
export function emitHotelEntrances(d:District,designs:ParcelDesign[],emit:(p:ArtPiece)=>void){
  for(const node of cityPlaces(d,designs).filter(p=>p.parcel)){
    const b=node.parcel!,yaw=b.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw),F=b.d/2,put=(u:number,y:number,v:number,w:number,h:number,depth:number,color:string,layer:ArtPiece['layer']='core')=>emit({x:b.x+c*u+s*v,z:b.z-s*u+c*v,y,w,h,d:depth,color,yaw,surface:'metal',layer,siteId:node.id});
    put(0,3.3,F-.8,Math.min(b.w-1,7),.3,1.5,'#318b83');put(0,3.95,F+.12,Math.min(b.w-1,7),.8,.25,'#24796f');
    for(const side of [-1,1])put(side*Math.min(b.w*.3,2.8),1.7,F-.4,.12,3.3,.12,'#d5b15f');
    put(0,3.12,F-.8,Math.min(b.w-1.5,6.2),.08,1.1,'#ffda8d','night');
  }
}
