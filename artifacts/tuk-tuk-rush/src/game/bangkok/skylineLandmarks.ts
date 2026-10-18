import * as T from 'three';
import type { Landmark } from '../types';
import { LandmarkBuilder } from './landmarkBuilder';
export function skylineLandmark(l:Landmark){
  if(!['mahanakhon','baiyoke','state'].includes(l.id!))return;
  const b=new LandmarkBuilder();
  const glass=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>b.sculpt(new T.BoxGeometry(w,h,d),x,y,z,color,'glass');
  if(l.id==='mahanakhon'){
    emitMahanakhon(b,true);
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
    emitMahanakhon(coarse,false);
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

/** One quiet, staggered carved ribbon. Fine cells maintain a mostly unbroken
 * curtain wall; only the outer two cell depths are carved. Far mode groups
 * pairs of floors but uses exactly the same pixel occupancy definition. */
function emitMahanakhon(b:LandmarkBuilder,detail:boolean){
 b.box(0,4,0,39,8,39,'#9eafb0');b.box(0,77,0,17,138,17,'#426a7b');
 const cell=3.85,levels=38,step=detail?1:2;
 for(let f=0;f<levels;f+=step)for(let x=0;x<7;x++)for(let z=0;z<7;z++){
  if(x>1&&x<5&&z>1&&z<5)continue;
  const outer=x===0||x===6||z===0||z===6;
  const edge=x===0?z:z===6?6+x:x===6?18-z:24-x;
  // Architectural cut moves through a little over one turn, in clustered
  // steps with asymmetric widths, unlike PR25's large uniform double helix.
  const center=4+Math.floor(Math.max(0,f-4)/3)*2,delta=Math.abs(((edge-center)%24+24)%24),dist=Math.min(delta,24-delta);
  const cut=f>5&&outer&&dist<((Math.floor(f/5)%3===1)?2.2:1.3);
  if(cut)continue;
  const px=(x-3)*cell,pz=(z-3)*cell,y=10+f*3.65,h=3.65*step-.07;
  b.sculpt(new T.BoxGeometry(cell-.025,h,cell-.025),px,y+h/2,pz,f%6===0?'#567f93':'#64899a','glass');
  if(detail&&outer){
   const side=x===0?-1:x===6?1:0;
   if(side)b.box(px+side*cell/2,y,pz,.06,.12,cell,'#b3c4c3');
   if(z===0||z===6)b.box(px,y,pz+(z===0?-1:1)*cell/2,cell,.12,.06,'#b3c4c3');
   if((x*3+z+f)%37===0)b.box(px,y+1,pz,cell*.8,.3,cell*.8,'#c6b889',0,true);
  }
 }
 b.box(0,149,0,26,.7,26,'#c3d6d1');b.box(0,151,0,23,.7,23,'#719ba6');
 b.box(4,153,3,10,3,10,'#34566a');b.box(-8,150,8,7,.2,6,'#8bc0c5');
}
