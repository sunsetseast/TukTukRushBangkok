import * as T from "three";
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
      top: d.landmarks.find((l) => l.id === a.id)!.name,
      bottom: a.kind === "palace" ? "PERIMETER DROP-OFF" : "VISITOR ARRIVAL  →",
      color: a.kind === "mall" ? "#2a6674" : "#7c483b",
    })),
  ];
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  entries.forEach((e, i) => {
    const x = (i % 2) * 512,
      y = Math.floor(i / 2) * 96;
    ctx.fillStyle = e.color;
    ctx.fillRect(x, y, 512, 96);
    ctx.fillStyle = "#f8ecd1";
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
    side: T.DoubleSide,
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
        ((i % 2) * 512 + 2 + uv.getX(j) * 508) / 1024,
        1 - (Math.floor(i / 2) * 96 + 94 - uv.getY(j) * 92) / 2048,
      );
    temp.position.set(x, y, z);
    temp.rotation.set(0, yaw, 0);
    temp.scale.set(1, 1, 1);
    temp.updateMatrix();
    batch.add(g, mat, [temp.matrix.clone()]);
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
  for (const a of d.destinations ?? []) {
    const p = a.entrance;
    add(`arrival:${a.id}`, p.x, 7.45, p.z, p.yaw + Math.PI, 11);
  }
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
