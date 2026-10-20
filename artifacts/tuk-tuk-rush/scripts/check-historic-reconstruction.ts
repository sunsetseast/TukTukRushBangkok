import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createBangkokWorld,toMap,riverDistance,pointInPolygon} from '../src/game/bangkok/world';
import {HISTORIC_PLAN,HISTORIC_IDS,inHistoricCore} from '../src/game/bangkok/historicPlan';
import {landmarkParcels,parcelConflicts,prepareLandmarkParcels} from '../src/game/bangkok/landmarkParcels';
import {historicSightlines,validateLandmarkVisibility} from '../src/game/bangkok/landmarkVisibility';
import {buildLandmarkRegistry} from '../src/game/bangkok/landmarkRegistry';
import {auditUrbanLand} from '../src/game/bangkok/urbanBlocks';
import {navigationPath} from '../src/game/navigation';
import {distanceToSegment,obstacleDistance} from '../src/game/world';
import {roadGraphKey} from '../src/game/bangkok/roadSurfaceGraph';
import baked from '../src/game/bangkok/roadSurfaces.generated.json';
import type {District} from '../src/game/types';
const out=new URL('../../../docs/qa/historic-bangkok/',import.meta.url);
const start=performance.now(), d=createBangkokWorld(),nodes=new Map(d.nodes.map(n=>[n.id,n]));
assert.equal(roadGraphKey(d),baked.key,'Committed asphalt must match the shared road graph');
const place=(id:string)=>d.landmarks.find(l=>l.id===id)!;
const palace=place('palace').plot!,swing=place('swing').plot!,golden=place('golden').plot!,gate=place('gate').plot!,traimit=place('traimit').plot!,hua=place('hua').plot!;
const visibleSwing={x:swing.x,z:swing.z+HISTORIC_PLAN.swingFeatureZ};
assert(visibleSwing.x>palace.x&&visibleSwing.z<palace.z,'Swing east and north of Palace');
assert(golden.x>visibleSwing.x&&golden.z<visibleSwing.z,'Golden Mount northeast of Swing');
assert(place('pho').plot!.z>palace.z,'Wat Pho south of Palace');
assert(place('sanam').plot!.z<palace.z,'Sanam Luang north of Palace');
const field=d.publicSpaces!.find(s=>s.id==='sanam')!;
assert(field.lawnBoundary&&field.lawnBoundary.length>10,'Retain the sourced ceremonial lawn separately from its outer public perimeter');
assert(d.buildings.every(b=>!pointInPolygon(b,field.boundary)),'No procedural houses between Sanam Luang lawn and its perimeter roads');
assert(traimit.x>gate.x&&traimit.z<gate.z&&hua.x>traimit.x&&hua.z<traimit.z,'Station–temple–gate relative geography');
for(const id of HISTORIC_IDS){
 const l=place(id),p=l.plot??l;
 assert(riverDistance(d,p)>d.riverWidth!/2,'Selected sites on dry east bank');
 const closest=d.river!.slice(1).map((b,i)=>distanceToSegment(p,d.river![i]!,b)).sort((a,b)=>a.distance-b.distance)[0]!;assert(p.x>closest.point.x,'Correct east riverbank '+id);
 assert(l.accessNode&&nodes.has(l.accessNode));
 assert(navigationPath(d,d.nodes[0]!,nodes.get(l.accessNode!)!).length,'Connected directed public access '+id);
}
for(const name of ['dinso','ti-thong','atsadang','old_siam','thai-wang','maha-chai','boripat','tri-mit','democracy-circle'])assert(d.roads.some(r=>r.corridor===name),name);
const degrees=new Map(d.nodes.map(n=>[n.id,0]));
for(const r of d.roads){degrees.set(r.a,degrees.get(r.a)!+1);degrees.set(r.b,degrees.get(r.b)!+1);}
for(const r of d.roads.filter(r=>['boripat','maha-chai'].includes(r.corridor??'')))for(const id of [r.a,r.b])assert(degrees.get(id)!>=2,'New historic junction cannot end just short of its visible crossing');
const ring=d.roads.filter(r=>r.corridor==='democracy-circle');
assert(ring.length>=32&&ring.every(r=>r.oneWay&&r.roundabout));
const center=place('democracy').plot!;
for(const r of ring){const a=nodes.get(r.a)!,b=nodes.get(r.b)!;assert((a.x-center.x)*(b.z-center.z)-(a.z-center.z)*(b.x-center.x)>0,'Clockwise left-side circulation');}
// Every ring arm must remain reachable from every other arm through directionality.
const arms=[...new Set(d.roads.filter(r=>r.corridor!=='democracy-circle'&&!r.noTraffic).flatMap(r=>[r.a,r.b]))].filter(id=>ring.some(r=>r.a===id||r.b===id));
assert(arms.length>=4,'Ratchadamnoen / Khao San / Dinso live approaches');
for(const a of arms)for(const b of arms)if(a!==b)assert(navigationPath(d,nodes.get(a)!,nodes.get(b)!).length>1);
const conflicts=d.buildings.flatMap(b=>parcelConflicts(d,b));assert.equal(conflicts.length,0,'Every generation pass respects protected sites');
const lines=historicSightlines(d),visibility=validateLandmarkVisibility(d,lines);
assert.equal(lines.length,24);for(const l of lines)assert(Math.min(...d.roads.filter(r=>r.corridor===l.approach).map(r=>distanceToSegment(l.from,nodes.get(r.a)!,nodes.get(r.b)!).distance))<.01,'Legal public road observer');
assert.deepEqual(place('hua').plot,{x:400,z:-288},'PR31 Hua frontage retained');
assert(d.obstacles.some(o=>o.landmarkId==='hua'&&o.d===300),'Physical yard boundary');
assert(d.obstacles.some(o=>o.environmentId==='hua-lamphong-mrt'),'Separate underground MRT surface entrance');
const before=JSON.parse(gunzipSync(fs.readFileSync(new URL('baseline-world.json.gz',out))).toString()) as District;
const baselineParcels=JSON.parse(fs.readFileSync(new URL('../landmark-accuracy/parcels-after.json',out),'utf8')).parcels;
function localSurvey(w:District,parcels:ReturnType<typeof landmarkParcels>){
 const nodes=new Map(w.nodes.map(n=>[n.id,n])),rows=[];
 for(let x=w.bounds!.minX+18;x<w.bounds!.maxX;x+=36)for(let z=w.bounds!.minZ+18;z<w.bounds!.maxZ;z+=36){
  const p={x,z};if(!inHistoricCore(p))continue;
  let use='vacant';
  if(riverDistance(w,p)<w.riverWidth!/2||(w.canals??[]).some(c=>c.points.slice(1).some((b,i)=>distanceToSegment(p,c.points[i]!,b).distance<c.width/2)))use='water';
  else if(w.roads.some(r=>distanceToSegment(p,nodes.get(r.a)!,nodes.get(r.b)!).distance<r.width/2+3))use='road';
  else if(w.publicSpaces?.some(a=>pointInPolygon(p,a.boundary)))use='public-space';
  else if(parcels.some(a=>pointInPolygon(p,a.boundary)))use='authored-reservation';
  else if(w.buildings.some(b=>obstacleDistance(p,b)<19.8))use='developed';
  rows.push({...p,use});
 }
 return rows;
}
const summaries=[];
for(const [label,w] of [['before',before],['after',d]] as const){
 const cells=localSurvey(w,label==='before'?baselineParcels:landmarkParcels(w)),registry=label==='before'?JSON.parse(fs.readFileSync(new URL('../landmark-accuracy/registry-after.json',out),'utf8')):buildLandmarkRegistry(w);
 const local={label,buildings:w.buildings.filter(inHistoricCore).length,samples:cells.length,uses:Object.fromEntries([...new Set(cells.map(c=>c.use))].map(u=>[u,cells.filter(c=>c.use===u).length]))};
 summaries.push(local);
 fs.writeFileSync(new URL(`land-${label}.json`,out),JSON.stringify({local,cells,method:"Identical 36m grid in the same historic area. Baseline uses committed PR31 parcel polygons; current uses live parcel index. Road, park and water classes take precedence over development."},null,2));
 fs.writeFileSync(new URL(`registry-${label}.json`,out),JSON.stringify(registry,null,2));
 fs.writeFileSync(new URL(`map-${label}.json.gz`,out),gzipSync(JSON.stringify({nodes:w.nodes,roads:w.roads,landmarks:w.landmarks,buildings:w.buildings.filter(inHistoricCore),parcels:label==='before'?baselineParcels:landmarkParcels(w),spaces:w.publicSpaces,river:w.river,riverWidth:w.riverWidth})));
}
fs.writeFileSync(new URL('after-world.json.gz',out),gzipSync(JSON.stringify(d)));
fs.writeFileSync(new URL('visibility.json',out),JSON.stringify(visibility,null,2));
const report={pass:true,baseline:'76b2e6c6994c4c2b9576c9d290b8669eee14166f',roadGraphKey:baked.key,roads:d.roads.length,nodes:d.nodes.length,buildings:d.buildings.length,registry:buildLandmarkRegistry(d).length,parcels:landmarkParcels(d).length,conflicts:conflicts.length,ringArms:arms.length,publicApproachRays:lines.length,clearVolumeRays:visibility.filter(v=>v.visible).length,blockedVolumeRays:visibility.filter(v=>!v.visible).map(v=>({id:v.id,blockers:v.blockers})),local:summaries,constructionAndAuditMs:Math.round(performance.now()-start),physicalIPhone:false,geographicCertification:'Relative placement and graph validated; approximate footprints and arcaded distances are not surveyed geometry.'};
fs.writeFileSync(new URL('validation.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
