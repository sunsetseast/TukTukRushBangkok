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
/** Per-axis aspect for a GAMEPLAY schedule, not verified Bangkok timings.
 * Opposing cross traffic cannot receive simultaneous green. An amber lamp
 * warns of a closing movement; motor AI already treats amber as non-green.
 */
export function simulatedSignalAspect(phase:0|1,seconds:number):
  "green"|"amber"|"red"{
  const t=((seconds+phase*18)%36+36)%36;
  if(t<14)return "green";
  if(t<16)return "amber";
  return "red"; // 2s all-red clearance before the cross-axis green.
}
export function simulatedSignalIsGreen(phase: 0 | 1, seconds: number) {
  return simulatedSignalAspect(phase,seconds)==="green";
}
export function sourceApproachControls(
  pack: RuntimeControlPack | null,
): VerifiedApproachControl[] {
  if(!pack || pack.status!=="ready") return [];
  const controls:VerifiedApproachControl[]=[];
  const seen=new Set<string>();
  // When two tagged devices overlap at one original OSM node, a verified
  // signal has priority over a stop/yield marker, regardless of OSM ID order.
  // Never let a standalone generic sign override a graph-controlled signal.
  const priority={signal:0,stop:1,yield:2,sign:3};
  for(const sign of [...pack.signs].sort((a,b)=>priority[a.kind]-priority[b.kind])) {
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
