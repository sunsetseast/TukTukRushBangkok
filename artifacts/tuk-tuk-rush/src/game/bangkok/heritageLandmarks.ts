import * as T from 'three';
import type {Landmark} from '../types';
import {LandmarkBuilder} from './landmarkBuilder';
import {thaiRoof,framedWindow,porcelainPrang,royalChedi,guardian,porcelainMaterial} from './templeCraft';
import {ribbonPath,sectionLoft} from './sculptureGeometry';
const sites=['arun','palace','traimit','golden','swing','democracy','victory','gate','hua','asiatique','mbk','central','terminal','flowers','food','chatuchak'];
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
 }else if(l.id==='palace'){
  wall(b,134,detail);
  // Chakri's pale classical lower storeys contrast with the temple precinct.
  b.box(25,7,24,63,13,32,'#e4dbc7');
  for(const x of [1,25,49]){b.box(x,13,24,17,12,35,'#ede5d0');thaiRoof(b,x,19.5,24,19,38,7,'#517f65',detail);royalChedi(b,x,24,40,2,'#d8ad4e',detail);}
  for(let x=-3;x<=53;x+=4.5)framedWindow(b,x,8,40.2,2.3,5,detail,'#d8c6a4');
  pavilion(b,-38,24,28,52,11,'#b94735',detail);
  pavilion(b,29,-35,31,33,12,'#4f7e69',detail);royalChedi(b,29,-35,47,3.5,'#d6ae50',detail);
  royalChedi(b,-46,-40,41,11,'#d6b257',detail);porcelainPrang(b,-12,-40,34,7.7,detail);
  if(detail)for(const x of [-58,58])for(let z=-48;z<51;z+=8)guardian(b,x,z,3.2,'#95a28b',false);
  for(const x of [-9,9])guardian(b,x,60,7.5,x<0?'#64977d':'#bb786c',detail);
 }else if(l.id==='traimit'){
  for(let i=0;i<4;i++){const w=46-i*5.8;b.box(0,1.4+i*3,0,w,2.8,w,'#e7e1d5');for(const side of [-1,1])b.box(0,2.8+i*3,side*w/2,w,.3,.4,'#cdb76d',0,true);}
  for(let i=0;i<14;i++)b.box(0,.5+i*.77,22-i*.65,9.5,.8,1.1,'#bfc1b7');
  pavilion(b,0,0,23,23,17,'#cda750',detail);royalChedi(b,0,0,42,2.6,'#dcb55a',detail);
  for(const x of [-16,16])for(const z of [-16,16])royalChedi(b,x,z,18,1.5,'#dfbd68',detail);
 }else if(l.id==='golden'){
  // Terraced planted hill and a continuous spiral stair silhouette.
  for(let i=0;i<8;i++)b.sculpt(new T.CylinderGeometry(22-i*1.8,24-i*1.8,3.1,20),0,1.8+i*3,0,i%2?'#819167':'#6c805c','ceramic');
  b.sculpt(new T.CylinderGeometry(9,10,4,16),0,26.5,0,'#e2d7b8','ceramic');
  // Its visible golden crown is separately elevated, preserving the planted base.
  const crown=new T.LatheGeometry([[0,0],[6,0],[6,.8],[5.2,1.4],[5.4,2.1],[4.1,2.6],[4.7,4],[4.4,5.8],[3.4,8],[2.2,9.5],[2.1,10.5],[1.7,11.5],[1.4,13],[.8,16],[0,20]].map(([r,y])=>new T.Vector2(r!,y!)),24);b.sculpt(crown,0,28,0,'#e2b34e','gilded');
  if(detail)for(let i=0;i<86;i++){const a=i*.115,r=23-i*.125,y=1+i*.29;b.box(Math.sin(a)*r,y,Math.cos(a)*r,1.25,.33,2.4,'#d5cdb5',a+Math.PI/2);if(i%3===0)b.sculpt(new T.CylinderGeometry(.05,.05,1,4),Math.sin(a)*(r+1.1),y+.6,Math.cos(a)*(r+1.1),'#e3d5b1','ceramic');}
 }else if(l.id==='swing'){
  for(const x of [-5.2,5.2]){b.box(x,1,0,2.2,1.5,2.5,'#cac5b3');b.sculpt(new T.CylinderGeometry(.38,.55,19,8),x,10.5,0,'#b52f2e','ceramic');b.box(x,19.5,0,1.1,1.8,1.1,'#b52f2e');}
  const lintel=new T.Shape([new T.Vector2(-7.2,0),new T.Vector2(-7.8,1.1),new T.Vector2(-5.5,.6),new T.Vector2(0,.4),new T.Vector2(5.5,.6),new T.Vector2(7.8,1.1),new T.Vector2(7.2,0),new T.Vector2(0,-.25)]);
  b.sculpt(new T.ExtrudeGeometry(lintel,{depth:.8,bevelEnabled:false}).translate(0,0,-.4),0,20.6,0,'#b52f2e','ceramic');
  b.box(0,19.4,0,13,.45,.8,'#9d282a');
 }else if(l.id==='democracy'){
  for(let i=0;i<3;i++)b.sculpt(new T.CylinderGeometry(13-i,13.6-i,.5,32),0,.6+i*.45,0,'#c8c7b7','ceramic');
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,x=Math.sin(a)*10,z=Math.cos(a)*10;
   const wing=new T.Shape([new T.Vector2(-2.6,0),new T.Vector2(2.6,0),new T.Vector2(1.7,21),new T.Vector2(-.35,23),new T.Vector2(-1.3,15)]);
   b.sculpt(new T.ExtrudeGeometry(wing,{depth:1.3,bevelEnabled:true,bevelSegments:1,steps:1,bevelThickness:.08,bevelSize:.08}),x,1.8,z,'#e9e0ca','ceramic',a);
   b.box(x,2.7,z,4.5,2.1,3,'#b4a27e',a);if(detail)for(let j=0;j<7;j++)b.box(x+Math.cos(a)*(j-3)*.5,2.9,z-Math.sin(a)*(j-3)*.5,.18,1.35,3.04,'#c7b58e',a);
  }
  b.sculpt(new T.CylinderGeometry(3,4.4,3.5,12),0,3.2,0,'#e1d3ae','ceramic');b.sculpt(new T.CylinderGeometry(2.1,1.2,1.2,16),0,5.5,0,'#d2ac55','gilded');b.box(0,6.5,0,2.8,.35,1.8,'#e6c477',0,true);
 }else if(l.id==='victory'){
  for(let i=0;i<3;i++)b.sculpt(new T.CylinderGeometry(11-i*1.1,12-i*1.1,1.1,20),0,.8+i,0,'#bec4b9','ceramic');
  b.box(0,5,0,9,4,9,'#c7c9bb');b.sculpt(new T.CylinderGeometry(.6,2.6,32,4),0,23,0,'#e2e0cf','ceramic',Math.PI/4);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;civicFigure(b,Math.sin(a)*8,Math.cos(a)*8,i);}
 }else if(l.id==='gate'){
  for(const x of [-9,9])for(const z of [-4,4]){b.sculpt(new T.CylinderGeometry(.72,.95,10.5,12),x,5.5,z,'#ab303a','ceramic');b.sculpt(new T.CylinderGeometry(1.2,1.2,.35,12),x,1,z,'#c8ba90','ceramic');}
  b.box(0,10.2,0,21,1.5,9,'#ad3b3d');
  for(const [y,w,d] of [[11,26,12],[13.4,20,10]]){const points=[[-w!/2,1.2],[-w!*.4,0],[0,2.8],[w!*.4,0],[w!/2,1.2]];const s=new T.Shape(points.map(([x,y])=>new T.Vector2(x!,y!)));s.lineTo(w!/2,.8);s.lineTo(0,2.3);s.lineTo(-w!/2,.8);b.sculpt(new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false}).translate(0,0,-d!/2),0,y!,0,'#438170','ceramic');
   if(detail)for(let z=-d!/2;z<d!/2;z+=.7)b.sculpt(ribbonPath(points.map(([x,q])=>[x!,y!+q!+.03,z]),.035,3,10),0,0,0,'#91ac7e','ceramic');}
  for(const side of [-1,1])b.box(0,10.3,side*4.7,9,1.2,.2,'#174a48');
  if(detail)for(let x=-8;x<=8;x+=2)b.sculpt(new T.OctahedronGeometry(.35,0),x,9.4,4.7,'#dbba62','gilded');
 }else if(l.id==='hua'){
  b.box(0,5,0,67,10,55,'#e2d4b5');for(const x of [-26,26]){b.box(x,8,27,14,15,3,'#ddcfb2');b.box(x,15.7,27,15,.7,3.4,'#c4ab83');}
  const front=new T.Shape();front.moveTo(-18,0);front.lineTo(-18,4);front.absarc(0,4,18,Math.PI,0,true);front.lineTo(18,0);front.closePath();b.sculpt(new T.ExtrudeGeometry(front,{depth:3,bevelEnabled:false}),0,5,26,'#d3b888','ceramic');
  b.sculpt(new T.CircleGeometry(16,32,0,Math.PI),0,9,29.15,'#567e83','glass');
  for(let a=0;a<=Math.PI;a+=Math.PI/12)b.sculpt(ribbonPath([[0,9,29.35],[Math.cos(a)*15.8,9+Math.sin(a)*15.8,29.35]],.09,4,1),0,0,0,'#d0c6a5','ceramic');
  for(const r of [6,11,16])b.sculpt(new T.TorusGeometry(r,.12,4,32,Math.PI),0,9,29.4,'#d0c6a5','ceramic');
  for(let x=-29;x<=29;x+=5.8){b.box(x,4.5,28.6,3.2,6,.4,'#395d65');b.box(x+2,5,28.9,.7,8,.55,'#c8b28d');}
  b.sculpt(new T.CircleGeometry(1.7,24),0,18,29.8,'#f0e6cb','ceramic');b.box(0,18,30,.13,2.4,.06,'#3c524f');b.box(.5,18,30,1,.12,.06,'#3c524f');
  b.box(0,2,31,69,.8,5,'#c9c2ac');
 }else if(l.id==='asiatique'){
  for(const x of [-11,11]){b.box(x,5,-9,20,9,22,'#9b6349');b.roof(x,9.5,-9,21,23,4,'#704e43');for(let u=-7;u<=7;u+=3.5){b.box(x+u,4,2.1,2.8,5.5,.2,'#3c625e');b.box(x+u,7.6,2.3,3.5,.3,.4,'#cfad73',0,true);}}
  for(const x of [-8,8])b.sculpt(ribbonPath([[x,0,17],[0,22,17]],.4,6,1),0,0,0,'#d8d1b5','ceramic');
  for(const r of [16,16.7])b.sculpt(new T.TorusGeometry(r,.2,5,48),0,22,17,'#e5ddd0','ceramic');
  for(let i=0;i<16;i++){const a=i*Math.PI/8,x=Math.sin(a)*16,y=22+Math.cos(a)*16;b.sculpt(ribbonPath([[0,22,17],[x,y,17]],.08,4,1),0,0,0,'#b4bdb5','ceramic');b.box(x,y-1.2,17,1.7,2.2,2,'#78a3a1',0,true);}
 }else if(['mbk','central','terminal'].includes(l.id!)){
  const tint=l.id==='mbk'?'#a5beae':l.id==='central'?'#d7d8cd':'#c2cac3';b.box(0,15,0,60,29,56,tint);
  for(const side of [-1,1])for(let x=-28;x<=28;x+=3.5){b.sculpt(new T.BoxGeometry(3.3,25,.3),x,15,side*28.3,x%7===0?'#8badae':'#557e8b','glass');b.box(x,15,side*28.6,.12,26,.18,'#d6d9cc');}
  for(let y=5;y<=27;y+=6)b.box(0,y,28.8,60,.5,.7,tint,0,true);
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
