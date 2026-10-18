import { reviewedLandmark } from './landmarkSites';
import * as T from 'three';
import type { Landmark } from '../types';
import { LandmarkBuilder } from './landmarkBuilder';
const WHITE='#e7e5d5',GLASS='#548b99',GOLD='#d5b161';
export const COMMERCIAL_ASSETS=['icon','paragon','central','mbk','terminal'];
/** Dedicated landmark compositions. Source photos and limitations are recorded
 * in docs/qa/real-bangkok-architecture; no retail artwork or logos are copied. */
export function realCommercial(l:Landmark){
 if(!COMMERCIAL_ASSETS.includes(l.id!))return;
 // PR24's thin folded ICONSIAM roof is stronger than a solid new crown. Reuse
 // its authored asset and correct the river orientation rather than regress it.
 if(l.id==='icon'){const root=reviewedLandmark(l)!;for(const level of root.levels)level.object.rotation.y=Math.PI/2;root.userData.authoredAsset='real-icon-river-oriented-v5';return root;}
 const lod=new T.LOD();
 for(const detail of [true,false]){
  const b=new LandmarkBuilder(),box=b.box.bind(b);
  const glass=(x:number,y:number,z:number,w:number,h:number,d:number,c=GLASS)=>b.sculpt(new T.BoxGeometry(w,h,d),x,y,z,c,'glass');
  if(l.id==='paragon'){
   box(0,10,-5,62,20,49,'#c8c2a8');
   // Broad stepped retail shoulders and the elliptical glass entrance jewel.
   for(const side of [-1,1]){box(side*23,21,-8,15,5,43,'#d6ceae');box(side*25,24,-12,11,1.5,33,WHITE);}
   const jewel=new T.CylinderGeometry(19,19,18,detail?48:20,1,false,-Math.PI/2,Math.PI).scale(1,1,.56);
   b.sculpt(jewel,0,11,19,'#5b8c96','glass');
   for(const y of [3,7,11,15,19])b.sculpt(new T.TorusGeometry(19,.14,4,detail?40:16,Math.PI).rotateX(Math.PI/2).scale(1,1,.56),0,y,19,WHITE);
   for(let i=0;i<=12;i++){const a=-Math.PI/2+i*Math.PI/12,x=Math.sin(a)*19,z=19+Math.cos(a)*10.7;box(x,11,z,.18,18,.18,WHITE);}
   for(const side of [-1,1]){glass(side*25,10,20,10,15,.3);box(side*18,10,26,1,17,1,GOLD);}
   box(0,19,26,37,1.1,2,GOLD);box(0,22,-6,37,3,37,'#d8d0b2');
   // Road approach remains open; scaled shallow plaza steps stay inside plot.
   box(0,.22,28,38,.35,7,'#c0bca5');box(0,4.5,25,17,7,.25,'#3a6c78');
  }else if(l.id==='central'){
   // Long, asymmetric glazed retail frontage and separate department-store
   // shoulders. Superimposed white fins and upper setbacks give depth.
   box(0,10,-6,64,20,48,'#e0ded0');box(-20,22,-9,23,8,42,WHITE);box(22,24,-10,19,12,40,'#c6cdbf');
   glass(0,13,18.2,40,23,.3,'#477887');glass(-24,11,18.3,13,18,.3,'#5e8c91');glass(25,15,13,12,23,.3,'#678f93');
   for(const y of [5,11,17,24])box(0,y,18.7,41,.35,.8,WHITE);
   for(let x=-19;x<=19;x+=detail?3.8:7.6)box(x,13,19,.32,23,1.1,WHITE);
   // Zen/Isetan-era offset fronts are materially different, with vertical
   // retail display fins and a folded, cantilevered event-entry canopy.
   for(let i=0;i<4;i++){box(-29+i*3,13,19,1.2,22,1.7,i%2?'#cebb94':WHITE);box(21+i*1.5,30+i*.6,-10,18,1,39,'#e8e8db');}
   const canopy=new T.Shape([new T.Vector2(-13,0),new T.Vector2(0,1.8),new T.Vector2(13,0),new T.Vector2(13,-.5),new T.Vector2(0,1),new T.Vector2(-13,-.5)]);
   b.sculpt(new T.ExtrudeGeometry(canopy,{depth:7,bevelEnabled:false}),0,6,23,'#b84f45');
   box(0,.22,28,44,.3,7,'#b5bbae');
  }else if(l.id==='mbk'){
   // Green banded, rounded shopping block with its characteristic large display
   // panels. Original color graphics only; no advertiser art.
   box(0,12,-2,61,24,55,'#78a9a5');
   for(const x of [-25,25])b.sculpt(new T.CylinderGeometry(6,6,24,detail?20:10),x,12,20,'#89b7ac');
   for(const y of [4,8,12,16,20,24])box(0,y,26,55,.6,.7,'#b5cdb8');
   for(const [x,c] of [[-18,'#bc4c80'],[0,'#d4a055'],[18,'#657ec0']] as const){box(x,16,26.6,15,12,.6,'#cfdbbc');box(x,16,27,13,10,.3,c,0,true);}
   glass(0,4,27,18,7,.3,'#2f7078');box(0,8,27,22,.7,3,'#e1d4a5');
   for(const side of [-1,1])for(const y of [7,15,23])glass(side*30.6,y,-3,.2,4,49,'#538b8c');
  }else{
   box(0,10,0,63,20,58,'#d4d3c1');glass(0,12,29.1,60,15,.3,'#5a889b');
   for(const y of [4,10,16,22])box(0,y,29.4,61,.45,.5,WHITE);
   for(let x=-30;x<=30;x+=6)box(x,12,29.5,.3,20,.3,WHITE);
   // Grande Centre Point tower above Terminal 21: integrated mass, no duplicate
   // hotel destination. Square setbacks, vertical fins and roof crown.
   box(-7,64,-6,29,88,29,'#a9bab6');
   for(let y=25;y<=108;y+=detail?3:6)for(const side of [-1,1]){
    glass(-7,y,-6+side*14.6,27,2,.2,'#50788e');box(-7,y+1.2,-6+side*14.8,30,.3,.5,WHITE);
   }
   for(const x of [-20,-13,-1,6])box(x,66,9,.6,84,1.1,WHITE);
   for(let i=0;i<4;i++)box(-7,109+i*2,-6,31-i*5,2,31-i*5,WHITE);
   box(0,8,30,30,.6,4,'#d9c79b');
  }
  const g=b.finish(`real-${l.id}-v5-${detail?'near':'far'}`);if(l.id==='icon')g.rotation.y=Math.PI/2;
  lod.addLevel(g,detail?0:300,.12);
 }
 lod.userData.authoredAsset=`real-${l.id}-v5`;lod.userData.nightMaterials=lod.levels.flatMap(l=>l.object.userData.nightMaterials);return lod;
}
