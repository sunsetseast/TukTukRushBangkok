import type { District, Point } from '../types';
import { distanceToSegment } from '../world';
import { regionAt } from './world';
const KEY = 'tuktuk:bangkok-discovery:v1';
export type Discovery = { regions: string[]; landmarks: string[]; shortcuts: string[] };
type Store = Pick<Storage, 'getItem' | 'setItem'>;
export function readDiscovery(storage?: Store): Discovery {
  try {
    const value = JSON.parse(storage?.getItem(KEY) ?? '{}');
    const ids = (key: string) => Array.isArray(value?.[key]) ? value[key].filter((id: unknown): id is string => typeof id === 'string') : [];
    return { regions: ids('regions'), landmarks: ids('landmarks'), shortcuts: ids('shortcuts') };
  } catch { return { regions: [], landmarks: [], shortcuts: [] }; }
}
export function discover(d: District, p: Point, state: Discovery, storage?: Store) {
  let changed = false;
  const add = (list: string[], id: string) => { if (!list.includes(id)) { list.push(id); changed = true; } };
  const region = regionAt(d, p), newRegion = !!region && !state.regions.includes(region.id);
  if (region) add(state.regions, region.id);
  for (const l of d.landmarks) {
    const approach = d.nodes.find(n => n.id === l.accessNode);
    const access=d.destinations?.find(a=>a.landmarkId===l.id);
    const reached=access?approach&&Math.hypot(approach.x-p.x,approach.z-p.z)<access.arrivalRadius:
      Math.hypot(l.x-p.x,l.z-p.z)<Math.max(110,(l.size??0)+60)||approach&&Math.hypot(approach.x-p.x,approach.z-p.z)<40;
    if(l.id&&reached)add(state.landmarks,l.id);
  }
  const nodes = new Map(d.nodes.map(n => [n.id, n]));
  for (const r of d.roads.filter(r => r.shortcut)) if (distanceToSegment(p, nodes.get(r.a)!, nodes.get(r.b)!).distance < r.width / 2 + 2) add(state.shortcuts, r.corridor!);
  if (changed) try { storage?.setItem(KEY, JSON.stringify(state)); } catch { /* Browser storage is optional. */ }
  return { changed, region, newRegion };
}
