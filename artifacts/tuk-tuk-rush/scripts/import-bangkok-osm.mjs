#!/usr/bin/env node
// OpenStreetMap contributors, ODbL 1.0. Geodata is always fetched, not invented.
// Manual, cached Overpass ingestion. Not used at game runtime.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const config=JSON.parse(await fs.readFile(path.join(root,"public/maps/bangkok-map-config.json"),"utf8"));
const bbox=config.bbox;
const out=path.join(root,"public/maps/imported");
const cache=path.join(out,".cache");
const endpoints=["https://overpass.kumi.systems/api/interpreter","https://overpass-api.de/api/interpreter"];
const args=process.argv.slice(2),arg=n=>{const i=args.indexOf(n);return i<0?undefined:args[i+1]};
const maxTiles=Number(arg("--max-tiles")||0);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await fs.mkdir(cache,{recursive:true});
const tiles=[];
for(let south=bbox.south;south<bbox.north-0.000001;south+=0.0275)
 for(let west=bbox.west;west<bbox.east-0.000001;west+=0.038)
  tiles.push({south,west,north:Math.min(bbox.north,south+0.0275),east:Math.min(bbox.east,west+0.038)});
const selected=maxTiles>0?tiles.slice(0,maxTiles):tiles,all=new Map();
for(let i=0;i<selected.length;i++){
 const tile=selected[i],file=path.join(cache,"tile-"+i+".json");
 let response;
 try{response=JSON.parse(await fs.readFile(file,"utf8"))}
 catch{
  const box=[tile.south,tile.west,tile.north,tile.east].map(n=>n.toFixed(6)).join(",");
  const query='[out:json][timeout:120];('+
   'way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|service)$"]('+box+');'+
   'way["waterway"~"^(river|canal)$"]('+box+');'+
   'way["water"="river"]('+box+');'+
   'way["waterway"="riverbank"]('+box+');'+
   ');out tags geom;';
  let last;
  for(let attempt=0;attempt<4&&!response;attempt++){
   try{
    const endpoint=endpoints[attempt%endpoints.length];
    const res=await fetch(endpoint,{method:"POST",
     body:new URLSearchParams({data:query}),
     signal:AbortSignal.timeout(155000),
     headers:{"Content-Type":"application/x-www-form-urlencoded"}});
    if(!res.ok)throw Error("Overpass HTTP "+res.status);
    const data=await res.json();
    if(!Array.isArray(data.elements))throw Error("Missing OSM elements");
    response=data;
   }catch(e){last=e;await wait((attempt+1)*4000)}
  }
  if(!response)throw Error("Could not fetch real OSM geometry; no invented fallback: "+last);
  await fs.writeFile(file,JSON.stringify(response));
  console.log("Saved tile "+(i+1)+"/"+selected.length);
  await wait(2000);
 }
 for(const x of response.elements)
  if(x.type==="way"&&Array.isArray(x.geometry)&&x.geometry.length>1)all.set(x.id,x);
}
const roads=[],waters=[],bridges=[];
const allowed=["highway","name","name:en","name:th","oneway","lanes","width","maxspeed","access","motor_vehicle","motorcar","service","bridge","layer","tunnel","waterway","water","natural"];
const props=e=>Object.fromEntries(Object.entries(e.tags||{}).filter(([key])=>allowed.includes(key)));
for(const way of all.values()){
 const coords=way.geometry.map(p=>[p.lon,p.lat]),id="osm-way-"+way.id;
 const tags={...props(way),osm_id:way.id,osm_type:"way",license:"ODbL-1.0"};
 if(way.tags?.highway){
  const f={type:"Feature",id,geometry:{type:"LineString",coordinates:coords},
   properties:{...tags,featureType:"road_centerline"}};
  roads.push(f);
  if(way.tags.bridge&&way.tags.bridge!=="no")bridges.push(f);
 }
 if(way.tags?.waterway||way.tags?.water==="river"){
  const a=coords[0],z=coords.at(-1),closed=coords.length>=4&&a[0]===z[0]&&a[1]===z[1];
  const polygon=way.tags?.water==="river"&&closed;
  waters.push({type:"Feature",id,
   geometry:polygon?{type:"Polygon",coordinates:[coords]}:{type:"LineString",coordinates:coords},
   properties:{...tags,featureType:"waterway"}});
 }
}
if(!roads.length)throw Error("No road centerlines retrieved. Stopping.");
const fc=features=>({type:"FeatureCollection",metadata:{
 attribution:"© OpenStreetMap contributors",license:"ODbL-1.0",
 source:"OpenStreetMap / Overpass",bbox,
 partial:maxTiles>0,tiles:selected.length,retrievedAt:new Date().toISOString()},features});
await fs.mkdir(out,{recursive:true});
await Promise.all([
 fs.writeFile(path.join(out,"roads.geojson"),JSON.stringify(fc(roads))),
 fs.writeFile(path.join(out,"waterways.geojson"),JSON.stringify(fc(waters))),
 fs.writeFile(path.join(out,"bridges.geojson"),JSON.stringify(fc(bridges)))
]);
await fs.writeFile(path.join(out,"manifest.json"),JSON.stringify({
 source:"© OpenStreetMap contributors (ODbL)",bbox,partial:maxTiles>0,
 tileCount:selected.length,roadWays:roads.length,waterFeatures:waters.length,bridgeWays:bridges.length,
 warnings:["OSM ways are NOT a ready-to-drive game navigation graph.",
 "Check restrictions, access, shared-node topology, crossings, bridge elevations and riverbank multipolygons.",
 "Never turn footways or ferry links into automobile roads."]
},null,2));
console.log("OSM import:",roads.length,"roads,",waters.length,"water objects,",bridges.length,"bridges.");
