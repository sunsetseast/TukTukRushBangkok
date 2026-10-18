import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createBangkokWorld, riverDistance } from '../src/game/bangkok/world';
import { planConvenienceStores, emitConvenienceStores, buildConvenienceStoreSigns } from '../src/game/bangkok/convenienceStores';
import { CONVENIENCE_BRAND, storeBrandTile } from '../src/game/bangkok/storeBrand';
import { completeUrbanFabric, emitUrbanCompletenessGrounds } from '../src/game/bangkok/urbanCompleteness';
import { distanceToSegment, obstacleDistance, orientedFootprintsOverlap } from '../src/game/world';
import type { ArtPiece } from '../src/game/bangkok/architecturalBatch';
import { landscapeMaterial } from '../src/game/bangkok/streetSurfaces';
import { disposeObject } from '../src/game/assets';

const d = createBangkokWorld(), stores = planConvenienceStores(d), nodes = new Map(d.nodes.map(n => [n.id,n]));
const count = d.buildings.length, solids = d.obstacles.length;
assert.strictEqual(planConvenienceStores(d), stores, 'No per-frame selection or duplicates');
assert(stores.length >= 25 && stores.length <= 38, 'Bounded neighborhood density');
assert.equal(new Set(stores.map(s=>s.id)).size, stores.length, 'Unique future interaction identifiers');
assert.equal(new Set(stores.map(s=>s.variant)).size, 5, 'Five distinct Thai-premises configurations');
for (const region of ['chinatown','siam','sukhumvit','silom','khaosan','talatnoi','icon','westbank'])
  assert(stores.some(s=>s.region===region), `Real neighborhood coverage ${region}`);
for (const s of stores) {
  assert(d.buildings.includes(s.parcel) && d.obstacles.includes(s.parcel), 'Reuse physical premises');
  assert(!s.parcel.protected && !s.parcel.landmarkId, 'No hijacked park or famous architecture');
  assert(d.roads.includes(s.road) && !s.road.destinationId && !s.road.bridge && !s.road.noTraffic);
  assert(nodes.has(s.nearestNode));
  assert.equal(s.brand, '7-eleven'); assert.equal(s.name, '7-Eleven');
  assert.deepEqual(s.services,['water','refreshments','snacks']);
  assert(!s.interaction.enabled && s.interaction.futureEnergy, 'Future data does not start a second gameplay loop');
  assert(obstacleDistance(s.entrance,s.parcel) >= .24, 'Entrance stays outside the solid shop');
  assert(riverDistance(d,s.front) > d.riverWidth!/2 + 3);
  const a=nodes.get(s.road.a)!, b=nodes.get(s.road.b)!;
  assert(distanceToSegment(s.publicStop,a,b).distance < .01, 'Stopping target is on a connected public lane');
  assert((s.publicStop.x-s.front.x)*Math.sin(s.yaw)+(s.publicStop.z-s.front.z)*Math.cos(s.yaw)>s.road.width/2+1);
  for (const other of stores) if(s!==other)
    assert(Math.hypot(s.parcel.x-other.parcel.x,s.parcel.z-other.parcel.z)>=220, 'No brand on every few buildings');
  for(const prop of s.forecourt) {
    assert(d.obstacles.includes(prop.body), 'Every parked bike/bin is a real collision-backed object');
    assert(obstacleDistance(s.entrance,prop.body)>2,'Keep the store entrance clear');
  }
}
const pieces:ArtPiece[]=[], grounds:ArtPiece[]=[];
emitConvenienceStores(d,p=>pieces.push(p)); emitUrbanCompletenessGrounds(d,p=>grounds.push(p));
assert.equal(d.buildings.length,count);assert.equal(d.obstacles.length,solids,'Rendering adds no untracked collisions');
assert(pieces.length < 1600 && pieces.some(p=>p.layer==='night') && pieces.some(p=>p.layer==='detail'));
for (const p of [...pieces,...grounds])
  assert([p.x,p.y,p.z,p.w,p.h,p.d,p.yaw].every(Number.isFinite)&&p.w>0&&p.h>0&&p.d>0);
const roadBodies=d.roads.map(r=>{const a=nodes.get(r.a)!,b=nodes.get(r.b)!;return{x:(a.x+b.x)/2,z:(a.z+b.z)/2,w:r.width,d:Math.hypot(a.x-b.x,a.z-b.z),yaw:Math.atan2(b.x-a.x,b.z-a.z),height:0,color:'#fff'};});
for (const p of pieces) {
  const box={x:p.x,z:p.z,w:p.w,d:p.d,yaw:p.yaw,height:p.h,color:p.color};
  assert(roadBodies.every(r=>!orientedFootprintsOverlap(box,r)), 'Store details never protrude into a drivable lane');
}
const report=completeUrbanFabric(d);
assert.strictEqual(completeUrbanFabric(d),report,'Completeness planning is idempotent');
assert(report.blockcourt<=112 && report.blockcourt>=30);
const blocks=d.buildings.filter(b=>b.environmentId?.startsWith('infill:blockcourt:'));
for (const b of blocks) {
  assert(d.obstacles.includes(b)); assert(b.height<=18 && b.w<=16 && b.d<=16,'Small neighborhood fabric, not random new towers');
  assert(roadBodies.every(r=>!orientedFootprintsOverlap(b,r)));
  assert(d.obstacles.filter(o=>o.protected).every(o=>!orientedFootprintsOverlap(b,o)));
}
const mat=landscapeMaterial(),pixel=mat.map!.image.data as Uint8Array;
assert(Math.abs(pixel[0]!-pixel[1]!)<10, 'City base cannot masquerade as green parkland');
let materialDisposed=false,textureDisposed=false;mat.addEventListener('dispose',()=>materialDisposed=true);mat.map!.addEventListener('dispose',()=>textureDisposed=true);
const group=buildConvenienceStoreSigns(d);disposeObject(group);mat.map!.dispose();mat.dispose();
assert(materialDisposed&&textureDisposed);
for(const tile of [0,1] as const){const g=storeBrandTile(tile),uv=g.attributes.uv!;for(let i=0;i<uv.count;i++)assert(uv.getX(i)>tile/2&&uv.getX(i)<(tile+1)/2);g.dispose();}
assert.equal(CONVENIENCE_BRAND.name,'7-Eleven');
const svg=fs.readFileSync(new URL('../public/brands/7-eleven-prototype.svg',import.meta.url),'utf8');
for(const literal of ['7-Eleven','#00834b','#f58220','#e3292e','No approval'])assert(svg.includes(literal));
console.log(JSON.stringify({pass:true,stores:stores.length,variants:Object.fromEntries([...new Set(stores.map(s=>s.variant))].map(v=>[v,stores.filter(s=>s.variant===v).length])),forecourtProps:stores.flatMap(s=>s.forecourt).length,storePieces:pieces.length,groundPatches:grounds.length,blockcourt:report.blockcourt,atlasPixels:512*256,physicalIPhone:false}));
