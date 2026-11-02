/** Audited, original-ID-preserving traffic-control alignment against our
 * immutable real-scale Bangkok source road graph.
 *
 * Newer OSM sign inventories are allowed ONLY if original OSM node IDs match
 * the already-imported map, and source coordinates remain within 2 metres.
 * Never infer a sign or traffic light from an untagged intersection.
 */
import type { GeographicDataset } from "./dataset";
import type { GeographicNetwork } from "./network";
import { geographicToMeters } from "./projection";
import { legalTrafficTraversal } from "./traffic";

export type SourceControlNode = {
  id: string;
  kind: "signal" | "stop" | "yield" | "sign";
  coordinate: [number, number];
  tags: Record<string, string>;
};
export type SourceRestriction = {
  id: string;
  from: string[];
  to: string[];
  via: Array<{ id: string; role: string }>;
  tags: Record<string, string>;
};
export type SourceControlSnapshot = {
  schema: 1;
  source: string;
  pbfSha256: string;
  baselinePbfSha256: string;
  matchesBaselineSnapshot: boolean;
  geographicSourceSha256: string;
  bbox: number[];
  nodes: SourceControlNode[];
  restrictions: SourceRestriction[];
};
export type RuntimeApproach = {
  edge: number;
  /** Green group for SIMULATED timing, not a measured Bangkok cycle. */
  phase: 0 | 1;
};
export type RuntimeTrafficSign = {
  id: string;
  kind: SourceControlNode["kind"];
  x: number;
  z: number;
  y: number;
  node?: number;
  approaches: RuntimeApproach[];
  /** false when the exact source position has no verified playable vertex. */
  mapped: boolean;
};
export type RuntimeTurnRestriction = {
  id: string;
  via: number;
  fromWay: number;
  toWay: number;
  type: "no" | "only";
};
export type RuntimeControlPack = {
  schema: 1;
  roadSourceSha256: string;
  controlSourceSha256: string | null;
  source: string;
  /** 'ready' means actual tags were imported, NOT confirmed signal timings. */
  status: "ready" | "not-imported";
  signs: RuntimeTrafficSign[];
  restrictions: RuntimeTurnRestriction[];
  stats: { taggedNodes: number; mappedSignals: number; mappedStops: number;
    mappedYields: number; unmatched: number; restrictions: number; unresolvedRestrictions: number; };
};

