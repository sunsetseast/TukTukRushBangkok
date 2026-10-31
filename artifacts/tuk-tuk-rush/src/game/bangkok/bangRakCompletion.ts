import type { District, Obstacle, Road, RoadNode } from "../types";
import migration from "./bangRakCompletionMigration.v1.json";
import plan from "./bangRakCompletionPlan.v1.json";
import { planChinatownBlocks } from "./chinatownBlocks";
import { bangRakState } from "./bangRakPlan";
import { fitCorridorFrontages } from "./streetFabric";
import { addBangRakDestinations } from "./bangRakDestinations";
import { orientedFootprintsOverlap } from "../world";

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
  changedProceduralRetired: string[];
  changedProceduralKept: string[];
  unlistedProceduralRetired: string[];
};

/**
 * These are placement candidates, not survey-authorized buildings. Their IDs
 * are derived from mutable seeds/cells and do not guarantee identical geometry
 * when an earlier road, property or clearance reservation changes.
 *
 * All authored, protected, landmark and Chinatown parcels still require the
 * versioned manifest's exact physical identity.
 */
const isMutableProcedural = (o: Obstacle) =>
  !!o.environmentId &&
  (o.environmentId.startsWith("infill:") ||
    o.environmentId.startsWith("urban-block:")) &&
  !o.protected && !o.landmarkId && !o.chinatown;

/** Physical road+sidewalk volumes from the already-approved replacement graph.
 * A drifted procedural parcel is removed only if it actually obstructs one of
 * these envelopes; an unrelated moved parcel is retained, not deleted by ID. */
export function completionRoadEnvelopes(
  d: District,
  roads: readonly Road[],
): Obstacle[] {
  const nodes = new Map(d.nodes.map(n => [n.id, n]));
  for (const n of migration.nodes as RoadNode[]) nodes.set(n.id, n);
  const sidewalkClearance = 6.5;
  return roads.map(r => {
    const a = nodes.get(r.a), b = nodes.get(r.b);
    if (!a || !b) throw Error("Bang Rak migration road endpoint missing: " + r.a + " > " + r.b);
    return {
      x: (a.x + b.x) / 2,
      z: (a.z + b.z) / 2,
      w: r.width + sidewalkClearance * 2,
      d: Math.hypot(b.x - a.x, b.z - a.z) + sidewalkClearance * 2,
      yaw: Math.atan2(b.x - a.x, b.z - a.z),
      height: 0,
      color: "#fff",
    };
  });
}

const conflictsWithCompletionRoads = (
  o: Obstacle,
  envelopes: readonly Obstacle[],
) => envelopes.some(r => {
  // Cheap bounding-circle rejection before the oriented footprint test.
  if (Math.hypot(o.x - r.x, o.z - r.z) >
    (Math.hypot(o.w, o.d) + Math.hypot(r.w, r.d)) / 2) return false;
  return orientedFootprintsOverlap(o, r);
});

/**
 * Resolve an exact authored retirement ledger against a changing procedural
 * world. Optional parcels absent from this build are already gone. A parcel
 * whose ID now represents a different shape is retired ONLY when physically
 * overlapping an approved replacement road/sidewalk; otherwise it stays.
 * Also clear unlisted procedural lots occupying those same road envelopes.
 *
 * No road, river, protected parcel or landmark baseline is waived.
 */
export function resolveCompletionRetirements(
  obstacles: readonly Obstacle[],
  entries: readonly { body: Obstacle }[],
  roadEnvelopes: readonly Obstacle[] = [],
) {
  const byKey = new Map(obstacles.map(o => [completionBodyKey(o), o]));
  const byId = new Map<string, Obstacle[]>();
  for (const o of obstacles) {
    if (!o.environmentId) continue;
    const list = byId.get(o.environmentId) ?? [];
    list.push(o);
    byId.set(o.environmentId, list);
  }

  const retired = new Set<Obstacle>();
  const alreadyAbsentProcedural: string[] = [];
  const changedProceduralRetired: string[] = [];
  const changedProceduralKept: string[] = [];
  const unlistedProceduralRetired: string[] = [];
  for (const { body } of entries) {
    const exact = byKey.get(completionBodyKey(body));
    if (exact) {
      retired.add(exact);
      continue;
    }
    const id = body.environmentId;
    const changed = id ? byId.get(id) ?? [] : [];
    if (!isMutableProcedural(body) ||
        changed.some(o => !isMutableProcedural(o))) {
      throw Error(
        "Bang Rak parcel baseline changed: " + (id ?? completionBodyKey(body)),
      );
    }

    if (changed.length === 0) {
      alreadyAbsentProcedural.push(id!);
      continue;
    }
    for (const o of changed) {
      if (conflictsWithCompletionRoads(o, roadEnvelopes)) {
        retired.add(o);
        changedProceduralRetired.push(id!);
      } else {
        changedProceduralKept.push(id!);
      }
    }
  }

  // A shifted/candidate parcel may not exist in the old retirement ledger at
  // all. Sweep the bounded, approved replacement road envelopes so the actual
  // new driving surface remains clear across every affected district.
  for (const o of obstacles) {
    if (retired.has(o) || !isMutableProcedural(o)) continue;
    if (!conflictsWithCompletionRoads(o, roadEnvelopes)) continue;
    retired.add(o);
    unlistedProceduralRetired.push(o.environmentId!);
  }

  return {
    retired: [...retired], alreadyAbsentProcedural,
    changedProceduralRetired, changedProceduralKept,
    unlistedProceduralRetired,
  };
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
  const roadEnvelopes = completionRoadEnvelopes(d, migration.roads as Road[]);
  const {
    retired, alreadyAbsentProcedural, changedProceduralRetired,
    changedProceduralKept, unlistedProceduralRetired,
  } = resolveCompletionRetirements(
    d.obstacles,
    migration.retired.map(({ body }) => ({ body: body as Obstacle })),
    roadEnvelopes,
  );
  if (alreadyAbsentProcedural.length || changedProceduralRetired.length ||
      changedProceduralKept.length || unlistedProceduralRetired.length)
    console.warn("Bang Rak procedural parcel reconciliation", {
      alreadyAbsentProcedural, changedProceduralRetired,
      changedProceduralKept, unlistedProceduralRetired,
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
  const state: CompletionState = {
    roads, retired, parcels: frontage.parcels, rejected: frontage.rejected,
    alreadyAbsentProcedural, changedProceduralRetired,
    changedProceduralKept, unlistedProceduralRetired,
  };
  states.set(d, state);
  return state;
}
