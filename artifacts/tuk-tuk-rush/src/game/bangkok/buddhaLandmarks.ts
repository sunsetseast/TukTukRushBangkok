import * as T from 'three';
import type { Landmark } from '../types';
import { LandmarkBuilder } from './landmarkBuilder';
const gold='#e8b84e',shade='#bb8735',hair='#c6993e';
function ellipsoid(b:LandmarkBuilder,x:number,y:number,z:number,w:number,h:number,d:number,col=gold,rx=0,rz=0){
  b.shape(new T.SphereGeometry(1,16,10).scale(w/2,h/2,d/2).rotateX(rx).rotateZ(rz),x,y,z,col,0,col!==shade);
}
function face(b:LandmarkBuilder,x:number,y:number,z:number,s:number){
  ellipsoid(b,x,y,z,2.5*s,3.6*s,2.35*s); // rounded cheeks taper to chin
  ellipsoid(b,x,y-1.1*s,z+.15*s,1.5*s,1.1*s,1.7*s);
  ellipsoid(b,x,y+.95*s,z-.18*s,2.6*s,1.75*s,2.5*s,hair);
  ellipsoid(b,x,y+2*s,z-.2*s,.9*s,1.35*s,.9*s,hair);
  ellipsoid(b,x,y-.1*s,z+1.17*s,.43*s,1.05*s,.58*s);
  for(const side of [-1,1]){
    ellipsoid(b,x+side*1.29*s,y-.15*s,z, .4*s,1.9*s,.65*s);
    b.shape(new T.TorusGeometry(.38*s,.035*s,4,8,Math.PI).rotateZ(Math.PI),x+side*.58*s,y+.3*s,z+1.04*s,shade);
    b.box(x+side*.57*s,y+.72*s,z+1.01*s,.8*s,.085*s,.09*s,shade,side*.1);
  }
  ellipsoid(b,x,y-.76*s,z+1.02*s,.75*s,.11*s,.12*s,shade);
}
export function buddhaLandmark(l:Landmark){
  if(!['pho','paknam'].includes(l.id!))return;
  const b=new LandmarkBuilder(),S=l.size!;
  if(l.id==='pho'){
    b.box(0,.5,0,S-1,1,S-1,'#d1c8af');
    // Full indoor hall: walls, columns and three roof tiers. Camera enters the hall.
    b.box(0,1.1,2,47,1.2,20,'#b59c67');
    b.box(0,2.5,2,44,1.6,8,'#994c3a');b.box(0,3.45,2,43,.35,8.4,'#e1be70',0,true);
    b.box(0,6.4,-7.3,47,10.8,.7,'#d6bd89');
    for(const x of [-23,23])b.box(x,6.4,2,.7,10.8,20,'#e4d0a0');
    for(let x=-21;x<=21;x+=6){
      b.box(x,6.3,10.7,.65,10.5,.65,'#963f38');b.box(x,10.9,10.7,1.2,.65,1.2,'#d3aa52',0,true);
      b.box(x,3,11,.65,.4,.8,'#dfc484');
    }
    b.box(0,11.6,10.7,47,.7,.7,'#aa753e');
    // Buddha reclines on its right side, head supported at the west end.
    ellipsoid(b,1,6.1,2.2,29,5.4,6.8);ellipsoid(b,12.2,5.5,2.3,15,4,5.4);
    ellipsoid(b,18.4,5.5,3.2,5.5,2.6,2.7);ellipsoid(b,18.7,5.25,.8,5.1,2.5,2.5);
    ellipsoid(b,-12.5,7.4,2.2,8.6,6.8,7.2);face(b,-17,9.8,2,1.35);
    ellipsoid(b,-17.8,7.8,3.4,1.8,4.3,2);ellipsoid(b,-15.9,6.2,4,5,1.8,2.1, gold,0,-.3);
    ellipsoid(b,-8,6.7,5.2,12,1.8,1.8,gold,0,-.08);
    ellipsoid(b,-2,6.3,5.5,3.4,.7,1.4);
    for(let i=0;i<8;i++)b.box(-6+i*2.9,6.5,5.75,.09,2.8,.07,'#d5a342',0,true);
    // Mother-of-pearl-inspired geometric soles, original ornament, no photo texture.
    for(const z of [.8,3.25])for(let i=0;i<4;i++)for(let j=0;j<3;j++)b.box(21,4.65+i*.45,z-.7+j*.65,.07,.2,.28,'#efe1b4');
    b.roof(0,12.2,2,49,23,4,'#315d68');b.roof(0,15,2,43,19,3.2,'#335963');
    // Four royal chedis and a ceremonial wall remain readable from the road.
    ['#518972','#eee1c4','#c4a344','#668ba3'].forEach((c,i)=>b.prang(-18+i*12,-18,18,3.7,c));
    for(const x of [-24,24])b.box(x,2.1,0,.65,3.2,48,'#e9dfc2');
    b.box(0,2.1,24,48,3.2,.7,'#ede0bc');b.roof(0,4,24,7,2,2,'#a34c38');
  }else{
    b.box(0,.7,0,S-1,1.4,S-1,'#d8ccb2');
    b.box(0,3,14,49,5,31,'#c5b394');b.box(0,6,14,45,1.4,28,'#e2ca90');
    // 69m bronze/gold seated figure: folded legs, resting hands, robe and long ears.
    ellipsoid(b,-10,12,17,29,12,19);ellipsoid(b,11,12,17,29,12,19);
    ellipsoid(b,0,29,12,26,35,20);ellipsoid(b,0,43,12,29,12,18);
    for(const side of [-1,1]){
      ellipsoid(b,side*13,31,15,7,26,7,gold,0,side*.12);
      ellipsoid(b,side*7,19,22,17,6,7,gold,0,-side*.2);
    }
    ellipsoid(b,-2,19,24,12,3,7);ellipsoid(b,3,20.3,24,10,2,5);face(b,0,55,12,3.7);
    for(let i=0;i<5;i++)b.shape(new T.TorusGeometry(12+i*.65,.16,4,20,Math.PI*.65).rotateX(.15).rotateZ(-.4),-1,35-i*3,19,'#c29234',0,true);
    // White twelve-sided Maharatchamongkhon pagoda behind the Buddha.
    for(let i=0;i<5;i++){
      const w=29-i*3.5;b.shape(new T.CylinderGeometry(w/2,w/2,6,12),0,4+i*6,-27,'#eee9d7');
      b.shape(new T.CylinderGeometry(w/2+1,w/2+1,.65,12),0,7+i*6,-27,'#d9dccc');
    }
    const profile=[[10,0],[11,2],[8,5],[9,7],[6,13],[5,22],[3,31],[2,40],[0,49]].map(([r,y])=>new T.Vector2(r!,y!));
    b.shape(new T.LatheGeometry(profile,12),0,30,-27,'#f3edda');
    for(const x of [-34,34]){b.box(x,4,-5,14,6,20,'#eee0bd');b.roof(x,7.4,-5,16,22,4,'#b95439');}
    for(const x of [-43,43])b.box(x,2,0,.8,3,87,'#e3d7b6');
  }
  const root=b.finish(`authored-${l.id}-buddha-v1`);root.userData.inspection=l.id==='pho';root.userData.nightScale=.18;return root;
}
