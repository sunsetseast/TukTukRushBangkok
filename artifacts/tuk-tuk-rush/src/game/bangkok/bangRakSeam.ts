import type { District, Obstacle, Point, Road } from "../types";
import { orientedFootprintsOverlap } from "../world";
import { riverClearance } from "./waterGeometry";
import { parcelConflicts } from "./landmarkParcels";
import { planChinatownBlocks } from "./chinatownBlocks";
import migration from "./bangRakSeamMigration.v1.json";

/** Selected northern seam, not a projection of the whole administrative district.
 * Si Phraya's western reach leaves the River City interface eastbound; Captain
 * Bush bends north back to it. The retained Wanit approach is compressed legacy
 * access, NOT a claim that Wanit 2 and Charoen Krung 24 are the same street. */
export const BANG_RAK_SEAM = {
  version: 1,
  baseline: migration.baseline,
  boundary: { minX: -225, maxX: 155, minZ: 750, maxZ: 888 },
  sources: [
    "https://rivercitybangkok.com/plan-your-visit/",
    "https://rivercitybangkok.com/wp-content/uploads/2021/09/RCB-Map.pdf",
    "https://www.openstreetmap.org/way/157800038",
    "https://www.openstreetmap.org/way/55932811",
    "https://www.openstreetmap.org/way/1235099299",
    "https://www.thailandtourismdirectory.go.th/en/attraction/103358",
  ],
  streets: [
    { id: "si-phraya", name: "Si Phraya Road", thai: "ถนนสี่พระยา", width: 12,
      oneWay: true, arrivalSpurFirstSegment: true, points: [{x:-200,z:784},{x:-165,z:822},{x:-140,z:822},{x:145.5172413796,z:780}] },
    { id: "captain-bush-return", name: "Charoen Krung Soi 30 / Captain Bush Lane", thai: "ซอยเจริญกรุง 30", width: 9,
      oneWay: true, points: [{x:-158,z:883},{x:-158,z:850},{x:-165,z:822}] },
  ],
  compromises: [
    "A separate two-way River City arrival spur joins the retained Wanit interface to eastbound Si Phraya and Captain Bush. This local curve is compressed; eastern Si Phraya and Maha Set remain deferred.",
    "All PR42 lane centerlines remain. Captain Bush's added northern bend and one-way rule correct its topology; widths and the bend are arcade fits, not surveyed dimensions.",
    "River City is in Talat Noi, Samphanthawong beside Bang Rak. No BTS/MRT station lies inside this finished seam; existing distant transit is inherited, not newly certified.",
  ],
} as const;
export type SeamState = { roads: Road[]; retired: Obstacle[]; parcels: Obstacle[]; rejected: string[] };
const states = new WeakMap<District, SeamState>();
export const bangRakSeamState = (d: District) => states.get(d);
export const retiredBangRakIds = new Set(migration.retired.map(p => p.environmentId));
export function planBangRakSeam(d: District) {
  if (states.has(d)) return states.get(d)!;
  const state: SeamState = {roads:[], retired:[], parcels:[], rejected:[]};
  states.set(d,state);
  // Explicit, immutable migration ledger. A newly conflicting protected property
  // is an error, never an excuse to widen the deletion area.
  for (const prior of migration.retired) {
    const o = d.obstacles.find(p => p.environmentId === prior.environmentId);
    if (!o || ["x","z","w","d","height","yaw"].some(k => Math.abs(((o as any)[k]??0)-((prior as any)[k]??0))>1e-6))
      throw Error("Si Phraya migration baseline changed: "+prior.environmentId);
    state.retired.push(o);
  }
  const retired = new Set(state.retired);
  d.buildings = d.buildings.filter(o => !retired.has(o));
  d.obstacles = d.obstacles.filter(o => !retired.has(o));
  for(const transfer of migration.ownerTransfers){
    const rear=d.buildings.find(b=>b.environmentId===transfer.id),owner=d.buildings.find(b=>b.environmentId===transfer.toOwner);
    if(!rear?.chinatown || rear.chinatown.owner!==transfer.fromOwner || !owner?.chinatown || owner.chinatown.block!==rear.chinatown.block)
      throw Error("Invalid Si Phraya rear ownership transfer: "+transfer.id);
    rear.chinatown.owner=transfer.toOwner;
  }
  for (const block of planChinatownBlocks(d)) {
    block.parcels = block.parcels.filter(o => !retired.has(o));
    block.courts = block.courts.filter(c => !retiredBangRakIds.has(c.owner) &&
      !migration.retired.some(p => c.id.startsWith(p.environmentId)));
  }
  const nodes = new Map(d.nodes.map(n => [n.id,n]));
  const existing = (p: Point) => d.nodes.find(n => Math.hypot(n.x-p.x,n.z-p.z)<1e-5);
  const node = (p: Point, id: string) => {
    const n = existing(p) ?? {...p,id};
    if (!nodes.has(n.id)) {d.nodes.push(n);nodes.set(n.id,n);}
    return n;
  };
  for (const street of BANG_RAK_SEAM.streets) {
    let count=0;
    for (let i=1;i<street.points.length;i++) {
      const a=street.points[i-1]!,b=street.points[i]!,steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/20);
      let prev=node(a,`brg:${street.id}:${count++}`);
      for(let j=1;j<=steps;j++) {
        const n=node({x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps},`brg:${street.id}:${count++}`);
        // River City's public car arrival is a local two-way spur northwest of
        // the real Si Phraya / Captain Bush junction, not an invented one-way
        // extension of Si Phraya. Keep the source street itself eastbound.
        const arrivalSpur=street.id==="si-phraya" && i===1;
        const r: Road={a:prev.id,b:n.id,width:street.width,
          name:arrivalSpur?"River City public arrival approach":street.name,
          corridor:arrivalSpur?"river-city-interface":street.id==="captain-bush-return"?"charoen-krung-30":street.id,
          oneWay:!arrivalSpur,spawnTraffic:false};
        state.roads.push(r);d.roads.push(r);prev=n;
      }
    }
  }
  for(const r of d.roads)if(r.corridor==="charoen-krung-30") r.oneWay=true;
  const volume=(r:Road,extra:number):Obstacle=>{
    const a=nodes.get(r.a)!,b=nodes.get(r.b)!;
    return {x:(a.x+b.x)/2,z:(a.z+b.z)/2,w:r.width+extra,d:Math.hypot(b.x-a.x,b.z-a.z)+extra,yaw:Math.atan2(b.x-a.x,b.z-a.z),height:0,color:"#aaa"};
  };
  const clear=state.roads.map(r=>volume(r,4));
  for(const o of d.obstacles)if(clear.some(r=>orientedFootprintsOverlap(o,r)))
    throw Error("Unledgered Si Phraya road conflict: "+o.environmentId);
  const allRoads=d.roads.map(r=>volume(r,8));
  const add=(id:string,p:Point,w:number,depth:number,height:number,yaw:number,family:NonNullable<Obstacle["bangRak"]>["family"],road:string)=>{
    const o:Obstacle={...p,w,d:depth,height,yaw,color:"#d5c3a4",protected:true,regionId:"bang-rak",environmentId:`brg:${id}`,
      bangRak:{family,road,trade:family==="gallery"?"gallery":family==="cafe"?"coffee":family==="workshop"?"workshop":"retail"}};
    const conflict=riverClearance(d,o)<Math.hypot(w,depth)/2+2 || allRoads.some(r=>orientedFootprintsOverlap(o,r)) ||
      d.obstacles.some(q=>orientedFootprintsOverlap(o,q,1)) || parcelConflicts(d,o).length;
    if(conflict){state.rejected.push(id);return;}
    d.buildings.push(o);d.obstacles.push(o);state.parcels.push(o);
  };
  // Two street-defined rows. Opposing facades face the same diagonal centerline;
  // shallow back wings belong to those properties, not a second retail row.
  const a=BANG_RAK_SEAM.streets[0].points[2]!,b=BANG_RAK_SEAM.streets[0].points[3]!,
    dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),tx=dx/len,tz=dz/len;
  for(const side of [-1,1])for(let i=0;i<10;i++){
    const t=34+i*24,off=side*23;
    add(`si-phraya:${side}:${i}`,{x:a.x+tx*t-tz*off,z:a.z+tz*t+tx*off},22,18,10.5+(i%3)*2.8,
      Math.atan2(tz*side,-tx*side),(["gallery","merchant","cafe","timber","workshop"] as const)[i%5]!,"si-phraya");
  }
  // The return is a service-scaled street with lane-facing workshops, not a
  // widened road through the River City or Warehouse 30 compounds.
  for(const [i,z] of [840,863].entries())add(`captain-east:${i}`,{x:-130,z},21,16,10.5, 0,"workshop","charoen-krung-30");
  return state;
}
