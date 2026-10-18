import { EXISTING_SITE_ANCHORS, EXISTING_SITE_WORLD_ANCHORS, registerExistingSites } from './authoredSites';
import { placeRealArchitecture } from './realPlaces';
import layout from './layout.json';
import {planLandscape} from './landscape';
import { completeUrbanFabric } from './urbanCompleteness';
import { completeStreetFabric } from './streetFabric';
import { scalaParcel } from './scala';
import { planEnvironment } from './environmentPlan';
import { bridgeBarriers } from './bridgeBarriers';
import { connectDestinations, detailDestinationCollisions, inDestinationGrounds } from './destinationAccess';
import { createRailNetwork, reserveRailCorridors } from './transit/network';
import type { District, Landmark, Obstacle, Point, Road, RoadNode } from '../types';
import { distanceToSegment, orientedFootprintsOverlap } from '../world';

/** North-up compressed design coordinates, not GPS. All world/map positions use this transform. */
export const SCALE = 4;
export const toWorld = ([x, y]: number[]): Point => ({ x: (x! - 500) * SCALE, z: (y! - 600) * SCALE });
export const toMap = (p: Point) => ({ x: p.x / SCALE + 500, y: p.z / SCALE + 600 });
export const SHIFT_SECONDS = 24 * 60;
type Segment = { a: Point; b: Point; road: Road; cuts: number[] };
const cross = (a: Point, b: Point) => a.x * b.z - a.z * b.x;
const sub = (a: Point, b: Point) => ({ x: a.x - b.x, z: a.z - b.z });
const mix = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });

