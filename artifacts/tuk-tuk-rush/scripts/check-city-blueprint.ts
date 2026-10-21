import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createBangkokWorld} from '../src/game/bangkok/world';
import {CITY_MODEL,assertApprovedCityGeometry,canonicalFeaturePoint} from '../src/game/bangkok/cityModel';
import {cityGraphApprovalKey} from '../src/game/bangkok/roadIdentity';
import {buildLandmarkRegistry} from '../src/game/bangkok/landmarkRegistry';
import {landmarkParcels,parcelConflicts} from '../src/game/bangkok/landmarkParcels';
import {geographicToWorld} from '../src/game/bangkok/geography';
import {planMrtEntrances} from '../src/game/bangkok/mrtSurface';
import {designBuildings} from '../src/game/bangkok/buildingGrammar';
import {cinematicParcel,emitYaowaratFacade} from '../src/game/bangkok/yaowarat';
import {cityGeometry} from '../src/game/bangkok/cityGeometry';
import {isHistoricWaterfront} from '../src/game/bangkok/historicPlan';
import {pieceVolume,validateSpatialVolumes} from '../src/game/bangkok/spatialValidation';
import type {District,Obstacle} from '../src/game/types';
const out=new URL('../../../docs/qa/world-blueprint/',import.meta.url),before=JSON.parse(gunzipSync(fs.readFileSync(new URL('before-world.json.gz',out))).toString()) as District,d=createBangkokWorld();
for(const key of ['roads','nodes','landmarks','transit','river'] as const)assert.deepEqual(JSON.parse(JSON.stringify(d[key])),before[key],key+' unchanged from approved main');
const sourceRoot=new URL('../src/',import.meta.url);
for(const file of fs.readdirSync(sourceRoot,{recursive:true}).filter(f=>typeof f==='string'&&/\.tsx?$/.test(f as string)) as string[])assert(!/from\s+["'][^"']*layout\.json["']/.test(fs.readFileSync(new URL(file,sourceRoot),'utf8')),'Runtime must use canonical cityLayout adapter: '+file);
assertApprovedCityGeometry(d);assert.equal(cityGraphApprovalKey(d),CITY_MODEL.roadBaseline.fullGraphKey);
assert.notEqual(cityGraphApprovalKey({...d,roads:d.roads.map((r,i)=>i? r:{...r,oneWay:!r.oneWay})}),CITY_MODEL.roadBaseline.fullGraphKey,'Direction changes invalidate approval');
assert.equal(new Set(CITY_MODEL.features.map(p=>p.id)).size,49);
for(const p of CITY_MODEL.geographicReferences)assert(Number.isFinite(p.coordinate.lat)&&Number.isFinite(p.coordinate.lon)&&p.sources.length);
const registry=buildLandmarkRegistry(d),old=JSON.parse(fs.readFileSync(new URL('before-registry.json',out),'utf8'));
assert(old.every((p:{id:string})=>registry.some(q=>q.id===p.id)));assert.equal(registry.length,96);assert.equal(landmarkParcels(d).length,208);
const swing=registry.find(p=>p.id==='swing')!,suthat=registry.find(p=>p.id==='suthat')!;
assert.deepEqual(swing.world,{x:-360,z:-998});assert.deepEqual(suthat.world,{x:-360,z:-901});
const g=CITY_MODEL.geographicReferences.find(g=>g.id==='swing')!,projected=geographicToWorld(g.coordinate);
assert(Math.abs(swing.world.z-projected.z+263)<.001,'Explicit local Swing compression, unchanged global projection');
for(const l of d.landmarks)assert.deepEqual(canonicalFeaturePoint(l.id!,l.plot??l,l.yaw??0),registry.find(p=>p.id===l.id)!.world);
for(const p of CITY_MODEL.infrastructure.piers){const r=registry.find(r=>r.id==='pier:'+p.id)!;assert.equal(r.district,p.district);assert.deepEqual(r.neighbors,[p.owner]);assert.deepEqual(r.roadRelationships,[...p.streets,`${p.bank} bank of Chao Phraya`]);assert(!r.roadRelationships.some(s=>s.includes('Odeon')));}
assert.equal(registry.find(p=>p.id==='pier:tha-chang')!.district,'Phra Nakhon');
const mrt=planMrtEntrances(d);assert.equal(mrt.length,7);for(const s of mrt.filter(s=>s.introduced<34)){const prev=before.obstacles.find(o=>o.environmentId===s.id)!;assert.equal(s.x,prev.x);assert.equal(s.z,prev.z);}
assert.equal(d.buildings.flatMap(b=>parcelConflicts(d,b)).length,0);
const key=(o:Obstacle)=>JSON.stringify([o.x,o.z,o.w,o.d,o.yaw??0]),a=new Set(before.buildings.map(key)),b=new Set(d.buildings.map(key));
const removed=before.buildings.filter(o=>!b.has(key(o))),added=d.buildings.filter(o=>!a.has(key(o))),newMrt=mrt.filter(s=>s.introduced>=34);
for(const o of [...removed,...added])assert(newMrt.some(s=>Math.hypot(s.x-o.x,s.z-o.z)<140),'Only local MRT entrance reflow changes footprints');
const designs=designBuildings(d),row=designs.filter(cinematicParcel),waterfront=designs.filter(p=>isHistoricWaterfront(p.parcel)),pieces:Parameters<typeof pieceVolume>[0][]=[];
row.forEach(p=>emitYaowaratFacade(p,o=>pieces.push(o)));
assert(row.length>=35&&row.length<=44);assert(new Set(row.flatMap(p=>p.bays.map(b=>b.trade))).size>=8);
assert(row.every(p=>p.bays.every(b=>b.height<=p.parcel.height&&b.floors>=2&&b.floors<=5)));
const conflicts=validateSpatialVolumes({...d,transit:undefined},pieces.map((p,i)=>pieceVolume(p,'benchmark:'+i)));assert.equal(conflicts.length,0,JSON.stringify(conflicts.slice(0,3)));
assert(waterfront.length>20);assert(cityGeometry(d).every(f=>f.geometry.length&&f.geometry.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z))));
const inv=JSON.parse(fs.readFileSync(new URL('../../../data/bangkok/iconic-inventory.v1.json',import.meta.url),'utf8'));
assert(inv.places.length>=130);assert.equal(new Set(inv.places.map((p:any)=>p.id)).size,inv.places.length);assert(inv.places.every((p:any)=>!p.coordinate||p.geographicSource.length));assert(inv.places.every((p:any)=>p.recognizabilityGrade!=='A'));
// A name alone cannot certify object identity: temple/bridge names also label
// ferry stops, and The Siam Society is not The Siam hotel.
const osm=JSON.parse(fs.readFileSync(new URL('../../../data/bangkok/osm-places.v1.json',import.meta.url),'utf8')).places;
for(const p of inv.places)for(const url of p.geographicSource){
 const candidate=osm.find((o:any)=>o.source===url);if(!candidate)continue;
 if(p.category!=='river-pier')assert.notEqual(candidate.tags.amenity,'ferry_terminal','Wrong source feature class for '+p.id);
 if(p.category==='hotel')assert(candidate.tags.tourism==='hotel'||candidate.tags.building==='hotel','Hotel source must identify a hotel: '+p.id);
 if(p.category==='bts-station')assert(['station','halt'].includes(candidate.tags.railway),'Station source must identify rail infrastructure: '+p.id);
}
assert.equal(inv.places.find((p:any)=>p.id==='the-siam').coordinate,null,'Ambiguous museum name must not supply hotel coordinates');
assert.equal(inv.places.find((p:any)=>p.id==='sena-ruam-bts').status,'intentionally excluded from the playable scope');
const summary={pass:true,roads:d.roads.length,nodes:d.nodes.length,buildings:d.buildings.length,places:registry.length,parcels:landmarkParcels(d).length,benchmarkParcels:row.length,benchmarkPieces:pieces.length,waterfrontParcels:waterfront.length,emittedLaneConflicts:conflicts.length,mrt:newMrt,footprintDeltas:{removed,added},inventory:inv.places.length,geographicReferences:inv.places.filter((p:any)=>p.coordinate).length};
fs.writeFileSync(new URL('certification.json',out),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
