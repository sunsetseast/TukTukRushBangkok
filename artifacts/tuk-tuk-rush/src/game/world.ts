import type { District, Point, Road, RoadNode, Obstacle } from './types';
import { YAOWARAT_TRACE, CHAROEN_TRACE, GATE_CENTER, TEMPLE_CENTER, STATION_CENTER, PALETTE, SIGN_NAMES } from './mapData';

export const WORLD_SIZE = 700;
export const nodeId = (col: number, row: number) => `${col}:${row}`;

export function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2)) : 0;
  const point = { x: a.x + t * dx, z: a.z + t * dz };
  return { point, distance: Math.hypot(p.x - point.x, p.z - point.z), t };
}

/** World-space point to an oriented obstacle's local axes (same yaw as Three.js). */
export function obstacleLocal(p: Point, b: Obstacle): Point {
  const c = Math.cos(b.yaw ?? 0), s = Math.sin(b.yaw ?? 0);
  const dx = p.x - b.x, dz = p.z - b.z;
  return { x: c * dx - s * dz, z: s * dx + c * dz };
}
export function obstacleDistance(p: Point, b: Obstacle) {
  const q = obstacleLocal(p, b);
  return Math.hypot(Math.max(0, Math.abs(q.x) - b.w / 2), Math.max(0, Math.abs(q.z) - b.d / 2));
}

