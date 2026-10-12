import type { District, Mission, RoadNode } from './types';
import { routeBetween, obstacleDistance } from './world';

export function createMissions(district: District): Mission[] {
  if (district.worldId === 'bangkok') return createBangkokMissions(district);
  const curb = (id: string, name: string): RoadNode => {
    const node = district.nodes.find(n => n.id === id);
    if (!node) throw new Error(`Missing mission road node: ${id}`);
    const road = district.roads.find(r => r.a === id && !r.roundabout) ?? district.roads.find(r => r.b === id)!;
    const a = district.nodes.find(n => n.id === road.a)!, b = district.nodes.find(n => n.id === road.b)!;
    const heading = Math.atan2(b.x - a.x, b.z - a.z);
    const offset = Math.min(road.width / 2 - 2, 7);
    const p = { ...node, x: node.x - Math.cos(heading) * offset, z: node.z + Math.sin(heading) * offset, name };
    if (district.obstacles.some(o => obstacleDistance(p, o) < 2)) throw new Error(`Blocked passenger stop: ${name}`);
    return p;
  };
  const missions: Mission[] = [
    { pickup: curb('yaowarat:3', 'Yaowarat gold-shop quarter'), destination: curb('yaowarat:8', 'Mangkon / Chinatown food stalls'), passenger: 'Mali · flower seller', limit: 55 },
    { pickup: curb('temple-stop', 'Wat Traimit'), destination: curb('station-stop', 'Hua Lamphong station'), passenger: 'Nok · evening commuter', limit: 50 },
    { pickup: curb('station-stop', 'Station noodle shop'), destination: curb('odeon:0', 'Chinatown Gate / Odeon Circle'), passenger: 'Arun · hungry explorer', limit: 65 },
    { pickup: curb('west-market', 'Dragon Alley market'), destination: curb('charoen:3', 'Charoen Krung / Plaeng Nam'), passenger: 'Dao · market chef', limit: 55 },
  ];
  for (const mission of missions) {
    if (!routeBetween(district, mission.pickup.id, mission.destination.id).length) throw new Error('Unreachable mission destination');
  }
  return missions;
}

function createBangkokMissions(d: District): Mission[] {
  const stop = (id: string) => {
    const landmark = d.landmarks.find(l => l.id === id)!, n = d.nodes.find(n => n.id === landmark.accessNode)!;
    const road = d.roads.find(r => r.a === n.id || r.b === n.id)!, a = d.nodes.find(n => n.id === road.a)!, b = d.nodes.find(n => n.id === road.b)!;
    const heading = Math.atan2(b.x - a.x, b.z - a.z), offset = Math.min(3, road.width / 2 - 2);
    let p = { ...n, x: n.x - Math.cos(heading) * offset, z: n.z + Math.sin(heading) * offset, name: `${landmark.name} · roadside stop` };
    if (d.obstacles.some(o => obstacleDistance(p, o) < 2)) p = { ...n, name: p.name };
    if (d.obstacles.some(o => obstacleDistance(p, o) < 2)) throw new Error(`Blocked Bangkok stop: ${id}`);
    return p;
  };
  const tour = ['gate', 'pho', 'arun', 'icon', 'asiatique', 'mahanakhon', 'park', 'terminal', 'paragon', 'chatuchak', 'gate'];
  return tour.slice(1).map((to, i) => {
    const pickup = stop(tour[i]!), destination = stop(to), route = routeBetween(d, pickup.id, destination.id);
    if (!route.length) throw new Error(`Unreachable Bangkok fare: ${to}`);
    const length = route.slice(1).reduce((sum, n, j) => sum + Math.hypot(n.x - route[j]!.x, n.z - route[j]!.z), 0);
    return { pickup, destination, passenger: ['Mali · local explorer', 'Nok · evening commuter', 'Dao · city visitor'][i % 3]!, limit: Math.ceil(length / 8 + 60) };
  });
}