export function emptyControlPack(roadSourceSha256: string): RuntimeControlPack {
  return {
    schema: 1, roadSourceSha256, controlSourceSha256: null,
    source: "No approved OSM control inventory imported", status: "not-imported",
    signs: [], restrictions: [],
    stats: {taggedNodes:0,mappedSignals:0,mappedStops:0,mappedYields:0,
      unmatched:0,restrictions:0,unresolvedRestrictions:0},
  };
}
export function compileControlPack(
  source: SourceControlSnapshot,
  runtime: GeographicDataset,
  network: GeographicNetwork,
): RuntimeControlPack {
  if (source.schema !== 1 || source.geographicSourceSha256 !== network.metadata.sourceSha256 ||
      source.bbox.join(",") !== runtime.bbox.join(","))
    throw Error("Traffic-control inventory does not match Bangkok's pinned road geometry");
  const pack = emptyControlPack(network.metadata.sourceSha256);
  pack.status = "ready";
  pack.source = source.source;
  pack.controlSourceSha256 = source.pbfSha256;
  pack.stats.taggedNodes = source.nodes.length;
  const wayIndex = new Map(network.metadata.ways.map((w,i) => [w.id,i]));
  const vertexIndex = new Map<string, number[]>();
  const positionKey = (x:number,z:number) => `${Math.round(x*10)}:${Math.round(z*10)}`;
  for (let i=0; i<network.x.length;i++) {
    const key = positionKey(network.x[i]!,network.z[i]!);
    const bucket=vertexIndex.get(key) ?? [];
    bucket.push(i);
    vertexIndex.set(key,bucket);
  }
  const verifiedVertex = (id: string, coordinate?: [number,number]): number | undefined => {
    const original = runtime.nodes[id];
    if (!original) return;
    if (coordinate) {
      const projected = geographicToMeters({lon:coordinate[0],lat:coordinate[1]});
      if (Math.hypot(projected.x-original[0]!,projected.z-original[1]!) > 2) return;
    }
    const candidate = (vertexIndex.get(positionKey(original[0]!,original[1]!)) ?? [])
      .filter(i => Math.hypot(network.x[i]! - original[0]!,network.z[i]! - original[1]!) <= .15)
      .filter(i => Math.abs(network.y[i]!) < 1.5);
    // Avoid applying a road control to overlapping, grade-separated vertices.
    if (candidate.length !== 1) return;
    return candidate[0];
  };
  for (const n of source.nodes) {
    if (!/^osm:node\/\d+$/.test(n.id) || !["signal","stop","yield","sign"].includes(n.kind)) continue;
    const matched=verifiedVertex(n.id,n.coordinate);
    const coords=geographicToMeters({lon:n.coordinate[0],lat:n.coordinate[1]});
    if (matched === undefined) {
      pack.stats.unmatched++;
      // The exact, audited OSM position can be shown for a nearby roadside
      // sign, but it must NOT control an unverified road approach.
      let near=false;
      try {
        const snap=network.nearest(coords,0);
        near=snap.distance<=10 &&
          network.motorAllowed[network.way[snap.edge]!]===1;
      } catch { /* outside drivable network */ }
      if (near) pack.signs.push({
        id:n.id,kind:n.kind,x:coords.x,z:coords.z,y:0,
        approaches:[],mapped:false,
      });
      continue;
    }
    const incoming: number[]=[];
    for (let k=network.offsets[matched]!;k<network.offsets[matched+1]!;k++) {
      const edge=network.incident[k]!;
      const from=network.a[edge]===matched?network.b[edge]!:network.a[edge]!;
      if (legalTrafficTraversal(network,edge,from) &&
        Math.abs(network.y[from]! - network.y[matched]!) < 2)
        incoming.push(edge);
    }
    const direction=(n.tags["traffic_signals:direction"] ?? n.tags.direction ?? "").toLowerCase();
    const hasExplicitDirection=direction==="forward" || direction==="backward";
    const taggedAllWay=n.tags.stop==="all";
    // If no source-bearing is given, only junction-mapped signals can control
    // all inbound approaches. A mid-block signal/roadside stop sign is shown
    // but never secretly applied in both directions.
    let selected = (n.kind!=="sign" && hasExplicitDirection
      ? incoming.filter(edge => direction==="forward"
          ? network.b[edge]===matched
          : network.a[edge]===matched)
      : n.kind==="signal" && incoming.length>=3 || (n.kind==="stop" && taggedAllWay)
        ? incoming : []);
    // Only suppress duplicate mappings within a tagged source node.
    selected=[...new Set(selected)];
    const approaches:RuntimeApproach[]=selected.map(edge => {
      const from=network.a[edge]===matched?network.b[edge]!:network.a[edge]!;
      const dx=network.x[matched]! - network.x[from]!,
        dz=network.z[matched]! - network.z[from]!;
      return {edge,phase: (Math.abs(dx)>Math.abs(dz)?0:1) as 0|1};
    });
    if (approaches.length) {
      if(n.kind==="signal")pack.stats.mappedSignals++;
      else if(n.kind==="stop")pack.stats.mappedStops++;
      else if(n.kind==="yield")pack.stats.mappedYields++;
    }
    pack.signs.push({
      id:n.id,kind:n.kind,
      x:network.x[matched]!,z:network.z[matched]!,y:network.y[matched]!,
      node:matched,approaches,mapped:true,
    });
  }
  for (const r of source.restrictions) {
    const via=r.via.length===1 && r.via[0]!.id.startsWith("osm:node/")
      ? verifiedVertex(r.via[0]!.id) : undefined;
    const rule=(r.tags["restriction:motorcar"] ?? r.tags["restriction:motor_vehicle"] ??
      r.tags.restriction ?? "").toLowerCase();
    const except=(r.tags.except ?? "").split(/[;,]/).map(x=>x.trim());
    if (via===undefined || (r.tags["restriction:conditional"] || except.includes("motorcar")
        || except.includes("motor_vehicle")) ||
        !(rule.startsWith("no_") || rule.startsWith("only_"))) {
      pack.stats.unresolvedRestrictions++;continue;
    }
    let linked=false;
    for (const from of r.from)for (const to of r.to) {
      const fromWay=wayIndex.get(from),toWay=wayIndex.get(to);
      if (fromWay===undefined || toWay===undefined)continue;
      pack.restrictions.push({
        id:r.id,via,fromWay,toWay,type:rule.startsWith("only_")?"only":"no",
      });linked=true;
    }
    if(!linked)pack.stats.unresolvedRestrictions++;
  }
  pack.stats.restrictions=pack.restrictions.length;
  return pack;
}
