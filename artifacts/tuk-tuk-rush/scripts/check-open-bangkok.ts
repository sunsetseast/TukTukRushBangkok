import assert from 'node:assert/strict';
import {createBangkokWorld,blockedByRiver} from '../src/game/bangkok/world';
import {VehicleController,createVehicle} from '../src/game/vehicle';
import {RailService,trainSample} from '../src/game/bangkok/transit/service';
import {obstacleDistance,distanceToSegment} from '../src/game/world';
import baked from '../src/game/bangkok/roadSurfaces.generated.json';
import {roadGraphKey} from '../src/game/bangkok/roadSurfaceGraph';
import {physicsObstacleIndex} from '../src/game/bangkok/clearanceIndex';
// @ts-ignore Shared browser/node QA controller.
import {accessJourney,driveControl} from './access-controller.mjs';
const d=createBangkokWorld(),net=d.transit!,grid=physicsObstacleIndex(d),journeys=[];
assert.equal(d.destinations!.length,10);assert.equal(roadGraphKey(d),baked.key,'Rendered road bake is stale');
for(const site of d.destinations!){
 const journey=accessJourney(d,site),start=journey.inbound[0],next=journey.inbound[1];
 const p={...createVehicle(d),x:start.x,z:start.z,heading:Math.atan2(next.x-start.x,next.z-start.z)},vc=new VehicleController();
 let metres=0,collisions=0,frames=0;
 for(const route of [journey.inbound,journey.outbound]){const state={index:1,done:false};for(let i=0;i<30000&&!state.done;i++){
  const input=driveControl({model:{player:p}},route,state),x=p.x,z=p.z;
  vc.update(p,{...input,boost:frames<300},d,[],1/60);frames++;metres+=Math.hypot(p.x-x,p.z-z);if(p.collision>.01)collisions++;
 }assert(state.done,`Cannot complete ${site.id}: ${JSON.stringify(p)}`);}
 assert.equal(collisions,0,`Collision in ${site.id}`);journeys.push({id:site.id,metres:Math.round(metres),frames,collisionFrames:collisions,boost:true,publicRoadEntryExit:true});
}
const expected={sukhumvit:['N8','N7','N5','N4','N3','N2','N1','CEN','E1','E2','E3','E4'],silom:['W1','CEN','S1','S2','S3','S4','S5','S6','S7','S8'],gold:['G1','G2','G3']};
for(const line of net.lines){assert.deepEqual(line.stations.map(s=>s.code),expected[line.id]);for(let i=1;i<line.samples.length;i++){const a=line.samples[i-1]!,b=line.samples[i]!;assert(Math.hypot(a.x-b.x,a.z-b.z)<6);assert(b.y>=11.9);}for(const s of line.stations)assert(net.lines.flatMap(l=>l.stations).some(q=>q.id===s.id&&q.entrances?.length));}
for(const support of net.supports){assert(support.height>8);assert(!d.roads.some(r=>{const a=d.nodes.find(n=>n.id===r.a)!,b=d.nodes.find(n=>n.id===r.b)!;return distanceToSegment(support,a,b).distance<r.width/2+1.2;}),'Column blocks a road');}
let crossLineChecks=0;
for(let i=0;i<net.lines.length;i++)for(let j=i+1;j<net.lines.length;j++){
 const a=net.lines[i]!,b=net.lines[j]!;
 for(const p of a.samples)for(const q of b.samples){if(Math.hypot(p.x-q.x,p.z-q.z)>16)continue;
  for(const ad of [-1,1])for(const bd of [-1,1]){crossLineChecks++;const x={...p},y={...q};trainSample(a,p.distance,ad,x);trainSample(b,q.distance,bd,y);const distance=Math.hypot(x.x-y.x,x.z-y.z);if(distance<3.2){assert(Math.abs(x.y-y.y)>3.5,`Crossing tracks collide ${a.id}/${b.id}`);}}
 }
}
const service=new RailService(net),visited=new Set<string>();let maxStep=0,minSeparation=Infinity;const last=service.trains.map(t=>({...t.sample}));
for(let frame=1;frame<=36000;frame++){
 service.update(frame/30);for(let i=0;i<service.trains.length;i++){const t=service.trains[i]!,old=last[i]!;maxStep=Math.max(maxStep,Math.hypot(t.sample.x-old.x,t.sample.z-old.z,t.sample.y-old.y));assert(maxStep<.8,'Train teleports');Object.assign(old,t.sample);if(t.station)visited.add(`${t.line.id}:${t.station}`);const s={...t.sample};trainSample(t.line,t.distance,t.direction,s);assert(Math.hypot(t.sample.x-s.x,t.sample.z-s.z,t.sample.y-s.y)<1e-7);}
 for(let i=0;i<6;i+=2){const a=service.trains[i]!,b=service.trains[i+1]!;const dist=Math.hypot(a.sample.x-b.sample.x,a.sample.z-b.sample.z,a.sample.y-b.sample.y);minSeparation=Math.min(minSeparation,dist);assert(dist>3.2,'Opposing trains collide');}
}
assert.equal(visited.size,25);const frozen=JSON.stringify(service.trains);service.update(1200);assert.equal(JSON.stringify(service.trains),frozen);service.update(0);assert.equal(JSON.stringify(service.trains),JSON.stringify(new RailService(net).trains));
console.log(JSON.stringify({pass:true,journeys,stationsServed:visited.size,trainFrames:36000,crossLineChecks,maxStep,minTrainCentreSeparation:minSeparation,supports:net.supports.length,clearedParcels:net.removedParcels,nodes:d.nodes.length,roads:d.roads.length,buildings:d.buildings.length,pauseRestart:true},null,2));