export function pointInPolygon(p: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!, b = polygon[j]!;
    if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
export function regionAt(d: District, p: Point) {
  return [...(d.regions ?? [])].reverse().find(r => pointInPolygon(p, r.polygon));
}
export function riverDistance(d: District, p: Point) {
  return Math.min(...(d.river ?? []).slice(1).map((b, i) => distanceToSegment(p, d.river![i]!, b).distance));
}
const bridgeCache = new WeakMap<District, {count:number;bridges:{ a: Point; b: Point; width: number }[]}>();
/** Render and physics use the same buffered river. Only actual bridge lanes cross water. */
export function blockedByRiver(d: District, p: Point, radius = 1.5) {
  const main=!!d.river&&riverDistance(d,p)<d.riverWidth!/2+radius;
  const canal=d.canals?.some(c=>c.points.slice(1).some((b,i)=>distanceToSegment(p,c.points[i]!,b).distance<c.width/2+radius));
  if(!main&&!canal)return false;
  let cache = bridgeCache.get(d);
  if (!cache || cache.count!==d.roads.length) {
    const nodes = new Map(d.nodes.map(n => [n.id, n]));
    const bridges = d.roads.filter(r => r.bridge).map(r => ({ a: nodes.get(r.a)!, b: nodes.get(r.b)!, width: r.width }));
    cache={count:d.roads.length,bridges};bridgeCache.set(d, cache);
  }
  return !cache.bridges.some(r => distanceToSegment(p, r.a, r.b).distance <= r.width / 2 - radius);
}
const kinds: Record<string, Landmark['kind']> = {
  paknam:'temple',baiyoke:'tower',state:'tower',chatuchak: 'market', victory: 'monument', khaosan: 'market', democracy: 'monument', sanam: 'park',
  palace: 'palace', pho: 'temple', arun: 'temple', golden: 'temple', swing: 'monument', flowers: 'market',
  mbk: 'mall', paragon: 'mall', central: 'mall', gate: 'gate', traimit: 'temple', hua: 'station',
  food: 'market', icon: 'mall', park: 'park', terminal: 'mall', benjakitti: 'park', mahanakhon: 'tower', asiatique: 'wheel',
};

export function createBangkokWorld(): District {
  const canals=layout.canals.map(c=>({points:c.centerline.map(toWorld),width:c.design_width*SCALE}));
  const controls = Object.fromEntries(Object.entries(layout.road_nodes).map(([id, p]) => [id, toWorld(p)]));
  const segments: Segment[] = [];
  for (const corridor of layout.road_corridors) {
    const ids = corridor.id === 'yaowarat' ? [...corridor.nodes].reverse() : corridor.nodes;
    for (let i = 1; i < ids.length; i++) segments.push({
      a: controls[ids[i - 1]!]!, b: controls[ids[i]!]!, cuts: [0, 1],
      road: { a: '', b: '', name: corridor.name, corridor: corridor.id,
        width: corridor.kind === 'shortcut' ? 6 : corridor.kind === 'district' ? 12 : 20,
        shortcut: corridor.kind === 'shortcut', bridge: corridor.kind === 'bridge',
        oneWay: corridor.id === 'yaowarat' || corridor.id === 'charoen_n' },
    });
  }
  // The gateway occupies a protected island. Route approaching streets around it.
  const gateCenter = controls.odeon!, circleRadius = 32, circleCount = 20;
  const circle = Array.from({ length: circleCount }, (_, i) => ({ x: gateCenter.x + Math.cos(-Math.PI / 2 + i * 2 * Math.PI / circleCount) * circleRadius, z: gateCenter.z + Math.sin(-Math.PI / 2 + i * 2 * Math.PI / circleCount) * circleRadius }));
  for (const segment of segments) for (const key of ['a', 'b'] as const) {
    if (Math.hypot(segment[key].x - gateCenter.x, segment[key].z - gateCenter.z) > .01) continue;
    const other = segment[key === 'a' ? 'b' : 'a'];
    segment[key] = circle.reduce((best, p) => Math.hypot(p.x - other.x, p.z - other.z) < Math.hypot(best.x - other.x, best.z - other.z) ? p : best);
  }
  for (let i = 0; i < circleCount; i++) segments.push({ a: circle[i]!, b: circle[(i + 1) % circleCount]!, cuts: [0, 1], road: { a: '', b: '', width: 12, name: 'Odeon Circle', corridor: 'odeon', roundabout: true, oneWay: true } });
  // A drawn at-grade crossing is also a graph junction, never a visual-only road overlap.
  for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
    const a = segments[i]!, b = segments[j]!, av = sub(a.b, a.a), bv = sub(b.b, b.a), denominator = cross(av, bv);
    if (Math.abs(denominator) < 1e-8) continue;
    const offset = sub(b.a, a.a), t = cross(offset, bv) / denominator, u = cross(offset, av) / denominator;
    if (t >= -1e-8 && t <= 1 + 1e-8 && u >= -1e-8 && u <= 1 + 1e-8) {
      a.cuts.push(Math.max(0, Math.min(1, t))); b.cuts.push(Math.max(0, Math.min(1, u)));
    }
  }
  const nodes: RoadNode[] = [], roads: Road[] = [], byPosition = new Map<string, RoadNode>();
  const getNode = (p: Point) => {
    const key = `${Math.round(p.x * 1e4)}:${Math.round(p.z * 1e4)}`;
    let n = byPosition.get(key);
    if (!n) { n = { ...p, id: `bkk:${nodes.length}` }; nodes.push(n); byPosition.set(key, n); }
    return n;
  };
  for (const s of segments) {
    const cuts = [...new Set(s.cuts.map(t => Math.round(t * 1e10) / 1e10))].sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      const a = mix(s.a, s.b, cuts[i - 1]!), b = mix(s.a, s.b, cuts[i]!);
      const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 28));
      let previous = getNode(a);
      for (let j = 1; j <= count; j++) {
        const next = getNode(mix(a, b, j / count));
        if (next.id !== previous.id) {
          const middle={x:(previous.x+next.x)/2,z:(previous.z+next.z)/2},half=Math.hypot(next.x-previous.x,next.z-previous.z)/2;
          const canalBridge=canals.some(c=>c.points.slice(1).some((b,i)=>distanceToSegment(middle,c.points[i]!,b).distance<c.width/2+half+3));
          roads.push({ ...s.road, bridge:s.road.bridge||canalBridge,a: previous.id, b: next.id });
        }
        previous = next;
      }
    }
  }
  const river = layout.river.centerline.map(toWorld), riverWidth = layout.river.design_width * SCALE;
  const regions = layout.districts.map(r => ({ id: r.id, name: r.name, color: r.color, polygon: r.polygon.map(toWorld) }));
  const landmarks: Landmark[] = layout.landmarks.map(l => ({ ...toWorld(l.position), id: l.id, name: l.name, kind: kinds[l.id]! }));
  const world: District = { worldId: 'bangkok', nodes, roads, river, riverWidth, canals, regions, landmarks, buildings: [], obstacles: [],
    bounds: { minX: -1980, maxX: 1980, minZ: -2380, maxZ: 2380 } };
  const byId = new Map(nodes.map(n => [n.id, n]));
  world.obstacles.push(
    { ...toWorld([805, 726]), w: 300, d: 520, height: .6, color: '#43886b', protected: true },
    { ...toWorld([904, 720]), w: 70, d: 265, height: .6, color: '#43886b', protected: true },
  );
  const bank = (p: Point) => {
    const closest = river.slice(1).map((b, i) => distanceToSegment(p, river[i]!, b)).sort((a, b) => a.distance - b.distance)[0]!;
    return Math.sign(p.x - closest.point.x);
  };
  for (const l of landmarks) {
    l.accessNode = nodes.reduce((best, n) => Math.hypot(n.x - l.x, n.z - l.z) < Math.hypot(best.x - l.x, best.z - l.z) ? n : best).id;
    if (l.kind === 'park') { l.size = 50; continue; }
    const size = l.id==='paknam' ? 90 : l.kind === 'palace' ? 135 : l.kind === 'tower' ? 40 : l.kind === 'mall' ? 65 : l.kind === 'station' ? 70 : l.kind === 'temple' ? 50 : l.kind === 'gate' ? 28 : l.kind === 'wheel' ? 45 : 30;
    const radius = size * Math.SQRT2 / 2;
    let plot: Point | undefined;
    // Site pins/roadside approaches are not building centers. Fit a meaningful
    // parcel nearby rather than shrinking a landmark into a pole on the road.
    const authored=EXISTING_SITE_ANCHORS[l.id!];
    if(authored){
      plot={...EXISTING_SITE_WORLD_ANCHORS[l.id!]!};
      world.obstacles.push({...plot,w:size,d:size,height:l.kind==='tower'?156:18,color:'#dfbd83',landmarkId:l.id});
    }else {
    for (const distance of [0, 30, 50, 75, 100, 140, 180]) {
      for (let direction = 0; direction < 16; direction++) {
        const angle = direction * Math.PI * 2 / 16;
        const candidate = { x: l.x + Math.cos(angle) * distance, z: l.z + Math.sin(angle) * distance };
        if (world.canals?.some(c=>c.points.slice(1).some((b,i)=>distanceToSegment(candidate,c.points[i]!,b).distance<c.width/2+radius+3))) continue;
        if (bank(candidate) !== bank(l) || riverDistance(world, candidate) < riverWidth / 2 + radius + 3) continue;
        if (candidate.x < world.bounds!.minX + radius || candidate.x > world.bounds!.maxX - radius || candidate.z < world.bounds!.minZ + radius || candidate.z > world.bounds!.maxZ - radius) continue;
        if (roads.some(r => distanceToSegment(candidate, byId.get(r.a)!, byId.get(r.b)!).distance < r.width / 2 + radius + (l.kind === 'gate' ? 1.5 : 3))) continue;
        const footprint: Obstacle = { ...candidate, w: size, d: size, height: l.id==='paknam'?80:l.kind === 'tower' ? 150 : l.kind === 'palace' ? 28 : 18, color: '#dfbd83', landmarkId: l.id };
        if (world.obstacles.some(o => orientedFootprintsOverlap(o, footprint, 3))) continue;
        plot = candidate; world.obstacles.push(footprint); break;
      }
      if (plot) break;
      if (l.kind === 'gate') break; // Gate stays on its protected circle island.
    }
    }
    if (!plot) throw new Error(`No safe landmark parcel: ${l.id}`);
    l.size = size; l.plot = plot;
    if(l.id==='paknam'){const a=byId.get(l.accessNode!)!;l.yaw=Math.atan2(a.x-plot.x,a.z-plot.z);world.obstacles.find(o=>o.landmarkId===l.id)!.yaw=l.yaw;}
  }
  connectDestinations(world);
  const paknamArrival=world.destinations!.find(a=>a.id==='paknam')!,paknamLandmark=landmarks.find(l=>l.id==='paknam')!;
  paknamLandmark.yaw=Math.atan2(paknamArrival.origin.x-paknamLandmark.plot!.x,paknamArrival.origin.z-paknamLandmark.plot!.z);
  world.obstacles.find(o=>o.landmarkId==='paknam')!.yaw=paknamLandmark.yaw;
  placeRealArchitecture(world);
  registerExistingSites(world);
  world.transit=createRailNetwork(world);
  // Access roads were appended after public graph sampling.
  for(const n of nodes)byId.set(n.id,n);
  // Streets are assembled as nearly attached commercial rows, not isolated
  // blocks every 54 metres. All facade masses remain in the real collision map.
  // Each +Z facade faces its road; the old tangent yaw placed windows sideways.
  let index = 0;
  for (const s of segments.filter(s => !s.road.shortcut && !s.road.bridge)) {
    const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
    for (let t = 14; t < len - 11; t += 26) for (const side of [-1, 1]) {
      const frontage = s.road.width / 2 + 18;
      const p = { x: s.a.x + ux * t + uz * frontage * side, z: s.a.z + uz * t - ux * frontage * side };
      if (p.x < world.bounds!.minX + 18 || p.x > world.bounds!.maxX - 18 ||
          p.z < world.bounds!.minZ + 18 || p.z > world.bounds!.maxZ - 18) continue;
      const region = regionAt(world, p);
      const modern = ['siam', 'silom', 'sukhumvit', 'icon'].includes(region?.id ?? '');
      const building: Obstacle = {
        ...p, w: 22, d: 22,
        height: modern ? 26 + index % 7 * 6 : 11 + index % 4 * 3.6,
        // The frontage normal points *toward* its road (local +Z).
        yaw: Math.atan2(-uz * side, ux * side),
        color: region?.color ?? '#b5ad9c', regionId: region?.id,
      };
      index++;
      if(inDestinationGrounds(world,building))continue;
      if (riverDistance(world, p) < riverWidth / 2 + 18 || world.canals?.some(c=>c.points.slice(1).some((b,i)=>distanceToSegment(p,c.points[i]!,b).distance<c.width/2+18))) continue;
      // The nearest possible rotated corner is ~15.6m from the center.
      // Leave at least 2m beyond the asphalt edge, including intersections.
      if (roads.some(r => distanceToSegment(p, byId.get(r.a)!, byId.get(r.b)!).distance < r.width / 2 + 16)) continue;
      if (world.obstacles.some(o => orientedFootprintsOverlap(o, building, 1.3))) continue;
      world.buildings.push(building); world.obstacles.push(building);
    }
  }
  // A small second row closes vistas behind roadside frontage. These are REAL
  // solid parcels, screened by the same road, river, park and landmark rules.
  // No fake roads, no skyline props floating outside the physical city.
  const frontages = [...world.buildings];
  for (const [i, b] of frontages.entries()) {
    if (i % 3 !== 0) continue;
    const yaw = b.yaw ?? 0;
    const p = { x: b.x - Math.sin(yaw) * 29, z: b.z - Math.cos(yaw) * 29 };
    const infill: Obstacle = { ...b, ...p, w: 21, d: 19, height: b.height * .75, artRole: 'background' };
    if(inDestinationGrounds(world,infill))continue;
    if (p.x < world.bounds!.minX+20 || p.x > world.bounds!.maxX-20 || p.z < world.bounds!.minZ+20 || p.z > world.bounds!.maxZ-20) continue;
    if (riverDistance(world,p) < riverWidth/2+18 || world.canals?.some(c=>c.points.slice(1).some((b,i)=>distanceToSegment(p,c.points[i]!,b).distance<c.width/2+18))) continue;
    if (roads.some(r=>distanceToSegment(p,byId.get(r.a)!,byId.get(r.b)!).distance<r.width/2+17)) continue;
    if (world.obstacles.some(o=>orientedFootprintsOverlap(o,infill,1.3))) continue;
    world.buildings.push(infill); world.obstacles.push(infill);
  }
  // Mall approach planters are solid furniture, validated independently of
  // the original mall plot. The broad road/river contract remains unchanged.
  for(const l of landmarks.filter(l=>l.kind==='mall'))for(const side of [-1,1])for(const end of [-1,1]){
    const site=l.plot!, p={x:site.x+side*24,z:site.z+end*(l.size!/2+5.5)};
    const o:Obstacle={...p,w:1.5,d:1.5,height:1,color:'#81967b',artRole:'furniture',landmarkId:l.id};
    if(riverDistance(world,p)<riverWidth/2+2)continue;
    if(roads.some(r=>distanceToSegment(p,byId.get(r.a)!,byId.get(r.b)!).distance<r.width/2+3))continue;
    if(world.obstacles.some(other=>orientedFootprintsOverlap(o,other,.5)))continue;
    world.obstacles.push(o);
  }
  const spawnRoad = roads.find(r => r.corridor === 'yaowarat')!;
  const spawn = byId.get(spawnRoad.a)!, next = byId.get(spawnRoad.b)!;
  const heading=Math.atan2(next.x-spawn.x,next.z-spawn.z);
  world.spawn = { x:spawn.x+Math.sin(heading)*5+Math.cos(heading)*3, z:spawn.z+Math.cos(heading)*5-Math.sin(heading)*3, heading };
  const approaches=landmarks.filter(l=>!world.destinations?.some(a=>a.landmarkId===l.id)&&['arun','pho','icon','paragon','paknam'].includes(l.id!)).map(l=>{const a=byId.get(l.accessNode!)!,p=l.plot!,length=Math.hypot(p.x-a.x,p.z-a.z);return {x:(p.x+a.x)/2,z:(p.z+a.z)/2,w:24,d:Math.max(0,length-l.size!*.45),yaw:Math.atan2(p.x-a.x,p.z-a.z),height:1,color:'#aaa'};});
  const hidden=new Set(world.buildings.filter(b=>approaches.some(a=>a.d>1&&orientedFootprintsOverlap(a,b))));
  world.buildings=world.buildings.filter(b=>!hidden.has(b));world.obstacles=world.obstacles.filter(b=>!hidden.has(b));
  scalaParcel(world).height=36;
  (world as District & {completeness?:unknown}).completeness=completeUrbanFabric(world);
  reserveRailCorridors(world);
  detailDestinationCollisions(world);
  registerExistingSites(world);
  completeStreetFabric(world);
  world.obstacles.push(...bridgeBarriers(world));planEnvironment(world);planLandscape(world);
  return world;
}

// Shared with the navigation HUD; disconnected targets return no fabricated route.
export { navigationPath as routeFromPoint } from '../navigation';
