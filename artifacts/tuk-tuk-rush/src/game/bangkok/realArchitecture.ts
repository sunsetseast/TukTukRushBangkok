import {curtain,glazing,entrance,planter,palm} from './heroCraft';
import { siteMasses } from './authoredSites';
import { buildEmDistrict } from './phromPhong';
import { buildSiamCenterDiscovery } from './commercialDistrictArt';
import { historicDistrictLandmark } from './historicDistricts';
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
 for(const [x,z,yaw,h] of [[-24,0,-.38,91],[-8,-5,.38,112],[8,-5,-.38,112],[24,0,.38,96]]){
  const c=Math.cos(yaw!),s=Math.sin(yaw!),put=(u:number,v:number,y:number,w:number,H:number,d:number,color:string,lit=false)=>b.box(x!+c*u+s*v,y,z!-s*u+c*v,w,H,d,color,yaw!,lit);
  put(0,0,h!/2,16,h!,16,'#d6d4c5');const floor=3.55,count=Math.floor((h!-4)/floor),step=detail?1:2;
  for(const side of [-1,1]){
   for(let f=0;f<count;f+=step)for(const u of [-5.4,-1.8,1.8,5.4]){const px=x!+c*u+s*side*8.04,pz=z!-s*u+c*side*8.04,y=4+f*floor;glazing(b,px,y,pz,2.3,2.5*step,.16,'#365664',yaw!);if(detail&&(f+Math.round(u*5))%17===0)put(u,side*8.16,y,1.8,1.7,.06,'#c6ad85',true);}
   for(let f=0;f<count;f+=step)put(0,side*8.26,2.7+f*floor,16.4,.25,.55,'#b9baad');
   for(const u of [-7.5,0,7.5])put(u,side*8.35,h!/2,.6,h!,.7,'#e4e2d1');
   glazing(b,x!+c*side*8.1,h!/2,z!-s*side*8.1,.18,h!-3,13,'#42616b',yaw!);
  }
  put(0,0,h!+.7,16,1.4,16,'#e5e0cd');put(0,0,h!+2,12,1,12,'#babeb1');
 }
 b.box(0,5,15,62,10,15,'#c6c0ab');curtain(b,0,5,22.7,60,8,detail,0,16,2);
 for(const x of [-22,0,22]){b.roof(x,5,25,13,7,3,'#c1ad87');if(detail)for(const u of [-5,5])b.box(x+u,2.5,26,.2,5,.2,STONE);}
 b.box(0,3.2,-17.8,26,6.4,11.8,'#c9c5b4');entrance(b,23,-23.8,detail);b.box(0,7.6,-24,25,2.3,.18,'#344b50');
 for(const x of [-28,28]){planter(b,x,-22,6,6,detail);palm(b,x,-22,7,detail);}
}
function hilton(b:B,detail:boolean){
 rounded(b,0,7,-2,35,22,94,'#deded0',detail);
 for(let f=0;f<(detail?29:15);f++){
  const y=10+f*(detail?3.15:6.3);
  for(const side of [-1,1])glazing(b,0,y+1,side>0?9.12:-13.12,32,2,.17,'#4a7180');
  rounded(b,0,y+2.6,-2,35.6,23,.95,'#d8dcd0',detail);
  if(detail&&f%7===0)b.box(5,y+1,9.24,3,1.5,.08,'#d3ba91',0,true);
 }
 for(const x of [-16.6,16.6])b.box(x,55,-2,.7,94,23,'#dee0d3');
 b.box(-10,56,-10,7,104,7,'#536b70');b.box(-10,109,-10,7,2,8,'#d2d7cb');
 b.sculpt(new T.CylinderGeometry(12.8,12.8,4,detail?32:16),4,105.5,0,'#31525e','glass');
 b.sculpt(new T.CylinderGeometry(15.3,15.3,.8,detail?32:16),4,108,0,'#d8dbcf');
 for(let i=0;i<(detail?18:9);i++){const a=i*Math.PI*2/(detail?18:9);b.box(4+Math.sin(a)*12.9,105.5,Math.cos(a)*12.9,.15,4,.15,'#b5c0bb');}
 b.sculpt(new T.CylinderGeometry(.15,.35,9,6),-10,115,-4,'#c9d0c7');
 b.box(0,4,3,46,8,31,'#d2d0c0');curtain(b,0,4,18.7,42,6,detail,0,12,1);
 b.box(0,3.2,-16.7,30,6.4,8.6,'#d0d0bf');entrance(b,27,-21,detail);b.box(0,7.8,-21,29,2.4,.18,'#344b50');
 for(const x of [-20,20]){planter(b,x,-18,5,5,detail);palm(b,x,-18,6,detail);}
 for(const x of [-19,19])planter(b,x,20,6,4,detail);
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
const builders:Record<string,(b:B,detail:boolean)=>void>={'peninsula':peninsula,'hilton':hilton,'rosewood':rosewood,'erawan-hotel':erawan,'eastin':eastin,'siam-center':buildSiamCenterDiscovery};
export function buildRealArchitecture(l:Landmark){
 const historic=historicDistrictLandmark(l);if(historic)return historic;
 const p=realPlace(l.id),make=['emporium','emquartier','emsphere'].includes(l.id!)?((b:B,detail:boolean)=>buildEmDistrict(l.id!,b,detail)):builders[l.id!];if(!p)return;
 const root=new T.LOD();
 for(const detail of [true,false]){let g=buildHeroArchitecture(p,detail);if(!g){if(!make)return;const b=new LandmarkBuilder();make(b,detail);g=b.finish(`${p.asset}-${detail?'near':'far'}`);}root.addLevel(g,detail?0:300,.12);}
 if(['hilton','peninsula','oriental'].includes(l.id!))root.userData.nightScale=.38;root.userData.authoredAsset=p.asset;root.userData.realPlace=p.id;root.userData.nightMaterials=root.levels.flatMap(l=>l.object.userData.nightMaterials);
 return root;
}
/** One original text atlas for all real-place names. No hotel logos or photo
 * textures. Canvas exists only in the renderer, never in registry/physics. */
export function buildRealPlaceSigns(d:District){
 if(typeof document==='undefined')return new T.Group();
 type Label={id:string;text:string;x:number;y:number;z:number;w:number;yaw:number;modelYaw?:number;plain?:boolean};
 const labels:Label[]=REAL_PLACES.filter(p=>!['state','oriental','hilton','peninsula'].includes(p.id)).map(p=>({id:p.id,text:p.name,x:0,y:6.6,z:Math.min(...siteMasses(p).map(m=>m.z-m.d/2))-9,w:Math.min(p.footprint[0]*.6,32),yaw:Math.PI,plain:true}));
 labels.push({id:'terminal',text:'TERMINAL21',x:-44.65,y:8.8,z:-12,w:24,yaw:-Math.PI/2},{id:'terminal',text:'TERMINAL21',x:44.65,y:8.8,z:-12,w:24,yaw:Math.PI/2},{id:'terminal',text:'TERMINAL21',x:17,y:27.3,z:32.3,w:39,yaw:0},{id:'icon',text:'ICONSIAM',x:0,y:8.8,z:-26.8,w:22,yaw:Math.PI,modelYaw:Math.PI/2},{id:'icon',text:'ICONSIAM',x:0,y:27,z:12,w:24,yaw:0,modelYaw:Math.PI/2},{id:'mahanakhon',text:'MAHANAKHON',x:-19.25,y:7.4,z:-1,w:25,yaw:-Math.PI/2},{id:'hilton',text:'MILLENNIUM HILTON',x:0,y:7.8,z:-21.1,w:28,yaw:Math.PI},{id:'peninsula',text:'THE PENINSULA',x:0,y:7.6,z:-24.1,w:24,yaw:Math.PI},{id:'oriental',text:'MANDARIN ORIENTAL',x:0,y:5.8,z:-34.9,w:20,yaw:Math.PI});
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;const ctx=canvas.getContext('2d')!,cols=2,rows=Math.ceil(labels.length/cols),cw=1024,rh=1024/rows,tiles:{left:number;top:number;width:number;height:number}[]=[];
 ctx.textAlign='center';ctx.textBaseline='middle';
 for(const[i,e]of labels.entries()){const x=i%cols*cw,y=Math.floor(i/cols)*rh;if(e.plain){ctx.fillStyle='#214a55';ctx.fillRect(x,y,cw,rh);}ctx.font=`600 ${Math.floor(rh*.55)}px "Rush Thai",sans-serif`;ctx.fillStyle=e.id==='terminal'?'#36515c':e.id==='icon'&&e.y<10?'#454c42':'#e7dbc1';const tw=Math.min(cw-24,ctx.measureText(e.text).width);ctx.fillText(e.text,x+cw/2,y+rh/2,cw-24);tiles.push({left:x+cw/2-tw/2-3,top:y+rh*.12,width:tw+6,height:rh*.76});}
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.minFilter=T.LinearFilter;tex.generateMipmaps=false;
 const mat=new T.MeshStandardMaterial({map:tex,alphaTest:.25,roughness:.75,emissive:'#ffffff',emissiveMap:tex,emissiveIntensity:.1}),root=new T.Group();
 for(const[i,e]of labels.entries()){const l=d.landmarks.find(l=>l.id===e.id);if(!l?.plot)continue;const t=tiles[i]!,geo=new T.PlaneGeometry(e.w,e.plain?1.8:e.w*t.height/t.width),uv=geo.getAttribute('uv');for(let j=0;j<uv.count;j++)uv.setXY(j,(t.left+uv.getX(j)*t.width)/2048,1-(t.top+(1-uv.getY(j))*t.height)/1024);const yaw=(l.yaw??0)+(e.modelYaw??0),c=Math.cos(yaw),s=Math.sin(yaw),m=new T.Mesh(geo,mat);m.position.set(l.plot.x+c*e.x+s*e.z,e.y,l.plot.z-s*e.x+c*e.z);m.rotation.y=yaw+e.yaw;m.name='ArchitecturalIdentity:'+e.id;root.add(m);}
 root.userData.materials=[mat];return root;
}
