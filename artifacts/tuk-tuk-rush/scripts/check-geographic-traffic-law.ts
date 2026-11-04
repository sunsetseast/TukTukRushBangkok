import assert from "node:assert/strict";
import {
  bangkokSpeedPolicy,indexVerifiedTurnRestrictions,turnAllowed,
  ROAD_LAW_COVERAGE_REQUIREMENTS,
} from "../src/game/bangkok/geographic/trafficLaw";
import { sourceLegalRoute, type LegalRoutingGraph } from "../src/game/bangkok/geographic/legalRouting";
import type { RuntimeTurnRestriction } from "../src/game/bangkok/geographic/controlImport";

// Government-announced MPB regulation, effective 2024-12-24.
for(const name of [
  "Ratchadamnoen Nai Avenue","Na Phra That Road","Phra Chan Road",
  "Na Phra Lan Road","Sanam Chai Road","Kalyana Maitri Road",
  "Thai Wang Road","Maha Rat Road","Rachini Road","Setthakan Road",
]){
  const rule=bangkokSpeedPolicy(name);
  assert.equal(rule.limitKph,50,`50 km/h royal-precinct name: ${name}`);
  assert.equal(rule.noHornZone,true);
  assert.equal(rule.postedSignVerified,false,
    "The metropolitan order is NOT a source-mapped physical sign");
}
assert.equal(bangkokSpeedPolicy("ถนนสนามไชย").limitKph,50);
assert.equal(bangkokSpeedPolicy("ถนนหน้าพระธาตุ").limitKph,50);
for(const name of [
  "Vibhavadi Rangsit Road","Bang Na Trat Road","Srinagarindra Road",
  "Phahonyothin Road","Ram Inthra Road","Ratchaphruek Road",
  "Borommaratchachonnani Road","Kanlapaphruek Road","Rom Klao Road",
  "Suwinthawong Road","Chaeng Watthana Road","Rama III Road",
  "New Srinagarindra Rom Klao Road",
]){
  const rule=bangkokSpeedPolicy(name);
  assert.equal(rule.limitKph,undefined,`Do not invent an exempt road speed: ${name}`);
  assert.equal(rule.source,"named-exemption-unresolved");
}
assert.equal(bangkokSpeedPolicy("Yaowarat Road").limitKph,60);
assert.equal(bangkokSpeedPolicy("ถนนเยาวราช").limitKph,60);
assert.equal(bangkokSpeedPolicy("Rama III Soi 25").limitKph,60,
  "A side alley is not automatically the named major-road exemption");
assert.equal(bangkokSpeedPolicy().limitKph,undefined,
  "Missing road name must not get a fabricated signed road limit");
assert.equal(ROAD_LAW_COVERAGE_REQUIREMENTS.length,13);

// Source-defined 5-way small directed network. The direct 0→1→2 route
// violates a verified OSM turn restriction at node 1, so the GPS MUST
// take 0→1→3→4→2. None of the legs are synthetic shortcuts.
const graph:LegalRoutingGraph={
  x:new Float32Array([0,30,60,30,60]),
  z:new Float32Array([0,0,0,30,30]),
  a:new Uint32Array([0,1,1,3,4]),
  b:new Uint32Array([1,2,3,4,2]),
  way:new Uint32Array([0,1,2,3,4]),
  directions:new Int8Array([1,0,0,0,0]),
  motorAllowed:new Uint8Array([1,1,1,1,1]),
  offsets:new Uint32Array([0,1,4,6,8,10]),
  incident:new Uint32Array([0,0,1,2,1,4,2,3,3,4]),
};
const restriction:RuntimeTurnRestriction={id:"osm:relation/123",
  via:1,fromWay:0,toWay:1,type:"no"};
const only:RuntimeTurnRestriction={id:"osm:relation/456",
  via:1,fromWay:0,toWay:2,type:"only"};
const banned=indexVerifiedTurnRestrictions([restriction]);
assert.equal(turnAllowed(banned,1,0,1),false);
assert.equal(turnAllowed(banned,1,2,1),true,
  "A turn ban only applies if the car ARRIVED on the restricted way");
assert.equal(turnAllowed(banned,1,undefined,1),true,
  "GPS starting exactly at the junction has no fabricated prior way");
assert.equal(turnAllowed(indexVerifiedTurnRestrictions([only]),1,0,1),false);
assert.equal(turnAllowed(indexVerifiedTurnRestrictions([only]),1,0,2),true);
assert.deepEqual(
  sourceLegalRoute(graph,5,[{node:0,cost:0}],2,new Map()),
  [0,1,2], "Without a verified restriction use the shortest legal path",
);
assert.deepEqual(
  sourceLegalRoute(graph,5,[{node:0,cost:0}],2,banned),
  [0,1,3,4,2],"GPS must not recommend a banned direct right turn",
);
const startAtJunction=indexVerifiedTurnRestrictions([restriction]);
assert.deepEqual(
  sourceLegalRoute(graph,5,[{node:1,cost:0,incomingWay:2}],2,startAtJunction),
  [1,2], "Arrival on another road makes this turn legal",
);
const noPedestrianShortcut:LegalRoutingGraph={
  ...graph,motorAllowed:new Uint8Array([1,1,0,1,1]),
};
assert.equal(sourceLegalRoute(noPedestrianShortcut,5,
  [{node:0,cost:0}],2,banned),undefined,
  "Do not route around a turn ban through a source-tagged motor-prohibited path");
const reverse:LegalRoutingGraph={
  ...graph,directions:new Int8Array([-1,0,0,0,0]),
};
assert.equal(sourceLegalRoute(reverse,5,[{node:0,cost:0}],2,new Map()),
  undefined,"One-way reverse must not be used by GPS");
assert.throws(()=>indexVerifiedTurnRestrictions([{
  ...restriction,type:"traffic lights" as any,
}]),/Bad source/);
console.log({pass:true,royalPrecinctSpeedRoads:10,exemptNamedTrunkRoads:13,
  BangkokDefault60:true,noInventedSpeedOnExemptRoads:true,
  sharedTurnRestrictions:true,routeDetoursFromBannedTurns:true,
  noMotorAccessShortcuts:true,noReversedOneWays:true});
