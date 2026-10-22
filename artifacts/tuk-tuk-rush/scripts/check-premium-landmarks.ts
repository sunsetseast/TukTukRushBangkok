import {assertUnmovedParcels} from './river-migration-contract';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {createBangkokWorld} from '../src/game/bangkok/world';
import {assertApprovedCityGeometry} from '../src/game/bangkok/cityModel';
import {realCommercial} from '../src/game/bangkok/realCommercial';
import {buildRealArchitecture} from '../src/game/bangkok/realArchitecture';
import {skylineLandmark,mahanakhonOccupied} from '../src/game/bangkok/skylineLandmarks';
import {designBuildings} from '../src/game/bangkok/buildingGrammar';
import {emitDistrictArchitecture} from '../src/game/bangkok/architecture';
import {ArchitecturalBatch} from '../src/game/bangkok/architecturalBatch';
import {disposeObject} from '../src/game/assets';
import {landmarkParcels,emitLandmarkApproaches,rectangleBoundary,polygonsOverlap} from '../src/game/bangkok/landmarkParcels';
const d=createBangkokWorld();assertApprovedCityGeometry(d);const records=[],roots=new Map<string,T.LOD>();
for(const id of ['terminal','icon','mahanakhon','hilton','peninsula','oriental']){
 const l=d.landmarks.find(l=>l.id===id)!,root=(buildRealArchitecture(l)??realCommercial(l)??skylineLandmark(l))!;assert(root instanceof T.LOD);roots.set(id,root);const levels=[];
 for(const level of root.levels){level.object.updateMatrixWorld(true);const box=new T.Box3().setFromObject(level.object),size=box.getSize(new T.Vector3()),materials=new Set<T.Material>();let triangles=0,calls=0;level.object.traverse(o=>{if(!(o instanceof T.Mesh))return;calls++;const g=o.geometry;triangles+=(g.index?.count??g.attributes.position.count)/3;for(const v of g.attributes.position.array)assert(Number.isFinite(v));for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);assert(!m.transparent);}});assert(calls<=5&&triangles<32000,id+' batch budget');assert(size.y>25);levels.push({triangles,calls,materials:materials.size,bounds:{min:box.min.toArray(),max:box.max.toArray()}});}
 assert(levels[1]!.triangles<=levels[0]!.triangles);records.push({id,levels});
}
const ray=(id:string,from:number[],dir:number[])=>new T.Raycaster(new T.Vector3(...from as [number,number,number]),new T.Vector3(...dir as [number,number,number])).intersectObject(roots.get(id)!.levels[0]!.object,true)[0]!;
for(const[id,from,dir]of [['terminal',[-70,3.7,-12.8],[1,0,0]],['terminal',[70,3.7,-12.8],[-1,0,0]],['icon',[-70,3.8,2.2],[1,0,0]]] as const){const hit=ray(id,[...from],[...dir]);assert(hit,id+' entrance');assert(((hit.object as T.Mesh).material as T.MeshStandardMaterial).roughness<=.42,id+' must expose glass');if(id==='terminal')assert(Math.abs(hit.point.x)<41,'Terminal entrance must be physically recessed behind the outer facade');}
const recesses=[];for(let f=0;f<38;f++){let occupied=0;for(let x=0;x<7;x++)for(let z=0;z<7;z++)if(mahanakhonOccupied(x,z,f))occupied++;assert(occupied>=25&&occupied<=49);const hit=ray('mahanakhon',[11.55,11+f*3.65,60],[0,0,-1]);if(hit)recesses.push(hit.point.z);}assert(Math.max(...recesses)-Math.min(...recesses)>3.8,'Physical ribbon must be carved');
const contexts=designBuildings(d).filter(p=>p.premiumContext);assert(contexts.length>12);const variants=new Set<string>();
for(const p of contexts){const b=p.parcel,c=Math.cos(b.yaw??0),s=Math.sin(b.yaw??0);emitDistrictArchitecture([p],piece=>{const dx=piece.x-b.x,dz=piece.z-b.z,u=c*dx-s*dz,v=s*dx+c*dz;assert(Math.abs(u)+piece.w/2<=b.w/2+.05);assert(Math.abs(v)+piece.d/2<=b.d/2+.05);});const v=p.premiumContext+':'+p.bays[0]!.seed%4;if(variants.has(v))continue;variants.add(v);const q={...p,parcel:{...b,x:0,z:0,yaw:0}},H=Math.min(b.height,p.premiumContext==='riverside'?48:80),fh=H/Math.max(2,Math.floor(H/3.7)),mat=new T.MeshBasicMaterial(),batch=new ArchitecturalBatch(mat,mat),group=new T.Group();emitDistrictArchitecture([q],p=>batch.add(p));group.add(...batch.finish());group.updateMatrixWorld(true);for(const side of [-1,1])for(const axis of ['x','z']){const samples=[-.3,-.15,.07,.22,.34].map(u=>{const from=axis==='z'?new T.Vector3(b.w*u,fh*1.68,side*(b.d/2+5)):new T.Vector3(side*(b.w/2+5),fh*1.68,b.d*u),dir=axis==='z'?new T.Vector3(0,0,-side):new T.Vector3(-side,0,0),hit=new T.Raycaster(from,dir).intersectObject(group,true)[0]!;assert(hit?.instanceId!==undefined);return(hit.object as T.InstancedMesh).geometry.getAttribute('artSurface').getX(hit.instanceId);});assert(samples.includes(7),'Visible context glass: '+v);}disposeObject(group);}
const apronArt:any[]=[];emitLandmarkApproaches(d,p=>{if(p.siteId==='terminal-asok-east-pr35')apronArt.push(p);});
const nodes=new Map(d.nodes.map(n=>[n.id,n]));
for(const p of apronArt)for(const r of d.roads){const a=nodes.get(r.a)!,b=nodes.get(r.b)!,road={x:(a.x+b.x)/2,z:(a.z+b.z)/2,w:r.width,d:Math.hypot(b.x-a.x,b.z-a.z),yaw:Math.atan2(b.x-a.x,b.z-a.z)};if(Math.hypot(road.x-p.x,road.z-p.z)>road.d/2+70)continue;assert(!polygonsOverlap(rectangleBoundary({x:p.x,z:p.z,w:p.w,d:p.d,yaw:p.yaw}),rectangleBoundary(road),.1),'Asok public art must not intersect a road');}
const old=JSON.parse(fs.readFileSync(new URL('../../../docs/qa/premium-landmarks/before-parcels.json',import.meta.url),'utf8'));assertUnmovedParcels(landmarkParcels(d),old.parcels);
for(const root of roots.values())disposeObject(root);const report={pass:true,roads:d.roads.length,nodes:d.nodes.length,buildings:d.buildings.length,parcels:landmarkParcels(d).length,contexts:contexts.length,contextSurfaceRays:variants.size*20,actualEntranceRays:3,physicallyRecessedTerminal:true,apronPieces:apronArt.length,records};fs.writeFileSync(new URL('../../../docs/qa/premium-landmarks/validation/architecture.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
