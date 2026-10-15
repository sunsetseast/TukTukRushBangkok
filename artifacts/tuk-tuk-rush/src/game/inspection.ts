import type {District,Landmark,Obstacle} from './types';
export type Vec3=[number,number,number];
export type InspectionView={id:string;label:string;target:Vec3;distance:number;azimuth:number;pitch:number;minDistance:number;maxDistance:number;minPitch:number;maxPitch:number;pan:number;azimuthRange?:[number,number];room?:{min:Vec3;max:Vec3}};
export type InspectionSubject={id:string;name:string;origin:Vec3;yaw:number;views:InspectionView[]};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function inspectionSubject(l:Landmark):InspectionSubject{
 const size=l.size??50,h=({arun:26,paknam:37,palace:21,traimit:18,golden:30,swing:12,democracy:12,victory:20,hua:12,icon:20,paragon:16,mahanakhon:80,baiyoke:82,state:72} as Record<string,number>)[l.id!]??10;
 const view=(id:string,label:string,target:Vec3,distance:number,azimuth=0,pitch=.28):InspectionView=>({id,label,target,distance,azimuth,pitch,minDistance:Math.max(size*.85,15),maxDistance:Math.max(size*2.7,distance*1.35,65),minPitch:.08,maxPitch:1.05,pan:Math.min(9,size*.12)});
 let views=[view('approach','Architecture',[0,h,0],Math.max(size*1.3,h*1.35,45),.3,.33),view('overview','Overview',[0,h*.65,0],Math.max(size*1.6,h*1.65,55),-.6,.67)];
 if(l.id==='pho'){
  const room={min:[-23.5,2.8,8.1] as Vec3,max:[23.5,11.3,10.05] as Vec3};
  const inside=(id:string,label:string,target:Vec3,azimuth:number,distance:number,pitch:number):InspectionView=>({id,label,target,azimuth,distance,pitch,minDistance:4,maxDistance:16,minPitch:-.2,maxPitch:.42,pan:2,azimuthRange:[-1.1,1.1],room});
  views=[inside('head','Serene face',[-17.6,10,2.1],-.38,8.6,.02),inside('body','Reclining figure',[-1,6.6,2.5],0,11,.15),{...inside('feet','Pearl-inlaid soles',[20.2,5.7,2.1],1.2,5.4,.08),azimuthRange:[.7,2.25],room:{min:[22.1,3,-5],max:[23.7,10.8,10.05]}},view('courts','Royal chedis',[0,10,-11],66,.35,.48)];
 }
 if(l.id==='paknam')views.push({...view('face','Buddha close-up',[0,55,12],43,.12,.07),minDistance:30,maxDistance:75,pan:4,azimuthRange:[-1.1,1.1]});
 if(l.id==='arun')views.push({...view('ceramics','Porcelain terraces',[0,20,0],51,.8,.13),minDistance:38,maxDistance:80,pan:4});
 return {id:l.id!,name:l.name,origin:[l.plot?.x??l.x,0,l.plot?.z??l.z],yaw:l.yaw??0,views};
}
/** Input state is separate from simulation time. No momentum runs after cancellation. */
export class InspectionCamera {
 subject?:InspectionSubject;viewIndex=0;revision=0;
 azimuth=0;pitch=.3;distance=50;panX=0;panY=0;
 private az=0;private el=.3;private radius=50;private px=0;private py=0;
 get view(){return this.subject?.views[this.viewIndex];}
 open(subject:InspectionSubject){this.subject=subject;this.viewIndex=0;this.reset();}
 close(){this.subject=undefined;this.revision++;}
 choose(index:number){if(!this.subject)return;this.viewIndex=clamp(index,0,this.subject.views.length-1);this.reset();}
 reset(){const v=this.view;if(!v)return;this.az=this.azimuth=v.azimuth;this.el=this.pitch=v.pitch;this.radius=this.distance=v.distance;this.px=this.panX=0;this.py=this.panY=0;this.revision++;}
 rotate(dx:number,dy:number){const v=this.view;if(!v)return;this.az=clamp(this.az-dx,v.azimuthRange?.[0]??-Infinity,v.azimuthRange?.[1]??Infinity);this.el=clamp(this.el+dy,v.minPitch,v.maxPitch);}
 zoom(factor:number){const v=this.view;if(v&&Number.isFinite(factor))this.radius=clamp(this.radius*factor,v.minDistance,v.maxDistance);}
 pan(dx:number,dy:number){const v=this.view;if(!v)return;this.px=clamp(this.px+dx,-v.pan,v.pan);this.py=clamp(this.py+dy,-v.pan*.6,v.pan*.6);}
 update(dt:number,out:{position:Vec3;target:Vec3},d?:District){
  const s=this.subject,v=this.view;if(!s||!v)return false;
  const f=1-Math.exp(-16*Math.min(.05,Math.max(0,dt)));
  this.azimuth+=(this.az-this.azimuth)*f;this.pitch+=(this.el-this.pitch)*f;this.distance+=(this.radius-this.distance)*f;this.panX+=(this.px-this.panX)*f;this.panY+=(this.py-this.panY)*f;
  const c=Math.cos(this.azimuth),sn=Math.sin(this.azimuth),r=this.distance*Math.cos(this.pitch);
  const target:Vec3=[v.target[0]+c*this.panX,v.target[1]+this.panY,v.target[2]-sn*this.panX];
  const pos:Vec3=[target[0]+sn*r,target[1]+Math.sin(this.pitch)*this.distance,target[2]+c*r];
  if(v.room){for(let i=0;i<3;i++)pos[i]=clamp(pos[i]!,v.room.min[i]!,v.room.max[i]!);}
  const cy=Math.cos(s.yaw),sy=Math.sin(s.yaw);
  for(const [local,world] of [[target,out.target],[pos,out.position]] as const){world[0]=s.origin[0]+cy*local[0]+sy*local[2];world[1]=local[1];world[2]=s.origin[2]-sy*local[0]+cy*local[2];}
  if(d&&!v.room)avoidInspectionObstacles(out.position,out.target,d.obstacles,s.id);
  return true;
 }
}
/** Bounded obstacle response. Never turn a near-target obstruction into an
 * unbounded vertical launch; resolve camera occupancy and cap optional lift. */
export function avoidInspectionObstacles(p:Vec3,target:Vec3,obstacles:Obstacle[],site:string){
 const initialY=p[1],ceiling=initialY+12;p[1]=Math.max(2,p[1]);
 for(const b of obstacles){
  if(b.landmarkId===site||Math.hypot(p[0]-b.x,p[2]-b.z)>Math.hypot(b.w,b.d)/2+3)continue;
  const c=Math.cos(b.yaw??0),s=Math.sin(b.yaw??0),dx=p[0]-b.x,dz=p[2]-b.z,x=c*dx-s*dz,z=s*dx+c*dz,rx=b.w/2+1,rz=b.d/2+1;
  if(Math.abs(x)>=rx||Math.abs(z)>=rz||p[1]>=b.height+1.2)continue;
  if(b.height+1.3<=ceiling){p[1]=Math.max(p[1],b.height+1.3);continue;}
  // Tall unrelated buildings: slide to the nearest exterior face rather than
  // moving through a roof. Viewpoint presets avoid these occupied envelopes.
  let nx=x,nz=z;if(rx-Math.abs(x)<rz-Math.abs(z))nx=Math.sign(x||1)*rx;else nz=Math.sign(z||1)*rz;
  p[0]=b.x+c*nx+s*nz;p[2]=b.z-s*nx+c*nz;
 }
}
