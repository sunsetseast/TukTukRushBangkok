import assert from 'node:assert/strict';
import * as T from 'three';
import clipping from 'polygon-clipping';
import {createBangkokWorld,regionAt,blockedByRiver} from '../src/game/bangkok/world';
import {TrafficSystem,lanePoint} from '../src/game/traffic';
import {roadEnvelopes,surfaceGeometry} from '../src/game/bangkok/roadSurfaceGraph';
import {TurboBoost,BOOST_SPEED_CAP} from '../src/game/boost';
import {VehicleController,createVehicle} from '../src/game/vehicle';
import {obstacleDistance,routeBetween} from '../src/game/world';
import {shiftLighting} from '../src/game/bangkok/mesh';
import {sculptedLandmark} from '../src/game/bangkok/sculptedLandmarks';
import {physicsObstacleIndex} from '../src/game/bangkok/clearanceIndex';
import {disposeObject} from '../src/game/assets';
import type {District,TrafficCar} from '../src/game/types';
const d=createBangkokWorld(),nodes=new Map(d.nodes.map(n=>[n.id,n])),traffic=new TrafficSystem(d),player={...createVehicle(d),x:99999,z:99999};
const grid=physicsObstacleIndex(d);
let samples=0;const regions=new Set<string>();
// Actual moving cars, both directions of every two-way road. Old sign fails +Z calibration.
for(const r of d.roads)for(const [from,to] of r.oneWay?[[r.a,r.b]]:[[r.a,r.b],[r.b,r.a]]){
  const a=nodes.get(from!)!,b=nodes.get(to!)!,len=Math.hypot(b.x-a.x,b.z-a.z);if(len<2)continue;
  const car:TrafficCar={...lanePoint(a,b,r,.5),from:from!,to:to!,heading:Math.atan2(b.x-a.x,b.z-a.z),speed:8,id:samples,kind:'taxi',color:'#fff',wait:0,nearMissCooldown:0};
  for(let i=0;i<3;i++){
    const old={...car};traffic.update([car],player,1/120);const dx=car.x-old.x,dz=car.z-old.z;
    if(r.roundabout)continue;
    const t=((car.x-a.x)*(b.x-a.x)+(car.z-a.z)*(b.z-a.z))/(len*len),center={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
    const left=(car.x-center.x)*dz-(car.z-center.z)*dx;
    assert(left>0,`Moving traffic on RIGHT: ${r.corridor} ${from}>${to}`);
    assert(!blockedByRiver(d,car,1),`Water lane ${r.corridor} ${from}>${to}: ${JSON.stringify(car)}`);assert(grid.query(car).every(i=>obstacleDistance(car,d.obstacles[i]!)>.8));samples++;
  }
  regions.add(regionAt(d,car)?.id??'connector');
}
// Curves enter the correct outgoing lane without teleporting through a junction.
const cars=traffic.create();let transitions=0,maxStep=0,clockwise=0;
const gate=d.landmarks.find(l=>l.id==='gate')!;
for(let frame=0;frame<7200;frame++){
  const before=cars.map(c=>({...c}));traffic.update(cars,player,1/60);
  for(let i=0;i<cars.length;i++){
    const c=cars[i]!,old=before[i]!,step=Math.hypot(c.x-old.x,c.z-old.z);maxStep=Math.max(maxStep,step);assert(step<.3,'Junction teleport');
    const r=d.roads.find(r=>r.a===c.from&&r.b===c.to||!r.oneWay&&r.b===c.from&&r.a===c.to)!;assert(r);
    assert(!blockedByRiver(d,c,1),`Traffic water: ${r.corridor}`);
    assert(grid.query(c).every(i=>obstacleDistance(c,d.obstacles[i]!)>.8),`Traffic solid: ${r.corridor}`);
    if(r.roundabout&&step>.001&&(!traffic.motionPhase(c).turning||traffic.motionPhase(c).nextRoundabout)){const angular=(old.x-gate.x)*(c.z-old.z)-(old.z-gate.z)*(c.x-old.x);assert(angular>-.01,'Counterclockwise circle');clockwise++;}
    if(old.from!==c.from){transitions++;const a=nodes.get(c.from)!,b=nodes.get(c.to)!,len=Math.hypot(b.x-a.x,b.z-a.z);
      if(!r.roundabout)assert(((c.x-a.x)*(b.z-a.z)-(c.z-a.z)*(b.x-a.x))/len>1,'Wrong destination lane');
    }
  }
}
assert(transitions>300);assert(clockwise>50);
const road=roadEnvelopes(d),curb=roadEnvelopes(d,.32),outer=roadEnvelopes(d,6),sidewalk=clipping.difference(outer,curb);
assert.equal(clipping.intersection(sidewalk,road).length,0,'Concrete overlaps asphalt');
const geometry=surfaceGeometry(road,.14),position=geometry.attributes.position!;
for(let i=0;i<position.count;i+=3){const a=new T.Vector3().fromBufferAttribute(position,i),b=new T.Vector3().fromBufferAttribute(position,i+1),c=new T.Vector3().fromBufferAttribute(position,i+2);assert(new T.Vector3().crossVectors(b.sub(a),c.sub(a)).y>=-1e-7,'Road winding');}
geometry.dispose();
const boost=new TurboBoost();assert(boost.trigger());assert(!boost.trigger());let active=0;
for(let i=0;i<301;i++)active+=boost.advance(1/60);assert(Math.abs(active-5)<1e-7);assert.equal(boost.state,'recharging');assert(!boost.trigger());
for(let i=0;i<599;i++)boost.advance(1/60);assert.equal(boost.state,'ready');assert(boost.trigger());boost.reset();assert.equal(boost.state,'ready');
const empty:District={nodes:[{id:'a',x:0,z:0},{id:'b',x:0,z:10000}],roads:[{a:'a',b:'b',width:20,name:'test'}],buildings:[],obstacles:[],landmarks:[],bounds:{minX:-1000,maxX:1000,minZ:-1000,maxZ:10000}};
const simulate=(boost:boolean,seconds:number)=>{const v={...createVehicle(),x:0,z:0,heading:0},controller=new VehicleController();for(let i=0;i<seconds*120;i++)controller.update(v,{gas:true,brake:false,steer:0,boost},empty,[],1/120);return {v,controller};};
const normal=simulate(false,.5),fast=simulate(true,.5);assert(Math.abs(fast.v.speed/normal.v.speed-1.4)<.02);
const top=simulate(true,8);assert(Math.abs(top.v.speed-BOOST_SPEED_CAP)<.1);const speed=top.v.speed;
for(let i=0;i<60;i++)top.controller.update(top.v,{gas:true,brake:true,steer:0,boost:true},empty,[],1/120);assert(top.v.speed<speed-10,'Brake loses priority');
// A thin obstacle must remain solid at boosted speed, including long submitted dt.
const wall={...empty,obstacles:[{x:0,z:30,w:20,d:.12,height:3,color:'#aaa'}]};const v={...createVehicle(),x:0,z:0,heading:0},vc=new VehicleController();
for(let i=0;i<100;i++)vc.update(v,{gas:true,brake:false,steer:0,boost:true},wall,[],.05);assert(v.z<30&&v.collision>0);
for(const id of ['paknam','baiyoke','state','pho']){
  const l=d.landmarks.find(l=>l.id===id)!;assert(routeBetween(d,d.spawn?d.nodes.find(n=>n.id===d.roads.find(r=>r.corridor==='yaowarat')!.a)!.id:d.nodes[0]!.id,l.accessNode!).length);
  const g=sculptedLandmark(l)!;assert(g);const box=new T.Box3().setFromObject(g),s=box.getSize(new T.Vector3());
  assert(s.x<=l.size!+1&&s.z<=l.size!+1,`Landmark beyond collision plot ${id}`);assert(s.y>(id==='pho'?14:60));disposeObject(g);
}
assert.equal(shiftLighting(240).night,1);assert.equal(shiftLighting(0).night,0);
console.log(JSON.stringify({pass:true,movingLaneSamples:samples,regions:[...regions],trafficTransitions:transitions,clockwiseFrames:clockwise,maxStep,sidewalkRoadOverlap:0,boost:'5s active / 10s recharge / 1.4 acceleration / 37m/s cap',roadTriangles:position.count/3,buildings:d.buildings.length}));
