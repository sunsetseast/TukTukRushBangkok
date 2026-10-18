import { siteMasses } from './authoredSites';
import { buildHeroArchitecture } from './heroArchitecture';
import * as T from 'three';
import type { District, Landmark } from '../types';
import { LandmarkBuilder } from './landmarkBuilder';
import { realPlace, REAL_PLACES } from './realPlaces';
import { thaiRoof } from './templeCraft';

const IVORY='#e9e4d2', STONE='#bfb79e', GLASS='#427c87', DARK='#264f63', GOLD='#d6b46a';
type B=LandmarkBuilder;
function glass(b:B,x:number,y:number,z:number,w:number,h:number,d:number,color=GLASS,yaw=0){b.sculpt(new T.BoxGeometry(w,h,d),x,y,z,color,'glass',yaw);}
function tree(b:B,x:number,z:number,h=6){b.sculpt(new T.CylinderGeometry(.2,.4,h*.6,6),x,h*.3,z,'#866249');b.sculpt(new T.IcosahedronGeometry(h*.36,1).scale(1,1.2,1),x,h*.78,z,'#4f9c69');}
function slab(b:B,x:number,z:number,w:number,d:number,h:number,levels:number,detail:boolean,color=IVORY,yaw=0,y=0){
  b.box(x,y+h/2,z,w,h,d,color,yaw);
  const put=(u:number,v:number,Y:number,W:number,H:number,D:number,c:string,lit=false)=>b.box(x+Math.cos(yaw)*u+Math.sin(yaw)*v,y+Y,z-Math.sin(yaw)*u+Math.cos(yaw)*v,W,H,D,c,yaw,lit);
  for(const side of [-1,1]){
    put(0,side*(d/2+.04),h/2,w-1,h-2,.15,GLASS);
    for(let f=1;f<=levels;f++){
      const Y=f*h/levels;
      put(0,side*(d/2+.22),Y,w+.6,.28,.65,color);
      if(detail)for(let u=-w/2+2;u<w/2;u+=3.1){put(u,side*(d/2+.25),Y-h/levels*.48,.16,h/levels-.3,.35,color);if((Math.round(u*3)+f)%7===0)put(u+.7,side*(d/2+.3),Y-h/levels*.5,1.1,.5,.04,'#f7d5a0',true);}
    }
    put(side*(w/2+.04),0,h/2,.15,h-2,d-1,GLASS);
    if(detail)for(let f=1;f<=levels;f++)put(side*(w/2+.2),0,f*h/levels,.6,.28,d+.6,color);
  }
}
/** Extruded elevation: solid sloping silhouettes, never a tilted rectangle with
 * a name. Used for Rosewood's two different hand/wai profiles. */
