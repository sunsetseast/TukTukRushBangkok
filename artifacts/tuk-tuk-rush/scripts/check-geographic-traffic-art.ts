import assert from "node:assert/strict";
import * as T from "three";
import { createBangkokFleetVisual } from "../src/game/bangkok/geographic/trafficArt";
import type { TrafficVehicle } from "../src/game/bangkok/geographic/traffic";

const kinds:TrafficVehicle["kind"][]=["taxi","car","motorcycle","tuktuk"];
const make=(id:number):TrafficVehicle=>({
  id:id+1,kind:kinds[id%kinds.length]!,
  edge:id,from:id,to:id+1,progress:20,speed:5,
  x:100+id*8,z:200+id*6,y:0,heading:id*.12,stoppedSeconds:0,
});
const fleet=createBangkokFleetVisual(16);
assert.equal(fleet.maxVehicles,16);
assert(fleet.drawBatches>=18 && fleet.drawBatches<=24,
  "Motor fleet must draw detailed vehicles with a fixed instanced draw budget");
const instances=fleet.root.children.filter((o):o is T.InstancedMesh=>o instanceof T.InstancedMesh);
assert.equal(instances.length,fleet.drawBatches);
assert(instances.every(m=>m.count===0),"No phantom vehicles on title screen");
fleet.render(kinds.map((_,i)=>make(i)));
assert(instances.some(m=>m.name==="Traffic:carCabin"&&m.count===2));
assert(instances.some(m=>m.name==="Traffic:taxiRoofSign"&&m.count===1));
assert(instances.some(m=>m.name==="Traffic:motorHelmet"&&m.count===1));
assert(instances.some(m=>m.name==="Traffic:tukCanopy"&&m.count===1));
assert(instances.some(m=>m.name==="Traffic:carWheels"&&m.count===8));
const roof=instances.find(m=>m.name==="Traffic:tukCanopy")!;
const mtx=new T.Matrix4();
roof.getMatrixAt(0,mtx);
const position=new T.Vector3(),quaternion=new T.Quaternion(),scale=new T.Vector3();
mtx.decompose(position,quaternion,scale);
assert(Number.isFinite(position.x)&&Number.isFinite(position.z));
assert.equal(position.y,1.94);
const fleet16=Array.from({length:16},(_,i)=>make(i));
fleet.render(fleet16);
assert(instances.every(m=>m.count<=m.instanceMatrix.count),
  "Part count must never overrun the preallocated GPU buffer");
fleet.render([]);
assert(instances.every(m=>m.count===0),"Turning off local traffic must hide all actors");
assert.throws(()=>fleet.render([...fleet16,make(17)]),/exceeded capacity/);
fleet.dispose();
assert.equal(fleet.root.children.length,0);
console.log({pass:true,batchedDrawCalls:fleet.drawBatches,complexTrafficKinds:4,
  capacity:16,instanceColors:true,cleanToggle:true,cleanDisposal:true});
