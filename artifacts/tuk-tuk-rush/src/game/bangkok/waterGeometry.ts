import type { District, Point } from '../types';
import { distanceToSegment } from '../world';
import { stableHash } from './stableHash';

type Edge = {a:Point;b:Point;minX:number;maxX:number;minZ:number;maxZ:number};
type WaterIndex = {rings:Point[][];edges:Edge[];rows:Map<number,Edge[]>};
const indices = new WeakMap<Point[][],WaterIndex>();
function index(rings:Point[][]):WaterIndex {
  let cached=indices.get(rings);if(cached)return cached;
  const edges:Edge[]=[],rows=new Map<number,Edge[]>();
  for(const ring of rings)for(let i=1;i<ring.length;i++){
    const a=ring[i-1]!,b=ring[i]!;
    if(a.x===b.x&&a.z===b.z)continue;
    const e={a,b,minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minZ:Math.min(a.z,b.z),maxZ:Math.max(a.z,b.z)};
    edges.push(e);
    for(let row=Math.floor(e.minZ/80);row<=Math.floor(e.maxZ/80);row++){
      if(!rows.has(row))rows.set(row,[]);rows.get(row)!.push(e);
    }
  }
  cached={rings,edges,rows};indices.set(rings,cached);return cached;
}
/** Polygon parity includes islands. Open-water geometry is never inferred from
 * the nominal width or a map stroke. Rings are closed, in game X/Z. */
export function inRiverWater(d:District,p:Point):boolean {
  // Independent OSM polygons are a union; holes belong only to their outer ring.
  // Flattening overlapping multipolygons into one parity test cancels real water.
  if(d.waterPolygons)return d.waterPolygons.some(rings=>inWaterRings(rings,p));
  if(!d.riverPolygon)return (d.river??[]).slice(1).some((b,i)=>distanceToSegment(p,d.river![i]!,b).distance<(d.riverWidth??0)/2);
  return inWaterRings(d.riverPolygon,p);
}
function inWaterRings(rings:Point[][],p:Point):boolean {
  let inside=false;
  for(const {a,b} of index(rings).rows.get(Math.floor(p.z/80))??[])
    if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  return inside;
}
export function nearestRiverShore(d:District,p:Point){
  const edges=d.riverPolygon?index(d.riverPolygon).edges:(d.river??[]).slice(1).map((b,i)=>{const a=d.river![i]!;return{a,b,minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minZ:Math.min(a.z,b.z),maxZ:Math.max(a.z,b.z)};});
  let distance=Infinity,point:Point={...p},edge=edges[0];
  for(const e of edges){
    const dx=Math.max(0,e.minX-p.x,p.x-e.maxX),dz=Math.max(0,e.minZ-p.z,p.z-e.maxZ);
    if(dx*dx+dz*dz>=distance*distance)continue;
    const q=distanceToSegment(p,e.a,e.b);if(q.distance<distance){distance=q.distance;point=q.point;edge=e;}
  }
  if(!edge)return{point,distance,nx:1,nz:0};
  const dx=edge.b.x-edge.a.x,dz=edge.b.z-edge.a.z,len=Math.hypot(dx,dz);
  let nx=dz/len,nz=-dx/len;
  if(d.riverPolygon&&inRiverWater(d,{x:point.x+nx*.1,z:point.z+nz*.1})){nx=-nx;nz=-nz;}
  if(!d.riverPolygon){const l=Math.hypot(p.x-point.x,p.z-point.z)||1;nx=(p.x-point.x)/l;nz=(p.z-point.z)/l;point={x:point.x+nx*(d.riverWidth??0)/2,z:point.z+nz*(d.riverWidth??0)/2};distance=Math.hypot(p.x-point.x,p.z-point.z);}
  return{point,distance,nx,nz};
}
/** Signed physical clearance: positive on land, negative in water. */
export function riverClearance(d:District,p:Point){
  if(!d.riverPolygon)return Math.min(Infinity,...(d.river??[]).slice(1).map((b,i)=>distanceToSegment(p,d.river![i]!,b).distance))-(d.riverWidth??0)/2;
  const q=nearestRiverShore(d,p);return inRiverWater(d,p)?-q.distance:q.distance;
}
/** Bangkok's named banks follow downstream left/right identity even when the
 * channel turns east. East/Phra Nakhon is downstream-left, not +X. */
export function riverBank(d:District,p:Point):'east'|'west'{
  let best=Infinity,side=0;
  for(let i=1;i<(d.river?.length??0);i++){
    const a=d.river![i-1]!,b=d.river![i]!,q=distanceToSegment(p,a,b);
    if(q.distance<best){best=q.distance;side=(b.x-a.x)*(p.z-q.point.z)-(b.z-a.z)*(p.x-q.point.x);}
  }
  return side<=0?'east':'west';
}
export function riverPolygonPath(d:District,map=false){
  return (d.riverPolygon??[]).map(r=>'M'+r.map(p=>map?`${p.x/4+500},${p.z/4+600}`:`${p.x},${p.z}`).join('L')+'Z').join('');
}
/** Independent of road identity: water or terrain edits invalidate baked land,
 * water, sidewalks and inspector exports even if every road node stays put. */
export function waterTerrainKey(d:District){
  const q=(v:number)=>Math.round(v*1000);
  return String(stableHash(JSON.stringify({version:d.waterVersion,river:d.riverPolygon?.map(r=>r.map(p=>[q(p.x),q(p.z)])),legacy:d.riverPolygon?undefined:[d.river,d.riverWidth],canals:d.canals,terrain:[-7000,-7000,7000,7000],surfaceVersion:2})));
}
