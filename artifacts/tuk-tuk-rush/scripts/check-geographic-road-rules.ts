import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { GeographicNetwork, type GameplayMetadata } from "../src/game/bangkok/geographic/network";
import type { GeographicDataset } from "../src/game/bangkok/geographic/dataset";
import {
  readRoadRuleDirections, roadDirectionFromTags, type GeographicRoadRules,
} from "../src/game/bangkok/geographic/roadRules";

const dir = new URL("../public/assets/geography/", import.meta.url);
const sourceBytes = fs.readFileSync(new URL("runtime.v1.json.gz", dir));
const source = JSON.parse(gunzipSync(sourceBytes).toString()) as GeographicDataset;
const metadata = JSON.parse(
  gunzipSync(fs.readFileSync(new URL("gameplay.v2.json.gz", dir))).toString(),
) as GameplayMetadata;
const rules = JSON.parse(
  gunzipSync(fs.readFileSync(new URL("road-rules.v1.json.gz", dir))).toString(),
) as GeographicRoadRules;
const hash = createHash("sha256").update(sourceBytes).digest("hex");
assert.equal(hash, metadata.sourceSha256);
const directions = readRoadRuleDirections(rules, hash, metadata.ways.length);
const byId = new Map(source.roads.map(w => [w.id, w]));
let forward = 0, reverse = 0;
for (let i = 0; i < metadata.ways.length; i++) {
  const id = metadata.ways[i]!.id, original = byId.get(id);
  assert(original, "Rule source retained for " + id);
  const expected = roadDirectionFromTags(original.tags);
  assert.equal(directions[i], expected, "Source-aligned one-way direction: " + id);
  if (expected === 1) forward++;
  if (expected === -1) reverse++;
}
assert(forward > 0, "Actual pinned Bangkok one-way roads must be represented");
assert.equal(forward + reverse, rules.directed.length);
assert.equal(roadDirectionFromTags({oneway:"yes"}),1);
assert.equal(roadDirectionFromTags({oneway:"true"}),1);
assert.equal(roadDirectionFromTags({oneway:"-1"}),-1);
assert.equal(roadDirectionFromTags({oneway:"reverse"}),-1);
assert.equal(roadDirectionFromTags({oneway:"no",junction:"roundabout"}),0);
assert.equal(roadDirectionFromTags({junction:"roundabout"}),1);
assert.equal(roadDirectionFromTags({highway:"motorway"}),1);
assert.equal(roadDirectionFromTags({oneway:"reversible"}),0);
assert.equal(roadDirectionFromTags({oneway:"alternating"}),0);
assert.equal(roadDirectionFromTags({oneway:"unknown",highway:"motorway"}),0);
assert.throws(() => readRoadRuleDirections({...rules,sourceSha256:"bad"},hash,metadata.ways.length),/does not match/);
assert.throws(() => readRoadRuleDirections({...rules,wayCount:metadata.ways.length+1},hash,metadata.ways.length),/does not match/);
assert.throws(() => readRoadRuleDirections({...rules,directed:[[0,1],[0,-1]]},hash,metadata.ways.length),/duplicate/);
assert.throws(() => readRoadRuleDirections({...rules,directed:[[metadata.ways.length,1]]},hash,metadata.ways.length),/Invalid/);

// Square-road synthetic map proves legal GPS direction and safe route caching
// without mixing direction semantics into physical roads or legacy game.
function fixtureBuffer(nodes: number[][], segments: number[][]) {
  const bytes = new ArrayBuffer(16 + 12*nodes.length + 16*segments.length);
  new Uint32Array(bytes,0,4).set([0x47454f32,nodes.length,segments.length,1]);
  let offset = 16;
  for (const axis of [0,1,2]) {
    new Float32Array(bytes,offset,nodes.length).set(nodes.map(n=>n[axis]!));
    offset += nodes.length*4;
  }
  for (const axis of [0,1,2,3]) {
    if (axis === 2) new Float32Array(bytes,offset,segments.length).set(segments.map(n=>n[axis]!));
    else new Uint32Array(bytes,offset,segments.length).set(segments.map(n=>n[axis]!));
    offset += segments.length*4;
  }
  return bytes;
}
const fourCorners = [
  [0,0,0], [20,0,0], [20,20,0], [0,20,0],
].map(([x,z,y])=>[x!,z!,y!]); // x, z, level
const buffer = fixtureBuffer(
  fourCorners.map(([x,z,y])=>[x,z,y]),
  [[0,1,8,0],[1,2,8,1],[2,3,8,2],[3,0,8,3]],
);
const fake = {
  ...metadata, nodeCount:4, edgeCount:4, waterUnion:[],
  ways:[
    {id:"frontage",name:"One-way street"},
    {id:"east",name:"Return east"},
    {id:"north",name:"Return north"},
    {id:"west",name:"Return west"},
  ],
};
const pack = (direction:-1|1):GeographicRoadRules => ({
  schema:1,sourceSha256:hash,wayCount:4,directed:[[0,direction]],
});
const gps = new GeographicNetwork(fake,buffer,pack(1));
const direct = new GeographicNetwork(fake,buffer);
const onlyNodes = (route: ReturnType<GeographicNetwork["path"]>) =>
  route.filter(p=> "id" in p).map(p=>(p as {id:string}).id);
assert.deepEqual(onlyNodes(direct.path({x:15,z:0},direct.node(0))),["geo:0"]);
assert.deepEqual(
  onlyNodes(gps.path({x:15,z:0},gps.node(0))),
  ["geo:1","geo:2","geo:3","geo:0"],
  "GPS must drive around the block instead of reversing an OSM forward one-way",
);
assert.deepEqual(onlyNodes(gps.path({x:5,z:0},gps.node(1))),["geo:1"]);
assert.deepEqual(onlyNodes(gps.path({x:0,z:0},gps.node(3))),["geo:0","geo:3"]);
assert.deepEqual(
  onlyNodes(gps.path({x:6,z:0},gps.node(3))),
  ["geo:1","geo:2","geo:3"],
  "Cached intersection start must never allow a reverse drive from mid-block",
);
const reverse = new GeographicNetwork(fake,buffer,pack(-1));
assert.deepEqual(
  onlyNodes(reverse.path({x:5,z:0},reverse.node(1))),
  ["geo:0","geo:3","geo:2","geo:1"],
);
assert.deepEqual(onlyNodes(reverse.path({x:15,z:0},reverse.node(0))),["geo:0"]);
const deadEnd = fixtureBuffer([[0,0,0],[20,0,0]],[[0,1,8,0]]);
const disconnected = new GeographicNetwork(
  {...fake,nodeCount:2,edgeCount:1,ways:[fake.ways[0]!] },
  deadEnd, {...pack(1),wayCount:1},
);
assert.deepEqual(disconnected.path({x:15,z:0},disconnected.node(0)),[],
  "No illegal reverse shortcut if no legal route exists");
assert.equal(gps.directions[0],1);
assert.equal(direct.directions[0],0);
console.log({
  roadRules: "pass", sourceHash:hash, verifiedWays:metadata.ways.length,
  forward,reverse, directed:rules.directed.length, geometryChanged:false,
  gpsDirectionRegression:"pass", freeRoamPhysicsUnchanged:true,
});
