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
export type CompletionState = {
  roads: Road[];
  retired: Obstacle[];
  parcels: Obstacle[];
  rejected: number;
  alreadyAbsentProcedural: string[];
};

/**
 * An infill:rear parcel is generated opportunistically, after road, river and
 * protected-site clearance checks. A later approved exclusion can mean it was
 * never built, so there is nothing left for the retirement manifest to remove.
 *
 * Keep exact identity checks for every parcel that DOES exist. In particular,
 * never accept a same-ID geometry change, or a missing protected/authored lot.
 */
export function resolveCompletionRetirements(
  obstacles: readonly Obstacle[],
  entries: readonly { body: Obstacle }[],
) {
  const byKey = new Map(obstacles.map(o => [completionBodyKey(o), o]));
  const byId = new Map<string, Obstacle[]>();
  for (const o of obstacles) {
    if (!o.environmentId) continue;
    const list = byId.get(o.environmentId) ?? [];
    list.push(o);
    byId.set(o.environmentId, list);
  }

  const retired: Obstacle[] = [];
  const alreadyAbsentProcedural: string[] = [];
  for (const { body } of entries) {
    const exact = byKey.get(completionBodyKey(body));
    if (exact) {
      retired.push(exact);
      continue;
    }
    const id = body.environmentId;
    const changed = id ? byId.get(id) : undefined;
    if (changed?.length)
      throw Error(
        "Bang Rak parcel geometry changed: " + id +
        " (expected " + completionBodyKey(body) +
        "; found " + changed.map(completionBodyKey).join(", ") + ")",
      );

    // Only optional rear-row procedural infill may already be absent.
    // The ledger is not permission to ignore missing authored properties.
    if (id?.startsWith("infill:rear:") && !body.protected && !body.landmarkId) {
      alreadyAbsentProcedural.push(id);
      continue;
    }
    throw Error("Bang Rak parcel baseline changed: " + (id ?? completionBodyKey(body)));
  }
  return { retired, alreadyAbsentProcedural };
}
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
  const { retired, alreadyAbsentProcedural } = resolveCompletionRetirements(
    d.obstacles,
    migration.retired.map(({ body }) => ({ body: body as Obstacle })),
  );
  if (alreadyAbsentProcedural.length)
    console.warn(
      "Bang Rak migration: procedural rear parcels already absent",
      alreadyAbsentProcedural,
    );
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
  const state: CompletionState = {
    roads, retired, parcels: frontage.parcels, rejected: frontage.rejected,
    alreadyAbsentProcedural,
  };
  states.set(d, state);
  return state;
}