export function createDistrict(): District {
  const nodes: RoadNode[] = [], roads: Road[] = [];
  const byId = new Map<string, RoadNode>();
  const node = (id: string, p: Point, name?: string) => {
    if (byId.has(id)) return byId.get(id)!;
    const n = { id, ...p, name }; nodes.push(n); byId.set(id, n); return n;
  };
  const edge = (a: string, b: string, width: number, name: string, oneWay = false, shortcut = false, roundabout = false) =>
    roads.push({ a, b, width, name, oneWay, shortcut, roundabout });
  const rb = { ...GATE_CENTER, radius: 34, laneWidth: 12 };
  for (let i = 0; i < 20; i++) {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / 20;
    node(`odeon:${i}`, { x: rb.x + Math.cos(angle) * rb.radius, z: rb.z + Math.sin(angle) * rb.radius }, 'Odeon Circle');
  }
  for (let i = 0; i < 20; i++) edge(`odeon:${i}`, `odeon:${(i + 1) % 20}`, 10, 'Odeon Circle', true, false, true);

  // Catmull-Rom sampled centreline: every system consumes these exact short edges.
  // Intersections are the named control nodes, not independently rendered curves.
  const trace = (prefix: string, points: Point[], width: number, name: string, oneWay: boolean) => {
    for (let i = 0; i < points.length; i++) node(`${prefix}:${i}`, points[i]!);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]!, p1 = points[i]!, p2 = points[i + 1]!, p3 = points[Math.min(points.length - 1, i + 2)]!;
      const count = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / 22));
      let prev = `${prefix}:${i}`;
      for (let j = 1; j <= count; j++) {
        const t = j / count;
        const f = (a: number, b: number, c: number, d: number) =>
          0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
        const id = j === count ? `${prefix}:${i + 1}` : `${prefix}:${i}.${j}`;
        node(id, { x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) });
        edge(prev, id, width, name, oneWay); prev = id;
      }
    }
  };
  trace('yaowarat', YAOWARAT_TRACE, 14, 'Yaowarat Road', true);
  trace('charoen', CHAROEN_TRACE, 15, 'Charoen Krung Road', true);
  edge('odeon:0', 'yaowarat:0', 14, 'Yaowarat Road', true);
  edge('charoen:8', 'odeon:3', 13, 'Charoen Krung Road', true);
  edge('yaowarat:6', 'charoen:3', 9.5, 'Plaeng Nam Road');
  edge('yaowarat:3', 'charoen:5', 11, 'Song Sawat Road');
  edge('yaowarat:8', 'charoen:1', 10.5, 'Mangkon Road');
  // Connected fictional service streets provide a return route without traffic jams.
  node('west-market', { x: -285, z: -175 }, 'Dragon Alley market');
  edge('yaowarat:10', 'west-market', 8.5, 'Dragon Alley', false, true);
  edge('west-market', 'charoen:0', 9, 'Lantern Cut', false, true);
  node('south-market', { x: -45, z: 244 });
  edge('yaowarat:3', 'south-market', 8.5, 'Spice Market', false, true);
  edge('south-market', 'odeon:14', 9, 'Market Loop', false, true);
  node('temple-stop', { x: 155, z: 121 }, 'Wat Traimit');
  node('station-stop', { x: 260, z: -26 }, 'Hua Lamphong station');
  node('tri-mit-bend', { x: 211, z: 90 });
  node('tri-mit-south', { x: 218, z: 229 });
  node('station-west', { x: 205, z: -26 });
  edge('odeon:7', 'tri-mit-south', 12, 'Tri Mit Road');
  edge('tri-mit-south', 'tri-mit-bend', 11, 'Tri Mit Road');
  edge('tri-mit-bend', 'temple-stop', 10, 'Temple Approach');
  edge('tri-mit-bend', 'station-west', 12, 'Station Approach');
  edge('station-west', 'station-stop', 12, 'Station Approach');
  edge('station-stop', 'charoen:5', 10, 'Station Service Road', false, true);

  const landmarks: District['landmarks'] = [
    { kind: 'gate', name: 'Chinatown Gate / Odeon Circle', ...GATE_CENTER },
    { kind: 'temple', name: 'Wat Traimit', ...TEMPLE_CENTER },
    { kind: 'station', name: 'Hua Lamphong', ...STATION_CENTER },
  ];
  const district: District = { nodes, roads, landmarks, roundabout: rb, buildings: [], obstacles: [] };
  district.obstacles.push(
    { ...TEMPLE_CENTER, w: 42, d: 44, height: 22, color: '#edc878' },
    { ...STATION_CENTER, w: 85, d: 48, height: 18, color: '#d9bc8e' },
    // A solid landscaped island, not a drive-through straight-street archway.
    { ...GATE_CENTER, w: 42, d: 38, height: 1, color: '#95aa77' },
  );
  const segments = roads.map(r => ({ r, a: byId.get(r.a)!, b: byId.get(r.b)! }));
  const clear = (b: Obstacle) => {
    if (Math.abs(b.x) + Math.hypot(b.w, b.d) / 2 > 335 || Math.abs(b.z) + Math.hypot(b.w, b.d) / 2 > 335) return false;
    if (landmarks.some(l => Math.hypot(l.x - b.x, l.z - b.z) < (l.kind === 'gate' ? 60 : l.kind === 'station' ? 67 : 45))) return false;
    // Rotated footprint projection against every road corridor, not just its closest road.
    for (const { r, a, b: end } of segments) {
      const q = distanceToSegment(b, a, end), theta = Math.atan2(end.x - a.x, end.z - a.z);
      const support = Math.abs(Math.cos((b.yaw ?? 0) - theta)) * b.w / 2 + Math.abs(Math.sin((b.yaw ?? 0) - theta)) * b.d / 2;
      if (q.distance < r.width / 2 + support + 5.2) return false;
    }
    return district.buildings.every(o => Math.hypot(o.x - b.x, o.z - b.z) > Math.hypot(o.w, o.d) / 2 + Math.hypot(b.w, b.d) / 2 - 2);
  };
  // Road-facing handcrafted module placements follow the SAME curve as traffic.
  // One building per ~20m on each side; distinct business classes and silhouettes.
  let index = 0;
  for (const { r, a, b: end } of segments) {
    if (r.roundabout || r.shortcut) continue;
    const len = Math.hypot(end.x - a.x, end.z - a.z), ux = (end.x - a.x) / len, uz = (end.z - a.z) / len;
    for (let t = 10; t < len - 1; t += 21) for (const side of [-1, 1]) {
      const showcase = r.name === 'Yaowarat Road', depth = showcase ? 13 : 15;
      const off = r.width / 2 + depth / 2 + 5.8;
      const x = a.x + ux * t + uz * off * side, z = a.z + uz * t - ux * off * side;
      const yaw = Math.atan2(-uz * side, ux * side);
      // District-specific business mix, not identical shops on every road.
      const styles: NonNullable<Obstacle['style']>[] = showcase
        ? ['gold', 'noodle', 'gold', 'heritage', 'noodle', 'gold', 'hotel']
        : r.name === 'Charoen Krung Road'
          ? ['heritage', 'pharmacy', 'hotel', 'heritage', 'noodle']
          : r.name.includes('Tri Mit') || r.name.includes('Temple')
            ? ['heritage', 'noodle', 'pharmacy', 'heritage']
            : ['heritage', 'hotel', 'pharmacy', 'noodle'];
      const variant = (index + Math.floor(t / 13) + (side < 0 ? 2 : 0)) % styles.length;
      const b: Obstacle = { x, z, w: 13, d: depth, height: 12 + ((index + Math.floor(t / 10)) % 4) * 3.4,
        color: PALETTE[(index + Math.floor(t / 10)) % PALETTE.length]!, yaw, style: styles[variant]!, showcase,
        sign: undefined };
      const text = { gold: 'ร้านทอง', noodle: 'ก๋วยเตี๋ยว', pharmacy: 'ร้านขายยา', hotel: 'โรงแรม', heritage: 'เยาวราช' };
      b.sign = text[b.style!];
      if (clear(b)) { district.buildings.push(b); district.obstacles.push(b); index++; }
    }
  }
  // One curated factual business reference, not a random repeating logo on every shop.
  const reference = byId.get('yaowarat:6')!;
  const goldShops = district.buildings.filter(b => b.showcase && b.style === 'gold')
    .sort((a, b) => Math.hypot(a.x - reference.x, a.z - reference.z) - Math.hypot(b.x - reference.x, b.z - reference.z));
  if (goldShops[0]) goldShops[0].sign = SIGN_NAMES[0];
  // Thong Bai Goldshop is a documented Yaowarat business. This uses original
  // stylized artwork, not an unlicensed reproduction of its commercial logo.
  if (goldShops[1]) goldShops[1].sign = 'ทองใบเยาวราช';
  const heritage = district.buildings.find(b => b.showcase && b.style === 'heritage');
  if (heritage) heritage.sign = '耀華力路';
  return district;
}

export function nearestRoad(district: District, p: Point) {
  let result = { point: { x: 0, z: 0 }, heading: 0, distance: Infinity };
  const nodes = new Map(district.nodes.map(n => [n.id, n]));
  for (const road of district.roads) {
    const a = nodes.get(road.a)!, b = nodes.get(road.b)!;
    const candidate = distanceToSegment(p, a, b);
    if (candidate.distance < result.distance) result = { ...candidate, heading: Math.atan2(b.x - a.x, b.z - a.z) };
  }
  return result;
}

/** Player routing permits wrong-way arcade driving; AI honors Road.oneWay. */
export function routeBetween(district: District, start: string, end: string): RoadNode[] {
  const queue = [start], previous = new Map<string, string | null>([[start, null]]);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!;
    if (id === end) break;
    for (const road of district.roads) {
      const next = road.a === id ? road.b : road.b === id ? road.a : null;
      if (next && !previous.has(next)) { previous.set(next, id); queue.push(next); }
    }
  }
  if (!previous.has(end)) return [];
  const ids: string[] = []; let current: string | null = end;
  while (current) { ids.unshift(current); current = previous.get(current) ?? null; }
  return ids.map(id => district.nodes.find(n => n.id === id)!);
}
