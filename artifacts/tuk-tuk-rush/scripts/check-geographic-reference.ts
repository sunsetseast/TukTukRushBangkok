import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GEOGRAPHIC_REFERENCES,LONGITUDE_KNOTS,SOUTHING_KNOTS,geographicToDesign,designToGeographic,geographicToWorld,worldToGeographic,geographicReference} from '../src/game/bangkok/geography';
for(const knots of [LONGITUDE_KNOTS,SOUTHING_KNOTS])for(let i=1;i<knots.length;i++) {
 assert(knots[i]![0]>knots[i-1]![0]);assert(knots[i]![1]>knots[i-1]![1]);
}
assert.equal(new Set(GEOGRAPHIC_REFERENCES.map(r=>r.id)).size,GEOGRAPHIC_REFERENCES.length);
for(const reference of GEOGRAPHIC_REFERENCES) {
 const p=reference.coordinate,round=designToGeographic(geographicToDesign(p)),world=worldToGeographic(geographicToWorld(p));
 assert(Math.abs(round.lat-p.lat)<1e-10&&Math.abs(round.lon-p.lon)<1e-10,`Design inverse ${reference.id}`);
 assert(Math.abs(world.lat-p.lat)<1e-10&&Math.abs(world.lon-p.lon)<1e-10,`World inverse ${reference.id}`);
 assert(reference.sources.every(s=>s.startsWith('https://'))&&reference.sources.length>0);
 assert(reference.corridors.length&&reference.publicAccess&&reference.frontage&&reference.neighbors.length);
}
for(let i=0;i<101;i++) {
 const p={lat:13.68+i*.0015,lon:100.44+i*.0016};const q=designToGeographic(geographicToDesign(p));
 assert(Math.abs(q.lat-p.lat)<1e-10&&Math.abs(q.lon-p.lon)<1e-10);
}
assert.throws(()=>geographicToDesign({lat:NaN,lon:100.5}),RangeError);
const r=(id:string)=>geographicReference(id)!;
assert(r('jim-thompson').coordinate.lat>r('mbk').coordinate.lat&&r('jim-thompson').design[1]<r('mbk').design[1]);
assert(r('sanam').coordinate.lat>r('palace').coordinate.lat&&r('sanam').design[1]<r('palace').design[1]);
assert(r('swing').coordinate.lat>r('wat-suthat').coordinate.lat&&r('swing').design[1]<r('wat-suthat').design[1]);
for(const ids of [['siam-discovery','siam-center','paragon','central'],['peninsula','oriental']])for(let i=1;i<ids.length;i++) {
 assert(r(ids[i]!).coordinate.lon>r(ids[i-1]!).coordinate.lon);assert(r(ids[i]!).design[0]>r(ids[i-1]!).design[0]);
}
assert(r('one-bangkok').design[0]>r('park').design[0]);assert(r('dusit').design[0]<r('park').design[0]&&r('dusit').design[1]>r('park').design[1]);
const dir=new URL('../../../docs/qa/geographic-city-reconstruction/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(new URL('geographic-reference-check.json',dir),JSON.stringify({pass:true,references:GEOGRAPHIC_REFERENCES.length,roundTrips:GEOGRAPHIC_REFERENCES.length*2+101,protectedRelationships:['Sanam north of Palace','Swing north of Wat Suthat','Jim Thompson north/west of MBK','Discovery < Center < Paragon < CentralWorld west/east order','Peninsula opposite Oriental','Dusit southwest / One Bangkok east of Lumphini'],knownExceptions:GEOGRAPHIC_REFERENCES.filter(r=>r.compromise).map(r=>({id:r.id,note:r.compromise})),physicalGpsAccuracy:'Not certified; nominal map/site centers only'},null,2)+'\n');
console.log(`Geographic reference: ${GEOGRAPHIC_REFERENCES.length} anchors, ${GEOGRAPHIC_REFERENCES.length*2+101} inverse checks and canonical adjacency pass`);
