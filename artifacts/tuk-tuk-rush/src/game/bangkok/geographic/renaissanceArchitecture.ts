import type {ArtPiece} from '../architecturalBatch';
import type {Facade} from './chinatownFacades';
import type {ChinatownSite} from './chinatownSites';
export type Place=(u:number,y:number,v:number,w:number,h:number,d:number,color:string,layer?:ArtPiece['layer'],shape?:ArtPiece['shape'],rotation?:number,surface?:ArtPiece['surface'])=>void;
type Sign=(u:number,y:number,v:number,w:number,h:number,vertical?:boolean,rotation?:number,reverse?:boolean,trade?:number)=>void;
/** Opening-aware source-edge architecture. Source visual walls are omitted only
 * where this complete wall/room replacement is installed. No collision edits. */
export function emitRenaissanceFacade(f:Facade,put:Place,sign:Sign,site:(ChinatownSite & {sign:number})|undefined,trades:number[]){
 const W=f.width,H=f.height,seed=f.seed,song=f.style==='songwat',n=trades.length,bay=W/n,base=Math.min(3.45,H*.43),fh=(H-base)/(f.floors-1),out=f.outset;
 const modern=!song&&seed%5===2,brick=song&&seed%3===1;
 const wall=(song?['#cdbb96','#ddd0ae','#bbb6a0','#d8c8aa']:['#c8b18f','#b9c5b6','#d2b9a2','#9db1b4','#cebfa4','#b6b3a5'])[seed%(song?4:6)]!;
 const stone=song?'#e4d4b1':'#ded2ba',metal='#364d4b',wallSurface=brick?'brick':modern?'concrete':'plaster';
 // Continuous grounded threshold with ceramic tread and a distinct dry gutter.
 const pavement=Math.min(out,1.5);
 put(0,.08,pavement/2,W-.04,.14,pavement,'#938c7c','core','box',0,'concrete');
 put(0,.17,.18,W-.12,.06,.45,song?'#9c8666':'#7c8b85','core','box',0,'tile');
 if(pavement>.6){put(0,.065,pavement-.08,W-.08,.09,.12,'#4b5351','near','box',0,'concrete');for(let k=0;k<n;k++)put(-W/2+(k+.5)*bay,.115,pavement-.16,.44,.015,.18,'#343c3d','detail','box',0,'metal');}
 for(let j=0;j<n;j++){
  const u=-W/2+(j+.5)*bay,span=bay-.34,type=trades[j]!,gold=type===0,food=[1,4,11].includes(type),tea=type===2;
  const accent=gold?'#8f2432':song?'#496a5c':food?'#28665f':['#506f70','#794946','#475c70'][seed%3]!;
  const depth=Math.min(1.15,Math.max(.6,bay*.2)),roomTop=base-.75;
  // Actual room behind the source edge: rear wall, side returns, ceiling, floor.
  put(u,roomTop/2,-depth,span,roomTop,.13,gold?'#603b2c':food?'#c4b490':'#6b7665','core','box',0,gold?'wood':food?'tile':'plaster');
  put(u,.15,-depth/2,span,.12,depth,food?'#777768':'#8b7459','core','box',0,'tile');
  put(u,roomTop,-depth/2,span,.14,depth,'#bba98a','core');
  for(const side of [-1,1]){
   put(u+side*span/2,roomTop/2,-depth/2,.14,roomTop,depth,side<0?'#827c69':stone,'core');
   put(u+side*(bay/2-.1),base/2,.10,.21,base,.34,stone,'core','box',0,wallSurface);
   put(u+side*(bay/2-.1),.45,.19,.26,.8,.18,song?'#968c70':'#5b7873','near','box',0,'tile');
  }
  // Deep, framed fascia; no canopy across its lettering envelope.
  const sy=base-.37;
  put(u,sy,.20,span,.66,.32,accent,'core');sign(u,sy,.375,span-.12,.53,false,0,false,site?.sign??type);
  put(u,base+.015,.21,bay-.02,.16,.48,stone,'core');
  for(const side of [-1,1])put(u+side*(span/2-.04),sy,.39,.045,.64,.04,gold?'#d3b46a':'#b9b99e','near','box',0,'metal');
  // Individual occupation, not a full-height uniformly glowing storefront.
  put(u,roomTop-.15,-.36,span*.72,.055,.17,gold?'#ffcf75':'#f6d3a0','night');
  const counter=Math.min(.64,out*.55);
  if(gold){
   put(u,.61,counter,span*.76,.91,.48,'#734a30','core','box',0,'wood');
   put(u,1.11,counter,span*.8,.12,.55,'#cfb16b','near','box',0,'metal');
   put(u,.99,counter+.255,span*.72,.2,.035,'#54767b','near','box',0,'panel');
   for(let k=0;k<4;k++){
    const x=u-span*.28+k*span*.185;
    put(x,1.32,-depth+.22,.38,.08,.3,'#d2b678','near','box',0,'metal');
    put(x,1.64,-depth+.18,.22,.38,.19,'#392f2b','near','orb');
    put(x,1.71,-depth+.30,.17,.23,.045,'#e4ba61','detail','arch',0,'metal');
    put(x,1.12,counter,.28,.035,.23,'#e0c483','detail','box',0,'metal');
   }
   put(u,1.24,counter,span*.72,.028,.30,'#e3b965','night');
   for(const side of [-1,1]){put(u+side*(span/2-.10),roomTop/2,.21,.08,roomTop,.10,'#c9a557','core','box',0,'metal');put(u+side*span*.34,2.03,-depth+.18,.06,.5,.06,'#f2cf87','night');}
  }else if(food){
   // Tiled kitchen, stainless worktop, deep shelf, hood and stove.
   put(u,1.86,-depth+.16,span*.9,.13,.36,'#80684b','near','box',0,'wood');
   put(u,.61,counter,span*.76,.9,.46,'#486f62','core','box',0,'tile');
   put(u,1.10,counter,span*.82,.09,.6,'#bec4b9','core','box',0,'metal');
   put(u,roomTop-.36,-.25,span*.45,.36,.62,'#8f9d98','near','box',0,'metal');
   for(const side of [-1,1]){
    put(u+side*span*.23,1.33,counter,.48,.4,.45,'#adbab2','near','cylinder',0,'metal');
    put(u+side*span*.23,1.55,counter,.5,.055,.48,'#d0d3bd','detail','cylinder',0,'metal');
    put(u+side*span*.32,2.04,-depth+.21,.22,.23,.22,'#e3cf9d','detail','cylinder',0,'tile');
   }
   for(let k=0;k<4;k++)put(u-span*.26+k*span*.17,1.95,-depth+.22,.20,.12,.19,k%2?'#c48b5d':'#ead7b3','near','orb');
   if(out>1.25&&j===0){const x=u+span*.36;put(x,.42,1.03,.32,.08,.33,'#a34c3c','near','cylinder');for(const side of [-1,1])put(x+side*.11,.23,1.03,.045,.4,.08,'#743e32','detail','box',0,'metal');}
  }else if((seed+j)%5===0&&!site){
   // A closed tenant breaks the repeated fully lit restaurant rhythm.
   put(u,1.25,.09,span*.92,2.25,.11,'#647877','core','box',0,'metal');
   put(u,.3,.16,span*.9,.065,.05,'#3b4646','near','box',0,'metal');
  }else{
   put(u,.58,counter,span*.72,.75,.46,tea?'#876f49':'#537169','core','box',0,'wood');
   for(let shelf=0;shelf<2;shelf++){
    put(u,1.18+shelf*.56,-depth+.24,span*.85,.07,.4,'#a28558','near','box',0,'wood');
    for(let k=0;k<4;k++)put(u-span*.29+k*span*.19,1.39+shelf*.56,-depth+.20,.25,.32,.25,tea?'#c4b783':['#b9c3a2','#ad7954','#c1a573'][k%3]!,'near','cylinder',0,'tile');
   }
  }
  // Sloped cloth canopy, complete stripes, metal support arms and valance.
  if(out>.7&&!gold){const deep=Math.min(1.17,out-.08),stripes=6;
   for(let k=0;k<stripes;k++){const x=u-span/2+(k+.5)*span/stripes;
    put(x,roomTop-.22,deep*.5,span/stripes-.012,.075,deep,k%2?accent:'#d8c9a8','near','box',0,'cloth');
    put(x,roomTop-.38,deep-.04,span/stripes-.012,.24,.065,k%2?accent:'#d8c9a8','near','box',0,'cloth');
   }
   for(const side of [-1,1])put(u+side*span*.42,roomTop-.32,deep*.46,.045,.07,deep*.95,metal,'near','box',0,'metal');
  }
  // Upper wall is built around openings, never a giant coloured panel.
  for(let floor=0;floor<f.floors-1;floor++){
   const lo=base+floor*fh,cy=lo+fh*.53,ww=span*(modern?.81:.64),hh=Math.min(2.05,fh*.62),reserve=site?.composition==='goldTower'&&j===0;
   if(reserve){put(u,lo+fh/2,.035,bay-.02,fh,.18,wall,'core','box',0,wallSurface);continue;}
   const lower=cy-hh/2,upper=cy+hh/2,side=(bay-ww)/2;
   put(u,(lo+lower)/2,.035,bay-.02,lower-lo,.18,wall,'core','box',0,wallSurface);
   put(u,(upper+lo+fh)/2,.035,bay-.02,lo+fh-upper,.18,wall,'core','box',0,wallSurface);
   for(const s of [-1,1]){
    put(u+s*(ww/2+side/2),cy,.035,side-.01,hh,.18,wall,'core','box',0,wallSurface);
    put(u+s*(ww/2+.065),cy,.13,.13,hh+.22,.25,stone,'core');
    put(u+s*(ww/2-.035),cy,-.14,.075,hh,.34,'#626e66','core','box',0,'wood');
   }
   put(u,cy,-.27,ww,hh,.055,modern?'#456c79':song?'#354d42':'#2d4a54','core','box',0,'panel');
   if(modern||(seed+floor+j)%2===0)put(u,cy,.015,.065,hh,.11,modern?'#98aaa5':'#657566','core','box',0,modern?'metal':'wood');
   put(u,cy-hh/2-.06,.18,ww+.30,.14,.46,stone,'core');
   put(u,cy+hh/2+.08,.12,ww+.31,.16,.32,stone,'core');
   // Visible inner top edge gives a contact shadow without a shadow map.
   if(!modern)put(u,cy+hh/2-.04,-.06,ww,.07,.36,'#535b52','core');
   if(song||((seed+j+floor)%4===0))for(const s of [-1,1]){
    put(u+s*ww*.40,cy,.10,ww*.23,hh,.10,accent,'near','box',0,'wood');
    for(let sl=0;sl<3;sl++)put(u+s*ww*.40,cy-hh*.35+sl*hh*.30,.18,ww*.23,.045,.045,'#627b67','detail','box',0,'wood');
   }
   if(song)put(u,cy+hh/2+.14,.16,ww*.84,.35,.18,stone,'near','arch');
   if((seed+floor+j)%3===0){
    // Warm curtains occupy only part of the glass, remaining truly recessed.
    put(u-ww*.19,cy,-.225,ww*.39,hh*.88,.02,'#c9a36b','night');
    put(u+ww*.30,cy,-.21,ww*.12,hh*.9,.02,'#695f4c','core','box',0,'cloth');
   }
   if(!modern&&(seed+j+floor)%3!==1&&out>.7){
    put(u,cy-hh*.56,.42,ww+.46,.13,.92,stone,'core');
    for(const y of [cy-hh*.24,cy-hh*.49])put(u,y,.84,ww+.4,.055,.055,metal,'near','box',0,'metal');
    for(let k=0;k<4;k++)put(u-ww/2+k*ww/3,cy-hh*.36,.84,.035,.52,.035,metal,'near','box',0,'metal');
    
   }
   if(!song&&(seed+j+floor)%4===1){const x=u+span*.34;
    put(x,cy-hh*.49,.39,.73,.46,.45,'#bcc2b4','near','box',0,'metal');
    for(let k=0;k<4;k++)put(x,cy-hh*.49-.14+k*.09,.63,.62,.027,.04,'#566962','detail','box',0,'metal');
    for(const s of [-1,1])put(x+s*.26,cy-hh*.49-.29,.30,.045,.16,.55,metal,'detail','box',0,'metal');
   }
  }
 }
 // Cornice built in layers, with side-readable volumes and parapet coping.
 put(0,H-.16,.12,W,.30,.4,stone,'core');put(0,H+.045,.16,W+.03,.12,.52,song?'#b39d79':'#9b9c89','core','box',0,'concrete');
 for(let j=0;j<n;j++){const u=-W/2+(j+.5)*bay;if(!modern){put(u,H-.64,.17,bay*.75,.18,.23,stone,'near');if(song||seed%3===0)put(u,H-.54,.20,bay*.48,.31,.20,stone,'near','arch');}}
 for(const side of [-1,1]){put(side*(W/2-.07),H/2,.13,.14,H,.34,stone,'core');put(side*(W/2-.24),H/2,.33,.075,H-.45,.11,'#6c7769','near','cylinder',0,'metal');}
 // Proper double-sided projecting cabinet with brackets behind each face.
 if(!song&&W>4&&out>.85&&H>7){const u=-W/2+.33,sh=Math.min(4.6,H-3.7),sy=Math.min(H-sh/2-.45,7.8),v=.85;
  put(u,sy,v,1.30,sh,.22,seed%2?'#224f53':'#812b33','core','box',Math.PI/2);
  for(const end of [-1,1]){put(u,sy+end*(sh/2-.07),v,1.34,.10,.26,'#d5bd7b','near','box',Math.PI/2,'metal');put(u,sy+end*(sh/2-.22),.32,.10,.07,.74,metal,'core','box',0,'metal');}
  sign(u,sy,v,1.21,sh-.20,true,Math.PI/2,false,site?.sign??trades[0]);sign(u,sy,v,1.21,sh-.20,true,Math.PI/2,true,site?.sign??trades[0]);
 }
 if(site?.composition==='goldTower'){
  const u=-W/2+bay/2,sh=Math.min(7.5,H-base-.5),sy=base+.24+sh/2;
  put(u,sy,.28,bay*.60,sh,.35,'#7e2530','core');sign(u,sy,.47,bay*.52,sh-.25,true);
  for(const side of [-1,1])put(u+side*bay*.31,sy,.48,.065,sh+.06,.06,'#e1be68','near','box',0,'metal');
 }
 // The source width also determines cable span; no random street scattering.
 if(!song){for(let k=0;k<4;k++)put(0,Math.min(H-.8,5.7)+k*.12,.72,W-.12,.018,.024,'#252e30','near','box',0,'metal');
  put(-W/2+.4,3.9,.68,.095,7.8,.095,'#747e73','near','cylinder',0,'concrete');
 }
}
