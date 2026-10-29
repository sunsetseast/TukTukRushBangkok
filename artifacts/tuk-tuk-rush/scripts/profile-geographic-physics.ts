/** Controlled Linux CPU comparison, not an iPhone benchmark. */
import fs from "node:fs";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { compiledChunkFile, decodeCompiledChunk } from "../src/game/bangkok/geographic/compiledBuildings";
import { buildingObstacles } from "../src/game/bangkok/geographic/buildings";
import { physicsObstacleIndex, setStreamedPhysicsObstacles } from "../src/game/bangkok/clearanceIndex";
import { obstacleDistance } from "../src/game/world";
import type { District } from "../src/game/types";
const root = new URL("../../../", import.meta.url), dir = new URL("../public/assets/geography/", import.meta.url);
const metadata = JSON.parse(gunzipSync(fs.readFileSync(new URL("runtime.v1.json.gz", dir))).toString());
const capture = JSON.parse(fs.readFileSync(new URL("generated-artifacts/geographic-stabilization/after/metrics.json", root), "utf8"));
const samples = ["yaowarat-drive", "silom-skyline"].map(name => ({ name, position: capture.views.find((v: any) => v.name === name).position }));
const report = JSON.parse(fs.readFileSync(new URL("compiled/report.json", dir), "utf8"));
const sparse = [...report.chunks].filter((r: any) => r.buildings >= 30).sort((a,b) => a.buildings-b.buildings)[0];
const origin = metadata.chunks.find((r: any) => r.id === sparse.id).origin;
samples.push({name:`sparse-source-${sparse.id}`, position:{x:origin[0]+512,z:origin[1]+512}});
const results = [];
for (const sample of samples) {
  const cx=Math.floor(sample.position.x/1024),cz=Math.floor(sample.position.z/1024);
  const refs=metadata.chunks.filter((r:any)=>Math.abs(r.origin[0]/1024-cx)<=1&&Math.abs(r.origin[1]/1024-cz)<=1);
  const groups=refs.map((ref:any)=>{
    const raw=gunzipSync(fs.readFileSync(new URL(compiledChunkFile(ref),dir)));
    const c=decodeCompiledChunk(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength) as ArrayBuffer,ref);
    return buildingObstacles(c.buildings!,c.origin);
  });
  const before={obstacles:[]} as unknown as District, after={obstacles:[]} as unknown as District;
  let beforeBuildMs=0,afterBuildMs=0;
  for(let i=1;i<=groups.length;i++){
    let t=performance.now();
    before.obstacles=groups.slice(0,i).flat();
    physicsObstacleIndex(before);beforeBuildMs+=performance.now()-t;
    t=performance.now();setStreamedPhysicsObstacles(after,groups.slice(0,i));afterBuildMs+=performance.now()-t;
  }
  const points=after.obstacles.filter((_,i)=>i%Math.max(1,Math.floor(after.obstacles.length/1000))===0).slice(0,1000)
    .map((o,i)=>({x:o.x+Math.sin(i)*1.8,z:o.z+Math.cos(i)*1.8}));
  function measure(d:District){
    const index=physicsObstacleIndex(d),counts:number[]=[],times:number[]=[];let contacts=0;
    for(const p of points){
      const t=performance.now(),candidates=index.query(p);counts.push(candidates.length);
      for(const i of candidates)if(obstacleDistance(p,d.obstacles[i]!)<1.55)contacts++;
      times.push(performance.now()-t);
    }
    counts.sort((a,b)=>a-b);times.sort((a,b)=>a-b);
    return {contacts,samples:points.length,candidateP50:counts[Math.floor(counts.length*.5)],candidateP95:counts[Math.floor(counts.length*.95)],
      narrowPhaseMeanMs:times.reduce((a,b)=>a+b,0)/times.length,narrowPhaseP95Ms:times[Math.floor(times.length*.95)]};
  }
  const a=measure(before),b=measure(after);assert.equal(a.contacts,b.contacts);
  results.push({name:sample.name,chunks:groups.length,colliders:after.obstacles.length,beforeBuildMs,afterBuildMs,before:a,after:b});
}
fs.writeFileSync(new URL("docs/qa/geographic-stabilization/physics-profile.json",root),JSON.stringify({environment:"Shared Linux Node CPU, default old 80m grid vs immutable streamed 32m grids; not Safari/device latency",results},null,2)+"\n");
console.log(JSON.stringify(results,null,2));
