import * as T from 'three';
import type {Landmark} from '../types';
import {LandmarkBuilder} from './landmarkBuilder';
import {thaiRoof,framedWindow,porcelainPrang,royalChedi,guardian,porcelainMaterial} from './templeCraft';
import {ribbonPath,sectionLoft} from './sculptureGeometry';
const sites=['arun','victory','asiatique','mbk','central','terminal','flowers','food','chatuchak'];
function pavilion(b:LandmarkBuilder,x:number,z:number,w:number,d:number,h:number,roof:string,detail:boolean){
 b.box(x,h/2+.7,z,w,h,d,'#eee0bf');
 for(const side of [-1,1])for(let u=-w/2+2;u<w/2;u+=3.6)framedWindow(b,x+u,h*.55,z+side*(d/2+.1),1.5,h*.5,detail);
 for(const side of [-1,1])for(let q=-d/2+1;q<d/2;q+=4)b.sculpt(new T.CylinderGeometry(.22,.3,h+1,8),x+side*(w/2+.4),h/2+.7,z+q,'#d9bd79','ceramic');
 thaiRoof(b,x,h+1.3,z,w+2,d+3,h*.5,roof,detail);thaiRoof(b,x,h+3.2,z,w*.8,d*.83,h*.42,roof,detail);
}
function wall(b:LandmarkBuilder,size:number,detail:boolean){
 for(const side of [-1,1]){b.box(side*(size/2-1),2,0,.8,3.5,size-2,'#e8dfc8');b.box(0,2,side*(size/2-1),size-2,3.5,.8,'#e8dfc8');
  if(detail)for(let q=-size/2+3;q<size/2-2;q+=4){b.sculpt(new T.ConeGeometry(.33,.55,4),q,4,side*(size/2-1),'#f3ead1','ceramic',Math.PI/4);}}
}
/** Five uniformed bronze figures, deliberately distinct from temple guardians. */
function civicFigure(b:LandmarkBuilder,x:number,z:number,index:number){
 const color='#536957';b.box(x,.8,z,2.2,.9,2.2,'#a8b19f');
 for(const side of [-1,1]){b.sculpt(sectionLoft([{p:[x+side*.37,1.1,z],a:.21,b:.23},{p:[x+side*.34,2.3,z],a:.24,b:.25},{p:[x+side*.27,3.1,z],a:.29,b:.27}],8,12),0,0,0,color,'bronze');b.box(x+side*.4,1.1,z+.25,.55,.3,.9,color);}
 b.sculpt(sectionLoft([{p:[x,2.6,z],a:.5,b:.3},{p:[x,3.5,z],a:.58,b:.34},{p:[x,4.3,z],a:.75,b:.32},{p:[x,4.5,z],a:.3,b:.26}],10,16),0,0,0,color,'bronze');
 b.sculpt(new T.CylinderGeometry(.33,.27,.75,10),x,5,z,color,'bronze');b.sculpt(new T.ConeGeometry(.12,.25,5).rotateX(Math.PI/2),x,5.05,z+.33,color,'bronze');
 // Soldier helmet, naval peak, air-service cap, police cap and civilian head.
 if(index!==4)b.sculpt(new T.CylinderGeometry(index===0?.4:.32,.43,.26,10),x,5.47,z,color,'bronze');
 for(const side of [-1,1])b.sculpt(ribbonPath([[x+side*.65,4.2,z],[x+side*.8,3.5,z+.12],[x+side*.45,3.1,z+.35]],.17,5,10),0,0,0,color,'bronze');
 if(index<3)b.sculpt(new T.CylinderGeometry(.06,.06,3.1,5),x+.7,2.6,z+.45,'#435b4d','bronze');else b.box(x-.4,3.2,z+.5,.65,.8,.13,color);
}
function build(l:Landmark,detail:boolean){
 const b=new LandmarkBuilder(),S=l.size??50;
 b.box(0,.35,0,S-.6,.7,S-.6,['mbk','central','terminal'].includes(l.id!)?'#bcc6c1':'#d1c5aa');
 if(l.id==='arun'){
  const porcelain=detail?porcelainMaterial():undefined;porcelainPrang(b,0,0,56,12.4,detail,porcelain);for(const x of [-16,16])for(const z of [-16,16])porcelainPrang(b,x,z,23,4.15,detail,porcelain);
  wall(b,49,detail);for(const x of [-7,7])guardian(b,x,21,5.4,x<0?'#6c9a83':'#e7d5ba',detail);
  for(const x of [-20.5,20.5])for(let z=-8;z<=8;z+=4)b.box(x,.82,z,2.8,.3,3.6,'#aeb8a0');
 }else if(l.id==='victory'){
  for(let i=0;i<3;i++)b.sculpt(new T.CylinderGeometry(11-i*1.1,12-i*1.1,1.1,20),0,.8+i,0,'#bec4b9','ceramic');
  b.box(0,5,0,9,4,9,'#c7c9bb');b.sculpt(new T.CylinderGeometry(.6,2.6,32,4),0,23,0,'#e2e0cf','ceramic',Math.PI/4);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;civicFigure(b,Math.sin(a)*8,Math.cos(a)*8,i);}
 }else if(l.id==='asiatique'){
  for(const x of [-11,11]){b.box(x,5,-9,20,9,22,'#9b6349');b.roof(x,9.5,-9,21,23,4,'#704e43');for(let u=-7;u<=7;u+=3.5){b.box(x+u,4,2.1,2.8,5.5,.2,'#3c625e');b.box(x+u,7.6,2.3,3.5,.3,.4,'#cfad73',0,true);}}
  // Warehouse bays continue around road-facing rear/end walls. This is an
  // original arcade interpretation, not a survey of individual tenant shops.
  for(const x of [-11,11]){
   for(const side of [-1,1]){
    const z=-9+side*11.18;
    for(let u=-7;u<=7;u+=3.5){
     b.box(x+u,4.1,z,3.15,6.2,.22,'#694d3c');
     b.sculpt(new T.BoxGeometry(2.65,4.9,.15),x+u,3.85,z+side*.18,u===0?'#77968a':'#3d6260','glass');
     b.box(x+u,1,z+side*.28,3.3,.42,.62,'#c3af8b');
     b.box(x+u,6.8,z+side*.45,3.6,.28,1.2,'#493c32');
     if(detail){b.box(x+u,4,z+side*.3,.12,5.2,.1,'#b09a72');b.box(x+u,5.4,z+side*.35,2.4,.08,.06,'#e6bc7c',0,true);}
    }
    for(const u of [-9.7,9.7])b.box(x+u,5,z, .38,8.8,.48,'#c9aa7b');
   }
   const outer=x<0?-1:1;
   for(const z of [-16,-9,-2]){
    b.box(x+outer*10.15,4.2,z,.28,5.8,4.8,'#664c3f');
    b.sculpt(new T.BoxGeometry(.18,4.8,4.2),x+outer*10.35,4,z,'#4c6d64','glass');
    b.box(x+outer*10.6,7.4,z,1.3,.3,5.3,'#604735');
   }
  }
  for(const x of [-8,8])b.sculpt(ribbonPath([[x,0,17],[0,22,17]],.4,6,1),0,0,0,'#d8d1b5','ceramic');
  for(const r of [16,16.7])b.sculpt(new T.TorusGeometry(r,.2,5,48),0,22,17,'#e5ddd0','ceramic');
  for(let i=0;i<16;i++){const a=i*Math.PI/8,x=Math.sin(a)*16,y=22+Math.cos(a)*16;b.sculpt(ribbonPath([[0,22,17],[x,y,17]],.08,4,1),0,0,0,'#b4bdb5','ceramic');b.box(x,y-1.2,17,1.7,2.2,2,'#78a3a1',0,true);}
 }else if(['mbk','central','terminal'].includes(l.id!)){
  const tint=l.id==='mbk'?'#a5beae':l.id==='central'?'#d7d8cd':'#c2cac3';b.box(0,15,0,60,29,56,tint);
  for(const side of [-1,1])for(let x=-28;x<=28;x+=3.5){b.sculpt(new T.BoxGeometry(3.3,25,.3),x,15,side*28.3,x%7===0?'#8badae':'#557e8b','glass');b.box(x,15,side*28.6,.12,26,.18,'#d6d9cc');}
  for(let y=5;y<=27;y+=6)b.box(0,y,28.8,60,.5,.7,tint,0,true);
  // The compressed street graph approaches these malls from their side too.
  // Articulate all four elevations rather than leaving a blank access frontage.
  for(const side of [-1,1]){
   for(let z=-24;z<=24;z+=4){
    b.sculpt(new T.BoxGeometry(.24,24,3.65),side*30.2,16,z,(z+24)%12===0?'#77949b':'#476976','glass');
    b.box(side*30.45,16,z,.28,25,.16,'#bac6bd');
   }
   for(let y=6;y<=28;y+=5.5)b.box(side*30.55,y,0,.8,.4,55.6,tint);
   // Ground-level shop glazing, mullions and a shallow entrance canopy.
   for(const z of [-18,-9,0,9,18]){
    b.sculpt(new T.BoxGeometry(.3,4.5,7.4),side*30.3,2.9,z,'#254952','glass');
    b.box(side*30.55,2.9,z,.2,4.5,.12,'#c6cfc3');
    if(detail)b.box(side*30.65,4.9,z,.08,.12,6.5,'#d1bd8d',0,true);
   }
   b.box(side*30.8,5.6,0,1.7,.42,24,'#b4beb1');
  }
  if(l.id==='terminal'){for(let i=0;i<6;i++)b.sculpt(new T.BoxGeometry(8,1,13).rotateZ((i-2.5)*.045),-20+i*8,31,18,'#c5d9d4','glass');b.box(0,8,29.7,24,.6,4,'#d7c49b',0,true);}
  else if(l.id==='mbk'){b.sculpt(new T.CylinderGeometry(8,8,28,24).scale(1,1,.65),-21,15,0,'#71978b','glass');}
  else{for(let x=-24;x<=24;x+=8)b.box(x,30.5,0,6.5,2,50,'#dce1d8');b.sculpt(new T.BoxGeometry(30,18,.3),10,15,29,'#739ba4','glass');}
 }else{
  // Three original market families: flower arcades, food courts, Chatuchak sheds.
  const flower=l.id==='flowers',food=l.id==='food';
  for(const side of [-1,1])for(let z=-10;z<=10;z+=7){const x=side*9;b.box(x,2.2,z,7,4,6,flower?'#9c8f76':food?'#a56f54':'#a48f73');b.roof(x,4.5,z,8,7,1.8,flower?'#668f7c':food?'#964a3d':'#607d73');b.box(x,1.5,z+3.2,6,1.2,1.6,'#79624d');
   if(detail)for(let u=-2;u<=2;u+=1){b.sculpt(new T.ConeGeometry(.35,.8,6),x+u,2.6,z+3.3,flower?['#dc8d9e','#e4bd61','#8ebf8b'][Math.abs(u)%3]!:food?'#d8aa55':'#bbaa7f','ceramic');}}
 }
 return b.finish(`crafted-${l.id}-${detail?'hero':'distant'}-v3`);
}
export function heritageLandmark(l:Landmark){
 if(!sites.includes(l.id!))return;
 const near=build(l,true),far=build(l,false),root=new T.LOD();root.addLevel(near,0);root.addLevel(far,['palace','arun'].includes(l.id!)?190:125);root.userData.authoredAsset=near.userData.authoredAsset;root.userData.nightMaterials=[...near.userData.nightMaterials,...far.userData.nightMaterials];return root;
}
