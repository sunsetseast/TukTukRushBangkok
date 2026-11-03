import type { TrafficVehicle } from "./traffic";

export type PlayerTrafficPose = {x:number;z:number;y:number;heading:number;speed:number};

/** Lightweight oriented-body overlap for the geographic-only AI fleet.
 * The production player still owns authoritative road/building collision.
 * AI actors never enter the generic (legacy) engine traffic list, because that
 * list expects different edge IDs and could crash on geographic roads=[].
 *
 * These conservative broadphase dimensions approximate the visible meshes,
 * not an authoritative rigid-body physics model.
 */
export function playerTrafficContact(
  player: Pick<PlayerTrafficPose,"x"|"z"|"y">,
  vehicles:readonly TrafficVehicle[],
):TrafficVehicle|undefined{
  for(const car of vehicles){
    if(Math.abs(player.y-car.y)>1.3)continue;
    const dx=player.x-car.x,dz=player.z-car.z;
    const halfLength=car.kind==="motorcycle"?.9:car.kind==="tuktuk"?1.28:1.65;
    const halfWidth=car.kind==="motorcycle"?.4:car.kind==="tuktuk"?.72:.87;
    // The player tuk-tuk is about 1.35 x 2.4m, with clearance added for
    // wheel arches. Test in the AI car's local forward/side frame.
    const longitudinal=dx*Math.sin(car.heading)+dz*Math.cos(car.heading);
    const lateral=dx*Math.cos(car.heading)-dz*Math.sin(car.heading);
    if(Math.abs(longitudinal)<=halfLength+1.04 &&
       Math.abs(lateral)<=halfWidth+.63)
      return car;
  }
  return undefined;
}

/** Do not teleport the player into water, inaccessible buildings, or a
 * different lane. Only restore the last *already observed safe* pose when it
 * remains clear of every moving car. Otherwise simply damp the velocity.
 */
export function resolvePlayerTrafficContact(
  player:PlayerTrafficPose,
  vehicles:readonly TrafficVehicle[],
  lastSafe:Pick<PlayerTrafficPose,"x"|"z"|"y">|undefined,
){
  const contact=playerTrafficContact(player,vehicles);
  if(!contact)return false;
  if(lastSafe && !playerTrafficContact(lastSafe,vehicles) &&
     Math.hypot(player.x-lastSafe.x,player.z-lastSafe.z)<2.8 &&
     Math.abs(player.y-lastSafe.y)<.6){
    player.x=lastSafe.x;player.z=lastSafe.z;
  }
  player.speed=Math.sign(player.speed)*Math.min(Math.abs(player.speed),.3);
  return true;
}
