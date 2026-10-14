import * as T from "three";
import type { District, Obstacle } from "../types";
import { buildingIdentity } from "./buildingGrammar";
import type { ArtPiece } from "./architecturalBatch";

/** A single authored override of a real Yaowarat parcel. The source photograph
 * informs proportions only; no photograph, watermark or copied logo is used. */
export function scalaParcel(d: District): Obstacle {
  return d.buildings
    .filter((b) => b.regionId === "chinatown" && !b.artRole)
    .reduce((best, b) =>
      Math.hypot(b.x - 63.11045, b.z + 45.66192) <
      Math.hypot(best.x - 63.11045, best.z + 45.66192)
        ? b
        : best,
    );
}
export function emitScala(b: Obstacle, emit: (p: ArtPiece) => void) {
  const yaw = b.yaw ?? 0,
    c = Math.cos(yaw),
    s = Math.sin(yaw),
    F = b.d / 2,
    W = b.w;
  const put = (
    u: number,
    y: number,
    v: number,
    w: number,
    h: number,
    d: number,
    color: string,
    shape: ArtPiece["shape"] = "box",
    layer: ArtPiece["layer"] = "core",
  ) =>
    emit({
      x: b.x + c * u + s * v,
      y,
      z: b.z - s * u + c * v,
      w,
      h,
      d,
      color,
      yaw,
      shape,
      layer,
      surface: shape === "cylinder" ? "tile" : "plaster",
    });
  // Broad glazing bands and red columns remain legible from the chase camera.
  put(0, 18, 0, W, 36, b.d, "#a7b5a8");
  put(0, 2.2, F + 0.07, W - 1, 4.4, 0.12, "#49382e");
  for (const x of [-0.44, 0, 0.44])
    put(x * W, 2.2, F + 0.18, 0.6, 4.4, 0.3, "#9a6261");
  for (const y of [7.5, 11.4, 17, 22, 27, 32.2]) {
    put(0, y, F + 0.03, W - 1, 3.5, 0.1, "#88b7b4");
    for (let u = -W * 0.4; u < W * 0.45; u += W / 8)
      put(u, y, F + 0.15, 0.16, 3.5, 0.14, "#dfddd0");
  }
  for (const u of [-W * 0.46, W * 0.46])
    put(u, 21, F + 0.24, 1.3, 30, 0.4, "#c85866");
  // Upturned tile eaves with dense rounded ridges, not plain shelf boxes.
  for (const y of [5.3, 14, 19.2, 24.2, 29.2, 34.5, 36.2]) {
    put(0, y, F + 0.65, W + 0.2, 0.3, 1.65, "#365e49");
    for (let u = -W / 2; u <= W / 2; u += 0.65) {
      put(u, y + 0.3, F + 0.65, 0.43, 0.4, 1.5, "#436f51", "cylinder");
      if (Math.abs(u) > W * 0.43)
        put(u, y + 0.55, F + 0.65, 0.55, 0.45, 1.5, "#547d52", "cylinder");
    }
  }
  for (const y of [6.4, 12.7]) {
    put(0, y, F + 0.25, W, 1.15, 0.45, "#b53642");
    put(0, y + 0.57, F + 0.52, W, 0.1, 0.12, "#dfbd62");
    put(0, y - 0.57, F + 0.52, W, 0.1, 0.12, "#dfbd62");
    for (let u = -W * 0.46; u < W * 0.45; u += 2.2) {
      put(u, y, F + 0.54, 1.4, 0.07, 0.08, "#dfbd62");
      put(u - 0.7, y + 0.21, F + 0.54, 0.07, 0.48, 0.08, "#dfbd62");
      put(u + 0.7, y - 0.21, F + 0.54, 0.07, 0.48, 0.08, "#dfbd62");
    }
  }
  // The central cream billboard and projecting red/gold sign are solid artwork
  // attached above vehicles. Their lettering is one shared original atlas.
  put(0, 10.3, F + 0.76, 8.7, 8.5, 0.5, "#efe6c8");
  put(W * 0.42, 22, F + 1.05, 2.75, 24, 1.8, "#aa2436");
  for (const u of [W * 0.42 - 1.5, W * 0.42 + 1.5]) {
    put(u, 22, F + 2, 0.15, 24, 0.18, "#e4bc61");
    for (let y = 11; y < 34; y += 1.45)
      put(u, y, F + 2.1, 0.22, 0.22, 0.15, "#ffe5a0", "cylinder", "night");
  }
  put(0, 4.9, F + 1.6, W - 2, 0.22, 2.9, "#812f34");
}

/** Atlas ownership stays with the city group; restart/dispose releases it once. */
export function buildScalaSigns(b: Obstacle) {
  const root = new T.Group();
  root.name = "BangkokScalaSigns";
  root.userData.parcel = buildingIdentity(b);
  if (typeof document === "undefined") return root;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f0e8d0";
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = "#bf3845";
  ctx.beginPath();
  ctx.moveTo(140, 260);
  ctx.lineTo(320, 45);
  ctx.lineTo(249, 264);
  ctx.closePath();
  ctx.fill();
  ctx.font = "bold 42px Georgia";
  ctx.textAlign = "center";
  ctx.fillText("CHINA TOWN", 256, 345);
  ctx.font = "bold 65px Georgia";
  ctx.fillText("SCALA", 256, 429);
  ctx.fillStyle = "#ab2639";
  ctx.fillRect(0, 512, 256, 512);
  ctx.fillStyle = "#f9edce";
  ctx.font = "bold 88px Georgia";
  [..."SCALA"].forEach((ch, i) => ctx.fillText(ch, 128, 597 + i * 98));
  ctx.fillStyle = "#ece3c5";
  ctx.fillRect(256, 512, 256, 512);
  ctx.fillStyle = "#385d4b";
  ctx.font = "bold 27px Georgia";
  ctx.fillText("CHINA TOWN", 384, 730);
  ctx.fillText("SCALA", 384, 773);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const mat = new T.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    emissive: "#fff0db",
    emissiveIntensity: 0.12,
    roughness: 0.7,
  });
  const yaw = b.yaw ?? 0,
    c = Math.cos(yaw),
    s = Math.sin(yaw),
    F = b.d / 2;
  const panel = (
    u: number,
    y: number,
    v: number,
    w: number,
    h: number,
    uv: [number, number, number, number],
    turn = 0,
  ) => {
    const g = new T.PlaneGeometry(w, h),
      a = g.attributes.uv!;
    for (let i = 0; i < a.count; i++)
      a.setXY(i, uv[0] + a.getX(i) * uv[2], uv[1] + a.getY(i) * uv[3]);
    const m = new T.Mesh(g, mat);
    m.position.set(b.x + c * u + s * v, y, b.z - s * u + c * v);
    m.rotation.y = yaw + turn;
    root.add(m);
  };
  panel(0, 10.3, F + 1.03, 8.65, 8.45, [0, 0.5, 1, 0.5]);
  panel(b.w * 0.42, 22, F + 1.98, 2.7, 23.8, [0, 0, 0.5, 0.5]);
  panel(
    b.w * 0.42 + 1.4,
    22,
    F + 1.05,
    1.8,
    23.8,
    [0, 0, 0.5, 0.5],
    Math.PI / 2,
  );
  panel(0, 5.1, F + 1.55, b.w - 2, 1.6, [0.5, 0, 0.5, 0.5]);
  root.userData.nightMaterial = mat;
  return root;
}
