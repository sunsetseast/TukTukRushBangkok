import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const read=async p=>JSON.parse(await fs.readFile(root+"public/maps/"+p,"utf8"));
const geo=await read("bangkok-landmarks.geojson"),cfg=await read("bangkok-map-config.json");
const html=await fs.readFile(root+"bangkok-map.html","utf8");
assert.equal(geo.type,"FeatureCollection");
assert(geo.features.length>=18);
const byId=new Map();
for(const f of geo.features){
 assert.equal(f.geometry.type,"Point");
 const [lon,lat]=f.geometry.coordinates;
 assert(lon>=cfg.bbox.west&&lon<=cfg.bbox.east&&lat>=cfg.bbox.south&&lat<=cfg.bbox.north);
 assert(!byId.has(f.id),"Duplicate landmark "+f.id);
 assert(f.properties.name&&f.properties.zone&&f.properties.source.startsWith("https://"));
 byId.set(f.id,{lat,lon});
}
const dist=(a,b)=>{
 const A=byId.get(a),B=byId.get(b),r=6371000,d=Math.PI/180;
 const dlat=(B.lat-A.lat)*d,dlon=(B.lon-A.lon)*d;
 const s=Math.sin(dlat/2)**2+Math.cos(A.lat*d)*Math.cos(B.lat*d)*Math.sin(dlon/2)**2;
 return 2*r*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));
};
for(const id of ["wat-pho","wat-arun","grand-palace","iconsiam","siam-paragon","yaowarat","chinatown-gate","asiatique","rama-viii-bridge"])
 assert(byId.has(id),"Missing geographic anchor "+id);
assert(byId.get("wat-arun").lon<byId.get("wat-pho").lon,"Wat Arun west bank");
assert(dist("wat-pho","wat-arun")>300&&dist("wat-pho","wat-arun")<900);
assert(byId.get("iconsiam").lat<byId.get("yaowarat").lat);
assert(byId.get("siam-paragon").lon>byId.get("yaowarat").lon);
assert(dist("siam-paragon","yaowarat")>1800,"No artificial 700m whole-city compression");
assert(dist("asiatique","rama-viii-bridge")>6000,"Covers real river corridor");
assert(cfg.projection.metersPerDegreeLongitude>106000&&cfg.projection.metersPerDegreeLongitude<109000);
assert(html.includes("tile.openstreetmap.org"));
assert(html.includes("OpenStreetMap contributors"));
assert(html.includes("/maps/bangkok-landmarks.geojson"));
console.log("PASS",geo.features.length,"landmark coordinates, Wat Arun riverbank, ICONSIAM and Siam geography, 1:1 projection");
