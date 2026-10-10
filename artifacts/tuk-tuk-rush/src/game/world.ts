import type { District, Point, Road, RoadNode } from './types';

// A stylized district, not a survey or a navigation map. North is -Z.
const xs = [-320, -210, -90, 40, 170, 300];
const zs = [-300, -180, -80, 40, 160, 280];
const palette = ['#ee9a73', '#4ea8a0', '#f1c96b', '#da7997', '#89a774', '#d49a61', '#b7b2cb'];
export const nodeId = (col: number, row: number) => `${col}:${row}`;
export const WORLD_SIZE = 700;

export function createDistrict(): District {
  const nodes: RoadNode[] = [];
  const roads: Road[] = [];
  for (let row = 0; row < zs.length; row++) {
    for (let col = 0; col < xs.length; col++) {
      nodes.push({ id: nodeId(col, row), x: xs[col]!, z: zs[row]! });
      if (col > 0) roads.push({
        a: nodeId(col - 1, row), b: nodeId(col, row),
        width: row === 3 ? 32 : row === 2 ? 28 : row === 0 || row === 5 ? 22 : 18,
        name: row === 3 ? 'Yaowarat Road' : row === 2 ? 'Charoen Krung Road' : row === 0 ? 'Station Road' : row === 4 ? 'Soi Lantern' : 'Market Lane',
      });
      if (row > 0) roads.push({
        a: nodeId(col, row - 1), b: nodeId(col, row),
        width: col === 4 ? 26 : col === 0 || col === 5 ? 22 : 18,
        name: col === 4 ? 'Tri Mit Road' : col === 2 ? 'Soi Wanit' : 'Chinatown Lane',
      });
    }
  }
  // Fictional shortcuts cross otherwise rectangular blocks. Buildings avoid them.
  roads.push(
    { a: '1:3', b: '2:4', width: 11, name: 'Dragon Alley', shortcut: true },
    { a: '3:1', b: '4:2', width: 11, name: 'Lantern Cut', shortcut: true },
    { a: '2:2', b: '3:3', width: 11, name: 'Spice Market', shortcut: true },
  );
  const landmarks: District['landmarks'] = [
    { kind: 'gate', name: 'Chinatown Gate / Odeon', x: 225, z: 100 },
    { kind: 'temple', name: 'Wat Traimit', x: 100, z: -20 },
    { kind: 'station', name: 'Hua Lamphong', x: 230, z: -240 },
  ];
  const district: District = { nodes, roads, buildings: [], obstacles: [], landmarks };
  // Shophouse footprints are generated once, never randomly in the render loop.
  let seed = 812;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let row = 0; row < zs.length - 1; row++) {
    for (let col = 0; col < xs.length - 1; col++) {
      const x0 = xs[col]! + 25, x1 = xs[col + 1]! - 25;
      const z0 = zs[row]! + 25, z1 = zs[row + 1]! - 25;
      for (let x = x0 + 7; x <= x1 - 5; x += 16) {
        for (let z = z0 + 7; z <= z1 - 5; z += 19) {
          if (x > x0 + 19 && x < x1 - 19 && z > z0 + 20 && z < z1 - 20) continue;
          if (landmarks.some(l => Math.abs(l.x - x) < (l.kind === 'station' ? 52 : 38) && Math.abs(l.z - z) < 40)) continue;
          if (roads.some(r => {
            const a = nodes.find(n => n.id === r.a)!;
            const b = nodes.find(n => n.id === r.b)!;
            return distanceToSegment({ x, z }, a, b).distance < r.width / 2 + 11;
          })) continue;
          const building = { x, z, w: 13, d: 16, height: 10 + Math.floor(random() * 5) * 4, color: palette[Math.floor(random() * palette.length)]! };
          district.buildings.push(building);
          district.obstacles.push(building);
        }
      }
    }
  }
  // Landmark collision footprints, with clear road approaches around each.
  district.obstacles.push(
    { x: 100, z: -20, w: 42, d: 44, height: 22, color: '#edc878' },
    { x: 230, z: -240, w: 85, d: 48, height: 18, color: '#d9bc8e' },
    { x: 206, z: 100, w: 5, d: 7, height: 15, color: '#b63737' },
    { x: 244, z: 100, w: 5, d: 7, height: 15, color: '#b63737' },
  );
  return district;
}

export function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  const point = { x: a.x + t * dx, z: a.z + t * dz };
  return { point, distance: Math.hypot(p.x - point.x, p.z - point.z), t };
}

export function nearestRoad(district: District, p: Point) {
  let result = { point: { x: -270, z: 40 }, heading: Math.PI / 2, distance: Infinity };
  for (const road of district.roads) {
    const a = district.nodes.find(n => n.id === road.a)!;
    const b = district.nodes.find(n => n.id === road.b)!;
    const candidate = distanceToSegment(p, a, b);
    if (candidate.distance < result.distance) result = { ...candidate, heading: Math.atan2(b.x - a.x, b.z - a.z) };
  }
  return result;
}

export function routeBetween(district: District, start: string, end: string): RoadNode[] {
  const queue = [start], previous = new Map<string, string | null>([[start, null]]);
  while (queue.length) {
    const id = queue.shift()!;
    if (id === end) break;
    for (const road of district.roads) {
      const next = road.a === id ? road.b : road.b === id ? road.a : null;
      if (next && !previous.has(next)) { previous.set(next, id); queue.push(next); }
    }
  }
  if (!previous.has(end)) return [];
  const ids: string[] = [];
  let current: string | null = end;
  while (current) { ids.unshift(current); current = previous.get(current) ?? null; }
  return ids.map(id => district.nodes.find(n => n.id === id)!);
}
