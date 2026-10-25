import assert from 'node:assert/strict';import fs from 'node:fs';
import {createBangkokWorld,blockedByRiver} from '../src/game/bangkok/world';
import {BANG_RAK_COMPLETION,bangRakCompletionState} from '../src/game/bangkok/bangRakCompletion';
import {beforeBangRakCompletion} from './bang-rak-completion-migration-contract';
import {orientedFootprintsOverlap,obstacleDistance,distanceToSegment} from '../src/game/world';
import {lanePoint,TrafficSystem} from '../src/game/traffic';
import {navigationPath} from '../src/game/navigation';
import {createVehicle} from '../src/game/vehicle';
import {nearestRoadIndex} from '../src/game/bangkok/nearestRoadIndex';
import {emitBangRakDestinations,BANG_RAK_DESTINATIONS} from '../src/game/bangkok/bangRakDestinations';
import {planChinatownBlocks} from '../src/game/bangkok/chinatownBlocks';
const start=performance.now(),d=createBangkokWorld(),s=bangRakCompletionState(d)!,old=beforeBangRakCompletion(d),ns=new Map(d.nodes.map(n=>[n.id,n]));
assert(s.parcels.length>=150,'Substantial continuous corridor fabric');
const failures:any[]=[];
for(const r of s.roads)for(const reverse of r.oneWay?[false]:[false,true]) {
 const a=ns.get(reverse?r.b:r.a)!,b=ns.get(reverse?r.a:r.b)!;
 for(let i=0;i<=10;i++) {const p=lanePoint(a,b,r,i/10),bad=d.obstacles.find(o=>obstacleDistance(p,o)<1.4);if(bad)failures.push({road:r.corridor,a:r.a,b:r.b,t:i/10,body:bad.environmentId??bad.landmarkId,p,distance:obstacleDistance(p,bad)});assert(!blockedByRiver(d,p,1.4),'Legal lane remains dry');}
}
for(const b of s.parcels) {
 const edge=d.roads.filter(r=>r.corridor===b.frontageRoad).map(r=>distanceToSegment(b,ns.get(r.a)!,ns.get(r.b)!)).sort((a,b)=>a.distance-b.distance)[0]!;
 const dx=edge.point.x-b.x,dz=edge.point.z-b.z;
 assert((dx*Math.sin(b.yaw!)+dz*Math.cos(b.yaw!))/Math.hypot(dx,dz)>.75,'Front faces its actual street '+b.environmentId);
 assert(!d.buildings.some(o=>o!==b&&orientedFootprintsOverlap(o,b,-.02)),'No overlap '+b.environmentId);
}
for(const block of planChinatownBlocks(d))assert(block.parcels.every(b=>d.buildings.includes(b)),'Live cached ownership');
const nearest=nearestRoadIndex(d.roads.map(r=>({r,a:ns.get(r.a)!,b:ns.get(r.b)!})));
for(const p of [...s.parcels,...old.buildings.filter((_,i)=>i%17===0)]) {
 const expected=d.roads.map(r=>({r,a:ns.get(r.a)!,b:ns.get(r.b)!})).reduce((a,b)=>distanceToSegment(p,b.a,b.b).distance<distanceToSegment(p,a.a,a.b).distance?b:a);
 assert.equal(nearest(p).r,expected.r,'Exact spatial nearest road matches exhaustive search');
}
const paths:any[]=[];
for(const from of BANG_RAK_COMPLETION.streets)for(const to of BANG_RAK_COMPLETION.streets)if(from!==to) {
 const pick=(id:string)=>{const r=d.roads.find(r=>r.corridor===id)!;return ns.get(r.a)!;};
 const path=navigationPath(d,pick(from.id),pick(to.id));assert(path.length>1,`${from.id}>${to.id}`);
 for(let i=1;i<path.length;i++)assert(d.roads.some(r=>r.a===path[i-1]!.id&&r.b===path[i]!.id||!r.oneWay&&r.b===path[i-1]!.id&&r.a===path[i]!.id),'GPS obeys every edge direction');
 paths.push({from:from.id,to:to.id,nodes:path.length});
}
const pieces:any[]=[];emitBangRakDestinations(d,p=>pieces.push(p));assert(pieces.length>400);
for(const site of BANG_RAK_DESTINATIONS){const l=d.landmarks.find(l=>l.id===site.id)!;assert(ns.has(l.accessNode!));assert(!blockedByRiver(d,l.plot!,1));assert(pieces.some(p=>p.siteId===site.id));}
const stations=d.transit!.lines.find(l=>l.id==='silom')!.stations.map(s=>s.id);
assert.deepEqual(stations.slice(stations.indexOf('sala-daeng'),stations.indexOf('saphan-taksin')+1),['sala-daeng','chong-nonsi','saint-louis','surasak','saphan-taksin']);
for(const seed of [982,41,67])assert.equal(new TrafficSystem(d,seed).create(createVehicle(d)).length,38);
const report={pass:failures.length===0,roads:d.roads.length,addedEdges:s.roads.length,retiredBodies:s.retired.length,frontages:s.parcels.length,unfittedCandidates:s.rejected,landmarks:BANG_RAK_DESTINATIONS.map(s=>s.id),landmarkArtPieces:pieces.length,legalPaths:paths,laneFailures:failures,physicalSafari:false,ms:performance.now()-start};
fs.writeFileSync(new URL('../../../docs/qa/bang-rak-completion/validation/completion.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
assert.equal(failures.length,0,JSON.stringify(failures.slice(0,8)));console.log(JSON.stringify(report));
