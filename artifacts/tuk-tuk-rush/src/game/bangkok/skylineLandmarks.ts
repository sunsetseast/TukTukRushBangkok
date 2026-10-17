import * as T from 'three';
import type { Landmark } from '../types';
import { LandmarkBuilder } from './landmarkBuilder';
export function skylineLandmark(l:Landmark){
  if(!['mahanakhon','baiyoke','state'].includes(l.id!))return;
  const b=new LandmarkBuilder();
  const glass=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>b.sculpt(new T.BoxGeometry(w,h,d),x,y,z,color,'glass');
  if(l.id==='mahanakhon'){
    b.box(0,4,0,39,8,39,'#b7c7cb');b.box(0,74,0,12,140,12,'#375f75');
    // Spiral pixel ribbon is missing volume, not boxes glued to a rectangular shaft.
    for(let level=0;level<35;level++)for(let x=0;x<5;x++)for(let z=0;z<5;z++){
      if(x>0&&x<4&&z>0&&z<4)continue;
      const perimeter=x===0?z:z===4?4+x:x===4?12-z:16-x;
      const band=(level*.92+3)%16;
      if(Math.min(Math.abs(perimeter-band),16-Math.abs(perimeter-band))<2.15&&level>5)continue;
      const px=(x-2)*6.5,pz=(z-2)*6.5;
      glass(px,10+level*4,pz,6.35,3.8,6.35,level%3?'#608eaa':'#436c83');
      if((x===0||x===4)&&level%3===0)b.box(px+(x===0?-3.19:3.19),10+level*4,pz,.08,.65,5.8,'#a8d6d4',0,true);
      if((z===0||z===4)&&level%4===0)b.box(px,10+level*4,pz+(z===0?-3.19:3.19),5.8,.65,.08,'#d7bb89',0,true);
    }
    // Real curtain wall rhythm remains quiet; the carved pixel ribbon is the
    // primary silhouette. Thin floor lines do not fill the missing volumes.
    for(let y=12;y<145;y+=4)for(const side of [-1,1]){
      b.box(side*8.52,y,0,.05,.16,16.5,'#85aab5');
      b.box(0,y,side*8.52,16.5,.16,.05,'#85aab5');
    }
    b.box(0,151,0,23,.8,23,'#b8d6d3',0,true);b.box(4,153,3,10,3,10,'#31576c');
  }else if(l.id==='baiyoke'){
    b.box(0,8,0,38,16,36,'#d7c7a6');
    for(let i=0;i<4;i++){
      const y=16+i*27,w=34-i*4;b.box(0,y+13.5,0,w,27,w*.8,'#cbbd9a');
      for(let f=0;f<7;f++)for(const side of [-1,1]){
        glass(0,y+2+f*3.5,side*(w*.4+.03),w-3,1.7,.15,'#497e81');
        b.box(side*(w*.5+.03),y+2+f*3.5,0,.15,1.7,w*.8-3,'#497e81');
      }
      b.box(0,y+26.5,0,w+1,.7,w*.8+1,'#eee0bd');
    }
    b.shape(new T.CylinderGeometry(13,11,6,24),0,127,0,'#d2c093');
    glass(0,126,0,12,3,12,'#315c70');
    for(let i=0;i<16;i++){const a=i*Math.PI/8;b.box(Math.sin(a)*12.9,128,Math.cos(a)*12.9,.25,4,.25,'#e1d4b4',a);}
    b.shape(new T.CylinderGeometry(13.6,13.6,.9,20),0,130.5,0,'#bcb291',0,true);
    b.shape(new T.CylinderGeometry(8,10,6,16),0,134,0,'#527e86');
    b.shape(new T.CylinderGeometry(5.8,8,5,16),0,139.5,0,'#d9c7a4');
    b.shape(new T.CylinderGeometry(.18,.45,14,8),0,149,0,'#c6d1cb',0,true);
  }else{
    b.box(0,8,0,39,16,37,'#d7c8aa');
    // State Tower's pale shoulder setbacks lead to the colonnaded dome. The
    // hotel remains inside this one landmark/save ID, rather than a second tower.
    for(let tier=0;tier<5;tier++)b.box(0,16+tier*18+9,0,39-tier*1.4,18,35-tier*1.2,'#d8d4c2');
    b.box(0,109,0,30,8,27,'#e0d9c3');
    for(let y=19;y<110;y+=3.4){
      const tier=Math.min(4,Math.floor((y-16)/18)),w=39-tier*1.4,d=35-tier*1.2;
      for(const side of [-1,1]){
        b.box(0,y,side*(d/2+.2),w,.7,.7,'#eee5d0');glass(0,y+1.1,side*(d/2+.06),w-2,1.2,.15,'#63818a');
        b.box(side*(w/2+.2),y,0,.7,.7,d,'#e8dfc9');glass(side*(w/2+.06),y+1.1,0,.15,1.2,d-2,'#63818a');
      }
    }
    b.box(0,115,0,30,5,27,'#d8caad');
    for(const x of [-8,-3,3,8])for(const z of [-8,8])b.shape(new T.CylinderGeometry(.65,.65,7,8),x,121,z,'#e8ddc1',0,true);
    b.shape(new T.CylinderGeometry(11,11,1.5,20),0,125.4,0,'#d9b05b',0,true);
    b.shape(new T.SphereGeometry(11,20,10,0,Math.PI*2,0,Math.PI/2).scale(1,.8,1),0,126,0,'#e9bd51',0,true);
    b.shape(new T.CylinderGeometry(.1,.8,3,8),0,136,0,'#e8c274',0,true);
  }
  // Podium doors, recessed shop bays and cornice relief are worth geometry
  // at road level; the upper silhouette keeps its existing distant LOD.
  for(const side of [-1,1])for(let x=-15;x<=15;x+=5){glass(x,4,side*18.6,3.7,5,.16,'#4b7280');b.box(x,7,side*18.8,4,.3,.4,'#d0c9ac',0,true);}
  const detailed=b.finish(`authored-${l.id}-skyline-v2`),coarse=new LandmarkBuilder();
  if(l.id==='mahanakhon'){
    coarse.box(0,4,0,39,8,39,'#b7c7cb');coarse.box(0,76,0,12,144,12,'#375f75');
    // Same square perimeter and ~two-turn removed ribbon as the near asset.
    // A round radial proxy would erase its architectural identity in Fast mode.
    for(let level=0;level<18;level++)for(let x=0;x<5;x++)for(let z=0;z<5;z++){
      if(x>0&&x<4&&z>0&&z<4)continue;
      const edge=x===0?z:z===4?4+x:x===4?12-z:16-x,band=(level*1.84+3)%16;
      const delta=Math.abs(edge-band);if(Math.min(delta,16-delta)<2.15&&level>2)continue;
      coarse.box((x-2)*6.5,12+level*8,(z-2)*6.5,6.35,7.8,6.35,'#608eaa');
    }
    coarse.box(0,151,0,23,.8,23,'#b8d6d3');coarse.box(4,153,3,10,3,10,'#31576c');
  }else if(l.id==='baiyoke'){
    coarse.box(0,5,0,39,10,36,'#d5c8a4');
    for(let i=0;i<4;i++)coarse.box(0,29.5+i*27,0,36-i*4,30,29-i*3,'#c7bea3');
    coarse.shape(new T.CylinderGeometry(13,10,8,12),0,127,0,'#b9c6b8');coarse.shape(new T.CylinderGeometry(6,10,13,12),0,137,0,'#92a99e');coarse.box(0,150,0,.4,16,.4,'#ccd3ca');
  }else{
    coarse.box(0,60,0,33,120,29,'#cccdbd');coarse.box(0,122,0,28,5,26,'#ded5b8');for(const x of [-7,7])coarse.box(x,125.5,0,1,3,1,'#e7dab5');coarse.shape(new T.SphereGeometry(11,12,6,0,Math.PI*2,0,Math.PI/2).scale(1,.8,1),0,126,0,'#e4b854',0,true);
  }
  const distant=coarse.finish(`${l.id}-distant`),root=new T.LOD();root.addLevel(detailed,0);root.addLevel(distant,360);
  root.userData.authoredAsset=detailed.userData.authoredAsset;root.userData.nightMaterials=[...detailed.userData.nightMaterials,...distant.userData.nightMaterials];return root;
}
