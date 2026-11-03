import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import type { GeographicNetwork } from "./network";
import type { GeographicSession } from "./session";
import {
  localThaiWayNames, paintBangkokRoadPlaque,
} from "./thaiStreetNames";
const CAPACITY=6;
type Slot={
  group:T.Group;
  canvas:HTMLCanvasElement;
  texture:T.CanvasTexture;
  material:T.MeshBasicMaterial;
  lastLabel:string;
};
/** Bangkok-style blue street name blades. Thai/English strings are copied
 * from actual OSM source way names, never reverse-transliterated by the game.
 * Mounting positions are deterministic SCENIC PLACEMENT on named road segments,
 * not claims that a particular street sign was surveyed at that coordinate.
 *
 * Six reusable CanvasTexture slots; no citywide sign textures, font loading
 * requests or ever-growing per-street mesh/texture cache.
 */
export function ThaiStreetNameActors({
  network,session,
}:{
  network:GeographicNetwork;session:GeographicSession;
}){
  const art=useMemo(()=>{
    const root=new T.Group();root.name="BangkokOSMNamedStreets";
    const postGeom=new T.CylinderGeometry(.055,.061,2.9,8);
    const faceGeom=new T.PlaneGeometry(1.85,.62);
    const backGeom=new T.BoxGeometry(1.93,.70,.055);
    const trimGeom=new T.SphereGeometry(.12,8,6);
    const postMat=new T.MeshStandardMaterial({color:"#333b44",metalness:.55,roughness:.50});
    const backMat=new T.MeshStandardMaterial({color:"#232b38",metalness:.4,roughness:.6});
    const trimMat=new T.MeshStandardMaterial({color:"#b7bbc0",metalness:.5,roughness:.52});
    const slots:Slot[]=Array.from({length:CAPACITY},(_,i)=>{
      const canvas=document.createElement("canvas");
      canvas.width=768;canvas.height=256;
      const texture=new T.CanvasTexture(canvas);
      texture.colorSpace=T.SRGBColorSpace;
      texture.anisotropy=4;
      const material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,
        transparent:true,depthWrite:true});
      const group=new T.Group();
      group.name="NamedOSMWayPlaque:"+i;
      group.visible=false;
      const pole=new T.Mesh(postGeom,postMat);
      pole.position.y=1.45;group.add(pole);
      const back=new T.Mesh(backGeom,backMat);
      back.position.set(0,2.92,-.04);group.add(back);
      const plate=new T.Mesh(faceGeom,material);
      plate.position.set(0,2.92,0);group.add(plate);
      const crown=new T.Mesh(trimGeom,trimMat);
      crown.position.y=3.38;group.add(crown);
      root.add(group);
      return {canvas,texture,material,group,lastLabel:""};
    });
    const dispose=()=>{
      for(const slot of slots){
        slot.texture.dispose();slot.material.dispose();
        root.remove(slot.group);
      }
      for(const g of [postGeom,faceGeom,backGeom,trimGeom])g.dispose();
      for(const m of [postMat,backMat,trimMat])m.dispose();
    };
    return {root,slots,dispose};
  },[]);
  useEffect(()=>()=>art.dispose(),[art]);
  const interval=useRef(1); // first visible update without an empty camera frame
  const debug=useMemo(()=>import.meta.env.DEV&&
    new URLSearchParams(location.search).has("geographyQA"),[]);
  useFrame((_,delta)=>{
    interval.current+=delta;
    if(interval.current<.95)return;
    interval.current=0;
    if(session.model.snapshot.phase!=="playing"){
      for(const slot of art.slots)slot.group.visible=false;
      return;
    }
    const named=localThaiWayNames(network,session.player,CAPACITY,95);
    for(let i=0;i<CAPACITY;i++){
      const slot=art.slots[i]!,road=named[i];
      if(!road){slot.group.visible=false;continue;}
      const key=`${road.thai??""}|${road.english??""}`;
      if(slot.lastLabel!==key){
        const ctx=slot.canvas.getContext("2d");
        if(!ctx)throw Error("Bangkok street sign font canvas unavailable");
        paintBangkokRoadPlaque(ctx,road);
        slot.texture.needsUpdate=true;
        slot.lastLabel=key;
      }
      slot.group.visible=true;
      slot.group.position.set(road.x,road.y,road.z);
      slot.group.rotation.set(0,road.yaw,0);
    }
    if(debug)(window as any).__geographicStreetNames={
      count:named.length,
      names:named.map(n=>({id:n.id,thai:n.thai,english:n.english})),
      mounting:"scenic placement; not surveyed street sign locations",
      textures:CAPACITY,
    };
  });
  return <primitive object={art.root}/>;
}
