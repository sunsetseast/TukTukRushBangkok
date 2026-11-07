import * as T from 'three';
import type {Facade} from './chinatownFacades';
export type LifeAnchor={sourceId:string;x:number;z:number;yaw:number;kind:'stir'|'wok'|'serve'|'browse'|'walk'|'seated'|'fan'|'steam';seed:number;travel:number;skin:string;shirt:string};
/** Anchors are admitted by the worker only after their complete swept footprint
 * passes road, source-building and furniture tests. Movement never leaves it. */
export function lifePose(a:LifeAnchor,time:number,player:{x:number;z:number}){
 const phase=time*(a.kind==='walk'?1.25:1.8)+(a.seed%97),wave=Math.sin(phase),react=Math.hypot(a.x-player.x,a.z-player.z)<12;
 return {along:a.kind==='walk'?Math.sin(time*.42+a.seed)*a.travel:0,arm:a.kind==='stir'?.3+wave*.26:a.kind==='wok'?.2+wave*.35:a.kind==='serve'?wave*.45:react?.28:0,head:react?.2:Math.sin(phase*.3)*.06,step:a.kind==='walk'?wave*.27:0,steam:(time*.38+(a.seed%13)/13)%1};
}
type Rig={anchor:LifeAnchor;parts:{index:number;part:string}[]};
type LifeState={mesh:T.InstancedMesh;rigs:Rig[];last:number;writes:number};
const dummy=new T.Object3D(),color=new T.Color(),world=new T.Vector3();
/** One box instance stream per chunk, shared facade material, no skeletons,
 * textures, per-person materials, React state, timers or global actor cache. */
export function buildChinatownLife(anchors:LifeAnchor[],material:T.Material){
 const count=anchors.reduce((n,a)=>n+(a.kind==='fan'?3:a.kind==='steam'?3:9),0);
 if(!count)return;
 const mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,count);mesh.name='ChinatownLife';mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;
 const rigs:Rig[]=[];let index=0;
 for(const a of anchors){const names=a.kind==='fan'?['hub','blade0','blade1']:a.kind==='steam'?['steam0','steam1','steam2']:['body','head','hair','legL','legR','armL','armR','apron','hand'];const parts=names.map(part=>({index:index++,part}));rigs.push({anchor:a,parts});for(const p of parts){color.set(p.part==='body'||p.part.startsWith('arm')?a.shirt:p.part==='head'||p.part==='hand'?a.skin:p.part==='apron'?'#ded4b4':p.part.startsWith('steam')?'#c9b995':p.part==='hair'?'#302c29':'#34434a');mesh.setColorAt(p.index,color);}}
 mesh.userData.life={mesh,rigs,last:-Infinity,writes:0} satisfies LifeState;mesh.visible=false;
 return mesh;
}
/** At most 12 Hz. Hidden/Fast/paused/far cells perform zero matrix uploads. */
export function updateChinatownLife(root:T.Object3D,time:number,quality:'low'|'medium',camera:T.Vector3,player:{x:number;z:number},playing=true){
 const mesh=root.userData.life?.mesh as T.InstancedMesh|undefined;if(!mesh)return 0;
 const state=mesh.userData.life as LifeState;mesh.parent!.getWorldPosition(world);
 const active=quality==='medium'&&playing&&state.rigs.some(r=>Math.hypot(camera.x-world.x-r.anchor.x,camera.z-world.z-r.anchor.z)<42);
 mesh.visible=active;if(!active||time-state.last<1/12)return 0;state.last=time;
 for(const r of state.rigs){const a=r.anchor,p=lifePose(a,time,{x:player.x-world.x,z:player.z-world.z});const visible=Math.hypot(camera.x-world.x-a.x,camera.z-world.z-a.z)<42;
  for(const {index,part}of r.parts){let u=p.along,y=0,v=0,w=.1,h=.1,d=.1,rx=0,rz=0;
   if(a.kind==='fan'){y=2.35;v=.05;w=part==='hub'?.14:.7;h=.08;d=.08;rz=time*4+(part==='blade1'?Math.PI/2:0);}
   else if(a.kind==='steam'){const n=Number(part.at(-1)),rise=(p.steam+n/3)%1;y=1.8+rise*.85;u+=(n-1)*.12+Math.sin(time+n)*.08;v=.35;w=.06+rise*.13;h=.08+rise*.16;d=w;}
   else {const seated=a.kind==='seated',base=seated?-.35:0;
    if(part==='body'){y=1.1+base;w=.38;h=.55;d=.25;}
    if(part==='head'){y=1.56+base;w=.25;h=.3;d=.26;rz=p.head;}
    if(part==='hair'){y=1.72+base;w=.26;h=.12;d=.27;}
    if(part.startsWith('leg')){const left=part==='legL';u+=(left?-1:1)*.105;y=.38+base*.45;w=.13;h=.72;d=.16;rx=seated?-.8:(left?1:-1)*p.step;}
    if(part.startsWith('arm')){const left=part==='armL';u+=(left?-1:1)*.25;y=1.14+base;v=.06;w=.12;h=.52;d=.14;rx=left?-.3:-.65-p.arm;rz=left?-.12:.12;}
    if(part==='apron'){y=.97+base;v=.14;w=.29;h=.5;d=.035;}
    if(part==='hand'){u+=.25;y=.98+base+Math.sin(p.arm)*.17;v=.32;w=.11;h=.12;d=.12;}
   }
   dummy.position.set(a.x+Math.cos(a.yaw)*u+Math.sin(a.yaw)*v,y,a.z-Math.sin(a.yaw)*u+Math.cos(a.yaw)*v);dummy.rotation.set(rx,a.yaw,rz);dummy.scale.set(visible?w:0,visible?h:0,visible?d:0);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
  }
 }
 mesh.instanceMatrix.needsUpdate=true;state.writes++;return 1;
}
