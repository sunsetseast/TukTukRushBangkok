import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import type { GeographicSession } from "./session";
import type { RuntimeControlPack } from "./controlImport";
import type { GeographicTrafficSimulation } from "./traffic";
import { localVisibleTrafficSigns, simulatedSignalAspect } from "./trafficControlRuntime";
import { trafficSignPlacement } from "./trafficSignPlacement";

type Instance = T.InstancedMesh<T.BufferGeometry, T.MeshStandardMaterial>;
const CAPACITY=48;
/** OSM-tagged location artwork. The exact mapped node comes from OSM; rendered
 * pole shapes/height are stylized and NOT surveyed sign mounting locations.
 */
function createSignArt() {
  const group=new T.Group();
  group.name="MappedBangkokSigns";
  const make=(geometry:T.BufferGeometry,color:string,capacity=CAPACITY):Instance=>{
    const instance=new T.InstancedMesh(
      geometry,new T.MeshStandardMaterial({color,roughness:.68}),capacity,
    );
    instance.count=0;
    instance.frustumCulled=false;
    instance.instanceMatrix.setUsage(T.DynamicDrawUsage);
    group.add(instance);
    return instance;
  };
  const poles=make(new T.CylinderGeometry(.045,.055,2.5,6),"#747d7c",CAPACITY*2);
  // A four-way signal can have different red/green aspects for perpendicular
  // approaches. Reserve two batched proxies per tagged location.
  const housing=make(new T.BoxGeometry(.32,.96,.24),"#252b2d",CAPACITY*2);
  const bulbs=make(new T.SphereGeometry(.13,6,5),"#ffffff",CAPACITY*2);
  const stops=make(new T.CylinderGeometry(.47,.47,.09,8),"#df3343");
  const yields=make(new T.ConeGeometry(.48,.88,3),"#f4f0e9");
  const otherSigns=make(new T.BoxGeometry(.85,.82,.08),"#1d5599");
  const list=[poles,housing,bulbs,stops,yields,otherSigns];
  return {group,poles,housing,bulbs,stops,yields,otherSigns,dispose:()=>{
    for(const mesh of list){mesh.geometry.dispose();mesh.material.dispose();}
  }};
}
export function TrafficSignActors({
  pack,session,enabled,simulation,
}:{
  pack:RuntimeControlPack|null;
  session:GeographicSession;
  enabled:boolean;
  simulation: GeographicTrafficSimulation;
}) {
  const art=useMemo(()=>createSignArt(),[]);
  const elapsed=useRef(0);
  const cursor=useMemo(()=>new T.Object3D(),[]);
  const red=useMemo(()=>new T.Color("#ea252c"),[]);
  const green=useMemo(()=>new T.Color("#54ee8a"),[]);
  const amber=useMemo(()=>new T.Color("#ffbf42"),[]);
  const inactive=useMemo(()=>new T.Color("#66727c"),[]);
  useEffect(()=>()=>art.dispose(),[art]);
  useFrame((_,delta)=>{
    elapsed.current+=delta;
    if(elapsed.current<.2)return; // low-cost source sign streaming
    elapsed.current=0;
    if(!pack || !enabled || session.model.snapshot.phase!=="playing") {
      for(const mesh of [art.poles,art.housing,art.bulbs,art.stops,art.yields,art.otherSigns])mesh.count=0;
      return;
    }
    const near=localVisibleTrafficSigns(
      pack.signs,session.player.x,session.player.z,175,CAPACITY,
    );
    const count={poles:0,housing:0,bulbs:0,stops:0,yields:0,otherSigns:0};
    const instance=(mesh:Instance,index:number,x:number,y:number,z:number,
      rotationX=0,color?:T.Color,yaw=0)=>{
      cursor.position.set(x,y,z);
      // Explicit YXZ: face the approaching driver even for flat signs.
      cursor.rotation.set(rotationX,yaw,0,"YXZ");
      cursor.scale.set(1,1,1);
      cursor.updateMatrix();
      mesh.setMatrixAt(index,cursor.matrix);
      if(color)mesh.setColorAt(index,color);
    };
    for(const sign of near) {
      const {y}=sign;
      if(sign.kind==="signal"){
        // Distinct crossing signal groups must not appear to share one green
        // lamp. Anchor each stylized pole to its *verified incoming approach*.
        const phases=sign.approaches.length
          ? [...new Set(sign.approaches.map(a=>a.phase))]
          : [null];
        for(const phase of phases) {
          const edge=sign.approaches.find(a=>a.phase===phase)?.edge;
          const placement=trafficSignPlacement(sign,simulation.network,edge);
          const {x,z,yaw}=placement;
          instance(art.poles,count.poles++,x,y+1.25,z);
          instance(art.housing,count.housing++,x,y+2.7,z,0,undefined,yaw);
          const aspect=phase===null ? "inactive" :
            simulatedSignalAspect(phase,simulation.simulationClockSeconds);
          const color=aspect==="green"?green:
            aspect==="amber"?amber:aspect==="red"?red:inactive;
          // Local forward offset, not a fixed world-north indicator.
          instance(art.bulbs,count.bulbs++,x-Math.sin(yaw)*.16,y+2.78,
            z-Math.cos(yaw)*.16,0,color,yaw);
        }
      }else{
        const {x,z,yaw}=trafficSignPlacement(sign,simulation.network);
        instance(art.poles,count.poles++,x,y+1.25,z);
        if(sign.kind==="stop")
          instance(art.stops,count.stops++,x,y+2.65,z,Math.PI/2,undefined,yaw);
        else if(sign.kind==="yield")
          instance(art.yields,count.yields++,x,y+2.62,z,Math.PI/2,undefined,yaw);
        else
          instance(art.otherSigns,count.otherSigns++,x,y+2.6,z,0,undefined,yaw);
      }
    }
    for(const [mesh,num] of [[art.poles,count.poles],[art.housing,count.housing],
      [art.bulbs,count.bulbs],[art.stops,count.stops],[art.yields,count.yields],
      [art.otherSigns,count.otherSigns]] as const) {
      mesh.count=num;
      if(num){mesh.instanceMatrix.needsUpdate=true;
        if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
    }
  });
  return <primitive object={art.group}/>;
}
