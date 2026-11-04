import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import type { GeographicSession } from "./session";
import type { RuntimeControlPack } from "./controlImport";
import type { GeographicTrafficSimulation } from "./traffic";
import { localVisibleTrafficSigns, simulatedSignalAspect } from "./trafficControlRuntime";
import { trafficSignPlacement } from "./trafficSignPlacement";
import {
  classifyThaiSign, createThaiSignMaterial, thaiSignKey, type ThaiSignFace,
} from "./thaiSignFaces";

type Instance = T.InstancedMesh<T.BufferGeometry,T.Material>;
type Batch = {mesh:Instance;count:number;capacity:number};
const SIGNS_NEAR=48,HEADS_NEAR=SIGNS_NEAR*2;
const redLit=new T.Color("#fa2532"),redOff=new T.Color("#49151a");
const amberLit=new T.Color("#ffc23e"),amberOff=new T.Color("#51411d");
const greenLit=new T.Color("#46ff86"),greenOff=new T.Color("#153b29");
const deepBlack="#171b1f",steel="#7b858b";
/** A single Thai regulatory face batch per actual mapped sign category.
 * Instancing prevents scene complexity from growing with the city-wide OSM
 * sign inventory. All 3 traffic-signal bulbs are visible, not one magic LED.
 */
function createThaiSignArt(){
  const root=new T.Group();root.name="SourceMatchedThaiStreetSigns";
  const batches=new Map<string,Batch>();
  const materials=new Set<T.Material>(),geometries=new Set<T.BufferGeometry>();
  const register=(key:string,geometry:T.BufferGeometry,material:T.Material,capacity:number)=>{
    const mesh=new T.InstancedMesh(geometry,material,capacity);
    mesh.name="Thai:"+key;
    mesh.count=0;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    root.add(mesh);
    batches.set(key,{mesh,count:0,capacity});
    materials.add(material);geometries.add(geometry);
  };
  const matte=(color:string)=>new T.MeshStandardMaterial({
    color,metalness:.24,roughness:.69,
  });
  const lamp=()=>new T.MeshBasicMaterial({color:"#ffffff"});
  const plateGeometry=new T.PlaneGeometry(1.04,1.04);
  register("post",new T.CylinderGeometry(.043,.054,3.13,8),
    matte(steel),HEADS_NEAR+SIGNS_NEAR);
  register("signalBody",new T.BoxGeometry(.36,1.20,.27),
    matte(deepBlack),HEADS_NEAR);
  register("signalShroud",new T.BoxGeometry(.38,.105,.39),
    matte("#24292d"),HEADS_NEAR*3);
  const bulbGeometry=new T.SphereGeometry(.128,12,8);
  register("redLamp",bulbGeometry,lamp(),HEADS_NEAR);
  register("amberLamp",bulbGeometry,lamp(),HEADS_NEAR);
  register("greenLamp",bulbGeometry,lamp(),HEADS_NEAR);
  const plates=new Map<string,string>();
  const face=(sign:ThaiSignFace)=>{
    const key=thaiSignKey(sign);
    if(plates.has(key))return plates.get(key)!;
    const batch="face:"+key;
    register(batch,plateGeometry,createThaiSignMaterial(sign),SIGNS_NEAR);
    plates.set(key,batch);
    return batch;
  };
  // Preload the two Thai-language regulatory plates; extra source-coded sign
  // faces are created only for verified OSM tags (no speculative signs).
  face({type:"stop"});face({type:"yield"});
  const dummy=new T.Object3D();
  const render=(key:string,x:number,y:number,z:number,yaw=0,
    tint?:T.Color,rotationX=0)=>{
    const b=batches.get(key);
    if(!b||b.count>=b.capacity)throw Error("Thai sign GPU pool exhausted: "+key);
    const i=b.count++;
    dummy.position.set(x,y,z);
    dummy.rotation.set(rotationX,yaw,0,"YXZ");
    dummy.scale.set(1,1,1);dummy.updateMatrix();
    b.mesh.setMatrixAt(i,dummy.matrix);
    if(tint)b.mesh.setColorAt(i,tint);
  };
  const hide=()=>{for(const b of batches.values()){b.count=0;b.mesh.count=0;}};
  const flush=()=>{for(const b of batches.values()){
    b.mesh.count=b.count;
    if(!b.count)continue;
    b.mesh.instanceMatrix.needsUpdate=true;
    if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;
  }};
  const dispose=()=>{
    for(const b of batches.values()){root.remove(b.mesh);b.mesh.dispose();}
    for(const m of materials){
      if(m instanceof T.MeshStandardMaterial)m.map?.dispose();
      m.dispose();
    }
    for(const g of geometries)g.dispose();
    batches.clear();plates.clear();
  };
  return {root,render,hide,flush,dispose,face,
    get drawBatches(){return batches.size;}};
}