function elevation(b:B,points:number[][],depth:number,x:number,z:number,color:string,finish:'glass'|'ceramic'='glass'){
 const s=new T.Shape(points.map(([u,v])=>new T.Vector2(u,v)));s.closePath();b.sculpt(new T.ExtrudeGeometry(s,{depth,bevelEnabled:false}).translate(0,0,-depth/2),x,0,z,color,finish);
}
function rounded(b:B,x:number,y:number,z:number,w:number,d:number,h:number,color:string,detail:boolean,yaw=0){
 const s=new T.Shape(),r=Math.min(w,d)*.28;s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
 const g=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:detail?8:3}).rotateX(-Math.PI/2);b.sculpt(g,x,y,z,color,'ceramic',yaw);
}
function arrival(b:B,w:number,d:number,detail:boolean){
 // Rear street entrance; river-facing (+Z) elevation has its own terraces.
 glass(b,0,3,-d/2+2,Math.min(w*.4,20),5,.3,DARK);
 b.box(0,6,-d/2+3,Math.min(w*.55,27),.55,7,STONE);
 for(const x of [-1,1])b.box(x*Math.min(w*.22,11),3,-d/2+1,.5,6,.5,IVORY);
 b.box(0,5.7,-d/2+3,Math.min(w*.45,22),.08,5,'#ffdca6',0,true);
 if(detail)for(const x of [-w*.4,w*.4])tree(b,x,-d*.34,6);
}
function peninsula(b:B,detail:boolean){
 // Four alternating angled slabs trace a W in plan. The uppermost floors step
 // down at the two outer shoulders; all four elevations retain the wave profile.
 const parts=[[-24,0,-.38,91],[-8,-5,.38,112],[8,-5,-.38,112],[24,0,.38,96]];
 for(const [x,z,yaw,h] of parts)slab(b,x!,z!,16,16,h!,detail?29:14,detail,'#d6d1bc',yaw!);
 for(const x of [-8,8]){b.box(x,113,-5,14,2,14,IVORY);b.box(x,115,-5,8,2,9,'#a3b5ae');}
 b.box(0,6,15,62,12,15,'#c4bda8');
 for(let x=-25;x<=25;x+=10){glass(b,x,6,22.6,6,8,.3,DARK);b.sculpt(new T.CylinderGeometry(.6,.7,10,10),x+4,5,23,IVORY);}
 b.box(0,.9,25,64,1.6,9,'#c4b594');
 for(const x of [-22,0,22]){b.roof(x,5,25,13,7,3,'#e8d8b7');if(detail)for(const u of [-5,5])b.box(x+u,2.5,26,.2,5,.2,STONE);}
 arrival(b,72,60,detail);
}
function hilton(b:B,detail:boolean){
 // Round-ended slab, continuous cream frame, off-centre rooftop lounge plate.
 rounded(b,0,6,-2,40,23,94,'#cbd5cd',detail);
 for(let f=0;f<(detail?30:15);f++){
   const y=9+f*(detail?3:6);rounded(b,0,y,0,40.5,24,.36,IVORY,detail);
   glass(b,0,y+1.5,12.1,34,2.2,.16,'#598f9b');
   glass(b,0,y+1.5,-13.6,34,2.2,.16,'#598f9b');
   for(const side of [-1,1])glass(b,side*20.1,y+1.5,-2,.16,2.2,15,'#598f9b');
 }
 for(const x of [-18,-11,11,18])b.box(x,54,12.4,.7,92,.6,IVORY);
 b.box(-13,58,-9,9,106,7,'#8d9994');b.box(-13,111,-9,9,2,8,IVORY);
 b.sculpt(new T.CylinderGeometry(13.5,12.5,2.8,detail?36:16),5,105,0,'#bed7d0','glass');
 b.sculpt(new T.CylinderGeometry(16,16,.9,detail?36:16),5,107,0,'#d5d8c7');
 b.sculpt(new T.CylinderGeometry(.15,.35,9,6),-10,115,-4,'#d2d9c9');
 b.box(0,4,3,46,8,31,IVORY);glass(b,0,4,18.6,42,6,.3);
 arrival(b,52,48,detail);
}
function rosewood(b:B,detail:boolean){
 const left=[[-23,0],[-23,44],[-12,113],[-5,113],[0,44],[-7,0]],right=[[0,0],[5,45],[4,119],[12,119],[23,45],[23,0]];
 elevation(b,left,27,0,0,'#4c7278');elevation(b,right,27,0,0,'#65858b');
 // Cladding follows the slope; the central opening remains physically empty.
 for(const side of [-1,1]){
   const a=side<0?[-23,44]:[23,45],top=side<0?[-12,113]:[12,119];
   const dx=top[0]!-a[0]!,dy=top[1]!-a[1]!,length=Math.hypot(dx,dy);
   const geo=new T.BoxGeometry(2,length,28);geo.rotateZ(-Math.atan2(dx,dy));b.sculpt(geo,(top[0]!+a[0]!)/2,(top[1]!+a[1]!)/2,0,IVORY);
 }
 for(let y=5;y<113;y+=detail?3:6){
   const lo=y<44?-23:-23+(y-44)*11/69,li=y<44?-7+y*7/44:(y-44)*-5/69;
   if(y<113)for(const z of [-13.7,13.7])b.box((lo+li)/2,y,z,li-lo,.3,.25,'#c0c5b8');
   const ri=y<45?y*5/45:5-(y-45)/74,ro=y<45?23:23-(y-45)*11/74;
   for(const z of [-13.7,13.7])b.box((ri+ro)/2,y,z,ro-ri,.3,.25,'#c4c7b8');
 }
 for(const y of [20,40,60,80]){b.box(0,y,0,9,.8,22,IVORY);if(detail){tree(b,0,0,3);b.box(0,y+.6,0,7,.4,16,'#508b65');}}
 arrival(b,48,42,detail);
}
function erawan(b:B,detail:boolean){
 slab(b,0,-4,49,28,58,17,detail,'#d5cdb6');
 for(let i=0;i<4;i++)slab(b,0,-4,43-i*8,25-i*3,3,1,false,IVORY,0,58+i*3);
 b.box(0,8,14,60,16,16,'#dfd3b8');
 for(const x of [-25,-16,-7,7,16,25])b.sculpt(new T.CylinderGeometry(.7,.8,13,8),x,6.5,22,IVORY);
 b.box(0,14,22,61,2,5,STONE);glass(b,0,6,23.1,17,10,.2,DARK);
 // Small shrine is on the street-side corner, not relabelled CentralWorld.
 b.box(-27,.7,-18,9,1.4,9,'#b3a17c');for(const x of [-29,-25])for(const z of [-20,-16])b.box(x,3,z,.3,5,.3,GOLD);
 thaiRoof(b,-27,5.5,-18,8,8,2,GOLD,detail);
}
function eastin(b:B,detail:boolean){
 slab(b,0,-3,31,27,107,detail?32:16,detail,'#b9cec8');
 for(const x of [-15,15])b.box(x,54,-3,1.3,108,28,'#dae3d1');
 b.box(0,42,13,37,4,10,'#b3b8a2');b.box(0,44.2,13,31,.3,7,'#50b9bd');
 b.box(0,109,-3,33,2,28,IVORY);arrival(b,42,40,detail);
}
function riverCity(b:B,detail:boolean){
 slab(b,0,-3,70,28,20,4,detail,'#d8d4c2');
 for(const x of [-25,-15,15,25])b.box(x,12,12,2,24,4,IVORY);
 const outer=new T.Shape();outer.moveTo(-11,0);outer.lineTo(-11,8);outer.absarc(0,8,11,Math.PI,0,true);outer.lineTo(11,0);outer.closePath();
 b.sculpt(new T.ExtrudeGeometry(outer,{depth:.5,bevelEnabled:false}),0,1,13,'#689ca2','glass');
 for(let x=-31;x<=31;x+=4)b.box(x,1,20,3,2,5,'#c1b395');arrival(b,74,48,detail);
}
function siamCenter(b:B,detail:boolean){
 b.box(-29,10,0,52,20,44,'#294f5c');glass(b,-29,11,22.2,49,15,.2,'#3d696e');
 b.box(29,13,0,52,26,47,'#bfcac2');
 for(let row=0;row<4;row++)for(let col=0;col<6;col++){
  const x=7+col*8.2,y=4+row*5.8,z=24+(row%2)*.5;
  glass(b,x,y,z,7,4.5,.15,'#50797d');
  for(const side of [-1,1])b.box(x+side*3.7,y,z+.2,.55,5.1,.55,IVORY);
  for(const side of [-1,1])b.box(x,y+side*2.5,z+.2,8,.55,.55,IVORY);
 }
 if(detail)for(const x of [-48,-34,-20])b.box(x,20.5,21,5,1.6,1.5,'#d64d45',0,true);
}
function jimThompson(b:B,detail:boolean){
 for(const [x,z,w,d,h] of [[-13,-6,14,24,7],[6,-8,16,20,8],[12,11,15,14,6],[-11,14,16,12,6]]){
  for(const u of [-1,1])for(const v of [-1,1])b.box(x!+u*w!*.4,2,z!+v*d!*.4,.6,4,.6,'#6d4835');
  b.box(x!,4+h!/2,z!,w!,h!,d!,'#955739');thaiRoof(b,x!,4+h!,z!,w!+3,d!+4,4,'#a55c3d',detail);
  for(let u=-w!/2+2;u<w!/2;u+=4)glass(b,x!+u,7,z!+d!/2+.1,1.4,2.5,.15,'#344e4d');
 }
 b.box(0,4,0,40,.35,5,'#ad744c');if(detail)for(const x of [-21,21])tree(b,x,15,8);
}
const builders:Record<string,(b:B,detail:boolean)=>void>={'peninsula':peninsula,'hilton':hilton,'rosewood':rosewood,'erawan-hotel':erawan,'eastin':eastin,'river-city':riverCity,'siam-center':siamCenter,'jim-thompson':jimThompson};
export function buildRealArchitecture(l:Landmark){
 const p=realPlace(l.id),make=builders[l.id!];if(!p)return;
 const root=new T.LOD();
 for(const detail of [true,false]){let g=buildHeroArchitecture(p,detail);if(!g){if(!make)return;const b=new LandmarkBuilder();make(b,detail);g=b.finish(`${p.asset}-${detail?'near':'far'}`);}root.addLevel(g,detail?0:300,.12);}
 root.userData.authoredAsset=p.asset;root.userData.realPlace=p.id;root.userData.nightMaterials=root.levels.flatMap(l=>l.object.userData.nightMaterials);
 return root;
}
/** One original text atlas for all real-place names. No hotel logos or photo
 * textures. Canvas exists only in the renderer, never in registry/physics. */
