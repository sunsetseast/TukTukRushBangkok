import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createBangkokWorld} from '../src/game/bangkok/world';
import {cityGeometry} from '../src/game/bangkok/cityGeometry';
import {buildLandmarkRegistry} from '../src/game/bangkok/landmarkRegistry';
import {geographicToWorld} from '../src/game/bangkok/geography';
import {CITY_MODEL} from '../src/game/bangkok/cityModel';
import type {District,Point} from '../src/game/types';
const out=new URL('../../../docs/qa/world-blueprint/',import.meta.url),d=createBangkokWorld();
const before=JSON.parse(gunzipSync(fs.readFileSync(new URL('before-world.json.gz',out))).toString()) as District;
const old=JSON.parse(fs.readFileSync(new URL('before-registry.json',out),'utf8')),registry=buildLandmarkRegistry(d);
fs.writeFileSync(new URL('approved-geometry.v1.json.gz',out),gzipSync(JSON.stringify({version:CITY_MODEL.id,features:cityGeometry(d)})));
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function map(d:District,label:string,places=buildLandmarkRegistry(d)) {
 const nodes=new Map(d.nodes.map(n=>[n.id,n]));const ps=(p:Point[])=>p.map(p=>`${p.x},${p.z}`).join(' ');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2600 -2600 5500 5700" width="1300" height="1350"><rect x="-2600" y="-2600" width="5500" height="5700" fill="#172c36"/><g font-family="sans-serif" fill="#fff"><text x="-2470" y="-2440" font-size="70">${label} · N ↑</text><text x="-2470" y="-2330" font-size="38">Actual game roads / water / parks / transit / destinations</text></g>
 ${d.regions?.map(r=>`<polygon points="${ps(r.polygon)}" fill="none" stroke="#486263" stroke-width="5"/>`).join('')}
 <polyline points="${ps(d.river??[])}" fill="none" stroke="#4b83a0" stroke-width="${d.riverWidth}"/>
 ${d.canals?.map(c=>`<polyline points="${ps(c.points)}" fill="none" stroke="#4b83a0" stroke-width="${c.width}"/>`).join('')}
 ${d.publicSpaces?.map(s=>`<polygon points="${ps(s.boundary)}" fill="#6f854b"/>`).join('')}
 ${d.roads.map(r=>{const a=nodes.get(r.a)!,b=nodes.get(r.b)!;return `<line x1="${a.x}" y1="${a.z}" x2="${b.x}" y2="${b.z}" stroke="${r.bridge?'#f9d4a2':r.oneWay?'#e4ac76':'#b0b8b4'}" stroke-width="${r.width}"><title>${esc(r.name??r.corridor??'arrival')}</title></line>`;}).join('')}
 ${d.transit?.lines.map(l=>`<polyline points="${ps(l.samples)}" fill="none" stroke="${l.id==='gold'?'#e9bb32':l.id==='silom'?'#38d8b8':'#89d66a'}" stroke-width="9"/>${l.stations.map(s=>`<circle cx="${s.x}" cy="${s.z}" r="13" fill="white"><title>${esc(s.name+' '+s.code)}</title></circle>`).join('')}`).join('')}
 ${places.map(p=>`<circle cx="${p.world.x}" cy="${p.world.z}" r="16" fill="${p.geographicReference?'#f1ce83':'#d7a0b2'}"><title>${esc(p.name+' / '+p.district)}</title></circle>${['palace','gate','hua','icon','paragon','terminal','paknam','asiatique','chatuchak'].includes(p.id)?`<text x="${p.world.x+20}" y="${p.world.z-17}" fill="white" stroke="#172c36" stroke-width="2" paint-order="stroke" font-size="33" font-family="sans-serif">${esc(p.name)}</text>`:''}`).join('')}
 <text x="-2450" y="2900" font-size="35" fill="white">Gold: referenced place · pink: unverified · orange: one-way · © OpenStreetMap contributors / ODbL facts</text></svg>`;
 fs.writeFileSync(new URL(label+'.svg',out),svg);
}
map(before,'map-before',old.map((p:any)=>{const l=before.landmarks.find(l=>l.id===p.id);return l?{...p,world:{x:l.x,z:l.z}}:p;}));map(d,'map-after');
const residuals=registry.filter(p=>p.geographicReference).map(p=>{const projected=geographicToWorld(p.geographicReference!);return {id:p.id,real:p.geographicReference,projected,approved:p.world,residual:{x:p.world.x-projected.x,z:p.world.z-projected.z},metres:Math.hypot(p.world.x-projected.x,p.world.z-projected.z),interpretation:'Approved arcade compression, not GPS error'};});
const markers=registry.flatMap(p=>{const l=before.landmarks.find(l=>l.id===p.id);return l&&Math.hypot(l.x-p.world.x,l.z-p.world.z)>.001?[{id:p.id,before:{x:l.x,z:l.z},after:p.world,metres:Math.hypot(l.x-p.world.x,l.z-p.world.z)}]:[];});
const moved=registry.flatMap(p=>{const prev=old.find((q:any)=>q.id===p.id);return prev&&Math.hypot(p.world.x-prev.world.x,p.world.z-prev.world.z)>.001?[{id:p.id,before:prev.world,after:p.world,reason:'Compound-origin metadata correction'}]:[];});
fs.writeFileSync(new URL('change-report.json',out),JSON.stringify({version:CITY_MODEL.id,base:CITY_MODEL.baselineCommit,roadGeometryUnchanged:JSON.stringify(d.roads)===JSON.stringify(before.roads),nodesUnchanged:JSON.stringify(d.nodes)===JSON.stringify(before.nodes),landmarksUnchanged:JSON.stringify(d.landmarks)===JSON.stringify(before.landmarks),transitUnchanged:JSON.stringify(d.transit)===JSON.stringify(before.transit),movedRegistryFeatures:moved,playerMapMarkerDeltas:markers,newPlaces:registry.filter(p=>!old.some((q:any)=>q.id===p.id)).map(p=>p.id),projectionResiduals:residuals},null,2));
console.log('Exported actual-world maps, geometry contracts and displacement report');
