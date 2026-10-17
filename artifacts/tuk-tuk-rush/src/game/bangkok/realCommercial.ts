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
   box(0,11,-3,62,22,55,'#cecbb3');glass(0,15,24.7,58,22,.3,'#5d929a');
   for(let x=-28;x<=28;x+=detail?3.5:7)box(x,15,25,.22,25,.4,'#c9cbb3');
   // Huge curved glazed jewel entrance and a framed gold portal.
   b.sculpt(new T.CylinderGeometry(17,17,13,detail?36:16,1,false,-Math.PI/2,Math.PI).scale(1,1,.65),0,7,20,'#79a6ab','glass');
   for(const y of [3,10,17,24])box(0,y,25.3,61,.45,.6,WHITE);
   for(const x of [-10,10])box(x,9,29,1.3,17,1.5,GOLD);box(0,17.5,29,22,1.4,2,GOLD);
   for(const side of [-1,1])glass(side*31.1,10,-3,.25,17,51);
   box(0,25,-3,56,2,50,'#d0ccb0');box(0,27,-5,43,2,38,'#e1dfc8');
  }else if(l.id==='central'){
   // Broad white retail blocks with a taller glass atrium and offset red-edged
   // canopy; does not share Paragon's portal or MBK's rounded green facade.
   box(0,9,-2,64,18,58,'#deded1');box(-13,20,-9,36,11,42,WHITE);box(20,24,-5,21,20,43,'#b4c4bd');
   glass(-10,12,27.4,42,19,.3,'#66939a');glass(23,18,18,17,28,.4,'#477889');
   for(const y of [7,17,27])box(-10,y,27.8,43,.4,.4,WHITE);
   for(let x=-30;x<12;x+=detail?3.5:7)box(x,14,28,.3,25,.4,WHITE);
   for(let i=0;i<4;i++)box(22+i*.8,33+i*.5,-5,22,1,44,'#e6e3d4');
   box(0,5,30,25,.5,4,'#cb5545');box(-18,27,27,24,1.2,.7,'#d1d9cd');
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
