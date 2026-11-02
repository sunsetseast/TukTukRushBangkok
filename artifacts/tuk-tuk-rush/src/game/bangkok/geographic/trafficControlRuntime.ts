import type { GeographicNetwork } from "./network";
import { fetchGeographicJson } from "./packedAsset";
import type { RuntimeControlPack, RuntimeTrafficSign } from "./controlImport";
import type { VerifiedApproachControl } from "./traffic";

/** Real positions, original OSM IDs, and only node/approach matches certified
 * against the static Bangkok network. Actual signal timing is generally not
 * available in OSM; we use an explicit simulated non-overlap schedule.
 */
export async function loadVerifiedTrafficControls(
  network: GeographicNetwork,
): Promise<RuntimeControlPack | null> {
  try {
    const pack=await fetchGeographicJson<RuntimeControlPack>(
      `${import.meta.env.BASE_URL}assets/geography/traffic-controls.v1.json.pack`,
    );
    if(pack.schema!==1 || pack.roadSourceSha256!==network.metadata.sourceSha256 ||
      !Array.isArray(pack.signs) || !Array.isArray(pack.restrictions))
      throw Error("Stale or invalid OSM traffic-control pack");
    return pack.status==="ready" ? pack : null;
  } catch(error) {
    // Do NOT crash the Bangkok map over an optional metadata file.
    // This can happen when Replit serves a stale development server.
    console.warn("Bangkok verified traffic controls unavailable; signs disabled",error);
    return null;
  }
}
export function simulatedSignalIsGreen(phase: 0 | 1, seconds: number) {
  const point=(seconds + phase*18) % 36;
  // 14 s green + 4 s amber/all-red buffer per intersecting axis.
  return point>=0 && point<14;
}
export function sourceApproachControls(
  pack: RuntimeControlPack | null,
): VerifiedApproachControl[] {
  if(!pack || pack.status!=="ready") return [];
  const controls:VerifiedApproachControl[]=[];
  const seen=new Set<string>();
  for(const sign of pack.signs) {
    if(sign.node===undefined || sign.kind==="sign")continue;
    for(const approach of sign.approaches) {
      const key=`${sign.node}:${approach.edge}`;
      if(seen.has(key))continue;
      seen.add(key);
      controls.push({
        at:sign.node,incomingEdge:approach.edge,
        sourceId:sign.id,kind:sign.kind,
        ...(sign.kind==="signal"
          ? {cycleSeconds:36,greenSeconds:14,offsetSeconds:approach.phase*18}
          : {}),
      });
    }
  }
  return controls;
}
export function localVisibleTrafficSigns(
  signs: RuntimeTrafficSign[],
  x:number,z:number,radius=200,max=48,
):RuntimeTrafficSign[] {
  return signs
    .filter(s=>Math.hypot(s.x-x,s.z-z)<=radius)
    .sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))
    .slice(0,max);
}
