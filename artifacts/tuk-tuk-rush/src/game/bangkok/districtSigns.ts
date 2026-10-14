import type { ParcelDesign } from './buildingGrammar';
import type { ArtPiece } from './architecturalBatch';
import type { SignEntry } from '../signArt';
export const DISTRICT_SIGN_ENTRIES:SignEntry[]=[
  {key:'hua418',text:'ฮั่วเซ่งเฮง',style:'gold',variant:0,signatureId:'hua418'},
  {key:'nai442',text:'ก๋วยจั๊บนายเอ็ก',style:'noodle',variant:0,signatureId:'nai442'},
  {key:'thong444',text:'ทองใบเยาวราช',style:'gold',variant:0,signatureId:'thong444'},
  {key:'so456',text:'โซวเซ่งเฮง',style:'gold',variant:0,signatureId:'so456'},
  {key:'canyon-gold',text:'ทองคำ',style:'gold',variant:0},
  {key:'canyon-chinese',text:'金店',style:'gold',variant:1},
  {key:'canyon-tea',text:'茶樓',style:'heritage',variant:0},
  {key:'canyon-food',text:'食堂',style:'noodle',variant:1},
  {key:'khao-hostel',text:'GUESTHOUSE',style:'hotel',variant:0},
  {key:'khao-live',text:'LIVE MUSIC',style:'hotel',variant:2},
  {key:'khao-cafe',text:'CAFE & BAR',style:'heritage',variant:3},
  {key:'khao-tailor',text:'TAILOR',style:'hotel',variant:1},
  {key:'khao-market',text:'NIGHT MARKET',style:'heritage',variant:2},
  {key:'khao-roof',text:'ROOFTOP',style:'hotel',variant:3},
];
export type DistrictSign={p:ParcelDesign;key:string;u:number;y:number;v:number;width:number;height:number;blade:boolean;round?:boolean;hero?:boolean};
/** Authored shop sequence on compressed Yaowarat. Names are real; these parcels
 * are arcade adaptations, never claimed surveyed branches or exact replicas. */
export function districtSigns(designs:ParcelDesign[]):DistrictSign[]{
  const signs:DistrictSign[]=[],yaowarat=designs.filter(p=>p.corridor==='yaowarat'&&!p.parcel.artRole).sort((a,b)=>a.parcel.x-b.parcel.x);
  const heroes=new Map<string,string>();
  ['hua418','nai442','thong444','so456'].forEach((key,i)=>{const p=yaowarat[Math.floor(yaowarat.length*(.15+i*.2))];if(p)heroes.set(p.id,key);});
  for(const p of designs){const b=p.parcel;if(b.artRole||!['chinatown','khaosan'].includes(p.region))continue;
    const seed=p.bays[0]!.seed,F=b.d/2,key=heroes.get(p.id),khao=p.region==='khaosan';
    const menu=khao?['khao-hostel','khao-live','khao-cafe','khao-tailor','khao-market','khao-roof']:['canyon-gold','canyon-chinese','canyon-gold','canyon-food','canyon-tea','canyon-gold','canyon-chinese'];
    const height=khao?2+seed%3*.65:5.5+seed%4*1.2,y=khao?7.4+seed%4*.7:Math.max(9,Math.min(15,b.height-2));
    signs.push({p,key:key??menu[seed%menu.length]!,u:b.w*.28,y,v:F+(khao?2.6:3.2),width:khao?3.4+seed%3*.55:2.7+seed%3*.65,height,blade:true,round:khao&&seed%4===0,hero:!!key});
    if(seed%3!==0||key)signs.push({p,key:key??menu[(seed+1)%menu.length]!,u:-b.w*.22,y:khao?5.8:5.9,v:F+1.4,width:Math.min(b.w*.75,khao?6.8:10),height:khao?1.8:1.9,blade:false,hero:!!key});
  }
  return signs;
}
export function emitDistrictSigns(designs:ParcelDesign[],emit:(p:ArtPiece)=>void){
  for(const sign of districtSigns(designs)){
    const {p,u,y,v,width,height,blade}=sign,b=p.parcel,yaw=b.yaw??0,F=b.d/2,c=Math.cos(yaw),s=Math.sin(yaw);
    const B=(x:number,h:number,z:number,w:number,H:number,d:number,color:string,layer:ArtPiece['layer']='core',shape:ArtPiece['shape']='box',pitch=0)=>emit({x:b.x+c*x+s*z,y:h,z:b.z-s*x+c*z,w,h:H,d,color,yaw,layer,shape,pitch,surface:'metal'});
    // Cabinet's back reaches its facade; two steel arms make the mounting legible.
    for(const h of [y-height*.32,y+height*.32])B(u,h,(F+v)/2,.18,.16,v-F+width*.45,'#435457');
    B(u,y,F+.1,.32,height+.5,.22,'#5c5550');
    B(u,y,v,blade?.55:width+.25,height+.25,blade?width+.25:.45,'#324946');
    if(sign.round)B(u,y,v,.62,height+.5,width+.3,'#a34154','core','cylinder',Math.PI/2);
    else for(const side of [-1,1])B(u,y+side*height*.5,v,blade?.6:width+.35,.1,blade?width+.35:.5,p.region==='khaosan'?'#86cab9':'#ebc569','night');
    if(sign.hero){
      B(0,2.6,F+.15,b.w-.5,4.5,.24,'#942c38');
      for(const x of [-b.w*.42,0,b.w*.42])B(x,2.7,F+.35,.28,4.8,.24,'#dcbe75');
      B(0,4.9,F+.2,b.w,.35,.35,'#e1c172','night');
    }
  }
}
