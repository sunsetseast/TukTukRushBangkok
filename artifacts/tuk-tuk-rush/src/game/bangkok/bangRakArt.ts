import type { District } from '../types';
import type { ArtPiece } from './architecturalBatch';
import type { ParcelDesign } from './buildingGrammar';
import { BANG_RAK_PLAN, bangRakState } from './bangRakPlan';
import { sitePoint } from './authoredSites';
import { storefrontMount, STOREFRONT } from './storefrontMounts';
type Emit=(p:ArtPiece)=>void;
/** Original civic/industrial art, batched into the established spatial LODs. */
export function emitBangRakParcel(p:ParcelDesign,emit:Emit){
  const b=p.parcel,recipe=b.bangRak;if(!recipe)return false;
  const yaw=b.yaw??0,F=b.d/2,H=b.height,W=b.w,warehouse=recipe.family==='warehouse';
  const wall=recipe.family==='gallery'?'#d4d1bd':recipe.family==='merchant'?'#d3bc92':recipe.family==='timber'?'#9a8969':recipe.family==='workshop'?'#b8baa1':warehouse?'#d6cdb5':'#ded2af';
  const put=(u:number,y:number,v:number,w:number,h:number,d:number,color:string,surface:ArtPiece['surface']='plaster',layer:ArtPiece['layer']='core',shape:ArtPiece['shape']='box',pitch=0)=>{
    const q=sitePoint(b,yaw,u,v);emit({...q,y,w,h,d,color,surface,layer,shape,pitch,yaw,siteId:p.id});
  };
  // Actual open ground floor: rear wall, party walls, columns and upper mass.
  put(0,0.2,0,W,0.4,b.d,'#a99d83','concrete');
  put(0,2.6,-F+0.4,W,5.2,0.8,wall,'brick');
  for(const side of [-1,1])put(side*(W/2-.3),2.6,0,.6,5.2,b.d,wall,'brick');
  put(0,(H+5.2)/2,0,W,H-5.2,b.d,wall,'plaster');
  if(warehouse){
    // Shallow pitched corrugated roof: ridge parallel to the long warehouse.
    for(const side of [-1,1]){
      put(0,H+0.7,side*b.d/4,W+.7,.2,b.d*.54,'#695f52','metal','core','box',side*.29);
      for(let u=-W/2+1;u<W/2;u+=1.9)put(u,H+0.82,side*b.d/4,.09,.14,b.d*.55,'#8a8070','metal','near','box',side*.29);
    }
    put(0,H+1.42,0,W+.5,.18,.36,'#8b7b61','metal');
  }else{
    put(0,H+.15,0,W+.2,.35,b.d+.2,'#9d947d','concrete');
    put(0,H+.7,F-.25,W,1.1,.5,wall);
    if(recipe.family==='merchant')for(const side of [-1,1])put(side*W*.42,H+1.1,F-.2,.7,1.4,.7,'#dcd2b5');
    if(recipe.family==='timber')put(0,H+1,0,W,2,b.d,'#6f6b55','wood','core','gable');
  }
  for(const [i,a] of p.bays.entries()){
    const m=storefrontMount(p,a),width=a.width-1.2,u=a.u,frame=recipe.family==='gallery'?'#343e39':'#55614e';
    put(u,1.9,F-2.5,width,3.4,.13,recipe.family==='cafe'?'#5a4431':'#3e4740','wood');
    put(u,2.5,F-3.2,width-1,1.8,.08,'#d7b584','panel','night');
    put(u,4.6,F-1.8,width,.12,2.8,'#a89c7b','wood');
    for(const side of [-1,1]){
      put(u+side*width/2,2.6,F-.25,.4,5.2,.6,wall,'brick');
      // Open sliding/folding doors occupy the jamb, not the display or footpath.
      put(u+side*(width/2-.65),1.9,F+.12,1.0,3.5,.18,frame,warehouse?'metal':'wood');
      for(let y=.65;y<3.3;y+=.45)put(u+side*(width/2-.65),y,F+.23,.85,.08,.08,'#9b9d80','metal','detail');
    }
    if(recipe.trade!=='residence') put(u,4.32,m.v,m.width,m.height,m.depth,'#40564d','wood');
    // Short returns visibly support the cabinet on its own wall.
    if(recipe.trade!=='residence') for(const side of [-1,1])put(u+side*(m.width/2-.18),m.y,(m.v+F)/2,.24,.8,m.v-F,'#697260','metal');
    put(u,STOREFRONT.corniceY,F+.13,a.width,.22,.35,'#e0d7b9');
    if(!warehouse&&recipe.family!=='gallery'){
      put(u,STOREFRONT.awningY,F+.7,width,.12,1.5,recipe.family==='cafe'?'#756347':'#6c7764','cloth');
      put(u,STOREFRONT.awningLipY,F+1.42,width,.28,.12,'#8d987c','cloth');
    }
    // Gallery display is original geometry in a recessed bay, never a photo.
    if(['gallery','warehouse'].includes(recipe.family)){
      put(u,2.2,F-1.15,width*.43,2.25,.18,'#c7b28a','wood');
      put(u,2.2,F-.99,width*.36,1.94,.06,i%2?'#637e78':'#a56b50','panel');
      put(u,1.0,F-1.9,1.1,1.8,1.0,'#d8cbb2','concrete');
      put(u,2.16,F-1.9,.7,.5,.7,'#9b7056','wood','detail','orb');
    }else if(recipe.family==='workshop'){
      put(u,1,F-1.2,width*.75,1,1.1,'#776344','wood');
      for(let j=0;j<4;j++)put(u-width*.25+j*width*.16,1.7,F-1.1,.55,.65,.55,'#636c5e','metal','near','cylinder');
    }else if(recipe.family==='cafe'){
      put(u,1,F-1.1,width*.75,1.4,1.0,'#8c6d49','wood');
      put(u,1.9,F-1.1,.9,.75,.65,'#a8aba0','metal');
      for(let j=-1;j<=1;j++)put(u+j*.8,1.78,F-.4,.22,.3,.22,'#dbceac','concrete','detail','cylinder');
    }
    if(!warehouse){
      for(let floor=1;floor<a.floors;floor++){
        const y=5.7+(floor-.5)*(H-5.7)/(a.floors-1);
        for(const side of [-1,1]){
          const wx=u+side*width*.24;
          put(wx,y,F+.02,width*.32,1.95,.12,'#43584e','wood');
          put(wx,y+1.12,F+.16,width*.39,.2,.35,'#e8d9b4');
          for(const edge of [-1,1])put(wx+edge*width*.16,y,F+.16,.15,2.2,.24,'#e2d1ad');
          if(recipe.family==='timber')for(let slat=0;slat<6;slat++)put(wx,y-.75+slat*.3,F+.14,width*.28,.09,.12,'#7f8a6c','wood','near');
        }
        if(recipe.family==='merchant')put(u,y-1.25,F+.2,width,.2,.5,'#e1d3af');
      }
    }
  }
  for(const side of [-1,1]){
    put(side*(W/2-.25),H/2,F+.05,.35,H,.28,'#b7a98b');
    put(side*(W/2-.65),2,F+.15,.13,4,.14,'#657166','metal','near');
  }
  // Back/side elevations have service doors and high vents, never duplicate retail signs.
  for(const side of [-1,1])for(let v=-F+2;v<F-1;v+=4.5){
    put(side*(W/2+.03),H-1.5,v,.1,1.0,1.7,'#536453','wood','near');
  }
  return true;
}
export function emitBangRakGrounds(d:District,emit:Emit){
  const state=bangRakState(d);if(!state)return;
  const hero=BANG_RAK_PLAN.postal,yaw=hero.yaw;
  const put=(u:number,y:number,v:number,w:number,h:number,depth:number,color:string,surface:ArtPiece['surface']='plaster',layer:ArtPiece['layer']='core',shape:ArtPiece['shape']='box',rotation=0)=>{
    emit({...sitePoint(hero.origin,yaw,u,v),y,w,h,d:depth,color,surface,layer,shape,yaw:yaw+rotation,siteId:hero.id});
  };
  const stone='#c7b697',trim='#ded0b0',shadow='#40524d';
  // Three front wings and a clearly legible rear T stem.
  for(const m of hero.masses){
    put(m.x,m.h/2,m.z-1,m.w,m.h,m.d-2,stone,'brick');
    put(m.x,.45,m.z,m.w,.9,m.d,'#9d9079','concrete');
    put(m.x,m.h-.35,m.z,m.w+.3,.7,m.d+.5,trim,'concrete');
  }
  // Main frontage is structurally articulated: recessed full-height openings,
  // six strong piers per wing, deep reveals and metal mullions.
  for(const side of [-1,1])for(let i=0;i<6;i++){
    const u=side*(16+i*5.2),v=13.5;
    put(u,10.1,v-1.6,3.5,14.2,.16,shadow,'panel');
    put(u-2.25,10.1,v-.15,1.0,16.2,1.7,trim,'brick');
    put(u+2.25,10.1,v-.15,1.0,16.2,1.7,trim,'brick');
    for(const y of [5.5,9.8,14.1]){
      put(u,y,v-1.25,3.4,.25,.22,'#a99f82','metal');
      put(u,y+1.9,v-1.42,2.75,3.3,.06,'#c7aa76','panel','night');
    }
    put(u,10,v-1.2,.16,13.8,.18,'#a99c7e','metal');
    put(u,18.1,v-.1,4.2,.5,1.7,trim);
  }
  // Central portal is a genuine recess. Flanking fins give it civic scale.
  put(0,5,17,13,7.5,.3,'#303e37','wood');
  for(const u of [-4,0,4]) {put(u,4.5,17.35,3.2,6.1,.18,'#56644f','metal');put(u,5.2,17.48,2.6,3.3,.1,'#233a34','panel');put(u-1.8,4.7,17.6,.4,7.2,.45,trim);}
  for(const u of [-9,-6,6,9])put(u,11.6,17.8,1.4,20.8,3.1,trim,'brick');
  put(0,14,17.7,11,.75,3.0,trim);
  put(0,15.35,17.85,11.2,1.1,.5,stone);
  for(const u of [-5,5])put(u,15.35,16.9,.3,1.1,2.1,stone);
  put(0,19,17.1,8,5.8,.45,'#b8a787','brick');
  // Clock disc and hands; low-poly original relief in place of a copied texture.
  emit({...sitePoint(hero.origin,yaw,0,17.5),y:19.1,w:2.7,h:.16,d:2.7,color:'#eee0bd',yaw,pitch:Math.PI/2,shape:'cylinder',siteId:hero.id});
  put(0,19.55,17.7,.11,.95,.12,'#454c42');put(.35,19.1,17.7,.8,.12,.12,'#454c42');
  // Garudas: symmetrical sculptural wing/body silhouettes on the high corners.
  for(const side of [-1,1]){
    const u=side*10.2;
    put(u,24,17,1.0,2.2,.8,trim,'concrete','core','orb');
    put(u,25.35,17,.65,.75,.6,trim,'concrete','core','orb');
    for(const wing of [-1,1])for(let f=0;f<4;f++)put(u+wing*(.7+f*.4),24.6-f*.23,17,.45,1.5-f*.12,.34,trim,'concrete','near');
    put(u,26,17,.22,.7,.25,'#bba67b','concrete','near');
  }
  // Paving stays within a narrow apron beside the preserved arterial bend.
  put(0,.07,30,92,.14,20,'#bab09a','concrete');
  for(let u=-44;u<=44;u+=4)put(u,.15,30,.04,.025,20,'#9b927f','concrete','near');
  for(let v=21;v<40;v+=4)put(0,.15,v,92,.025,.045,'#9b927f','concrete','near');
  for(let step=0;step<6;step++)put(0,.17+step*.13,23-step*.65,16,.3+step*.26,1.1,trim,'concrete');
  // Central forecourt monument: original sculptural interpretation.
  put(0,.5,33,3.8,1,3.8,'#9d927b','concrete');put(0,1.5,33,2,1.2,2,stone,'concrete');
  put(0,3,33,.75,1.8,.7,'#6b6551','metal','near');put(0,4.1,33,.65,.65,.6,'#6b6551','metal','near','orb');
  for(const u of [-38,38]){
    put(u,.4,29,6,.8,3,'#aaa186','concrete');put(u,1.1,29,5.4,.9,2.5,'#648057','wood','near','orb');
  }
  // Lamp housings and selected apertures share the existing night material;
  // no point lights or full-facade glowing sheets.
  for(const u of [-35,-20,20,35]){
    put(u,2,15.5,.5,1.2,.3,'#555d50','metal');put(u,2,15.7,.3,.85,.08,'#d1b17d','panel','night');
  }
}
