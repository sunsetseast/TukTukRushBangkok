import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createBangkokWorld,riverDistance} from '../src/game/bangkok/world';
import type {District,Obstacle} from '../src/game/types';
import {historicFeatureSightlines,validateLandmarkVisibility} from '../src/game/bangkok/landmarkVisibility';
import {landmarkParcels,parcelConflicts,polygonsOverlap,rectangleBoundary} from '../src/game/bangkok/landmarkParcels';
import {isHistoricWaterfront,PHO_PIER_PASSAGE} from '../src/game/bangkok/historicPlan';
import {designBuildings} from '../src/game/bangkok/buildingGrammar';
import {planTropicalPlants} from '../src/game/bangkok/tropicalPlan';
import {riverPiers} from '../src/game/bangkok/riverfront';
import {obstacleDistance} from '../src/game/world';
const out=new URL('../../../docs/qa/historic-visual-fidelity/',import.meta.url);
fs.mkdirSync(out,{recursive:true});
const before=JSON.parse(gunzipSync(fs.readFileSync(new URL('baseline-world.json.gz',out))).toString()) as District;
const d=createBangkokWorld();
assert.deepEqual(d.roads,before.roads,'Every PR32 road, direction and lane remains authoritative');
assert.deepEqual(d.nodes,before.nodes,'No new or moved road graph nodes');
assert.deepEqual(d.landmarks,before.landmarks,'Landmark positions, identities and orientations preserved');
assert.deepEqual(JSON.parse(JSON.stringify(d.transit)),before.transit,'BTS and Gold Line geometry preserved');
assert.deepEqual(d.river,before.river,'River alignment preserved');
assert.equal(d.riverWidth,before.riverWidth);
const key=(o:Obstacle)=>[o.x,o.z,o.w,o.d,o.yaw??0].map(n=>n.toFixed(4)).join(':');
const current=new Set(d.buildings.map(key)),old=new Set(before.buildings.map(key));
const removed=before.buildings.filter(o=>!current.has(key(o))),added=d.buildings.filter(o=>!old.has(key(o)));
fs.writeFileSync(new URL('footprint-deltas.json',out),JSON.stringify({removed,added},null,2));
const newParcels=landmarkParcels(d).filter(p=>p.landmarkId==='pho'&&(p.use==='entrance'||p.use==='forecourt'));
assert(removed.length>0,'Incorrect infill must actually be corrected');
for(const o of [...removed,...added])assert(o.x>-1120&&o.x<-820&&o.z>-1120&&o.z<-520,'No infill churn outside the bounded waterfront/public approach: '+key(o));
assert.equal(d.buildings.flatMap(b=>parcelConflicts(d,b)).length,0);
const waterfront=designBuildings(d).filter(p=>isHistoricWaterfront(p.parcel));
assert(waterfront.length>20,'Retain dense waterfront commercial blocks');
assert(waterfront.every(p=>p.parcel.height<=8.4&&p.bays.every(b=>b.floors===2&&b.height<=p.parcel.height+.001&&b.surface==='plaster')),'Waterfront collision and actual facade design agree on two-storey masonry');
// A circumscribed circle is conservative for every rotated footprint: a
// positive clearance proves its entire rectangle stays out of river geometry.
const riverClearances=[...waterfront.map(p=>p.parcel),...added].map(b=>riverDistance(d,b)-d.riverWidth!/2-Math.hypot(b.w,b.d)/2);
assert(riverClearances.every(clearance=>clearance>0),'No retained waterfront or reflowed building intersects the river');
const passage=PHO_PIER_PASSAGE;
for(let i=0;i<=40;i++) {
  const t=i/40,p={x:passage.from.x+(passage.to.x-passage.from.x)*t,z:passage.from.z+(passage.to.z-passage.from.z)*t};
  assert(d.buildings.every(b=>obstacleDistance(p,b)>passage.width/2),'Physical pier passage remains unobstructed');
}
assert(riverPiers(d).some(p=>p.id==='pho')&&riverPiers(d).some(p=>p.id==='tha-chang'),'Both public landings remain represented');
const planting=planTropicalPlants(d).filter(p=>p.context==='sanam');
assert(planting.length>10&&planting.every(p=>p.species==='tamarind'||p.species==='understory'),'Sanam has bounded tamarind planting rather than palms');
const lines=historicFeatureSightlines(d),rays=validateLandmarkVisibility(d,lines);
assert.equal(lines.length,37);
assert(rays.some(r=>r.landmarkId==='pho'&&r.feature==='entrance'&&r.visible),'New west temple gate has a separate clear volume approach');
const original=JSON.parse(fs.readFileSync(new URL('baseline-visibility.json',out),'utf8'));
const cases=original.filter((v:any)=>!v.visible).map((v:any)=>({
  id:v.id,from:v.from,target:v.target,originalBlockers:v.blockers,
  originalObjects:v.blockers.map((b:any)=>before.obstacles.find(o=>o.environmentId===b.objectId)??before.obstacles[+b.objectId.split(':').at(-1)]),
  after:rays.find(r=>r.id===v.id),
}));
const report={pass:true,baseline:'341e02f52b04d07dda7688e2f07b47abc19d44a8',roads:d.roads.length,nodes:d.nodes.length,buildings:d.buildings.length,parcels:landmarkParcels(d).length,removed,added,waterfrontBuildings:waterfront.length,minimumConservativeRiverClearance:Math.min(...riverClearances),sanamPlanting:planting.map(p=>({id:p.id,species:p.species})),sixCases:cases,volumeRays:rays.length,clearVolumeRays:rays.filter(r=>r.visible).length,entranceRays:rays.filter(r=>r.feature==='entrance'),physicalIPhone:false};
fs.writeFileSync(new URL('validation.json',out),JSON.stringify(report,null,2));
fs.writeFileSync(new URL('feature-rays.json',out),JSON.stringify(lines,null,2));
fs.writeFileSync(new URL('map-after.json',out),JSON.stringify({roads:d.roads,nodes:d.nodes,river:d.river,riverWidth:d.riverWidth,buildings:d.buildings.filter(b=>isHistoricWaterfront(b)||newParcels.some(p=>polygonsOverlap(rectangleBoundary(b),p.boundary))),parcels:newParcels,removed}));
console.log(JSON.stringify({pass:true,roads:d.roads.length,nodes:d.nodes.length,buildings:d.buildings.length,removed:removed.length,added:added.length,waterfront:waterfront.length,clearVolumeRays:report.clearVolumeRays,totalVolumeRays:rays.length,cases:cases.map((c:any)=>({id:c.id,clear:c.after?.visible}))}));
