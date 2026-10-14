import * as T from 'three';
import type { Landmark } from '../types';
import { LandmarkBuilder } from './landmarkBuilder';
export function skylineLandmark(l:Landmark){
  if(!['mahanakhon','baiyoke','state'].includes(l.id!))return;
  const b=new LandmarkBuilder();
  if(l.id==='mahanakhon'){
    b.box(0,4,0,39,8,39,'#b7c7cb');b.box(0,74,0,17,140,17,'#375f75');
    // Spiral pixel ribbon is missing volume, not boxes glued to a rectangular shaft.
    for(let level=0;level<35;level++)for(let x=0;x<5;x++)for(let z=0;z<5;z++){
      if(x>0&&x<4&&z>0&&z<4)continue;
      const perimeter=x===0?z:z===4?4+x:x===4?12-z:16-x;
      const band=(level*.48+3)%16;
      if(Math.min(Math.abs(perimeter-band),16-Math.abs(perimeter-band))<1.5&&level>5)continue;
      const px=(x-2)*6.5,pz=(z-2)*6.5;
      b.box(px,10+level*4,pz,6.35,3.8,6.35,level%3?'#608eaa':'#436c83');
      if((x===0||x===4)&&level%3===0)b.box(px+(x===0?-3.19:3.19),10+level*4,pz,.08,.65,5.8,'#a8d6d4',0,true);
      if((z===0||z===4)&&level%4===0)b.box(px,10+level*4,pz+(z===0?-3.19:3.19),5.8,.65,.08,'#d7bb89',0,true);
    }
    b.box(0,151,0,23,.8,23,'#b8d6d3',0,true);b.box(4,153,3,10,3,10,'#31576c');
  }else if(l.id==='baiyoke'){
    b.box(0,8,0,38,16,36,'#d7c7a6');
    for(let i=0;i<4;i++){
      const y=16+i*27,w=34-i*4;b.box(0,y+13.5,0,w,27,w*.8,'#cbbd9a');
      for(let f=0;f<7;f++)for(const side of [-1,1]){
        b.box(0,y+2+f*3.5,side*(w*.4+.03),w-3,1.7,.15,'#497e81');
        b.box(side*(w*.5+.03),y+2+f*3.5,0,.15,1.7,w*.8-3,'#497e81');
      }
      b.box(0,y+26.5,0,w+1,.7,w*.8+1,'#eee0bd');
    }
    b.shape(new T.CylinderGeometry(13,11,6,16),0,127,0,'#d2c093');
    b.shape(new T.CylinderGeometry(13.6,13.6,.9,20),0,130.5,0,'#bcb291',0,true);
    b.shape(new T.CylinderGeometry(8,10,6,16),0,134,0,'#527e86');
    b.shape(new T.CylinderGeometry(5.8,8,5,16),0,139.5,0,'#d9c7a4');
    b.shape(new T.CylinderGeometry(.18,.45,14,8),0,149,0,'#c6d1cb',0,true);
  }else{
    b.box(0,8,0,39,16,37,'#d7c8aa');b.box(0,61,0,33,106,29,'#d8d4c2');
    for(let y=19;y<110;y+=3.4)for(const side of [-1,1]){
      b.box(0,y,side*14.8,32,.7,.9,'#eee5d0');b.box(0,y+1.1,side*14.62,29,1.2,.2,'#63818a');
      b.box(side*16.7,y,0,.9,.7,29,'#e8dfc9');
    }
    b.box(0,115,0,30,5,27,'#d8caad');
    for(const x of [-8,-3,3,8])for(const z of [-8,8])b.shape(new T.CylinderGeometry(.65,.65,7,8),x,121,z,'#e8ddc1',0,true);
    b.shape(new T.CylinderGeometry(11,11,1.5,20),0,125.4,0,'#d9b05b',0,true);
    b.shape(new T.SphereGeometry(11,20,10,0,Math.PI*2,0,Math.PI/2).scale(1,.8,1),0,126,0,'#e9bd51',0,true);
    b.shape(new T.CylinderGeometry(.1,.8,3,8),0,136,0,'#e8c274',0,true);
  }
  const detailed=b.finish(`authored-${l.id}-skyline-v2`),coarse=new LandmarkBuilder();
  if(l.id==='mahanakhon'){
    coarse.box(0,4,0,39,8,39,'#b7c7cb');coarse.box(0,76,0,17,144,17,'#456d82');
    for(let y=0;y<18;y++)for(let edge=0;edge<8;edge++){
      const cut=(Math.floor(y*.6)+2)%8;if(edge===cut||edge===(cut+1)%8)continue;
      const a=edge*Math.PI/4;coarse.box(Math.sin(a)*12,12+y*8,Math.cos(a)*12,9,7.7,9,'#698fa4');
    }
  }else if(l.id==='baiyoke'){
    for(let i=0;i<4;i++)coarse.box(0,16+i*27,0,36-i*4,30,29-i*3,'#c7bea3');
    coarse.shape(new T.CylinderGeometry(13,10,8,12),0,127,0,'#b9c6b8');coarse.shape(new T.CylinderGeometry(6,10,13,12),0,137,0,'#92a99e');coarse.box(0,150,0,.4,16,.4,'#ccd3ca');
  }else{
    coarse.box(0,60,0,33,120,29,'#cccdbd');coarse.box(0,122,0,28,5,26,'#ded5b8');coarse.shape(new T.SphereGeometry(11,12,6,0,Math.PI*2,0,Math.PI/2).scale(1,.8,1),0,126,0,'#e4b854',0,true);
  }
  const distant=coarse.finish(`${l.id}-distant`),root=new T.LOD();root.addLevel(detailed,0);root.addLevel(distant,360);
  root.userData.authoredAsset=detailed.userData.authoredAsset;root.userData.nightMaterials=[...detailed.userData.nightMaterials,...distant.userData.nightMaterials];return root;
}
export function civicLandmark(l:Landmark){
  if(!['palace','traimit','democracy','victory','hua','khaosan'].includes(l.id!))return;
  const b=new LandmarkBuilder(),S=l.size!;
  b.box(0,.5,0,S-.5,1,S-.5,'#d5c9ac');
  if(l.id==='palace'){
    for(const x of [-66,66])b.box(x,2,0,1,3.3,132,'#ede5ce');
    for(const z of [-66,66])b.box(0,2,z,132,3.3,1,'#ede5ce');
    for(const x of [-45,-8,30]){
      b.box(x,5,15,25,9,53,'#eee1c1');
      for(let z=-7;z<40;z+=7)for(const side of [-1,1])b.box(x+side*11.8,7,z,.65,13,.65,'#d9b15d',0,true);
      b.roof(x,10,15,30,57,7,'#b53d38');b.roof(x,15,15,24,48,5,'#376e65');b.roof(x,19,15,18,38,4,'#bd4b37');
      for(const z of [-13,43])b.prang(x,z,25,1.5,'#dabb5d');
    }
    b.prang(-44,-42,42,13,'#d9ba54');b.prang(-7,-40,35,10,'#e2d8be');
    b.box(33,8,-37,35,15,28,'#ede4d0');b.roof(33,16,-37,40,32,7,'#4d795f');b.prang(33,-37,45,4,'#d3a74c');
    for(let x=-60;x<60;x+=10)b.box(x,2,65,2.4,3,2,'#e8ddbc');
  }else if(l.id==='traimit'){
    for(let i=0;i<4;i++)b.box(0,1.5+i*3,0,46-i*6,3,46-i*6,'#e8e1d2');
    for(let i=0;i<10;i++)b.box(0,.6+i*1.05,21-i*.9,10,1.1,1.2,'#c8c6b7');
    b.box(0,16,0,23,8,24,'#e8dbc0');
    for(const x of [-10,10])for(const z of [-9,-3,3,9])b.box(x,16,z,.7,9,.7,'#e2c786');
    b.roof(0,20.3,0,28,29,6,'#a84938');b.roof(0,24,0,21,23,5,'#c79842');b.prang(0,0,35,2.4,'#dbb455');
    for(const x of [-16,16])for(const z of [-16,16])b.prang(x,z,18,1.6,'#d8b04e');
  }else if(l.id==='democracy'){
    for(const x of [-9,9])for(const z of [-9,9]){
      const wing=new T.Shape([new T.Vector2(-2,0),new T.Vector2(2,0),new T.Vector2(1.5,20),new T.Vector2(-1.3,16)]);
      b.shape(new T.ExtrudeGeometry(wing,{depth:1.5,bevelEnabled:false}),x,1,z,'#eee3c9',Math.atan2(x,z));
      for(let y=2;y<16;y+=2)b.box(x,y,z,2.8,.12,2,'#b8ad92');
    }
    b.shape(new T.CylinderGeometry(4,5,4,12),0,3,0,'#d8c7a0');b.box(0,6,0,3,2,3,'#dabb62',0,true);
  }else if(l.id==='victory'){
    b.shape(new T.CylinderGeometry(10,12,3,16),0,2,0,'#bdc2b7');
    b.shape(new T.CylinderGeometry(.8,3,31,4),0,18,0,'#e0ded0',Math.PI/4);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5,x=Math.sin(a)*8,z=Math.cos(a)*8;b.box(x,4,z,2,4,2,'#6c796c');b.shape(new T.SphereGeometry(.7,8,6),x,6.7,z,'#657765');}
  }else if(l.id==='hua'){
    b.box(0,5,0,67,10,55,'#e4d6b7');
    for(const x of [-26,26])b.box(x,9,27,13,16,2,'#d6c6a4');
    const arch=new T.Shape();arch.moveTo(-18,0);arch.lineTo(-18,4);arch.absarc(0,4,18,Math.PI,0,true);arch.lineTo(18,0);arch.closePath();
    b.shape(new T.ExtrudeGeometry(arch,{depth:3,bevelEnabled:false}),0,5,26,'#d3b687');
    b.shape(new T.CircleGeometry(16,24,0,Math.PI).rotateZ(0),0,9,29.1,'#588184');
    for(let x=-14;x<=14;x+=3)b.box(x,12.5,29.3,.22,10,.25,'#dbcba1');
    b.shape(new T.CircleGeometry(2,16),0,18,29.7,'#f1dec0');
    for(let x=-29;x<=29;x+=6)b.box(x,4.2,28.1,3.5,6,.3,'#345e69');
    b.box(0,3,30,69,1,4,'#d1c6ae');
  }else{
    // Roadside guesthouse courtyard, not a generic market cube.
    for(const x of [-10,10]){
      b.box(x,7,0,8,13,27,'#bfad98');b.box(x,3.5,14,8,1.2,2,'#654976');
      for(const y of [6,10])for(const z of [-9,-3,3,9])b.box(x+(x<0?4:-4),y,z,.12,2,2,'#93aa98',0,true);
      b.box(x,14,0,8.7,.7,28,'#814b53');
    }
    for(let z=-10;z<=8;z+=6)b.box(0,5,z,15,.12,.14,'#e7b95c',0,true);
  }
  return b.finish(`authored-${l.id}-civic-v2`);
}
