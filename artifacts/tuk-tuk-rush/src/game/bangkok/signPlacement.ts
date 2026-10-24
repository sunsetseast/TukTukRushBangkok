import type {District,DestinationAccess} from '../types';
import {distanceToSegment,obstacleDistance} from '../world';
import {blockedByRiver} from './world';
export const STREET_NAMES=[
 ["si-phraya","ถนนสี่พระยา","Si Phraya Road"],
 ["charoen-krung-30","ซอยเจริญกรุง 30","Charoen Krung Soi 30 / Captain Bush Lane"],["charoen-krung-32","ซอยเจริญกรุง 32","Charoen Krung Soi 32"],
 ['yaowarat','ถนนเยาวราช','Yaowarat Road'],['khaosan','ถนนข้าวสาร','Thanon Khao San'],['charoen_n','ถนนเจริญกรุง','Charoen Krung Road'],['sukhumvit','ถนนสุขุมวิท','Sukhumvit Road'],['silom','ถนนสีลม','Silom Road'],['rama1','ถนนพระรามที่ ๑','Rama I Road'],['charoen_nakhon','ถนนเจริญนคร','Charoen Nakhon Road'],
] as const;
export const ARRIVAL_THAI:Record<string,string>={pho:'วัดพระเชตุพน',arun:'วัดอรุณราชวราราม',paknam:'วัดปากน้ำ ภาษีเจริญ',palace:'พระบรมมหาราชวัง',traimit:'วัดไตรมิตร',icon:'ไอคอนสยาม',paragon:'สยามพารากอน',central:'เซ็นทรัลเวิลด์',terminal:'เทอร์มินอล ๒๑',asiatique:'เอเชียทีค'};
/** Suspended from the existing gate structure, forward of its beam and below
 * the gable. Clearance is measured from the complete board, not its origin. */
export function arrivalSign(a:DestinationAccess){const g=a.entrance;return {key:`arrival:${a.id}`,x:g.x-Math.sin(g.yaw)*3.3,y:5.45,z:g.z-Math.cos(g.yaw)*3.3,yaw:g.yaw+Math.PI,w:11,h:2.0625,clearance:4.41875};}
export function municipalSigns(d:District){
 const nodes=new Map(d.nodes.map(n=>[n.id,n]));
 return STREET_NAMES.flatMap(([corridor,thai,english])=>{
  const roads=d.roads.filter(r=>!r.destinationId&&(r.corridor===corridor||(corridor==='rama1'&&r.corridor==='old_siam'&&(nodes.get(r.a)!.x+nodes.get(r.b)!.x)/2>0)));
  for(const road of roads){const a=nodes.get(road.a)!,b=nodes.get(road.b)!,len=Math.hypot(b.x-a.x,b.z-a.z),tx=(b.x-a.x)/len,tz=(b.z-a.z)/len;
   for(const fraction of [.12,.24,.76,.88])for(const side of [-1,1]){
    const x=a.x+(b.x-a.x)*fraction-tz*side*(road.width/2+4),z=a.z+(b.z-a.z)*fraction+tx*side*(road.width/2+4);
    if(blockedByRiver(d,{x,z},3)||d.obstacles.some(o=>obstacleDistance({x,z},o)<3.8))continue;
    if(d.roads.some(r=>distanceToSegment({x,z},nodes.get(r.a)!,nodes.get(r.b)!).distance<r.width/2+2))continue;
    return [{key:`street:${corridor}`,thai,english,x,z,y:3.7,yaw:Math.atan2(tx,tz)+(side>0?Math.PI/2:-Math.PI/2),w:5.8}];
   }
  }
  return [];
 });
}
