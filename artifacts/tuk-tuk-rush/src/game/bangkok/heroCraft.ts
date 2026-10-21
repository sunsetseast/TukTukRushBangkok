/** Bounded craft modules for the existing authored-building pipeline. */
import * as T from 'three';
import {LandmarkBuilder} from './landmarkBuilder';
import {tropicalLeafGeometry} from './tropicalVegetation';
type B=LandmarkBuilder;
export function glazing(b:B,x:number,y:number,z:number,w:number,h:number,d:number,color='#496f80',yaw=0){b.sculpt(new T.BoxGeometry(w,h,d),x,y,z,color,'glass',yaw);}
export function curtain(b:B,x:number,y:number,z:number,w:number,h:number,detail:boolean,yaw=0,columns=8,floors=4){
 const c=Math.cos(yaw),s=Math.sin(yaw),put=(u:number,v:number,Y:number,W:number,H:number,D:number,color:string,lit=false)=>b.box(x+c*u+s*v,Y,z-s*u+c*v,W,H,D,color,yaw,lit);
 glazing(b,x,y,z,w,h,.2,'#496e7b',yaw);glazing(b,x,y-h*.25,z,w,h*.46,.24,'#294653',yaw);
 for(let f=0;f<=floors;f++)put(0,.18,y-h/2+f*h/floors,w+.35,.24,.48,'#c4cbc6');
 for(let i=0;i<=columns;i++)put(-w/2+i*w/columns,.21,y,.15,h,.4,'#b4c2bf');
 if(detail)for(let i=0;i<columns;i++)for(let f=0;f<floors;f++)if((i*7+f*11)%9<2)put(-w/2+(i+.5)*w/columns,.145,y-h/2+(f+.5)*h/floors,w/columns*.79,h/floors*.62,.055,'#b6a17d',true);
}
export function palm(b:B,x:number,z:number,h=7,detail=true,y=0){
 b.sculpt(new T.CylinderGeometry(.14,.24,h,6),x,y+h/2,z,'#8e7758');
 for(let i=0;i<(detail?7:5);i++){const a=i*Math.PI*2/(detail?7:5);b.sculpt(tropicalLeafGeometry('frond').scale(1.15,1.5,4.6).rotateY(a),x+Math.sin(a)*1.6,y+h,z+Math.cos(a)*1.6,i%2?'#527e56':'#356c51');}
}
export function planter(b:B,x:number,z:number,w:number,d:number,detail:boolean,y=0){b.box(x,y+.4,z,w,.8,d,'#b5ad96');b.box(x,y+.86,z,w-.45,.12,d-.45,'#3d6c4c');if(detail)for(let i=0;i<3;i++)b.sculpt(new T.IcosahedronGeometry(Math.min(.8,w*.2,d*.2),0).scale(1,.5,1),x+(i-1)*w*.22,y+1.1,z,i%2?'#6b8a55':'#4e7750');}
export function entrance(b:B,w:number,z:number,detail:boolean){curtain(b,0,3.2,z,w,5.8,detail,0,Math.max(4,Math.round(w/3)),1);b.box(0,6.4,z+1.7,w+3,.4,4.4,'#d6d3c3');b.box(0,6.12,z+1.7,w+1,.08,3.8,'#efcf9c',0,true);for(const x of [-w/2,w/2])b.box(x,3,z+1,.3,6,.3,'#a8a28f');}
export function foldedRoof(b:B,x:number,y:number,z:number,w:number,h:number,d:number,detail:boolean){
 const s=new T.Shape();s.moveTo(-w/2,0);s.bezierCurveTo(-w*.36,h*.63,-w*.12,h*.94,0,h);s.bezierCurveTo(w*.14,h*.9,w*.36,h*.58,w/2,0);s.lineTo(w/2-.8,.3);s.bezierCurveTo(w*.32,h*.52,w*.1,h*.84,0,h-.9);s.bezierCurveTo(-w*.12,h*.86,-w*.33,h*.53,-w/2+.8,.3);s.closePath();b.sculpt(new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:detail?12:5}).translate(0,0,-d/2),x,y,z,'#c9a052','gilded');
}
