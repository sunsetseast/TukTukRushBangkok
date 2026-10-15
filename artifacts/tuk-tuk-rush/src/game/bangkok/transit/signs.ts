import * as T from "three";
import {arrivalSign,municipalSigns,ARRIVAL_THAI} from "../signPlacement";
import {LandmarkBuilder} from "../landmarkBuilder";
import type { District } from "../../types";
import { StaticBatch } from "../../staticBatch";

/** One locally shaped atlas for station and destination wayfinding. Original
 * typography/sign faces; no photographs or operator logo images are shipped. */
export function buildTransitSigns(d: District) {
  const root = new T.Group();
  root.name = "BangkokTransitSigns";
  if (typeof document === "undefined") return root;
  const stations = d
    .transit!.lines.flatMap((l) => l.stations)
    .filter((s, i, all) => all.findIndex((q) => q.id === s.id) === i);
  const entries = [
    {key:"historic:gate",top:"ซุ้มประตูเฉลิมพระเกียรติ",bottom:"Chinatown Gate",color:"#174a45"},
    ...stations.map((s) => ({
      key: s.id,
      top: `${s.code}  ${s.thai}`,
      bottom: s.name,
      color: s.line === "gold" ? "#9c762c" : "#1b5571",
    })),
    ...stations
      .filter((s) => s.mrt)
      .map((s) => ({
        key: `mrt:${s.id}`,
        top: s.mrt!,
        bottom: "MRT · PEDESTRIAN CONNECTION",
        color: "#254e88",
      })),
    ...(d.destinations ?? []).map((a) => ({
      key: `arrival:${a.id}`,
      top: ARRIVAL_THAI[a.id],
      bottom: `${d.landmarks.find(l=>l.id===a.id)!.name} · ${a.kind==='palace'?'DROP-OFF':'ARRIVAL'} →`,
      color: a.kind === "mall" ? "#2a6674" : "#7c483b",
    })),
    ...municipalSigns(d).map(s=>({key:s.key,top:s.thai,bottom:s.english,color:"#163c91"})),
  ];
  const cols=3, cellW=512,cellH=96;
  const canvas = document.createElement("canvas");
  canvas.width = cols*cellW;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  entries.forEach((e, i) => {
    const x = (i % cols) * 512,
      y = Math.floor(i / cols) * 96;
    ctx.fillStyle = e.color;
    ctx.fillRect(x, y, 512, 96);
    ctx.strokeStyle=e.key.startsWith("street:")?"#d7e4f4":"#e4c78f";ctx.lineWidth=2;ctx.strokeRect(x+5,y+5,502,86);
    ctx.fillStyle = "#fff7e6";
    ctx.font = '32px "Rush Thai", sans-serif';
    ctx.fillText(e.top, x + 256, y + 29, 490);
    ctx.font = "23px sans-serif";
    ctx.fillText(e.bottom, x + 256, y + 70, 490);
  });
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 2;
  const mat = new T.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    emissive: "#ffffff",
    emissiveIntensity: 0.2,
    roughness: 0.6,
    side: T.FrontSide,
  });
  const batch = new StaticBatch(),
    temp = new T.Object3D();
  const add = (
    key: string,
    x: number,
    y: number,
    z: number,
    yaw: number,
    w: number,
  ) => {
    const i = entries.findIndex((e) => e.key === key),
      g = new T.PlaneGeometry(w, (w * 96) / 512),
      uv = g.attributes.uv;
    for (let j = 0; j < uv.count; j++)
      uv.setXY(
        j,
        ((i % cols) * 512 + 2 + uv.getX(j) * 508) / canvas.width,
        1 - (Math.floor(i / cols) * 96 + 94 - uv.getY(j) * 92) / 2048,
      );
    const matrices=[];for(const side of [0,1]){temp.position.set(x+Math.sin(yaw)*(.035-side*.07),y,z+Math.cos(yaw)*(.035-side*.07));temp.rotation.set(0,yaw+side*Math.PI,0);temp.scale.set(1,1,1);temp.updateMatrix();matrices.push(temp.matrix.clone());}batch.add(g,mat,matrices);
  };
  for (const s of stations) {
    for (const side of [-1, 1])
      add(
        s.id,
        s.x + Math.cos(s.yaw) * side * 9.2,
        10.7,
        s.z - Math.sin(s.yaw) * side * 9.2,
        s.yaw + (side * Math.PI) / 2,
        20,
      );
    for (const p of s.entrances ?? [])
      add(s.id, p.x, 3.3, p.z, p.yaw + Math.PI, 6);
    if (s.mrt) {
      const p = s.entrances?.[0];
      if (p) add(`mrt:${s.id}`, p.x, 2, p.z, p.yaw + Math.PI, 5);
    }
  }
  const gate=d.landmarks.find(l=>l.id==='gate');if(gate){const p=gate.plot??gate;for(const side of [-1,1])add('historic:gate',p.x,10.3,p.z+side*4.86,side>0?0:Math.PI,6.4);}
  const structure=new LandmarkBuilder();
  for(const a of d.destinations??[]){const p=arrivalSign(a),g=a.entrance;add(p.key,p.x,p.y,p.z,p.yaw,p.w);
   const c=Math.cos(g.yaw),s=Math.sin(g.yaw);for(const u of [-5.3,5.3]){structure.box(g.x+c*u-s*1.7,6.8,g.z-s*u-c*1.7,.12,.16,3.5,'#9b8c62',g.yaw);structure.box(p.x+c*u,6.25,p.z-s*u,.12,1.1,.12,'#9b8c62');}}
  for(const p of municipalSigns(d)){add(p.key,p.x,p.y,p.z,p.yaw,p.w);const px=p.x-Math.cos(p.yaw)*3.15,pz=p.z+Math.sin(p.yaw)*3.15;structure.sculpt(new T.CylinderGeometry(.07,.12,4.5,8),px,2.25,pz,'#54746d','ceramic');structure.sculpt(new T.ConeGeometry(.22,.55,8),px,4.7,pz,'#cbb77b','ceramic');structure.box(px,.3,pz,.6,.6,.6,'#9d9e8c');structure.box(p.x,3.08,p.z,6.2,.12,.12,'#54746d',p.yaw);}
  root.add(structure.finish('wayfinding-mounts-v3'));
  const materials: T.Material[] = [];
  for (const g of batch.finish()) {
    g.name = "BangkokSign";
    root.add(g);
    g.traverse((o) => {
      if ((o as T.Mesh).material)
        materials.push((o as T.Mesh).material as T.Material);
    });
  }
  root.userData.materials = materials;
  return root;
}