export function buildRealPlaceSigns(d:District){
 if(typeof document==='undefined')return new T.Group();
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;const c=canvas.getContext('2d')!;
 c.fillStyle='#214a55';c.fillRect(0,0,1024,1024);c.textAlign='center';c.textBaseline='middle';
 const entries=REAL_PLACES.filter(p=>p.id!=='state'),row=1024/entries.length;
 for(const [i,p] of entries.entries()){c.fillStyle='#edce8f';c.font=`600 ${p.name.length>35?23:28}px sans-serif`;c.fillText(p.name,512,row*(i+.5),990);}
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.minFilter=T.LinearFilter;tex.generateMipmaps=false;
 const mat=new T.MeshStandardMaterial({map:tex,roughness:.75,emissive:'#ffffff',emissiveMap:tex,emissiveIntensity:.35}),root=new T.Group();
 for(const [i,p] of entries.entries()){
  const l=d.landmarks.find(l=>l.id===p.id);if(!l?.plot)continue;
  const geo=new T.PlaneGeometry(Math.min(p.footprint[0]*.6,32),1.8),uv=geo.getAttribute('uv');
  for(let j=0;j<uv.count;j++)uv.setY(j,1-(i+1-uv.getY(j))/entries.length);
  const m=new T.Mesh(geo,mat),yaw=p.yaw+Math.PI,z=Math.min(...siteMasses(p).map(m=>m.z-m.d/2))-9;
  m.position.set(l.plot.x+Math.sin(p.yaw)*z,6.6,l.plot.z+Math.cos(p.yaw)*z);m.rotation.y=yaw;root.add(m);
 }
 root.userData.materials=[mat];return root;
}
