import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import type { GeographicSession } from "./session";
import type { RuntimeControlPack } from "./controlImport";
import type { GeographicTrafficSimulation } from "./traffic";
import { localVisibleTrafficSigns, simulatedSignalIsGreen } from "./trafficControlRuntime";

type Instance = T.InstancedMesh<T.BufferGeometry, T.MeshStandardMaterial>;
const CAPACITY=48;
/** OSM-tagged location artwork. The exact mapped node comes from OSM; rendered
 * pole shapes/height are stylized and NOT surveyed sign mounting locations.
 */
function createSignArt() {
  const group=new T.Group();
  group.name="MappedBangkokSigns";
  const make=(geometry:T.BufferGeometry,color:string):Instance=>{
    const instance=new T.InstancedMesh(
      geometry,new T.MeshStandardMaterial({color,roughness:.68}),CAPACITY,
    );
    instance.count=0;
    instance.frustumCulled=false;
    instance.instanceMatrix.setUsage(T.DynamicDrawUsage);
    group.add(instance);
    return instance;
  };
  const poles=make(new T.CylinderGeometry(.045,.055,2.5,6),"#747d7c");
  const housing=make(new T.BoxGeometry(.32,.96,.24),"#252b2d");
  const bulbs=make(new T.SphereGeometry(.13,6,5),"#ffffff");
  const stops=make(new T.CylinderGeometry(.47,.47,.09,8),"#df3343");
  const yields=make(new T.ConeGeometry(.48,.88,3),"#f4f0e9");
  const list=[poles,housing,bulbs,stops,yields];
  return {group,poles,housing,bulbs,stops,yields,dispose:()=>{
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
  const inactive=useMemo(()=>new T.Color("#66727c"),[]);
  useEffect(()=>()=>art.dispose(),[art]);
  useFrame((_,delta)=>{
    elapsed.current+=delta;
    if(elapsed.current<.2)return; // low-cost source sign streaming
    elapsed.current=0;
    if(!pack || !enabled || session.model.snapshot.phase!=="playing") {
      for(const mesh of [art.poles,art.housing,art.bulbs,art.stops,art.yields])mesh.count=0;
      return;
    }
    const near=localVisibleTrafficSigns(
      pack.signs,session.player.x,session.player.z,175,CAPACITY,
    );
    const count={poles:0,housing:0,bulbs:0,stops:0,yields:0};
    const instance=(mesh:Instance,index:number,x:number,y:number,z:number,
      rotationX=0,color?:T.Color)=>{
      cursor.position.set(x,y,z);
      cursor.rotation.set(rotationX,0,0);
      cursor.scale.set(1,1,1);
      cursor.updateMatrix();
      mesh.setMatrixAt(index,cursor.matrix);
      if(color)mesh.setColorAt(index,color);
    };
    for(const sign of near) {
      const {x,z,y}=sign;
      instance(art.poles,count.poles++,x,y+1.25,z);
      if(sign.kind==="signal"){
        const index=count.housing++;
        instance(art.housing,index,x,y+2.7,z);
        const approach=sign.approaches[0];
        const color=approach
          ? simulatedSignalIsGreen(approach.phase,simulation.simulationClockSeconds)
            ? green : red
          : inactive;
        instance(art.bulbs,count.bulbs++,x,y+2.78,z-.16,0,color);
      }else if(sign.kind==="stop"){
        instance(art.stops,count.stops++,x,y+2.65,z,Math.PI/2);
      }else if(sign.kind==="yield"){
        instance(art.yields,count.yields++,x,y+2.62,z,Math.PI/2);
      }
    }
    for(const [mesh,num] of [[art.poles,count.poles],[art.housing,count.housing],
      [art.bulbs,count.bulbs],[art.stops,count.stops],[art.yields,count.yields]] as const) {
      mesh.count=num;
      if(num){mesh.instanceMatrix.needsUpdate=true;
        if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
    }
  });
  return <primitive object={art.group}/>;
}
