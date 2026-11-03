import assert from "node:assert/strict";
import {
  GeographicTrafficSimulation, legalTrafficTraversal,
  leftSideTrafficPosition, type TrafficNetwork, type TrafficVehicle,
} from "../src/game/bangkok/geographic/traffic";

/** Small OSM-like directed road square:
 * eastbound one-way -> south -> west -> north, plus a blocked footpath.
 * Every index and degree is actual graph topology, never proximity welding.
 */
const x = new Float32Array([0,80,80,0,160]);
const z = new Float32Array([0,0,80,80,0]);
const y = new Float32Array([0,0,0,0,0]);
const a = new Uint32Array([0,1,2,3,1]);
const b = new Uint32Array([1,2,3,0,4]);
const width = new Float32Array([8,8,8,8,2]);
const way = new Uint32Array([0,1,2,3,4]);
const directions = new Int8Array([1,0,0,0,0]);
const motorAllowed = new Uint8Array([1,1,1,1,0]);
const adjacency: number[][] = Array.from({length: x.length},()=>[]);
for (let edge=0;edge<a.length;edge++){
  adjacency[a[edge]!]!.push(edge);adjacency[b[edge]!]!.push(edge);
}
const offsets = new Uint32Array(x.length+1);
for (let i=0;i<x.length;i++) offsets[i+1]=offsets[i]!+adjacency[i]!.length;
const incident = Uint32Array.from(adjacency.flat());
const net: TrafficNetwork = {
  x,z,y,a,b,width,way,directions,motorAllowed,offsets,incident,
  trafficEdgesNear: (_position, _radius) => [0,1,2,3,4],
};
assert.equal(legalTrafficTraversal(net,0,0),true);
assert.equal(legalTrafficTraversal(net,0,1),false,"Forward one-way must not run backward");
assert.equal(legalTrafficTraversal(net,1,1),true);
assert.equal(legalTrafficTraversal(net,1,2),true);
assert.equal(legalTrafficTraversal(net,4,1),false,"Footpath never spawns motor traffic");
assert.equal(legalTrafficTraversal(net,4,4),false);
const reverse: TrafficNetwork = {...net,directions:new Int8Array([-1,0,0,0,0])};
assert.equal(legalTrafficTraversal(reverse,0,0),false);
assert.equal(legalTrafficTraversal(reverse,0,1),true);
const mid: TrafficVehicle = {
  id:1,kind:"taxi",edge:0,from:0,to:1,progress:40,speed:0,
  x:0,z:0,y:0,heading:0,stoppedSeconds:0,
};
const east = leftSideTrafficPosition(net,mid);
assert.equal(east.x,40);
assert(east.z < -1, "Bangkok left-side means NORTH lane when driving EAST");
const west = leftSideTrafficPosition(reverse,{...mid,from:1,to:0});
assert(west.z > 1, "Opposite-direction traffic occupies opposite side");
assert.equal(east.heading,Math.PI/2);

// Reproducible small fleet only; all vehicles occupy source-permitted roads.
const traffic = new GeographicTrafficSimulation(net,1234);
for(let i=0;i<500;i++)traffic.update(.08,{x:40,z:40},true,"medium");
assert(traffic.stats.spawned > 0,"Actual cars must appear near the player");
assert(traffic.vehicles.length <=16,"Bounded mobile draw budget");
assert(traffic.vehicles.every(v=>legalTrafficTraversal(net,v.edge,v.from)));
assert(traffic.vehicles.every(v=>Math.hypot(v.x-40,v.z-40)<=265));
assert(traffic.vehicles.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.z)));
const deterministic = new GeographicTrafficSimulation(net,1234);
for(let i=0;i<500;i++)deterministic.update(.08,{x:40,z:40},true,"medium");
assert.deepEqual(deterministic.vehicles,traffic.vehicles,"Identical seed and source must replay same traffic");

// Never resurrect stale traffic after leaving gameplay or leaving/returning.
traffic.update(.1,{x:40,z:40},false,"medium");
assert.equal(traffic.vehicles.length,0);
for(let i=0;i<40;i++)traffic.update(.08,{x:40,z:40},true,"low");
assert(traffic.vehicles.length<=9,"Low quality cap");
assert(traffic.vehicles.length>0,"Returning to gameplay must repopulate traffic");

// Stop/signal control is used ONLY when an actual sourced approach provides it.
// This synthetic control fixture tests the behavior, not a claim of live OSM tags.
const signal = new GeographicTrafficSimulation(net,1234,[{
  at:1,incomingEdge:0,kind:"signal",sourceId:"synthetic-fixture",
  cycleSeconds:30,greenSeconds:3,offsetSeconds:8,
}]);
const actor: TrafficVehicle = {
  ...mid,id:10,progress:76,speed:0,stoppedSeconds:0,
};
Object.assign(actor,leftSideTrafficPosition(net,actor));
signal.vehicles.push(actor);
for(let i=0;i<70;i++)signal.update(.08,{x:0,z:40},true);
assert(actor.progress <= 76.51,"Red signal stops at the line; no running red");
assert(signal.stats.stoppedForControl>0);
const openSignal = new GeographicTrafficSimulation(net,1234,[{
  at:1,incomingEdge:0,kind:"signal",sourceId:"synthetic-fixture",
  cycleSeconds:30,greenSeconds:15,offsetSeconds:0,
}]);
const greenActor = {...actor,id:11,progress:76,speed:0,stoppedSeconds:0};
Object.assign(greenActor,leftSideTrafficPosition(net,greenActor));
openSignal.vehicles.push(greenActor);
for(let i=0;i<45;i++)openSignal.update(.08,{x:0,z:40},true);
assert(greenActor.edge !== 0 || greenActor.progress > 76.5,
  "Sourced green allows progress");
const stopSign = new GeographicTrafficSimulation(net,1234,[{
  at:1,incomingEdge:0,kind:"stop",sourceId:"synthetic-fixture",
}]);
const stopActor={...actor,id:12,progress:76,speed:0,stoppedSeconds:0};
Object.assign(stopActor,leftSideTrafficPosition(net,stopActor));
stopSign.vehicles.push(stopActor);
for(let i=0;i<18;i++)stopSign.update(.08,{x:0,z:40},true);
assert(stopActor.progress <= 76.51,"Tagged stop sign holds before crossing");
for(let i=0;i<90;i++)stopSign.update(.08,{x:0,z:40},true);
assert(stopActor.progress > 76.51 || stopActor.edge!==0,
  "After actual stop dwell, tagged junction should clear");
assert.throws(()=>new GeographicTrafficSimulation(net,1,[{
  at:1,incomingEdge:0,kind:"signal",sourceId:"no-phase",
}]), /verified, non-conflicting/);
assert.throws(()=>new GeographicTrafficSimulation(net,1,[{
  at:1,incomingEdge:0,kind:"stop",sourceId:"",
}]), /Unverified/);
console.log({
  result:"pass", noWrongWay:true, noFootpaths:true, bangkokLeftSide:true,
  deterministic:true, boundedAt16:true, actualVehicleSpawning:true,
  explicitlyTaggedRedSignal:true, actualStopDwell:true,
  sourceControlLocationsInProduction:"not yet imported",
});