export function TrafficSignActors({
  pack,session,enabled,simulation,
}:{
  pack:RuntimeControlPack|null;
  session:GeographicSession;
  enabled:boolean;
  simulation: GeographicTrafficSimulation;
}){
  const art=useMemo(createThaiSignArt,[]);
  useEffect(()=>()=>art.dispose(),[art]);
  const elapsed=useRef(0);
  const debug=useMemo(()=>import.meta.env.DEV &&
    new URLSearchParams(location.search).has("geographyQA"),[]);
  useFrame((_,delta)=>{
    elapsed.current+=delta;
    if(elapsed.current<.20)return; // mobile-budgeted 5Hz sign refresh
    elapsed.current=0;
    art.hide();
    if(!pack||!enabled||session.model.snapshot.phase!=="playing"){
      if(debug)(window as any).__geographicThaiSigns={visible:0,
        signals:0,stops:0,yields:0,unknownSkipped:0,heads:0};
      return;
    }
    const near=localVisibleTrafficSigns(pack.signs,
      session.player.x,session.player.z,175,SIGNS_NEAR);
    // visible counts ACTUALLY rendered, not merely nearby OSM tags.
    const stats={visible:0,sourceNearby:near.length,signals:0,stops:0,yields:0,
      unknownSkipped:0,heads:0,osmIds:[] as string[], drawBatches:0};
    for(const sign of near){
      if(sign.kind==="signal"){
        stats.visible++;stats.signals++;stats.osmIds.push(sign.id);
        // Cross-axis heads face separate verified approaches and never display
        // a mixed green on the same panel. Unmatched signals are visibly OFF.
        const phases=sign.approaches.length?
          [...new Set(sign.approaches.map(a=>a.phase))]:[null];
        for(const phase of phases){
          const edge=sign.approaches.find(a=>a.phase===phase)?.edge;
          const {x,z,yaw}=trafficSignPlacement(sign,simulation.network,edge);
          const y=sign.y;
          art.render("post",x,y+1.565,z);
          art.render("signalBody",x,y+3.09,z,yaw);
          const aspect=phase===null?"inactive":
            simulatedSignalAspect(phase,simulation.simulationClockSeconds);
          const bulbs=[
            ["redLamp",3.45,aspect==="red"?redLit:redOff],
            ["amberLamp",3.08,aspect==="amber"?amberLit:amberOff],
            ["greenLamp",2.71,aspect==="green"?greenLit:greenOff],
          ] as const;
          for(const [key,height,color] of bulbs){
            // The local housing is pointed toward oncoming vehicles; lens
            // and visor positions are offset along its forward (+Z) axis.
            art.render(key,x+Math.sin(yaw)*.158,y+height,
              z+Math.cos(yaw)*.158,yaw,color);
            art.render("signalShroud",x+Math.sin(yaw)*.06,y+height+.16,
              z+Math.cos(yaw)*.06,yaw);
          }
          stats.heads++;
        }
        continue;
      }
      const style=classifyThaiSign(sign);
      if(!style){stats.unknownSkipped++;continue;}
      // Ambiguous stop/yield without a source-verified approach is hidden
      // rather than placed in the road center with a guessed facing.
      if((style.type==="stop"||style.type==="yield") &&
         !sign.approaches.length){stats.unknownSkipped++;continue;}
      const {x,z,yaw}=trafficSignPlacement(sign,simulation.network);
      art.render("post",x,sign.y+1.565,z);
      art.render(art.face(style),x,sign.y+2.77,z,yaw);
      if(style.type==="stop")stats.stops++;
      if(style.type==="yield")stats.yields++;
      stats.visible++;stats.osmIds.push(sign.id);
    }
    art.flush();
    if(debug)(window as any).__geographicThaiSigns={
      ...stats,drawBatches:art.drawBatches,
    };
  });
  return <primitive object={art.root}/>;
}
