import assert from "node:assert/strict";
import fs from "node:fs";
import {gunzipSync} from "node:zlib";
import {
  classifyThaiSign,thaiSignKey,
} from "../src/game/bangkok/geographic/thaiSignFaces";
import {
  localThaiWayNames,sourceWayName,
} from "../src/game/bangkok/geographic/thaiStreetNames";
import type { GeographicNetwork } from "../src/game/bangkok/geographic/network";
import type { RuntimeTrafficSign } from "../src/game/bangkok/geographic/controlImport";

const sign=(kind:RuntimeTrafficSign["kind"],
 tags?:Record<string,string>)=>({kind,tags});
assert.deepEqual(classifyThaiSign(sign("stop")),{type:"stop"});
assert.deepEqual(classifyThaiSign(sign("yield")),{type:"yield"});
assert.deepEqual(classifyThaiSign(sign("sign",{traffic_sign:"maxspeed"})),undefined,
  "A generic maxspeed tag MUST NOT create a fabricated Thai limit");
assert.deepEqual(classifyThaiSign(sign("sign",{traffic_sign:"city_limit"})),undefined);
assert.deepEqual(classifyThaiSign(sign("sign",{traffic_sign:"yes"})),undefined);
assert.deepEqual(classifyThaiSign(sign("sign",{traffic_sign:"maxspeed",maxspeed:"40"})),
  {type:"speed",kph:40});
assert.deepEqual(classifyThaiSign(sign("sign",{traffic_sign:"maxspeed:60"})),
  {type:"speed",kph:60});
assert.deepEqual(classifyThaiSign(sign("sign",{traffic_sign:"maxspeed",maxspeed:"120 mph"})),
  undefined,"Do not display miles-per-hour values as kilometres per hour");
assert.deepEqual(classifyThaiSign(sign("sign",{traffic_sign:"maxspeed",maxspeed:"180"})),
  undefined,"Reject implausible source speed limit");
assert.deepEqual(classifyThaiSign(sign("sign",{traffic_sign:"no_entry"})),
  {type:"no-entry"});
assert.deepEqual(classifyThaiSign(sign("sign",{traffic_sign:"no_stopping"})),
  {type:"no-stopping"});
assert.deepEqual(classifyThaiSign(sign("sign",{traffic_sign:"no_parking"})),
  {type:"no-parking"});
assert.deepEqual(classifyThaiSign(sign("sign",{traffic_sign:"no_u_turn"})),
  {type:"no-uturn"});
assert.equal(classifyThaiSign(sign("sign",{traffic_sign:"oneway"})),
  undefined,"Source tag alone does not specify physical one-way arrow orientation");
assert.deepEqual(classifyThaiSign(sign("sign",{traffic_sign:"bus_stop"})),
  undefined,"Do not mistake a bus stop for a mandatory stop control");
assert.equal(thaiSignKey({type:"speed",kph:40}),"speed:40");

const bilingual={id:"osm:way/100",name:"Yaowarat Road",thai:"ถนนเยาวราช"};
assert.deepEqual(sourceWayName(bilingual),
  {thai:"ถนนเยาวราช",english:"Yaowarat Road"});
assert.deepEqual(sourceWayName({id:"osm:way/2",name:"Unnamed passage"}),undefined);
assert.deepEqual(sourceWayName({id:"osm:way/3",name:"ซอยสันติภาพ",thai:"ซอยสันติภาพ"}),
  {thai:"ซอยสันติภาพ",english:undefined});
const network={
  x:new Float32Array([0,60,120]),
  z:new Float32Array([0,0,0]),
  y:new Float32Array([0,0,0]),
  a:new Uint32Array([0,1]),
  b:new Uint32Array([1,2]),
  width:new Float32Array([8,8]),
  way:new Uint32Array([0,1]),
  metadata:{ways:[bilingual,{id:"osm:way/101",name:"Unnamed passage"}]},
  trafficEdgesNear:()=>[0,1,0],
} as unknown as GeographicNetwork;
const labels=localThaiWayNames(network,{x:20,z:0},6,95);
assert.equal(labels.length,1);
assert.equal(labels[0]!.id,"osm:way/100");
assert.equal(labels[0]!.thai,"ถนนเยาวราช");
assert.equal(labels[0]!.english,"Yaowarat Road");
assert.equal(labels[0]!.edge,0);
assert(labels[0]!.z<0,"Bangkok's left roadside places eastbound plaque north of lane");
assert.equal(localThaiWayNames(network,{x:999,z:999}).length,0);
assert.equal(localThaiWayNames(network,{x:20,z:0},6,95,()=>false).length,0,
  "A road name plaque must not intersect a streamed building collider");
assert.equal(localThaiWayNames(network,{x:20,z:0},6,95,()=>true).length,1);
assert.deepEqual(localThaiWayNames(network,{x:20,z:0},0),[],
  "All extra road signs can be disabled without changing OSM routing");
const overpass={
  ...network,y:new Float32Array([6,6,6]),
} as unknown as GeographicNetwork;
assert.equal(localThaiWayNames(overpass,{x:20,z:0}).length,0,
  "No guessed decorative street signposts on grade-separated bridges");
const narrow={
  ...network,x:new Float32Array([0,3,6]),
} as unknown as GeographicNetwork;
assert.equal(localThaiWayNames(narrow,{x:2,z:0}).length,0,
  "Do not crowd junctions with plaques on <15m segments");

// Audit real source metadata, not just hand-written fixtures: source road
// names must actually exist for bilingual Bangkok plaques to render.
const gameplay=JSON.parse(gunzipSync(fs.readFileSync(
  new URL("../public/assets/geography/gameplay.v2.json.gz",import.meta.url),
)).toString()) as {ways:Array<{id:string;name:string;thai?:string}>};
const actualSourceNamed=gameplay.ways.filter(w=>sourceWayName(w));
const actualBilingual=gameplay.ways.filter(w=>{
  const label=sourceWayName(w);
  return !!label?.thai && !!label.english;
});
assert(actualSourceNamed.length>100,
  "Real Bangkok source must include actual OSM-named roads");
assert(actualBilingual.length>0,
  "No verified bilingual road names present; cannot claim Thai/English plaque support");
console.log({
  pass:true,actualSourceNamedRoads:actualSourceNamed.length,
  actualBilingualOSMWayNames:actualBilingual.length,
  thaiScript:["หยุด","ให้ทาง","ถนนเยาวราช"],
  unknownOMSSpeedValuesSkipped:true,
  sourceNamedRoadsOnly:true,
  leftHandRoadside:true,
  gradeSeparatedMountsExcluded:true,
  noPhantomTrafficControls:true,
});
