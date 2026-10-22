import type {District} from '../types';
import {CITY_MODEL,type CityGeometryContract} from './cityModel';
import {buildLandmarkRegistry} from './landmarkRegistry';
import {landmarkParcels,rectangleBoundary} from './landmarkParcels';
/** Inspection adapter over actual objects; never a second placement system. */
export function cityGeometry(d:District):CityGeometryContract[] {
 const nodes=new Map(d.nodes.map(n=>[n.id,n]));
 const f=(id:string,kind:CityGeometryContract['kind'],geometry:CityGeometryContract['geometry'],provenance:string):CityGeometryContract=>({id,kind,geometry,coordinates:'game-world',provenance,approvalVersion:CITY_MODEL.id});
 return [
  ...d.roads.map((r,i)=>f(`road:${i}:${r.a}:${r.b}`,'street-corridor',[nodes.get(r.a)!,nodes.get(r.b)!],`approved arcade graph; ${r.corridor??'arrival'}; not surveyed geometry`)),
  ...d.roads.filter(r=>r.bridge).map(r=>f(`bridge:${r.a}:${r.b}`,'bridge',[nodes.get(r.a)!,nodes.get(r.b)!],'shared bridge road/collision geometry')),
  ...d.nodes.map(n=>f(n.id,'intersection',[n],'existing stable graph node')),
  ...(d.regions??[]).map(r=>f(r.id,'district',r.polygon,'authored arcade district boundary')),
  ...landmarkParcels(d).map(p=>f(p.id,'parcel',p.boundary,'existing protected-parcel builder')),
  ...buildLandmarkRegistry(d).flatMap(p=>[f(p.id,p.category==='river-pier'?'pier':p.category.includes('station')||p.category.includes('mrt')?'transit-station':'landmark-site',[p.world],p.references.join(' ')||'research required'),...p.footprints.map((b,i)=>f(p.id+':solid:'+i,'landmark-footprint',rectangleBoundary(b),'actual compressed model collision footprint')),...(p.mainEntrance?[f(p.id+':entrance','entrance',[p.mainEntrance],'actual model/public entrance; real bearing may be approximate')]:[])]),
  ...(d.publicSpaces??[]).map(p=>f(p.id,'public-space',p.boundary,p.adaptation)),
  ...(d.river?[f('chao-phraya','waterway',d.river,'approved compressed river spine')]:[]),
  ...(d.riverPolygon??[]).map((r,i)=>f(`chao-phraya:bank-ring:${i}`,'waterway',r,'OSM riverbank polygon; '+d.waterVersion+'; © OpenStreetMap contributors, ODbL 1.0; explicit river-local compression')),
  ...(d.canals??[]).map((c,i)=>f('canal:'+i,'waterway',c.points,'compressed canal')),
 ];
}
