import { REAL_PLACES } from './realPlaces';
import type { District, Obstacle, Point } from "../types";
import { type ParcelDesign } from "./buildingGrammar";
import { riverPiers } from "./riverfront";
import { regionAt } from "./world";
export type CityPlace = Point & {
  id: string;
  name: string;
  kind: "pier" | "hotel";
  region?: string;
  parcel?: Obstacle;
  note: string;
};
const cache = new WeakMap<District, CityPlace[]>();
/** Pins are backed by the same physical pier geometry or existing hotel parcel.
 * Real hotels share their physical landmark plots and stable save IDs. */
export function cityPlaces(d: District, designs?: ParcelDesign[]) {
  const prior = cache.get(d);
  if (prior) return prior;
  const result: CityPlace[] = riverPiers(d).map((p) => ({
    ...p,
    id: `pier:${p.id}`,
    kind: "pier",
    region: regionAt(d, p)?.id,
    note: "Covered river landing on the Chao Phraya. Approach from the public streets.",
  }));
  for (const p of REAL_PLACES.filter(p=>p.category==='hotel')) {
    const l=d.landmarks.find(l=>l.id===p.id);
    if (!l?.plot) continue;
    result.push({...l.plot,id:`hotel:${p.id}`,name:p.name,kind:'hotel',region:p.region,
      note:`${p.neighborhood}. ${p.features.join('. ')}. Passenger stop on the connected exterior approach; hotel interiors and gardens are pedestrian.`});
  }
  cache.set(d, result);
  return result;
}
