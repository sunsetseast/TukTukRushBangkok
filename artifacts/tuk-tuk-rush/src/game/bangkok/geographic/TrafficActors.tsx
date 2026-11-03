import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { GeographicTrafficSimulation } from "./traffic";
import type { GeographicNetwork } from "./network";
import type { GeographicSession } from "./session";
import type { RuntimeControlPack } from "./controlImport";
import { loadVerifiedTrafficControls, sourceApproachControls } from "./trafficControlRuntime";
import { TrafficSignActors } from "./TrafficSignActors";
import { createBangkokFleetVisual } from "./trafficArt";
import { resolvePlayerTrafficContact } from "./trafficContact";

/** All moving vehicles share one bounded simulation and instanced renderer.
 * Real OSM controls are optional until their independently-versioned compact
 * source pack has loaded; failure must never break the player's map startup.
 */
export function TrafficActors({
  network, session, enabled,
}: {
  network: GeographicNetwork;
  session: GeographicSession;
  enabled: boolean;
}) {
  const [pack,setPack]=useState<RuntimeControlPack|null>(null);
  useEffect(()=>{
    let cancelled=false;
    void loadVerifiedTrafficControls(network).then(result=>{
      if(!cancelled)setPack(result);
    });
    return ()=>{cancelled=true;};
  },[network]);
  const fleet=useMemo(()=>{
    const simulation=new GeographicTrafficSimulation(
      network,20261102,sourceApproachControls(pack),pack?.restrictions ?? [],
    );
    return {simulation,visual:createBangkokFleetVisual(16)};
  },[network,pack]);
  useEffect(()=>()=>fleet.visual.dispose(),[fleet]);
  const inspect=useMemo(()=>import.meta.env.DEV &&
    new URLSearchParams(location.search).has("geographyQA"),[]);
  const lastDebug=useRef(0);
  const lastSafe=useRef<{x:number;z:number;y:number}|undefined>(undefined);
  const contacts=useRef(0);
  useFrame((state,delta)=>{
    const active=enabled && session.model.snapshot.phase==="playing";
    fleet.simulation.update(delta,session.player,active,session.model.snapshot.quality);
    if(active){
      const player=session.player;
      const pose={x:player.x,z:player.z,y:session.height,
        heading:player.heading,speed:player.speed};
      if(resolvePlayerTrafficContact(pose,fleet.simulation.vehicles,lastSafe.current)){
        player.x=pose.x;player.z=pose.z;player.speed=pose.speed;
        player.collision=Math.max(player.collision,.5);
        contacts.current++;
      }else{
        lastSafe.current={x:player.x,z:player.z,y:pose.y};
      }
    }else lastSafe.current=undefined;
    fleet.visual.render(fleet.simulation.vehicles);
    // Keep expensive debug map snapshot optional and capped at 4 Hz.
    if(inspect && state.clock.elapsedTime-lastDebug.current>.25){
      lastDebug.current=state.clock.elapsedTime;
      (window as any).__geographicTraffic={
        active:fleet.simulation.vehicles.length,
        spawned:fleet.simulation.stats.spawned,
        removed:fleet.simulation.stats.removed,
        controlledBrakingFrames:fleet.simulation.stats.stoppedForControl,
        playerTrafficContactFrames:contacts.current,
        sourceMatchedControls:pack?.stats.mappedSignals??0,
        sourceTurnRestrictions:pack?.stats.restrictions??0,
        drawBatches:fleet.visual.drawBatches,
        actors:fleet.simulation.vehicles.map(v=>({
          id:v.id,kind:v.kind,edge:v.edge,from:v.from,to:v.to,
          x:v.x,z:v.z,speed:v.speed,
        })),
      };
    }
  });
  return <>
    <primitive object={fleet.visual.root}/>
    <TrafficSignActors pack={pack} session={session}
      enabled={enabled} simulation={fleet.simulation}/>
  </>;
}
