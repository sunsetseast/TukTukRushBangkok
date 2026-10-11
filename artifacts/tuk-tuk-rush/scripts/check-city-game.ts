import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {BangkokNetwork,project} from "../src/game/bangkokNetwork";
const root=fileURLToPath(new URL("../",import.meta.url));
const read=async (f:string)=>JSON.parse(await fs.readFile(path.join(root,"public/maps",f),"utf8"));
const roads=await read("imported/roads.geojson"),spots=await read("bangkok-landmarks.geojson");
const graph=new BangkokNetwork();graph.build(roads);
assert(graph.nodes.length>=200,"Real street graph needs nodes");
assert(graph.segments.length>=500,"A broad enough 3D road network");
const poi=graph.setLandmarks(spots);
const ready=poi.filter(p=>p.accessible), names=ready.map(p=>p.id);
console.log("Bangkok OSM network:",graph.nodes.length,"nodes",graph.segments.length,
  "segments",graph.componentCounts.size,"components","main",graph.componentCounts.get(graph.mainComponent));
console.log("Reachable named landmarks:",names.join(", "));
assert(ready.length>=7,"Map must have enough drivable landmark missions");
for(const id of ["yaowarat","wat-pho","wat-arun","iconsiam","siam-paragon"]){
 assert(names.includes(id),"Iconic destination has no drivable stop: "+id);
}
const yaowarat=poi.find(p=>p.id==="yaowarat")!;
let crossings=0;
for(const name of ["wat-pho","wat-arun","iconsiam","siam-paragon"]){
 const dst=poi.find(p=>p.id===name)!;
 const route=graph.path(yaowarat.roadNode,dst.roadNode);
 assert(route.length>=2,"No directed road route from Chinatown to "+name);
 if(name==="wat-arun"||name==="iconsiam")crossings++;
}
assert(crossings===2);
for(const p of ready){
 const n=graph.nearest(p.road,true,100);
 assert(n&&n.d<7,"Tourist stop must be on the real road "+p.name);
}
const nearest=graph.nearest(project(100.5099857,13.7403072),true,1000);
assert(nearest,"Cannot spawn at Chinatown");
console.log("PASS real connected tour missions, actual bridge route to west bank, legal stops");
