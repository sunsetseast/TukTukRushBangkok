import type { TrafficNetwork } from "./traffic";
import type { RuntimeTrafficSign } from "./controlImport";

/** A sign's source OSM vertex is canonical; the mesh itself is a stylized
 * roadside fixture, not a claim about which curb/gantry the real hardware
 * uses. Bangkok drives on the LEFT, so a sign facing an incoming lane belongs
 * beyond the vehicle's left shoulder, before the mapped junction vertex.
 *
 * If the graph cannot establish an actual incoming legal approach, preserve
 * the original OSM marker position. Never attach a sign to a guessed road.
 */
export function trafficSignPlacement(
  sign: RuntimeTrafficSign,
  network: Pick<TrafficNetwork,"x"|"z"|"a"|"b"|"width">,
  incomingEdge?: number,
) {
  const edge=incomingEdge ?? sign.approaches[0]?.edge;
  if(sign.node===undefined || edge===undefined ||
     !Number.isInteger(edge)||edge<0||edge>=network.a.length ||
     (network.a[edge]!==sign.node && network.b[edge]!==sign.node))
    return {x:sign.x,z:sign.z,yaw:0,sourceOnly:true};
  const from=network.a[edge]===sign.node?network.b[edge]!:network.a[edge]!;
  const dx=network.x[sign.node]!-network.x[from]!,
        dz=network.z[sign.node]!-network.z[from]!,
        length=Math.hypot(dx,dz);
  if(length<.1) return {x:sign.x,z:sign.z,yaw:0,sourceOnly:true};
  const ux=dx/length,uz=dz/length;
  const shoulder=Math.max(2.6,Math.min(7.2,network.width[edge]!/2+.6));
  const before=Math.min(4,Math.max(.7,length*.15));
  return {
    x:sign.x-ux*before+uz*shoulder,
    z:sign.z-uz*before-ux*shoulder,
    yaw:Math.atan2(-ux,-uz),
    sourceOnly:false,
  };
}
