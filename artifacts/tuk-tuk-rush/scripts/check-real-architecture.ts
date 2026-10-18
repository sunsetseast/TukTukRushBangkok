import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {createBangkokWorld,toMap,riverDistance} from '../src/game/bangkok/world';
import {REAL_PLACES} from '../src/game/bangkok/realPlaces';
import {buildRealArchitecture} from '../src/game/bangkok/realArchitecture';
import {realCommercial,COMMERCIAL_ASSETS} from '../src/game/bangkok/realCommercial';
import {passengerStops} from '../src/game/missions';
import {obstacleDistance,orientedFootprintsOverlap,routeBetween,distanceToSegment} from '../src/game/world';
import {discover} from '../src/game/bangkok/discovery';
import {auditStreetEdges} from '../src/game/bangkok/streetEdges';
import {roadGraphKey} from '../src/game/bangkok/roadSurfaceGraph';
import baked from '../src/game/bangkok/roadSurfaces.generated.json';
import {disposeObject} from '../src/game/assets';
const d=createBangkokWorld(),nodes=new Map(d.nodes.map(n=>[n.id,n])),stops=passengerStops(d),discovery={regions:[],landmarks:[],shortcuts:[]} as {regions:string[];landmarks:string[];shortcuts:string[]};
assert.equal(roadGraphKey(d),baked.key);
const models=[];
for(const p of REAL_PLACES){
 const l=d.landmarks.find(l=>l.id===p.id)!;assert(l?.plot,p.id);assert.equal(l.name,p.id==='state'?'State Tower / Lebua':p.name);
 const o=d.obstacles.find(o=>o.landmarkId===p.id)!;assert(o);assert(nodes.has(l.accessNode!));
 assert(stops.some(s=>s.id===l.accessNode&&s.name?.includes(p.id==='state'?'Lebua':p.name)),`Passenger destination ${p.id}`);
 assert(routeBetween(d,d.nodes[0]!.id,l.accessNode!).length,`Connected route ${p.id}`);
 const arrival=nodes.get(l.accessNode!)!;assert(d.obstacles.every(o=>obstacleDistance(arrival,o)>2),`Clear arrival ${p.id}`);
 discover(d,arrival,discovery);assert(discovery.landmarks.includes(p.id));
 if(p.bank){const q=d.river!.slice(1).map((b,i)=>distanceToSegment(l.plot!,d.river![i]!,b)).sort((a,b)=>a.distance-b.distance)[0]!.point;assert(p.bank==='east'?l.plot.x>q.x:l.plot.x<q.x,p.id);}
 const g=buildRealArchitecture(l);if(!g)continue;
 assert(g instanceof T.LOD&&g.levels.length===2);
 const bounds=new T.Box3().setFromObject(g.levels[0]!.object),size=bounds.getSize(new T.Vector3());
 assert(size.x<=p.footprint[0]+.5&&size.z<=p.footprint[1]+.5,`Geometry escapes reserved footprint ${p.id}: ${size.toArray()}`);
 assert(bounds.max.y<=p.height+.5,`Camera collider height ${p.id}`);
 let near=0,far=0,meshes=0;g.levels.forEach((l,i)=>l.object.traverse(o=>{if(o instanceof T.Mesh){meshes++;const n=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;if(i===0)near+=n;else far+=n;for(const a of Object.values(o.geometry.attributes))for(const v of a.array)assert(Number.isFinite(v),`Non-finite ${p.id}`);}}));
 assert(far<near,`LOD reduces ${p.id}`);assert(meshes<=16,`Batch budget ${p.id}`);models.push({id:p.id,nearTriangles:near,farTriangles:far,meshes,size:size.toArray()});disposeObject(g);
}
for(const id of COMMERCIAL_ASSETS){const g=realCommercial(d.landmarks.find(l=>l.id===id)!)!;assert(g instanceof T.LOD);disposeObject(g);}
assert.equal(d.landmarks.filter(l=>l.id==='state').length,1,'Never duplicate Lebua');
const mp=(id:string)=>toMap(d.landmarks.find(l=>l.id===id)!.plot!);
assert(mp('hilton').y<mp('icon').y&&mp('peninsula').y>mp('icon').y);
assert(mp('oriental').y<mp('shangri').y&&mp('capella').y<mp('four-seasons').y);
assert(mp('embassy').x<mp('rosewood').x&&mp('jim-thompson').x<mp('siam-center').x);
const newRoads=d.roads.filter(r=>r.corridor?.startsWith('real-arrival:'));
for(const r of newRoads){const a=nodes.get(r.a)!,b=nodes.get(r.b)!;for(let i=0;i<=8;i++){const t=i/8,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};assert(riverDistance(d,p)>d.riverWidth!/2+2);assert(d.obstacles.every(o=>obstacleDistance(p,o)>2),`Driveway blocked: ${r.name}`);}}
const edges=auditStreetEdges(d),open=edges.filter(s=>s.kind==='open'),root=new URL('../../../docs/qa/real-bangkok-architecture/',import.meta.url);fs.mkdirSync(root,{recursive:true});
fs.writeFileSync(new URL('asset-budgets.json',root),JSON.stringify(models,null,2));
fs.writeFileSync(new URL('remaining-edges.json',root),JSON.stringify(open.map(s=>({roadIndex:s.roadIndex,corridor:s.road.corridor,point:s.point,map:toMap(s.point),outward:s.outward,status:'unresolved-open-ray',note:'Not reclassified as a park/compound without physical evidence.'})),null,2));
fs.writeFileSync(new URL('registry.json',root),JSON.stringify(REAL_PLACES.map(p=>{const l=d.landmarks.find(l=>l.id===p.id)!;return {...p,actualLocation:{address:p.address,geographicReference:p.references[0]},intendedMap:p.map,gameLocation:toMap(l.plot!),world:l.plot,accessNode:l.accessNode,implemented:true,visualQA:'See asset review table; never inferred from automated geometry checks',discoveryId:p.id,referenceOnlyPhotography:true};}),null,2));
console.log(JSON.stringify({pass:true,realHotels:REAL_PLACES.filter(p=>p.category==='hotel').length,authoredNewSites:models.length,upgradedMalls:COMMERCIAL_ASSETS.length,hotelApproachEdges:newRoads.length,passengerStops:stops.length,openEdges:open.length,sampledEdges:edges.length}));
