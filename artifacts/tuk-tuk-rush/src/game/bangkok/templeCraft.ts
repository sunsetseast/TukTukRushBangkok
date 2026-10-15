import * as T from 'three';
import type {LandmarkBuilder} from './landmarkBuilder';
import {ribbonPath,sectionLoft,sculptedFace} from './sculptureGeometry';
/** Site-scale Thai roofing: curved eaves, layered gables, chofa and mirror ribs.
 * Original geometric interpretation; no copied ornaments or photo textures. */
export function thaiRoof(b:LandmarkBuilder,x:number,y:number,z:number,w:number,d:number,h:number,color:string,detail=true){
 const top=[[-.5,.14],[-.46,0],[-.32,.22],[-.14,.66],[0,1],[.14,.66],[.32,.22],[.46,0],[.5,.14]].map(([a,q])=>new T.Vector2(a!*w,q!*h));
 const shell=new T.Shape([...top,...[...top].reverse().map(p=>new T.Vector2(p.x,p.y-.18))]);
 b.sculpt(new T.ExtrudeGeometry(shell,{depth:d,bevelEnabled:false,curveSegments:1}).translate(0,0,-d/2),x,y,z,color,'ceramic');
 for(const side of [-1,1]){
  const gz=z+side*(d/2+.04),gable=new T.Shape([new T.Vector2(-w*.43,0),new T.Vector2(0,h*.94),new T.Vector2(w*.43,0)]);
  b.sculpt(new T.ExtrudeGeometry(gable,{depth:.15,bevelEnabled:false}),x,y,gz,'#a54232','ceramic');
  for(const direction of [-1,1]){
   b.sculpt(ribbonPath([[x,y+h,gz],[x+direction*w*.15,y+h*.65,gz],[x+direction*w*.32,y+h*.23,gz],[x+direction*w*.48,y+.08,gz]],.11,5,16),0,0,0,'#dcad50','gilded');
   const finial=new T.Shape([new T.Vector2(0,0),new T.Vector2(.18,1),new T.Vector2(.65,2.4),new T.Vector2(.5,1.1),new T.Vector2(.38,.2)]);
   b.sculpt(new T.ExtrudeGeometry(finial,{depth:.14,bevelEnabled:false}).scale(direction,Math.max(.55,h/5),1),x+direction*w*.47,y+.1,gz,'#e5bd66','gilded');
  }
  b.sculpt(ribbonPath([[x,y+h-.2,gz],[x+.35,y+h+.7,gz],[x+.15,y+h+1.9,gz],[x-.25,y+h+2.3,gz]],.11,5,14),0,0,0,'#e5bc61','gilded');
  if(detail){for(let row=1;row<6;row++){const span=w*.38*(1-row/7);for(let u=-span;u<=span;u+=1.1){b.sculpt(new T.OctahedronGeometry(.17,0).scale(1,1.3,.25),x+u,y+row*h/7,gz+side*.14,(row+Math.round(u))%2?'#65a89c':'#dfb75a','ceramic');}}}
 }
 if(detail)for(let q=-d/2+1;q<d/2;q+=1.35){
  b.sculpt(ribbonPath(top.map(p=>[x+p.x,y+p.y+.035,z+q]),.025,3,16),0,0,0,'#c59a53','ceramic');
 }
}
export function framedWindow(b:LandmarkBuilder,x:number,y:number,z:number,w:number,h:number,detail=true,color='#d5ab53'){
 b.box(x,y,z,w,h,.12,'#344b4a');
 for(const side of [-1,1]){b.box(x+side*(w/2+.1),y,z+.1,.18,h+.4,.22,color,0,true);b.box(x,y+side*(h/2+.1),z+.1,w+.4,.18,.22,color,0,true);}
 b.box(x,y,z+.14,.09,h,.11,'#c6a15a');
 if(detail){const triangle=new T.Shape([new T.Vector2(-w*.6,0),new T.Vector2(0,w*.65),new T.Vector2(w*.6,0)]);b.sculpt(new T.ExtrudeGeometry(triangle,{depth:.13,bevelEnabled:false}),x,y+h/2+.25,z,'#d9b156','gilded');}
}
/** Bell profile with twelve re-entrant corner rhythm, unlike Khmer prangs. */
export function royalChedi(b:LandmarkBuilder,x:number,z:number,h:number,r:number,color:string,detail=true){
 const profile=[[1,0],[1,.045],[.86,.065],[.91,.11],[.68,.14],[.75,.2],[.55,.25],[.66,.34],[.58,.43],[.43,.52],[.32,.57],[.3,.62],[.24,.68],[.18,.77],[.12,.86],[.06,.94],[0,1]];
 const seg=detail?48:24,p:number[]=[],idx:number[]=[];
 profile.forEach(([radius,y],i)=>{for(let j=0;j<=seg;j++){const a=j/seg*Math.PI*2,corner=1-.08*Math.cos(a*12);p.push(x+Math.sin(a)*r*radius!*corner,y!*h,z+Math.cos(a)*r*radius!*corner);if(i<profile.length-1&&j<seg){const k=i*(seg+1)+j;idx.push(k,k+1,k+seg+1,k+1,k+seg+2,k+seg+1);}}});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();b.sculpt(g,0,.4,0,color,'ceramic');
 for(const f of [.065,.14,.25,.43,.58,.68,.78,.87])b.sculpt(new T.CylinderGeometry(r*(1-f)*.9,r*(1-f)*.9,.16,24),x,h*f+.5,z,'#e1bc72','gilded');
 if(detail)for(const f of [.18,.32,.44,.53])for(let j=0;j<24;j++){const a=j/24*Math.PI*2,rr=r*(1-f)*.93;b.sculpt(new T.OctahedronGeometry(.18,0).scale(1,1.7,.5),x+Math.sin(a)*rr,h*f+.5,z+Math.cos(a)*rr,j%3===0?'#f1dfb4':j%3===1?'#698d83':'#b76a5b','ceramic',a);}
}
export function porcelainPrang(b:LandmarkBuilder,x:number,z:number,h:number,r:number,detail=true){
 b.prang(x,z,h,r,'#eee6d5');
 for(const f of [.08,.18,.28,.4,.53,.65]){
  const rr=r*(1-f)*.88;
  b.sculpt(new T.CylinderGeometry(rr*1.04,rr*1.1,.28,8),x,h*f,z,'#d5d4bd','ceramic',Math.PI/8);
  for(let j=0;j<(detail?24:8);j++){const a=j/(detail?24:8)*Math.PI*2,xx=x+Math.sin(a)*rr,zz=z+Math.cos(a)*rr;
   b.sculpt(new T.OctahedronGeometry(r*.045,0).scale(1,1.3,.4),xx,h*f+.7,zz,['#739b8b','#c9837b','#7895a8','#d5b264'][j%4]!,'ceramic',a);
   if(detail&&j%3===0){b.sculpt(new T.TorusGeometry(r*.045,r*.011,3,8).rotateY(a),xx,h*f+1.5,zz,'#d6b67b','gilded');}
  }
 }
 for(const side of [-1,1]){
  for(let step=0;step<12;step++){const y=step*h*.012,zp=side*(r*1.7-step*r*.075);b.box(x,y+.3,z+zp,r*.53,.5,r*.14,'#c8c2aa');}
  const recess=new T.Shape([new T.Vector2(-r*.17,0),new T.Vector2(-r*.17,h*.07),new T.Vector2(0,h*.1),new T.Vector2(r*.17,h*.07),new T.Vector2(r*.17,0)]);
  b.sculpt(new T.ExtrudeGeometry(recess,{depth:.1,bevelEnabled:false}),x,h*.18,z+side*r*.7,'#707c70','ceramic',side<0?Math.PI:0);
 }
}
export function guardian(b:LandmarkBuilder,x:number,z:number,h:number,color:string,detail=true){
 const S=h/8;b.box(x,.5*S,z,2*S,1*S,2*S,'#c9c4b0');
 const body=sectionLoft([{p:[x,1*S,z],a:.25*S,b:.3*S},{p:[x,2.2*S,z],a:.8*S,b:.55*S},{p:[x,4.5*S,z],a:.95*S,b:.48*S},{p:[x,5.2*S,z],a:.3*S,b:.3*S}],12,18);b.sculpt(body,0,0,0,color,'ceramic');
 if(detail)sculptedFace(b,[x,6.1*S,z],.43*S,false);
 else b.sculpt(new T.CylinderGeometry(.4*S,.5*S,1*S,8),x,6*S,z,color,'ceramic');
 b.sculpt(new T.ConeGeometry(.55*S,1.3*S,8),x,7.1*S,z,'#d9b160','gilded');
 for(const side of [-1,1])b.sculpt(ribbonPath([[x+side*.8*S,4.6*S,z],[x+side*.6*S,3.6*S,z+.5*S],[x+side*.2*S,3.4*S,z+.8*S]],.18*S,6,12),0,0,0,color,'ceramic');
 b.sculpt(new T.CylinderGeometry(.08*S,.1*S,4.5*S,6),x,2.8*S,z+1*S,'#9e8054','gilded');
}
