import fs from "node:fs";
import { gzipSync } from "node:zlib";
import {createBangkokWorld} from "../src/game/bangkok/world";
import {BANG_RAK_SEAM,bangRakSeamState} from "../src/game/bangkok/bangRakSeam";
import {roadGraphKey,cityGraphApprovalKey} from "../src/game/bangkok/roadIdentity";
const d=createBangkokWorld({authoring:true}),s=bangRakSeamState(d)!;
const f=new URL('../src/game/bangkok/cityData.v1.json',import.meta.url),data=JSON.parse(fs.readFileSync(f,'utf8'));
data.roadBaseline={...data.roadBaseline,version:5,key:roadGraphKey(d),fullGraphKey:cityGraphApprovalKey(d),roads:d.roads.length,nodes:d.nodes.length,sourceStages:[...data.roadBaseline.sourceStages.filter((s:string)=>s!=='bang-rak-seam-v1'),'bang-rak-seam-v1'],status:'approved-bang-rak-seam-v1-explicit-parcel-migration'};
fs.writeFileSync(f,JSON.stringify(data,null,2)+'\n');
const out=new URL('../../../docs/qa/bang-rak-geography/',import.meta.url);
const ns=new Map(d.nodes.map(n=>[n.id,n]));
const collar=[...s.retired,...s.parcels].flatMap(b=>{const c=Math.cos(b.yaw??0),sn=Math.sin(b.yaw??0);return [-1,1].flatMap(u=>[-1,1].map(v=>({x:b.x+c*u*b.w/2+sn*v*b.d/2,z:b.z-sn*u*b.w/2+c*v*b.d/2})));});
for(const r of s.roads)for(const id of [r.a,r.b]){const p=ns.get(id)!,pad=r.width/2+6;for(const u of [-1,1])for(const v of [-1,1])collar.push({x:p.x+u*pad,z:p.z+v*pad});}
const fittedBoundary={minX:Math.floor(Math.min(...collar.map(p=>p.x))/5)*5,maxX:Math.ceil(Math.max(...collar.map(p=>p.x))/5)*5,minZ:Math.floor(Math.min(...collar.map(p=>p.z))/5)*5,maxZ:Math.ceil(Math.max(...collar.map(p=>p.z))/5)*5};
fs.writeFileSync(new URL('district-plan.json',out),JSON.stringify({plan:BANG_RAK_SEAM,fittedBoundary,boundaryNote:"fittedBoundary encloses actual migrated/new physical bodies and 6m road aprons; plan.boundary is the initial selection seed.",nodes:d.nodes.filter(n=>n.id.startsWith('brg:')),roads:s.roads,retired:s.retired,parcels:s.parcels,rejected:s.rejected,note:'Final production plan, game metres. Inherits existing landmark compounds/river/transit unchanged. Not a surveyed real-world map.'},null,2)+'\n');
fs.writeFileSync(new URL('validation/pr43-world.json.gz',out),gzipSync(JSON.stringify(d)));
console.log({roads:d.roads.length,newEdges:s.roads.length,parcels:s.parcels.length,retired:s.retired.length,rejected:s.rejected});
