import * as T from 'three';
import type {Landmark} from '../types';
import {LandmarkBuilder} from './landmarkBuilder';
import {sectionLoft,ribbonPath,sculptedFace,sculptedHand,pearlSoleTexture,type Section} from './sculptureGeometry';
import {thaiRoof,royalChedi,framedWindow,guardian} from './templeCraft';
const GOLD='#dfb15b';
function robe(b:LandmarkBuilder,sections:Section[],detail:boolean){b.sculpt(sectionLoft(sections,detail?36:18,detail?70:34,sections.length>=5?.035:0),0,0,0,GOLD,'gilded');}
function sole(b:LandmarkBuilder,x:number,y:number,z:number,material:T.MeshStandardMaterial){
 const s=new T.Shape();s.moveTo(-.62,-1.8);s.quadraticCurveTo(-1.16,-1.2,-.92,.7);
 for(let i=0;i<5;i++){const a=-1+i*.4;s.quadraticCurveTo(a-.1,2.12-Math.abs(i-2)*.07,a+.22,2.18-Math.abs(i-2)*.07);}
 s.quadraticCurveTo(1.18,1.6,1.02,.4);s.quadraticCurveTo(.72,-1.4,.42,-1.8);s.quadraticCurveTo(0,-2.05,-.62,-1.8);
 const g=new T.ExtrudeGeometry(s,{depth:.2,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.09,bevelThickness:.07,curveSegments:5}),p=g.attributes.position!,uv=g.attributes.uv!;
 for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+1.2)/2.4,(p.getY(i)+2.1)/4.4);
 g.rotateY(Math.PI/2);b.painted(g,material,x,y,z);
 b.sculpt(new T.TorusGeometry(.48,.04,4,32).rotateY(Math.PI/2),x+.3,y-.1,z,'#eee7c2','ceramic');
}
function reclining(b:LandmarkBuilder,detail:boolean){
 // Continuous shoulder/chest/waist/hip sections, with the robe following the body.
 robe(b,[{p:[-16.6,8.3,2],a:1.05,b:1.1},{p:[-12.5,7,2],a:2.55,b:3.05},{p:[-9.5,6.5,2],a:2.65,b:3.1},{p:[-4,6.2,2.15],a:2.35,b:2.85},{p:[3,6,2.25],a:2.15,b:2.5},{p:[7.5,5.6,2.25],a:1.75,b:2.15},{p:[10,5.3,2.2],a:1.4,b:1.7}],detail);
 for(const side of [-1,1])robe(b,[{p:[5,5.75,2.2+side*.8],a:1.65,b:1.15},{p:[10,5.4,2.2+side*1.03],a:1.5,b:1.06},{p:[15.5,5.1,2.2+side*1.1],a:1.25,b:.95},{p:[19,5.2,2.2+side*1.16],a:1.05,b:.9},{p:[20.5,5.6,2.2+side*1.3],a:1.1,b:.95}],detail);
 // Supporting right elbow, forearm and vertical palm. The opposite arm rests
 // along the robe, with separated, tapered fingers rather than mitten spheres.
 robe(b,[{p:[-12.4,7.2,3.7],a:.85,b:.9},{p:[-14.3,5.05,4.6],a:.8,b:.8},{p:[-16.8,6.6,4.3],a:.58,b:.62},{p:[-18.6,8.55,.85],a:.38,b:.4}],detail);
 sculptedHand(b,[-18.6,8.65,.8],.75,0,true,detail);
 robe(b,[{p:[-11.4,7.7,4.4],a:.75,b:.75},{p:[-7.5,7,5.05],a:.7,b:.7},{p:[-3.4,6.5,5.1],a:.5,b:.6},{p:[-1.1,6.35,5.1],a:.18,b:.34}],detail);
 sculptedHand(b,[-.9,6.3,5.15],1.05,0,false,detail);
 b.box(-19.2,6.8,1.8,5.7,1.25,5.4,'#873e35');b.box(-19.2,7.5,1.8,5.4,.32,5.2,'#bd984f',0,true);
 sculptedFace(b,[-17.8,10.05,2.05],1.38,detail,.22);
 const pearl=new T.MeshStandardMaterial({map:pearlSoleTexture(),roughness:.42,metalness:.25});
 for(const z of [.8,3.6])sole(b,20.8,5.9,z,pearl);
}
function hall(b:LandmarkBuilder,detail:boolean){
 b.box(0,.5,0,49,1,49,'#d1c8af');b.box(0,1.05,2,47,1.1,20,'#a3997d');
 for(let tier=0;tier<4;tier++)b.box(0,1.8+tier*.47,2,44.6-tier*.4,.35,8.8-tier*.2,tier%2?'#b98c55':'#7d3e32');
 b.box(0,8.5,-7.5,49,15,.65,'#833c33');
 for(const x of [-24.4,24.4])b.box(x,8.5,2,.55,15,20,'#b9a272');
 // Burgundy mural fields with original lotus/landscape friezes; not photographs
 // and not a claim to reproduce a specific Jataka scene.
 for(let x=-21;x<=21;x+=6){
  b.box(x,8.2,-7.1,5.45,11.8,.1,'#684335');
  for(const y of [2.4,13.9])b.box(x,y,-6.96,5.5,.2,.1,'#d4b66c',0,true);
  if(detail)for(let row=0;row<3;row++)for(let j=-2;j<=2;j++)b.sculpt(new T.OctahedronGeometry(.26,0).scale(1,1.5,.15),x+j*.85,4+row*2.05,-6.91,['#d5b16a','#6c9985','#bd7960'][(j+row+6)%3]!,'ceramic');
 }
 for(let x=-21;x<=21;x+=6){
  b.sculpt(new T.CylinderGeometry(.32,.43,14.6,12),x,8.5,10.75,'#914334','ceramic');
  for(const y of [1.6,3,13.8,15.4])b.sculpt(new T.CylinderGeometry(y>10?.62:.47,y>10?.55:.5,.28,12),x,y,10.75,'#d9b66c','gilded');
  if(detail)for(let y=4;y<13;y+=.75)b.sculpt(new T.OctahedronGeometry(.12,0).scale(1,1.4,.4),x,y,11.09,'#e6bd71','gilded');
 }
 b.box(0,16.05,2,49,.24,20,'#6d382f');
 if(detail)for(let x=-22;x<=22;x+=3)for(let z=-5;z<=9;z+=3)b.sculpt(new T.OctahedronGeometry(.3,0).scale(1,.1,1),x,15.87,z,'#d4b16a','gilded');
 thaiRoof(b,0,16.4,2,49.5,22.8,3.6,'#47736c',detail);thaiRoof(b,0,18.85,2,41,19,3.3,'#ba4c34',detail);
 for(const [i,color] of ['#3e8265','#eee4cf','#d2a33a','#345d91'].entries())royalChedi(b,-18+i*12,-18,20,3.7,color,detail);
 for(const x of [-24.4,24.4])b.box(x,2.2,0,.6,3.2,49,'#e9dfc2');b.box(0,2.2,24.4,49,3.2,.6,'#ede0bc');
 for(const x of [-9,9])guardian(b,x,22.2,3.5,'#8c9685',false);
}
function seated(b:LandmarkBuilder,detail:boolean){
 b.box(0,.7,0,89,1.4,89,'#d8ccb2');
 for(let i=0;i<4;i++)b.box(0,1.6+i*1.4,14,49-i*1.2,1.25,31-i*.8,i%2?'#c0a277':'#d6bd86');
 robe(b,[{p:[0,9,12],a:8,b:6},{p:[0,15,12],a:13,b:10},{p:[0,27,12],a:12,b:9},{p:[0,36,12],a:13.5,b:8.2},{p:[0,41.2,12],a:14.2,b:7.1},{p:[0,44.3,12],a:5,b:4.8},{p:[0,51,12],a:3.8,b:3.7}],detail);
 // Interlaced thighs and bent knees are continuous curved anatomical sections.
 for(const side of [-1,1])robe(b,[{p:[side*9,13,12],a:4.5,b:5},{p:[side*18.5,11.8,17],a:5.3,b:5.7},{p:[side*11,11.2,22],a:4.1,b:4.6},{p:[-side*2,13.3,23],a:2.8,b:3.2},{p:[-side*7,15.2,22],a:.7,b:1.2}],detail);
 for(const side of [-1,1]){
  robe(b,[{p:[side*12,40,13],a:3.1,b:3.5},{p:[side*14.1,30,15],a:3.1,b:3.2},{p:[side*13.2,21.5,21],a:2.4,b:2.7},{p:[side*6,19.9,23.3],a:1.6,b:1.9},{p:[side*2.3,20.2+(side>0?.8:0),23.7],a:1.3,b:1.4}],detail);
  sculptedHand(b,[side*2,20.4+(side>0?.8:0),24],1.5,side>0?Math.PI:0,false,detail);
 }
 sculptedFace(b,[0,55.5,12],3.3,detail);
 // Maharatchamongkhon: white polygonal terraces behind the figure, with recesses.
 for(let i=0;i<5;i++){const r=14.5-i*1.65;b.sculpt(new T.CylinderGeometry(r,r,5.8,12),0,4+i*6,-27,'#eee9da','ceramic');b.sculpt(new T.CylinderGeometry(r+1,r+1,.55,12),0,7+i*6,-27,'#cec9b8','ceramic');
  if(detail)for(let j=0;j<12;j++){const a=j*Math.PI/6;b.sculpt(new T.BoxGeometry(1.3,2.2,.12),Math.sin(a)*(r+.02),4+i*6,Math.cos(a)*(r+.02)-27,'#849e9b','glass',a);}
 }
 const profile=[[10,0],[11,2],[8,5],[9,7],[6,13],[5,22],[3,31],[2,40],[0,49]].map(([r,y])=>new T.Vector2(r!,y!));b.sculpt(new T.LatheGeometry(profile,24),0,30,-27,'#f3eddf','ceramic');
 for(const x of [-34,34]){b.box(x,4,-5,14,6,20,'#eee0bd');thaiRoof(b,x,7.4,-5,16,22,4,'#b95439',detail);for(const z of [-11,-5,1])framedWindow(b,x,4,z,1.5,3,false);}
 for(const x of [-43,43])b.box(x,2,0,.8,3,87,'#e3d7b6');
 // Maharatchamongkhon forecourt, side salas and planted courts bind the statue
 // to the existing canal-side neighborhood without moving its arrival loop.
 for(const side of [-1,1]){
  for(const z of [-32,22]){
   b.box(side*35,.9,z,12,.45,12,'#83ac6d');
   b.sculpt(new T.CylinderGeometry(.25,.45,4.5,6),side*35,3,z,'#8d6a44');
   b.sculpt(new T.IcosahedronGeometry(3,1).scale(1,1.3,1),side*35,6,z,'#549b61');
  }
  for(let z=7;z<=32;z+=8){b.box(side*40,2,z,3.5,2.5,6,'#f1dfbb');thaiRoof(b,side*40,3.5,z,4.5,7,1.8,'#bc593f',false);}
  b.box(side*20,.83,-27,6,.25,27,'#c7b98d');
 }
 for(const x of [-31,31]){b.box(x,1,33,9,.7,11,'#a4bc78');b.sculpt(new T.CylinderGeometry(.3,.5,5,6),x,3.8,33,'#9c764a');b.sculpt(new T.IcosahedronGeometry(3.5,1).scale(1,1.25,1),x,7,33,'#5ba269');}
 b.box(0,.79,34,47,.18,1.2,'#ba8a57');for(const x of [-24,24])b.box(x,.79,21,1.2,.18,27,'#ba8a57');
 for(const x of [-8,8]){b.box(x,.85,37,8,.3,6,'#7fa66b');b.sculpt(new T.IcosahedronGeometry(1.5,1),x,2,37,'#6caa65');}
 for(let i=0;i<7;i++)b.box(0,.85+i*.24,-9-i*.65,9,.28,1,'#d4c5a8');
 for(const side of [-1,1])b.box(side*7,1.5,-14,.3,1.5,11,'#e7d9b8');

}
export function buddhaLandmark(l:Landmark){
 if(!['pho','paknam'].includes(l.id!))return;
 const make=(detail:boolean)=>{const b=new LandmarkBuilder();if(l.id==='pho'){hall(b,detail);reclining(b,detail);}else seated(b,detail);const g=b.finish(`sculpted-${l.id}-${detail?'hero':'road'}-v3`);g.userData.nightScale=.16;return g;};
 const near=make(true),far=make(false),root=new T.LOD();root.addLevel(near,0);root.addLevel(far,l.id==='pho'?95:135);root.userData.authoredAsset=`sculpted-${l.id}-v3`;root.userData.inspection=true;root.userData.nightScale=.16;root.userData.nightMaterials=[...near.userData.nightMaterials,...far.userData.nightMaterials];return root;
}
