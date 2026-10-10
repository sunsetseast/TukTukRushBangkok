import type { District, Mission, RoadNode } from './types';
import { routeBetween } from './world';

export function createMissions(district: District): Mission[] {
  const curb = (id: string, name: string): RoadNode => {
    const node = district.nodes.find(n => n.id === id)!;
    return { ...node, z: node.z + 9, name };
  };
  const missions: Mission[] = [
    { pickup: curb('1:3', 'Yaowarat night market'), destination: curb('4:3', 'Chinatown Gate'), passenger: 'Mali · flower seller', limit: 55 },
    { pickup: curb('4:2', 'Wat Traimit'), destination: curb('4:0', 'Hua Lamphong station'), passenger: 'Nok · evening commuter', limit: 50 },
    { pickup: curb('3:0', 'Station noodle shop'), destination: curb('2:3', 'Yaowarat food stalls'), passenger: 'Arun · hungry explorer', limit: 65 },
    { pickup: curb('2:4', 'Dragon Alley market'), destination: curb('1:2', 'Charoen Krung Road'), passenger: 'Dao · market chef', limit: 55 },
  ];
  // Fail explicitly if a future map edit makes a delivery unreachable.
  for (const mission of missions) {
    if (!routeBetween(district, mission.pickup.id, mission.destination.id).length) throw new Error('Unreachable mission destination');
  }
  return missions;
}
