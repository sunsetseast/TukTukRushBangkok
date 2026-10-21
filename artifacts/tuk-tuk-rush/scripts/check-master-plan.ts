import assert from "node:assert/strict";
import fs from "node:fs";
import { createBangkokWorld,toWorld,toMap } from "../src/game/bangkok/world";
import { validateSpatialVolumes,obstacleVolume,pieceVolume } from "../src/game/bangkok/spatialValidation";
import { emitDestinationGrounds } from "../src/game/bangkok/destinationArt";
import { emitAuthoredGrounds } from "../src/game/bangkok/authoredGrounds";
import { emitEnvironment } from "../src/game/bangkok/environmentArt";
import { emitTropicalVegetation,planTropicalPlants } from "../src/game/bangkok/tropicalPlan";
import { planMrtEntrances,emitMrtEntrances } from "../src/game/bangkok/mrtSurface";
import { MASTER_PLAN } from "../src/game/bangkok/masterPlan";
import { distanceToSegment } from "../src/game/world";
import { navigationPath } from "../src/game/navigation";
import { readDiscovery,discover } from "../src/game/bangkok/discovery";
import { RailService } from "../src/game/bangkok/transit/service";
import { roadGraphKey } from "../src/game/bangkok/roadSurfaceGraph";
import baked from "../src/game/bangkok/roadSurfaces.generated.json";
import type { SpatialVolume } from "../src/game/bangkok/spatialValidation";
const start=performance.now(),d=createBangkokWorld(),nodes=new Map(d.nodes.map(n=>[n.id,n]));
const directory=new URL("../../../docs/qa/master-plan/",import.meta.url);fs.mkdirSync(directory,{recursive:true});
assert.equal(roadGraphKey(d),baked.key,"Road render graph must match collision/navigation graph");
assert.deepEqual(toMap(toWorld([...MASTER_PLAN.phromPhong])),{x:1030,y:610});
const expected=["phaya","sukhumvit-east","soi-11","soi-22","soi-24","soi-31","soi-39","dinso","ti-thong","atsadang","mangkon","plaeng-nam"];
for(const id of expected)assert(d.roads.some(r=>r.corridor===id),`Missing real corridor ${id}`);
// Actual graph traversal, not proximity between decorative road endpoints.
const adjacency=new Map(d.nodes.map(n=>[n.id,[] as string[]]));
for(const r of d.roads){adjacency.get(r.a)!.push(r.b);if(!r.oneWay)adjacency.get(r.b)!.push(r.a);assert(Math.hypot(nodes.get(r.a)!.x-nodes.get(r.b)!.x,nodes.get(r.a)!.z-nodes.get(r.b)!.z)>.001,"No zero-length intersection fragments");}
const seen=new Set<string>(),queue=[d.nodes[0]!.id];for(let i=0;i<queue.length;i++){const p=queue[i]!;if(seen.has(p))continue;seen.add(p);for(const q of adjacency.get(p)!)if(!seen.has(q))queue.push(q);}
assert.equal(seen.size,d.nodes.length,"Every street/arrival reachable following directionality");
for(const id of ["emporium","emquartier","emsphere","benchasiri","chatuchak-park"]){
  const l=d.landmarks.find(l=>l.id===id)!;assert(l&&l.accessNode,`Discoverable reachable destination ${id}`);
  assert(navigationPath(d,d.nodes[0]!,nodes.get(l.accessNode!)!).length>1,`Navigation reaches ${id}`);
}
const e=d.landmarks.find(l=>l.id==="emporium")!,q=d.landmarks.find(l=>l.id==="emquartier")!,b=d.landmarks.find(l=>l.id==="benchasiri")!;
assert(e.plot!.z>toWorld([...MASTER_PLAN.phromPhong]).z&&q.plot!.z<toWorld([...MASTER_PLAN.phromPhong]).z,"Malls opposite sides of Sukhumvit");
assert(b.plot!.x<e.plot!.x&&b.plot!.x>d.landmarks.find(l=>l.id==="emsphere")!.plot!.x,"Benchasiri between EmSphere and Emporium");
const colliders=d.obstacles.map(obstacleVolume),decoration:SpatialVolume[]=[],plants:SpatialVolume[]=[];
for(const [name,emit] of [["arrival",emitDestinationGrounds],["authored",emitAuthoredGrounds],["environment",emitEnvironment],["mrt",emitMrtEntrances]] as const)emit(d,p=>decoration.push(pieceVolume(p,`${name}:${decoration.length}`)));
emitTropicalVegetation(d,p=>plants.push(pieceVolume(p,p.siteId!)));
const conflicts=validateSpatialVolumes({...d,transit:undefined},[...colliders,...decoration,...plants]);
const plantConflicts=validateSpatialVolumes(d,plants);
const railBuildings=validateSpatialVolumes(d,d.obstacles.filter(o=>o.landmarkId||d.buildings.includes(o)).map(obstacleVolume)).filter(c=>c.type==="rail-envelope");
fs.writeFileSync(new URL("conflicts-after.json",directory),JSON.stringify({lane:conflicts,plant:plantConflicts,railBuildings},null,2));
assert.equal(conflicts.length,0,`Severe lane intrusions: ${JSON.stringify(conflicts.slice(0,6))}`);
assert.equal(plantConflicts.length,0,`Full crown / train / station clearance: ${JSON.stringify(plantConflicts.slice(0,6))}`);
assert.equal(railBuildings.length,0,`Building / transit clearance: ${JSON.stringify(railBuildings.slice(0,6))}`);
// Regression: a rotated thin wing crosses the lane even with its center outside.
const synthetic={nodes:[{id:"a",x:0,z:-20},{id:"b",x:0,z:20}],roads:[{a:"a",b:"b",width:8,name:"fixture"}],buildings:[],obstacles:[],landmarks:[]};
const wing={x:12,z:0,w:2,d:30,height:10,color:"#fff",yaw:Math.PI/4};
assert.equal(validateSpatialVolumes(synthetic,[obstacleVolume(wing,0)]).length,1);
assert.equal(validateSpatialVolumes(synthetic,[pieceVolume({...wing,y:12,h:2,yaw:0},"bridge")]).length,0,"Legal elevated clearance is distinct from a ground intrusion");
const suk=d.transit!.lines[0]!;assert.deepEqual(suk.stations.map(s=>s.code),["N8","N7","N5","N4","N3","N2","N1","CEN","E1","E2","E3","E4","E5"]);
const roadDistance=(p:{x:number;z:number})=>Math.min(...d.roads.filter(r=>["phaya","old_siam","sukhumvit","sukhumvit-east"].includes(r.corridor??"")).map(r=>distanceToSegment(p,nodes.get(r.a)!,nodes.get(r.b)!).distance));
for(const station of suk.stations)assert(roadDistance(station)<3.5,`Station aligned to the real shared road: ${station.id}`);
const service=new RailService(d.transit!),visited=new Set<string>();for(let t=0;t<1800;t+=.5){service.update(t);for(const train of service.trains)if(train.station)visited.add(`${train.line.id}:${train.station}`);}
assert(visited.has("sukhumvit:phrom-phong"),"New E5 station receives service");
service.update(0);assert.equal(JSON.stringify(service.trains),JSON.stringify(new RailService(d.transit!).trains),"Restart deterministic");
const mrt=planMrtEntrances(d);assert.equal(mrt.length,7);assert(mrt.every(s=>d.obstacles.some(o=>o.environmentId===s.id)));
const store=new Map<string,string>(),storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);}},discovery=readDiscovery(storage);
for(const id of ["emporium","benchasiri","chatuchak-park"]){const l=d.landmarks.find(l=>l.id===id)!;discover(d,nodes.get(l.accessNode!)!,discovery,storage);assert(discovery.landmarks.includes(id));}
assert.deepEqual(readDiscovery(storage),discovery,"Save/load includes new places without renaming existing IDs");
const plantsBySpecies=Object.fromEntries(Object.entries(Object.groupBy(planTropicalPlants(d),p=>p.species)).map(([k,v])=>[k,v!.length]));
assert((plantsBySpecies.coconut??0)>10&&(plantsBySpecies["rain-tree"]??0)>20,"Visible tropical silhouette mix");
const summary={pass:true,roads:d.roads.length,nodes:d.nodes.length,connectedDirectedNodes:seen.size,buildings:d.buildings.length,landmarks:d.landmarks.length,publicSpaces:d.publicSpaces!.length,stations:d.transit!.lines.map(l=>({line:l.id,count:l.stations.length})),plantsBySpecies,mrtEntrances:mrt,colliderVolumes:colliders.length,decorationVolumes:decoration.length,plantVolumes:plants.length,severeLaneConflicts:conflicts.length,railBuildingConflicts:railBuildings.length,plantConflicts:plantConflicts.length,ms:Math.round(performance.now()-start)};
fs.writeFileSync(new URL("validation.json",directory),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
