import { bangRakCompletionState } from "../src/game/bangkok/bangRakCompletion";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createBangkokWorld} from "../src/game/bangkok/world";
import {BANG_RAK_SEAM,bangRakSeamState,retiredBangRakIds} from "../src/game/bangkok/bangRakSeam";
import {beforeBangRakSeam} from "./bang-rak-seam-migration-contract";
import {distanceToSegment,obstacleDistance,orientedFootprintsOverlap} from "../src/game/world";
import {CurrentStreetTracker} from "../src/game/currentStreet";
import {navigationPath} from "../src/game/navigation";
import {lanePoint,TrafficSystem} from "../src/game/traffic";
import {createVehicle} from "../src/game/vehicle";
import {designBuildings} from "../src/game/bangkok/buildingGrammar";
import {emitBangRakParcel} from "../src/game/bangkok/bangRakArt";
import {pieceVolume,validateSpatialVolumes} from "../src/game/bangkok/spatialValidation";
import {planChinatownBlocks} from "../src/game/bangkok/chinatownBlocks";
import {placementIndex} from "../src/game/bangkok/environmentPlan";
import {bangRakPeople} from "../src/game/bangkok/bangRakActivity";
const d=createBangkokWorld(),s=bangRakSeamState(d)!,old=beforeBangRakSeam(d),ns=new Map(d.nodes.map(n=>[n.id,n]));
assert.equal(s.roads.length,24);assert.equal(s.parcels.length,14);assert.equal(s.retired.filter(b=>b.chinatown).length,7);
assert.equal(s.roads.filter(r=>r.corridor==="river-city-interface"&&!r.oneWay).length,3,"Two-way public arrival spur is distinct from eastbound Si Phraya");
assert(s.roads.every(r=>!!r.oneWay===(r.corridor!=="river-city-interface") && !r.noTraffic));
for(const r of s.roads){
 const a=ns.get(r.a)!,b=ns.get(r.b)!;
 for(let i=0;i<=10;i++){
  const p=lanePoint(a,b,r,i/10);
  assert(d.obstacles.every(o=>obstacleDistance(p,o)>1.4),`Full legal lane clears physical geometry ${r.a}>${r.b}`);
 }
 const tracker=new CurrentStreetTracker(d);
 for(let i=0;i<5;i++)tracker.update({x:(a.x+b.x)/2,z:(a.z+b.z)/2},Math.atan2(b.x-a.x,b.z-a.z),i*250);
 if(r.corridor!=="river-city-interface"&&Math.hypot(b.x-a.x,b.z-a.z)>12)assert(tracker.current?.thai,'Bilingual HUD identity on real new road');
}
const river=ns.get('civic:-2000000:7840000')!,charoen=ns.get('civic:1455172:7800000')!,bend=ns.get('br:charoen-krung-30:13')!;
const east=navigationPath(d,river,charoen),west=navigationPath(d,charoen,river),loop=navigationPath(d,bend,charoen);
assert(east.some(n=>n.id.startsWith('brg:si-phraya')));assert(west.length>1);assert(loop.some(n=>n.id.startsWith('brg:captain-bush-return')));
const directArrival=navigationPath(d,bend,river);assert(directArrival.some(n=>n.id.startsWith('brg:captain-bush-return'))&&directArrival.length<15,'Captain Bush reaches River City through the local arrival spur, without a northern detour');
for(const path of [east,west,loop])for(let i=1;i<path.length;i++)assert(d.roads.some(r=>(r.a===path[i-1]!.id&&r.b===path[i]!.id)||(!r.oneWay&&r.b===path[i-1]!.id&&r.a===path[i]!.id)));
const pieces:any[]=[];
for(const p of designBuildings(d).filter(p=>p.parcel.environmentId?.startsWith('brg:'))){
 const b=p.parcel,edges=d.roads.filter(r=>r.corridor===b.bangRak!.road).map(r=>distanceToSegment(b,ns.get(r.a)!,ns.get(r.b)!)).sort((a,b)=>a.distance-b.distance),q=edges[0]!.point;
 const dx=q.x-b.x,dz=q.z-b.z;assert((dx*Math.sin(b.yaw!)+dz*Math.cos(b.yaw!))/Math.hypot(dx,dz)>.95,'Street-facing facade normals '+b.environmentId);
 emitBangRakParcel(p,q=>pieces.push(q));
 for(const o of d.buildings)if(o!==b)assert(!orientedFootprintsOverlap(b,o,-.01));
}
const conflicts=validateSpatialVolumes(d,pieces.map((p,i)=>pieceVolume(p,'seam:'+i)));assert.equal(conflicts.length,0,JSON.stringify(conflicts.slice(0,5)));
for(const b of planChinatownBlocks(d)){
 assert(b.parcels.every(o=>d.buildings.includes(o)),'No stale retired facade references');
 assert(b.courts.every(c=>!retiredBangRakIds.has(c.owner)),'No orphan migrated courts');
}
for(const seed of [982,41,67]){const cars=new TrafficSystem(d,seed).create(createVehicle(d));assert.equal(cars.length,38);if(!bangRakCompletionState(d))assert.deepEqual(cars,new TrafficSystem(old,seed).create(createVehicle(old)),"Retain seeded population");}
const npcRoad=s.roads.find(r=>r.corridor==="charoen-krung-30")!,na=ns.get(npcRoad.a)!,nb=ns.get(npcRoad.b)!;
const npc={...lanePoint(na,nb,npcRoad,.2),id:9001,heading:Math.atan2(nb.x-na.x,nb.z-na.z),speed:5,kind:"car" as const,color:"#ded4be",from:na.id,to:nb.id,wait:0,nearMissCooldown:0};
const traffic=new TrafficSystem(d,41),near=d.obstacles.filter(o=>o.x>-250&&o.x<210&&o.z>720&&o.z<940);
let npcMetres=0,npcReachedSiPhraya=false,npcReachedArrival=false;
for(let tick=0;tick<2400;tick++){
 const prev={x:npc.x,z:npc.z};traffic.update([npc],createVehicle(d),1/60);
 npcMetres+=Math.hypot(npc.x-prev.x,npc.z-prev.z);
 assert(near.every(o=>obstacleDistance(npc,o)>1.1),"NPC physically clears the northern return / junction");
 npcReachedSiPhraya ||= s.roads.some(r=>r.corridor==="si-phraya"&&r.a===npc.from&&r.b===npc.to);
 npcReachedArrival ||= s.roads.some(r=>r.corridor==="river-city-interface"&&((r.a===npc.from&&r.b===npc.to)||(r.b===npc.from&&r.a===npc.to)));
}
assert((npcReachedSiPhraya||npcReachedArrival)&&npcMetres>60,"NPC traverses Captain Bush into a legal Si Phraya / River City exit");
const people=bangRakPeople(d,placementIndex(d).person);assert(people.length>=12&&people.length<=32);assert(people.some(p=>p.z<880),'Purposeful seam footpaths');
const report={pass:true,npc:{metres:Math.round(npcMetres),reachedSiPhraya:npcReachedSiPhraya,reachedArrival:npcReachedArrival},newRoadEdges:s.roads.length,retiredPhysicalBodies:s.retired.length,newProperties:s.parcels.length,retainedPriorProperties:d.buildings.length-s.parcels.length,people:people.length,artPieces:pieces.length,conflicts,source:BANG_RAK_SEAM.sources,geographyLimit:BANG_RAK_SEAM.compromises};
fs.writeFileSync(new URL('../../../docs/qa/bang-rak-geography/validation/seam.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
