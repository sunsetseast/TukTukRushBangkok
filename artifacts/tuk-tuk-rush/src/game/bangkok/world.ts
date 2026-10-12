import layout from './layout.json';
import type { District, Landmark, Obstacle, Point, Road, RoadNode } from '../types';
import { distanceToSegment, orientedFootprintsOverlap, routeBetween } from '../world';

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
const bridgeCache = new WeakMap<District, { a: Point; b: Point; width: number }[]>();
/** Render and physics use the same buffered river. Only actual bridge lanes cross water. */
export function blockedByRiver(d: District, p: Point, radius = 1.5) {
  if (!d.river || riverDistance(d, p) >= d.riverWidth! / 2 + radius) return false;
  let bridges = bridgeCache.get(d);
  if (!bridges) {
    const nodes = new Map(d.nodes.map(n => [n.id, n]));
    bridges = d.roads.filter(r => r.bridge).map(r => ({ a: nodes.get(r.a)!, b: nodes.get(r.b)!, width: r.width }));
    bridgeCache.set(d, bridges);
  }
  return !bridges.some(r => distanceToSegment(p, r.a, r.b).distance <= r.width / 2 - radius);
}
const kinds: Record<string, Landmark['kind']> = {
  chatuchak: 'market', victory: 'monument', khaosan: 'market', democracy: 'monument', sanam: 'park',
  palace: 'palace', pho: 'temple', arun: 'temple', golden: 'temple', swing: 'monument', flowers: 'market',
  mbk: 'mall', paragon: 'mall', central: 'mall', gate: 'gate', traimit: 'temple', hua: 'station',
  food: 'market', icon: 'mall', park: 'park', terminal: 'mall', benjakitti: 'park', mahanakhon: 'tower', asiatique: 'wheel',
};

export function createBangkokWorld(): District {
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
        if (next.id !== previous.id) roads.push({ ...s.road, a: previous.id, b: next.id });
        previous = next;
      }
    }
  }
  const river = layout.river.centerline.map(toWorld), riverWidth = layout.river.design_width * SCALE;
  const regions = layout.districts.map(r => ({ id: r.id, name: r.name, color: r.color, polygon: r.polygon.map(toWorld) }));
  const landmarks: Landmark[] = layout.landmarks.map(l => ({ ...toWorld(l.position), id: l.id, name: l.name, kind: kinds[l.id]! }));
  const world: District = { worldId: 'bangkok', nodes, roads, river, riverWidth, regions, landmarks, buildings: [], obstacles: [],
    bounds: { minX: -1980, maxX: 1980, minZ: -2380, maxZ: 2380 } };
  const byId = new Map(nodes.map(n => [n.id, n]));
  world.obstacles.push(
    { ...toWorld([805, 726]), w: 300, d: 520, height: .6, color: '#43886b', protected: true },
    { ...toWorld([904, 720]), w: 70, d: 265, height: .6, color: '#43886b', protected: true },
  );
  for (const l of landmarks) {
    const nearest = Math.min(...roads.map(r => distanceToSegment(l, byId.get(r.a)!, byId.get(r.b)!).distance));
    const size = l.kind === 'gate' ? 28 : Math.max(3, Math.min(l.kind === 'palace' ? 135 : l.kind === 'tower' ? 40 : 50, (nearest - 4) * 1.1));
    l.size = size;
    l.accessNode = nodes.reduce((best, n) => Math.hypot(n.x - l.x, n.z - l.z) < Math.hypot(best.x - l.x, best.z - l.z) ? n : best).id;
    if (l.kind !== 'park' && nearest > size * Math.SQRT2 / 2 + 3) world.obstacles.push({ ...l, w: size, d: size,
      height: l.kind === 'tower' ? 100 : l.kind === 'palace' ? 28 : 18, color: '#dfbd83', landmarkId: l.id });
  }
  let index = 0;
  for (const s of segments.filter(s => !s.road.shortcut && !s.road.bridge)) {
    const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
    for (let t = 40; t < len - 24; t += 54) for (const side of [-1, 1]) {
      const offset = s.road.width / 2 + 22;
      const p = { x: s.a.x + ux * t + uz * offset * side, z: s.a.z + uz * t - ux * offset * side };
      if (p.x < world.bounds!.minX || p.x > world.bounds!.maxX || p.z < world.bounds!.minZ || p.z > world.bounds!.maxZ) continue;
      const region = regionAt(world, p), tower = region?.id === 'silom' || region?.id === 'sukhumvit';
      const building: Obstacle = { ...p, w: 24, d: 27, height: tower ? 30 + index % 6 * 10 : 9 + index % 4 * 4,
        yaw: Math.atan2(ux, uz), color: region?.color ?? '#888f9d', regionId: region?.id };
      index++;
      if (riverDistance(world, p) < riverWidth / 2 + 24) continue;
      if (roads.some(r => distanceToSegment(p, byId.get(r.a)!, byId.get(r.b)!).distance < r.width / 2 + 21)) continue;
      if (world.obstacles.some(o => orientedFootprintsOverlap(o, building, 3))) continue;
      world.buildings.push(building); world.obstacles.push(building);
    }
  }
  const spawnRoad = roads.find(r => r.corridor === 'yaowarat')!;
  const spawn = byId.get(spawnRoad.a)!, next = byId.get(spawnRoad.b)!;
  world.spawn = { ...spawn, heading: Math.atan2(next.x - spawn.x, next.z - spawn.z) };
  return world;
}

export function routeFromPoint(d: District, p: Point, target: RoadNode): Point[] {
  const nodes = new Map(d.nodes.map(n => [n.id, n]));
  const road = d.roads.reduce((best, r) => distanceToSegment(p, nodes.get(r.a)!, nodes.get(r.b)!).distance <
    distanceToSegment(p, nodes.get(best.a)!, nodes.get(best.b)!).distance ? r : best);
  const projection = distanceToSegment(p, nodes.get(road.a)!, nodes.get(road.b)!).point;
  const length = (ps: Point[]) => ps.slice(1).reduce((sum, b, i) => sum + Math.hypot(b.x - ps[i]!.x, b.z - ps[i]!.z), 0);
  const choices = [road.a, road.b].map(id => [projection, ...routeBetween(d, id, target.id), target]);
  return [p, ...choices.sort((a, b) => length(a) - length(b))[0]!];
}
