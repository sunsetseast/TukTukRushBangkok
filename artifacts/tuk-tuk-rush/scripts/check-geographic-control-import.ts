import assert from "node:assert/strict";
import type { GeographicNetwork } from "../src/game/bangkok/geographic/network";
import type { GeographicDataset } from "../src/game/bangkok/geographic/dataset";
import {
  compileControlPack, emptyControlPack,
  type SourceControlSnapshot,
} from "../src/game/bangkok/geographic/controlImport";
import { geographicToMeters } from "../src/game/bangkok/geographic/projection";
import { simulatedSignalIsGreen, sourceApproachControls } from "../src/game/bangkok/geographic/trafficControlRuntime";
import { GeographicTrafficSimulation } from "../src/game/bangkok/geographic/traffic";
import { trafficSignPlacement } from "../src/game/bangkok/geographic/trafficSignPlacement";

const coordinate={lon:100.5,lat:13.75};
const c=geographicToMeters(coordinate);
const nodes = [
  [c.x,c.z], [c.x-20,c.z],[c.x+20,c.z],[c.x,c.z-20],[c.x,c.z+20],
];
const a=new Uint32Array([1,0,3,0]);
const b=new Uint32Array([0,2,0,4]);
const way=new Uint32Array([0,1,2,3]);
const fake={
  metadata:{schema:2,sourceSha256:"pinned-map",ways:[
    {id:"osm:way/10",name:"West Road"}, {id:"osm:way/11",name:"East Road"},
    {id:"osm:way/12",name:"North Road"}, {id:"osm:way/13",name:"South Road"},
  ]},
  x:Float32Array.from(nodes.map(n=>n[0]!)),
  z:Float32Array.from(nodes.map(n=>n[1]!)),
  y:new Float32Array(nodes.length),
  a,b,way,width:new Float32Array([8,8,8,8]),
  directions:new Int8Array(4),
  motorAllowed:new Uint8Array([1,1,1,1]),
  offsets:new Uint32Array([0,4,5,6,7,8]),
  incident:new Uint32Array([0,1,2,3,0,1,2,3]),
  nearest:()=>{throw Error("Unmapped sign must never control a synthetic junction");},
} as unknown as GeographicNetwork;
const bbox=[100.46,13.63,100.65,13.825];
const source:SourceControlSnapshot={
  schema:1,source:"https://download.geofabrik.de/asia/thailand-latest.osm.pbf",
  pbfSha256:"separately-versioned-control-snapshot",
  baselinePbfSha256:"baseline",
  matchesBaselineSnapshot:false,
  geographicSourceSha256:"pinned-map",bbox,
  nodes:[
    {id:"osm:node/1",kind:"signal",
      coordinate:[coordinate.lon,coordinate.lat],tags:{highway:"traffic_signals"}},
    // A stop sign without direction is visible but cannot impose a fictitious
    // all-way STOP rule on this 4-legged intersection.
    {id:"osm:node/2",kind:"stop",
      coordinate:[coordinate.lon,coordinate.lat],tags:{highway:"stop"}},
    {id:"osm:node/3",kind:"yield",
      coordinate:[coordinate.lon,coordinate.lat],tags:{highway:"give_way",direction:"forward"}},
    {id:"osm:node/4",kind:"signal",
      coordinate:[coordinate.lon+.01,coordinate.lat],tags:{highway:"traffic_signals"}},
  ],
  restrictions:[
    {id:"osm:relation/99",from:["osm:way/10"],to:["osm:way/11"],
      via:[{id:"osm:node/1",role:"via"}],tags:{restriction:"no_right_turn"}},
    {id:"osm:relation/100",from:["osm:way/12"],to:["osm:way/13"],
      via:[{id:"osm:node/1",role:"via"}],tags:{restriction:"only_straight_on"}},
    {id:"osm:relation/101",from:["osm:way/10"],to:["osm:way/13"],
      via:[{id:"osm:node/1",role:"via"}],tags:{restriction:"no_left_turn",except:"motorcar"}},
  ],
};
const runtime={
  bbox,nodes:{"osm:node/1":nodes[0] as [number,number],
    "osm:node/2":nodes[0] as [number,number],
    "osm:node/3":nodes[0] as [number,number],
    "osm:node/4":nodes[0] as [number,number]},
  roads:[],
} as unknown as GeographicDataset;
const pack=compileControlPack(source,runtime,fake);
assert.equal(pack.schema,1);
assert.equal(pack.status,"ready");
assert.equal(pack.signs.filter(s=>s.mapped).length,3,
  "Only tagged source IDs at unchanged coordinates should align");
const signal=pack.signs.find(s=>s.id==="osm:node/1")!;
assert.equal(signal.approaches.length,4);
assert(new Set(signal.approaches.map(a=>a.phase)).size===2,
  "Crossing E-W/N-S approaches must use separate simulated phases");
const stop=pack.signs.find(s=>s.id==="osm:node/2")!;
assert.equal(stop.approaches.length,0,
  "Stop sign without source direction must NOT become an imaginary four-way STOP");
const yieldSign=pack.signs.find(s=>s.id==="osm:node/3")!;
assert(yieldSign.approaches.every(a=>fake.b[a.edge]===0),
  "Direction=forward only affects actual forward inbound source ways");
assert.equal(pack.stats.unmatched,1,
  "OSM node that changed position after pinned road import stays unbound");
assert.equal(pack.stats.unresolvedRestrictions,1,
  "Restriction explicitly excepting motorcar cannot apply to motor traffic");
assert.equal(pack.restrictions.length,2);
assert.equal(pack.restrictions.find(r=>r.id==="osm:relation/99")?.type,"no");
assert.equal(pack.restrictions.find(r=>r.id==="osm:relation/100")?.type,"only");
// Source-backed pole placement on the LEFT shoulder of an EASTBOUND lane
// must not float in the center of the actual Bangkok junction.
const pole=trafficSignPlacement(signal,fake,0);
assert(!pole.sourceOnly);
assert(pole.x < signal.x,"Signal faces vehicles BEFORE the mapped junction");
assert(pole.z < signal.z,"Eastbound Bangkok traffic has a northern LEFT shoulder");
const absent=trafficSignPlacement({...signal,node:undefined,approaches:[]},fake);
assert.equal(absent.x,signal.x);
assert.equal(absent.z,signal.z);
assert(absent.sourceOnly,"Never infer an approach for an unmatched OSM sign");
const controls=sourceApproachControls(pack);
assert(controls.length>=4);
assert(controls.every(c=>c.sourceId==="osm:node/1"),
  "Ambiguous signs cannot preempt properly source-bound signals");
assert.equal(simulatedSignalIsGreen(0,5),true);
assert.equal(simulatedSignalIsGreen(1,5),false);
assert.equal(simulatedSignalIsGreen(0,22),false);
assert.equal(simulatedSignalIsGreen(1,22),true);
const fleet=new GeographicTrafficSimulation(fake,42,controls,pack.restrictions);
assert(fleet);
assert.equal(sourceApproachControls(emptyControlPack("pinned-map")).length,0);
assert.throws(()=>compileControlPack({...source,geographicSourceSha256:"unrelated-map"},runtime,fake),
 /does not match/);
console.log({pass:true,sourceAnchoring:true,taggedControls:3,taggedSignsNotInvented:true,
  phaseGroupsNonOverlapping:true,exactOSMTurnRestrictions:2,
  newerSourceRequiresCoordinateMatch:true});
