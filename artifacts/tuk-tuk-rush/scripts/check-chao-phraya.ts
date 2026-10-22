import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import * as T from 'three';
import {createBangkokWorld,blockedByRiver,riverDistance} from '../src/game/bangkok/world';
import {CITY_MODEL,assertApprovedCityGeometry} from '../src/game/bangkok/cityModel';
import {inRiverWater,riverClearance,riverBank,nearestRiverShore,waterTerrainKey,riverPolygonPath} from '../src/game/bangkok/waterGeometry';
import {channelGeometry,assertWaterTerrainFresh,buildRoadSurfaces} from '../src/game/bangkok/roadSurfaceGraph';
import {roadGraphKey} from '../src/game/bangkok/roadIdentity';
import {riverPiers,boatRoutes,boatPose} from '../src/game/bangkok/riverfront';
import {rectangleBoundary} from '../src/game/bangkok/landmarkParcels';
import {cityGeometry} from '../src/game/bangkok/cityGeometry';
import {cartography} from '../src/game/bangkok/cartography';
import {distanceToSegment} from '../src/game/world';
import {disposeObject} from '../src/game/assets';
const dir=new URL('../../../docs/qa/chao-phraya/',import.meta.url),d=createBangkokWorld(),before=JSON.parse(gunzipSync(fs.readFileSync(new URL('before-world.json.gz',dir))).toString());
fs.writeFileSync(new URL('after-world.json.gz',dir),gzipSync(JSON.stringify(d)));
assertApprovedCityGeometry(d);assertWaterTerrainFresh(d);
assert.equal(CITY_MODEL.waterApproval.compression.globalProjectionChanged,false);
assert.equal(d.riverPolygon!.length,CITY_MODEL.waterApproval.polygon.length);
assert.equal(d.riverStructures!.length,5,'Retain source structure exclusions without terrain islands');
assert.equal(d.riverPolygon!.length,1,'Overwater structures must not become isolated terrain patches');
for(const ring of d.riverStructures!){const p={x:ring.reduce((s,p)=>s+p.x,0)/ring.length,z:ring.reduce((s,p)=>s+p.z,0)/ring.length};assert(inRiverWater(d,p),'Water continues beneath non-terrain source structures');}
assert(d.river!.length>40);assert(d.riverPolygon![0]!.length<2000);
const area=(r:{x:number;z:number}[])=>Math.abs(r.slice(1).reduce((a,p,i)=>a+r[i]!.x*p.z-p.x*r[i]!.z,0)/2);
const orient=(a:any,b:any,c:any)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
let edgePairs=0;
for(const ring of d.riverPolygon!){
 assert.deepEqual(ring[0],ring.at(-1));assert(area(ring)>1);
 for(let i=1;i<ring.length;i++){const a=ring[i-1]!,b=ring[i]!;assert(Math.hypot(a.x-b.x,a.z-b.z)>.01);for(let j=i+2;j<ring.length;j++){if(i===1&&j===ring.length-1)continue;const c=ring[j-1]!,e=ring[j]!;edgePairs++;assert(!(orient(a,b,c)*orient(a,b,e)<-1e-6&&orient(c,e,a)*orient(c,e,b)<-1e-6),'Self-intersecting ring');}}
}
const nodes=new Map(d.nodes.map(n=>[n.id,n])),roadWater:any[]=[],bridges:any[]=[];
for(const r of d.roads){const a=nodes.get(r.a)!,b=nodes.get(r.b)!,len=Math.hypot(b.x-a.x,b.z-a.z);let water=0;
 for(let j=0;j<=Math.ceil(len/4);j++){const t=j/Math.ceil(len/4),p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};if(!r.bridge){const nx=(b.z-a.z)/len,nz=-(b.x-a.x)/len;for(const side of [-1,1])assert(!inRiverWater(d,{x:p.x+nx*r.width/2*side,z:p.z+nz*r.width/2*side}),'Road ribbon crosses source bank: '+r.corridor);}if(inRiverWater(d,p)){water++;if(!r.bridge)roadWater.push({corridor:r.corridor,a:r.a,b:r.b,p});else assert(!blockedByRiver(d,p,1.5),'Bridge deck blocked by water');}}
 if(r.bridge&&water)bridges.push(r.corridor);
}
assert.deepEqual(roadWater,[],'Ordinary road centerlines may not cross open water');
for(const id of ['pinklao','memorial','taksin'])assert(bridges.includes(id),'Missing real crossing '+id);
const buildingWater:any[]=[];
for(const b of d.buildings){const ring=rectangleBoundary(b);for(const p of [...ring,b])if(inRiverWater(d,p)){buildingWater.push({id:b.landmarkId??b.environmentId,p});break;}}
assert.deepEqual(buildingWater,[],'Submerged physical buildings');
const solids=d.obstacles.filter(o=>o.landmarkId&&o.height>1),solidWater:any[]=[];
for(const o of solids)for(const p of rectangleBoundary(o))if(inRiverWater(d,p)){solidWater.push({id:o.landmarkId,p});break;}
assert.deepEqual(solidWater,[],'Submerged landmark wing');
for(const id of ['icon','hilton','peninsula','oriental','terminal','mahanakhon']){
 const old=before.landmarks.find((l:any)=>l.id===id),now=d.landmarks.find(l=>l.id===id)!;assert.deepEqual(now.plot,old.plot);assert.equal(now.yaw,old.yaw);assert.equal(now.size,old.size);
}
for(const site of before.authoredSites){const now=d.authoredSites!.find(s=>s.id===site.id)!;assert.deepEqual(JSON.parse(JSON.stringify(now.solids)),site.solids,'Preserve authored structural wings: '+site.id);}
for(const [id,bank] of [['icon','west'],['hilton','west'],['peninsula','west'],['oriental','east'],['river-city','east'],['shangri','east'],['anantara','west'],['asiatique','east'],['capella','east'],['four-seasons','east']] as const)assert.equal(riverBank(d,d.landmarks.find(l=>l.id===id)!.plot!),bank,id);
const turn={...d,river:[{x:0,z:0},{x:0,z:100},{x:100,z:100}]};assert.equal(riverBank(turn,{x:70,z:80}),'east');assert.equal(riverBank(turn,{x:70,z:120}),'west','Bank identity survives an eastward turn');
const changed={...d,riverPolygon:d.riverPolygon!.map(r=>r.map(p=>({...p})))};changed.riverPolygon[0]![4]!.x+=2;
assert.equal(roadGraphKey(d),roadGraphKey(changed));assert.notEqual(waterTerrainKey(d),waterTerrainKey(changed));assert.throws(()=>assertWaterTerrainFresh(changed),/stale/);
assert.equal(cartography(d).riverPolygon,riverPolygonPath(d,true));assert(cityGeometry(d).some(g=>g.id==='chao-phraya:bank-ring:0'));
const water=new T.Mesh(channelGeometry('water',d),new T.MeshBasicMaterial()),land=new T.Mesh(channelGeometry('land',d),new T.MeshBasicMaterial());water.updateMatrixWorld();land.updateMatrixWorld();const ray=new T.Raycaster();let meshRays=0,triangles=0;
for(const g of [water.geometry,land.geometry]){const p=g.getAttribute('position');for(let i=0;i<p.count;i+=3){const ax=p.getX(i),az=p.getZ(i),bx=p.getX(i+1),bz=p.getZ(i+1),cx=p.getX(i+2),cz=p.getZ(i+2),cross=(bx-ax)*(cz-az)-(bz-az)*(cx-ax);assert(Number.isFinite(cross)&&cross<-1e-6,'Only finite, upward, nondegenerate triangles');triangles++;}}
for(let z=-1900;z<2730;z+=71)for(let x=-1660;x<200;x+=61){const p={x,z};if(Math.abs(riverClearance(d,p))<.1)continue;ray.set(new T.Vector3(x,2,z),new T.Vector3(0,-1,0));const w=ray.intersectObject(water).length>0,l=ray.intersectObject(land).length>0;assert.notEqual(w,l,'Terrain/water seam disagreement');if(!(d.canals??[]).some(c=>c.points.slice(1).some((b,i)=>distanceToSegment(p,c.points[i]!,b).distance<c.width/2+.2)))assert.equal(w,inRiverWater(d,p),'Physical water equals canonical polygon');meshRays++;}
const piers=riverPiers(d);for(const p of piers){assert(inRiverWater(d,p),'Pier must land on water: '+p.id);assert(riverClearance(d,{x:p.shore.x+p.nx*8,z:p.shore.z+p.nz*8})>0,'Gangway must touch land');assert.equal(riverBank(d,p.point),p.bank);}
assert(piers.length>=10,'Preserve existing named pier coverage');
let boatSamples=0;const routes=boatRoutes(d);assert(routes.length>=5);for(const r of routes)for(let i=0;i<512;i++){const p=boatPose(r,r.period*i/512);assert(riverClearance(d,p)<-14,'Boat hull clips bank');for(const ring of d.riverStructures!)assert(ring.slice(1).every((b,i)=>distanceToSegment(p,ring[i]!,b).distance>14),'Boat intersects source structure clearance');assert(Number.isFinite(p.heading));const next=boatPose(r,r.period*(i+1)/512),delta=Math.atan2(Math.sin(next.heading-p.heading),Math.cos(next.heading-p.heading));assert(Math.abs(delta)<.5,'Boat heading jumps');boatSamples++;}
const widths=d.river!.slice(2,-2).map(p=>-riverClearance(d,p)*2).filter(w=>w>20);assert(Math.max(...widths)-Math.min(...widths)>40,'River has sourced width variation');assert(d.river!.at(-1)!.z>d.bounds!.maxZ);assert(d.river!.at(-1)!.x>d.river![d.river!.length-10]!.x,'Downstream eastward continuation');
const roads=buildRoadSurfaces(d);disposeObject(roads);disposeObject(water);disposeObject(land);
const report={pass:true,version:d.waterVersion,edgePairs,polygonVertices:d.riverPolygon!.map(r=>r.length),spineVertices:d.river!.length,roadWater,buildingWater,solidWater,bridges:[...new Set(bridges)],piers:piers.map(p=>({id:p.id,bank:p.bank,point:{x:p.x,z:p.z},shore:p.shore})),boatRoutes:routes.length,boatSamples,meshRays,triangles,waterKey:waterTerrainKey(d),sourceStructureExclusions:d.riverStructures!.length,widthRange:[Math.min(...widths),Math.max(...widths)],physicalIPhone:false};
fs.writeFileSync(new URL('validation/geometry.json',dir),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
