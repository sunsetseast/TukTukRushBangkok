import {landmarkParcels} from "../src/game/bangkok/landmarkParcels";
import fs from 'node:fs';
import {createBangkokWorld} from '../src/game/bangkok/world';
import {roadGraphKey,cityGraphApprovalKey} from '../src/game/bangkok/roadIdentity';
import {bangRakState,BANG_RAK_PLAN} from '../src/game/bangkok/bangRakPlan';
const d=createBangkokWorld({authoring:true}),s=bangRakState(d)!;
const f=new URL('../src/game/bangkok/cityData.v1.json',import.meta.url),data=JSON.parse(fs.readFileSync(f,'utf8'));
console.log({roads:d.roads.length,nodes:d.nodes.length,parcels:s.parcels.map(p=>p.id),rejected:s.rejected});
data.roadBaseline={...data.roadBaseline,version:4,key:roadGraphKey(d),fullGraphKey:cityGraphApprovalKey(d),roads:d.roads.length,nodes:d.nodes.length,sourceStages:[...data.roadBaseline.sourceStages.filter((s:string)=>s!=='bang-rak-v1'),'bang-rak-v1'],status:'approved-bang-rak-v1-additive-lanes'};
fs.writeFileSync(f,JSON.stringify(data,null,2)+'\n');
// The work collar includes complete retired lots and public road aprons;
// separately protected compounds within it retain their ownership.
const protectedParcels=landmarkParcels(d).filter(p=>["grand-postal","warehouse-30"].includes(p.landmarkId));
const points=[...s.removed,...s.parcels.map(p=>p.body)].flatMap(b=>{
 const c=Math.cos(b.yaw??0),sn=Math.sin(b.yaw??0);
 return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>({x:b.x+c*u*b.w/2+sn*v*b.d/2,z:b.z-sn*u*b.w/2+c*v*b.d/2}));
});
points.push(...protectedParcels.flatMap(p=>p.boundary));
for(const lane of BANG_RAK_PLAN.lanes)for(const p of [lane.near,lane.end])for(const u of [-12,12])for(const v of [-12,12])points.push({x:p.x+u,z:p.z+v});
const minX=Math.floor(Math.min(...points.map(p=>p.x))/5)*5,maxX=Math.ceil(Math.max(...points.map(p=>p.x))/5)*5,minZ=Math.floor(Math.min(...points.map(p=>p.z))/5)*5,maxZ=Math.ceil(Math.max(...points.map(p=>p.z))/5)*5;
const approvedBoundary=[{x:minX,z:minZ},{x:maxX,z:minZ},{x:maxX,z:maxZ},{x:minX,z:maxZ}];
const geometryNote='approvedBoundary is the fitted work collar enclosing complete new/retired footprints and public-road aprons. It does not transfer ownership of protected property within it. plan.boundary is the initial fitting seed; protectedParcels records actual final civic/warehouse ownership and the narrowed forecourt.';
fs.writeFileSync(new URL('../../../docs/qa/bang-rak/district-plan.json',import.meta.url),JSON.stringify({plan:BANG_RAK_PLAN,approvedBoundary,geometryNote,protectedParcels,parcels:s.parcels,removed:s.removed,rejected:s.rejected,roads:s.roads,landmarks:d.landmarks.filter(l=>['grand-postal','warehouse-30'].includes(l.id!))},null,2)+'\n');
