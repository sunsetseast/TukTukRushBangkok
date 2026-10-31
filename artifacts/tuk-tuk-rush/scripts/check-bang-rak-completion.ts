import assert from 'node:assert/strict';import fs from 'node:fs';
import {createBangkokWorld,blockedByRiver} from '../src/game/bangkok/world';
import {BANG_RAK_COMPLETION,bangRakCompletionState,resolveCompletionRetirements,completionRoadEnvelopes} from '../src/game/bangkok/bangRakCompletion';
import migration from '../src/game/bangkok/bangRakCompletionMigration.v1.json';
import type {Obstacle} from '../src/game/types';
import {beforeBangRakCompletion} from './bang-rak-completion-migration-contract';
import {orientedFootprintsOverlap,obstacleDistance,distanceToSegment} from '../src/game/world';
import {lanePoint,TrafficSystem} from '../src/game/traffic';
import {navigationPath} from '../src/game/navigation';
import {createVehicle} from '../src/game/vehicle';
import {nearestRoadIndex} from '../src/game/bangkok/nearestRoadIndex';
import {emitBangRakDestinations,BANG_RAK_DESTINATIONS} from '../src/game/bangkok/bangRakDestinations';
import {planChinatownBlocks} from '../src/game/bangkok/chinatownBlocks';
// This data-driven regression covers *all* optional procedural retirements
// in the approved ledger, not only the two IDs reported from iPhone Safari.
const mutableLegacy = migration.retired
  .filter(({body}) => !!body.environmentId &&
    (body.environmentId.startsWith('infill:') ||
     body.environmentId.startsWith('urban-block:')))
  .map(({body}) => ({body:body as Obstacle}));
assert(mutableLegacy.length >= 60, 'The full procedural retirement ledger is tested');
const noLongerGenerated = resolveCompletionRetirements([], mutableLegacy);
assert.equal(noLongerGenerated.alreadyAbsentProcedural.length, mutableLegacy.length);
assert.equal(noLongerGenerated.retired.length, 0);

const legacyRear = migration.retired.find(
  r => r.body.environmentId === 'infill:rear:2354271658',
)?.body as Obstacle | undefined;
const legacyCourt = migration.retired.find(
  r => r.body.environmentId === 'infill:blockcourt:6:14:-1',
)?.body as Obstacle | undefined;
assert(legacyRear && legacyCourt, 'Both screenshot regression fixtures remain in the ledger');

const exact = {...legacyRear};
assert.equal(resolveCompletionRetirements([exact], [{body:legacyRear}]).retired[0], exact);
const roadEnvelope:Obstacle = {
  x:legacyCourt.x, z:legacyCourt.z, w:120, d:120,
  yaw:0, height:0, color:'#fff',
};
const shiftedCourt = {...legacyCourt, x:legacyCourt.x + 1};
const changedCourt = resolveCompletionRetirements(
  [shiftedCourt], [{body:legacyCourt}], [roadEnvelope],
);
assert.deepEqual(changedCourt.changedProceduralRetired, ['infill:blockcourt:6:14:-1']);
assert.equal(changedCourt.retired[0], shiftedCourt);

const shiftedAway = {...legacyCourt, x:legacyCourt.x + 500};
const keptCourt = resolveCompletionRetirements(
  [shiftedAway], [{body:legacyCourt}], [roadEnvelope],
);
assert.deepEqual(keptCourt.changedProceduralKept, ['infill:blockcourt:6:14:-1']);
assert.equal(keptCourt.retired.length, 0, 'Unrelated procedural buildings must not be deleted by ID');

const extra = {...legacyCourt, environmentId:'infill:blockcourt:another-cell:1'};
const detectedExtra = resolveCompletionRetirements([extra], [], [roadEnvelope]);
assert.equal(detectedExtra.retired[0], extra, 'New procedural street obstruction is cleared');
assert.deepEqual(detectedExtra.unlistedProceduralRetired, [extra.environmentId]);

for (const body of [legacyRear, legacyCourt]) {
  assert.throws(
    () => resolveCompletionRetirements(
      [{...body, x:body.x+1, protected:true}], [{body}], [roadEnvelope]),
    /Bang Rak parcel baseline changed/,
    'Never replace protected geometry just because its ID looks procedural',
  );
}
assert.throws(
  () => resolveCompletionRetirements([], [{
    body:{...legacyRear, environmentId:'br:authored', protected:true},
  }]),
  /Bang Rak parcel baseline changed/,
);
assert.throws(
  () => resolveCompletionRetirements([], [{
    body:{...legacyRear, environmentId:undefined},
  }]),
  /Bang Rak parcel baseline changed/,
  'Anonymous baseline bodies are never implicitly optional',
);
const start=performance.now(),d=createBangkokWorld(),s=bangRakCompletionState(d)!,old=beforeBangRakCompletion(d),ns=new Map(d.nodes.map(n=>[n.id,n]));

// All mutable old-world parcels must be clear of every approved new corridor
// after the migration, including any not listed in the historical manifest.
const envelopes = completionRoadEnvelopes(d, s.roads);
for (const o of d.obstacles) {
  const id = o.environmentId ?? '';
  if (!id.startsWith('infill:') && !id.startsWith('urban-block:')) continue;
  if (o.protected || o.landmarkId || o.chinatown) continue;
  for (const r of envelopes) {
    if (Math.hypot(o.x-r.x,o.z-r.z) > (Math.hypot(o.w,o.d)+Math.hypot(r.w,r.d))/2) continue;
    assert(!orientedFootprintsOverlap(o,r),
      'Legacy procedural lot obstructs the approved road/sidewalk: '+id);
  }
}
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
const report={pass:failures.length===0,roads:d.roads.length,addedEdges:s.roads.length,retiredBodies:s.retired.length,alreadyAbsentProcedural:s.alreadyAbsentProcedural,changedProceduralRetired:s.changedProceduralRetired,changedProceduralKept:s.changedProceduralKept,unlistedProceduralRetired:s.unlistedProceduralRetired,frontages:s.parcels.length,unfittedCandidates:s.rejected,landmarks:BANG_RAK_DESTINATIONS.map(s=>s.id),landmarkArtPieces:pieces.length,legalPaths:paths,laneFailures:failures,physicalSafari:false,ms:performance.now()-start};
fs.writeFileSync(new URL('../../../docs/qa/bang-rak-completion/validation/completion.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
assert.equal(failures.length,0,JSON.stringify(failures.slice(0,8)));console.log(JSON.stringify(report));
