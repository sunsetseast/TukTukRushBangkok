import type { District, Obstacle, Point } from "../types";
import { orientedFootprintsOverlap, obstacleDistance } from "../world";
import type { ArtPiece } from "./architecturalBatch";
import { stationEnvelope } from './transit/stationGeometry';
import { SIAM_JUNCTION } from './transit/network';

export type SpatialVolume = Obstacle & {
  id: string;
  minY: number;
  maxY: number;
  category: "solid" | "canopy" | "overhead";
};
export type SpatialConflict = {
  objectId: string;
  location: Point;
  conflictId: string;
  type: "vehicle-lane" | "rail-envelope";
  severity: "severe";
};
/** Conservative projection of the actual pitched decorative box, including
 * horizontal overhang. Tall crowns are separate from their physical trunks. */
export function pieceVolume(p: ArtPiece, id: string): SpatialVolume {
  const c = Math.abs(Math.cos(p.pitch ?? 0)), s = Math.abs(Math.sin(p.pitch ?? 0));
  const h = c * p.h + s * p.d;
  return { ...p, id, height: h, d: c * p.d + s * p.h,
    minY: p.y - h / 2, maxY: p.y + h / 2,
    category: p.y - h / 2 > 5 ? "overhead" : "solid" };
}
export function obstacleVolume(o: Obstacle, i: number): SpatialVolume {
  return { ...o, id: o.environmentId ?? `${o.landmarkId ?? "building"}:${i}`,
    minY: 0, maxY: o.height, category: "solid" };
}
const box = (a: Point, b: Point, width: number): Obstacle => ({
  x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, w: width,
  d: Math.hypot(b.x - a.x, b.z - a.z),
  yaw: Math.atan2(b.x - a.x, b.z - a.z), height: 0, color: "#fff",
});
/** Spatial broad phase + exact oriented rectangle SAT. Does not mutate world
 * geometry, suppress collisions, or silently relocate an authored asset. */
export function validateSpatialVolumes(d: District, volumes: SpatialVolume[]) {
  const nodes = new Map(d.nodes.map(n => [n.id, n]));
  const roads = d.roads.map(r => ({ r, volume: box(nodes.get(r.a)!, nodes.get(r.b)!, r.width),cap:0 }));
  // The baked asphalt also includes rounded node caps. Testing only ribbons
  // misses the swept turning area on acute junctions and short road ends.
  const caps=new Map<string,number>();for(const r of d.roads)for(const id of [r.a,r.b])caps.set(id,Math.max(caps.get(id)??0,r.width/2));
  for(const [id,radius] of caps){const p=nodes.get(id)!;roads.push({r:{a:id,b:id,name:"Intersection / road end clearance",corridor:`turn:${id}`,width:radius*2},volume:{...p,w:radius*2,d:radius*2,height:0,color:"#fff"},cap:radius*.98});}
  const grid = new Map<string, typeof roads>();
  const visit = (o: Obstacle, f: (key: string) => void) => {
    const c = Math.abs(Math.cos(o.yaw ?? 0)), s = Math.abs(Math.sin(o.yaw ?? 0));
    const rx = (c * o.w + s * o.d) / 2, rz = (s * o.w + c * o.d) / 2;
    for (let x = Math.floor((o.x-rx)/80); x <= Math.floor((o.x+rx)/80); x++)
      for (let z = Math.floor((o.z-rz)/80); z <= Math.floor((o.z+rz)/80); z++) f(`${x}:${z}`);
  };
  for (const road of roads) visit(road.volume, k => {
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(road);
  });
  type RailVolume={line:string;volume:Obstacle;minY:number;maxY:number};
  const railGrid=new Map<string,RailVolume[]>();
  const addRail=(r:RailVolume)=>visit(r.volume,k=>{if(!railGrid.has(k))railGrid.set(k,[]);railGrid.get(k)!.push(r);});
  for(const line of d.transit?.lines??[]){
    const siam=line.stations.find(s=>s.id==='siam');
    for(const p of line.samples){const rise=siam?6*Math.max(0,Math.min(1,(SIAM_JUNCTION.gradeApproach-Math.abs(p.distance-siam.distance))/SIAM_JUNCTION.gradeRun)):0;
      addRail({line:line.id,volume:{...p,w:10,d:6,yaw:Math.atan2(p.tx,p.tz),height:6,color:"#fff"},minY:p.y-1.7,maxY:p.y+4.5+rise});}
    for(const s of line.stations)addRail({line:line.id,volume:stationEnvelope(s),minY:7.5,maxY:26});
  }
  const conflicts: SpatialConflict[] = [];
  for (const o of volumes) {
    // Road markings, flat ground and legally elevated spans are not obstacles.
    if (o.maxY <= .3) continue;
    if (o.minY < 5) {
      const candidates = new Set<typeof roads[number]>();
      visit(o, k => grid.get(k)?.forEach(r => candidates.add(r)));
      for (const {r, volume,cap} of candidates) if (cap?obstacleDistance(volume,o)<cap-.05:orientedFootprintsOverlap(o, volume, -.05))
        conflicts.push({ objectId: o.id, location: {x:o.x,z:o.z},
          conflictId: `${r.corridor ?? r.name}:${r.a}:${r.b}`, type: "vehicle-lane", severity:"severe" });
    }
    const railCandidates=new Set<RailVolume>(),hit=new Set<string>();
    visit(o,k=>railGrid.get(k)?.forEach(r=>railCandidates.add(r)));
    for(const r of railCandidates)if(!hit.has(r.line)&&o.minY<r.maxY&&o.maxY>r.minY&&orientedFootprintsOverlap(o,r.volume)){
      hit.add(r.line);conflicts.push({objectId:o.id,location:{x:o.x,z:o.z},conflictId:`bts:${r.line}`,type:"rail-envelope",severity:"severe"});
    }
  }
  return conflicts;
}
