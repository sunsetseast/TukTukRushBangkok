import type { District, Obstacle, Road, RoadNode } from "../types";
import migration from "./bangRakCompletionMigration.v1.json";
import plan from "./bangRakCompletionPlan.v1.json";
import { planChinatownBlocks } from "./chinatownBlocks";
import { bangRakState } from "./bangRakPlan";
import { fitCorridorFrontages } from "./streetFabric";
import { addBangRakDestinations } from "./bangRakDestinations";

export const BANG_RAK_COMPLETION = plan;
export const completionBodyKey = (o: Obstacle) => JSON.stringify([
  o.environmentId ?? "", o.landmarkId ?? "", ...[o.x, o.z, o.w, o.d, o.height, o.yaw ?? 0].map(v=>Math.round(v*1e4)),
]);
export const completionRoadKey = (r: Road) => JSON.stringify([r.a, r.b, r.width, r.corridor, !!r.oneWay]);
export type CompletionState = { roads: Road[]; retired: Obstacle[]; parcels: Obstacle[]; rejected: number };
const states = new WeakMap<District, CompletionState>();
export const bangRakCompletionState = (d: District) => states.get(d);

/** Apply a versioned, exact physical migration after the two preserved historic
 * plans. Ordinary bodies are retired only by manifest identity, never a box. */
export function completeBangRak(d: District) {
  if (states.has(d)) return states.get(d)!;
  if (migration.blocked.length) throw Error("Unresolved protected Bang Rak migration conflicts");
  const removedRoads = new Set([...migration.retiredRoads, ...migration.splitRoads].map(completionRoadKey));
  for (const key of removedRoads)
    if (!d.roads.some(r => completionRoadKey(r) === key)) throw Error("Bang Rak road baseline changed: " + key);
  const old = new Map(d.obstacles.map(o => [completionBodyKey(o), o]));
  const retired = migration.retired.map(({body}) => {
    const o = old.get(completionBodyKey(body as Obstacle));
    if (!o) throw Error("Bang Rak parcel baseline changed: " + body.environmentId);
    return o;
  });
  const removed = new Set(retired);
  d.roads = d.roads.filter(r => !removedRoads.has(completionRoadKey(r)));
  const retiredNodes = new Set(migration.retiredNodes.map(n=>n.id));
  d.nodes = d.nodes.filter(n=>!retiredNodes.has(n.id));
  d.nodes.push(...migration.nodes as RoadNode[]);
  const roads = migration.roads as Road[];
  d.roads.push(...roads);
  for(const change of migration.approaches) {
    const landmark=d.landmarks.find(l=>l.id===change.landmark);
    if(!landmark || landmark.accessNode!==change.previousNode)throw Error("Bang Rak arrival baseline changed: "+change.landmark);
    landmark.accessNode=change.nextNode;
  }
  d.buildings = d.buildings.filter(o => !removed.has(o));
  d.obstacles = d.obstacles.filter(o => !removed.has(o));
  // Keep all cached ownership lists in agreement with the physical world.
  for (const block of planChinatownBlocks(d)) {
    block.parcels = block.parcels.filter(o => !removed.has(o));
    block.courts = block.courts.filter(c => !retired.some(o => c.owner === o.environmentId));
  }
  const core = bangRakState(d);
  if (core) core.parcels = core.parcels.filter(p => !removed.has(p.body));
  addBangRakDestinations(d);
  const frontage = fitCorridorFrontages(d, plan.streets);
  const state = { roads, retired, parcels: frontage.parcels, rejected: frontage.rejected };
  states.set(d, state);
  return state;
}
