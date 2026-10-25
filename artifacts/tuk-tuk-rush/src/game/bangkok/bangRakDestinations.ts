import type { District, Landmark, Obstacle } from "../types";
import plan from "./bangRakCompletionPlan.v1.json";
import { appendProtectedParcels, rectangleBoundary } from "./landmarkParcels";
import type { ArtPiece } from "./architecturalBatch";
import { localPoint } from "./landmarkParcels";
import { orientedFootprintsOverlap } from "../world";

export const BANG_RAK_DESTINATIONS = plan.sites;
export function addBangRakDestinations(d: District) {
  for (const s of plan.sites) {
    const body: Obstacle = {...s.origin, w:s.w, d:s.d, height:s.height, yaw:s.yaw,
      color:"#cdb89b", landmarkId:s.id, protected:true, environmentId:`brc:site:${s.id}`};
    const clash = d.obstacles.find(o => orientedFootprintsOverlap(body,o));
    if (clash) throw Error(`Unledgered ${s.id} site conflict: ${clash.environmentId ?? clash.landmarkId}`);
    const candidates = d.nodes.filter(n => d.roads.some(r => (r.a===n.id || r.b===n.id) && r.corridor===s.road));
    const stop = candidates.reduce((a,b) => Math.hypot(a.x-s.access.x,a.z-s.access.z)<Math.hypot(b.x-s.access.x,b.z-s.access.z)?a:b);
    d.landmarks.push({...stop,id:s.id,name:s.name,kind:s.kind as Landmark["kind"],plot:{...s.origin},yaw:s.yaw,size:Math.max(s.w,s.d),accessNode:stop.id});
    d.obstacles.push(body);
    appendProtectedParcels(d,[{landmarkId:s.id,use:"structure",boundary:rectangleBoundary(body)}]);
  }
}

/** Original landmark interpretations through the existing spatial/LOD batch.
 * No per-window meshes, materials, lights, or imported facade renderer. */
export function emitBangRakDestinations(d: District, emit:(p:ArtPiece)=>void) {
  for (const s of plan.sites) {
    if (!d.landmarks.some(l=>l.id===s.id)) continue;
    const put=(u:number,y:number,v:number,w:number,h:number,depth:number,color:string,shape:ArtPiece["shape"]="box",surface:ArtPiece["surface"]="plaster",layer:ArtPiece["layer"]="core") =>
      emit({...localPoint(s.origin,s.yaw,u,v),y,w,h,d:depth,color,shape,surface,layer,yaw:s.yaw,siteId:s.id});
    const F=s.d/2, W=s.w;
    if (s.id==='assumption') {
      put(0,10,0,30,20,52,"#a9573c","box","brick");
      put(0,22,0,32,7,54,"#704e43","gable","tile");
      for(const side of [-1,1]) {
        put(side*14,14,F-7,10,28,12,"#aa5a40","box","brick");
        put(side*14,29,F-7,11,2,13,"#e7d5b4");
        put(side*14,32,F-7,8,5,10,"#a9573c","box","brick");
        for(const y of [6,13,22,31]) {put(side*14,y,F-.85,4,5,.28,"#e1d0af","arch");put(side*14,y,F-.55,2.7,3.8,.12,"#324338","arch");}
        for(const z of [-20,-10,0,10]) {put(side*15.1,10,z,.45,13,3,"#ead6b5");put(side*15.35,12,z,.15,6,2,"#48625a");}
      }
      put(0,15,F-.6,8,8,.4,"#e5d3b4","orb");
      // Rose tracery lies in the facade plane (cylinder template axis is Y).
      for(let i=0;i<12;i++){const a=i*Math.PI/6;put(Math.cos(a)*3,15+Math.sin(a)*3,F-.2,.4,.4,.4,"#577774","orb");}
      put(0,5,F-.1,6,9,.35,"#eadbc0","arch");put(0,4.4,F+.1,4.5,7,.15,"#4a3b32","arch","wood");
      put(0,29,F-7,.65,6,.65,"#e8d6b8");put(0,30,F-7,3.5,.55,.65,"#e8d6b8");
    } else if(s.id==='royal-orchid') {
      put(0,3,0,W,6,s.d,"#bdb49b","box","concrete");
      // Faceted concave river frontage, broad hotel slab and pale floor bands.
      for(let i=0;i<7;i++) {
        const u=(i-3)*10,curve=Math.pow((i-3)/3,2)*5;
        put(u,37,-3+curve,10,66,30,"#b7c6ba","box","concrete");
        for(let floor=0;floor<19;floor++) {
          const y=8+floor*3.2;
          put(u,y,F-4+curve*.3,9.8,2.25,.2,"#4e7172","box","panel");
          put(u,y-1.3,F-3.8+curve*.3,10,.45,.45,"#d6d4bb","box","concrete");
          if((i+floor)%5===0)put(u,y,F-3.65+curve*.3,4,1.6,.08,"#dab887","box","panel","night");
        }
      }
      put(0,6,-F+1,34,.55,8,"#6c7869","canopy","metal");
    } else {
      const house=s.id==='house-no-1',H=house?10:15;
      put(0,H/2,0,W,H,s.d,house?"#d6bc83":"#cfb99b","box","plaster");
      put(0,H+.9,0,W+1,2,s.d+1,house?"#6c6555":"#a28b72",house?"gable":"box","tile");
      for(const side of [-1,1])put(side*(W/2-.5),H/2,F+.15,.7,H,.6,"#eee1c6");
      for(let u=-W/2+4;u<W/2-2;u+=6)for(const y of [3,8]) {
        put(u,y,F+.12,3.4,4,.25,"#e4d5b5","arch");put(u,y,F+.28,2.4,3,.12,house?"#436354":"#655548","arch","wood");
        put(u,y-2,F+.55,4,.25,.8,"#e8dabf");
        put(u,y,-F-.1,2.4,3,.2,"#546253","box","wood");
      }
      if(!house) {put(0,H+1.5,F-1,13,4,3,"#e6d7bb","gable");put(0,H+.7,F+.6,2.4,2.4,.2,"#f0e5c9","orb");}
      for(const side of [-1,1])put(side*W*.22,1,F+2.5,1.2,2,1.2,"#b5a17b");
    }
  }
}
