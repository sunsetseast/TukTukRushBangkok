import { DISTRICT_SIGN_ENTRIES, districtSigns } from "./districtSigns";
import { CURATED_SIGNS, curatedSignKey } from "./curatedSigns";
import { completeStreetFabric } from "./streetFabric";
import { cityPlaces } from "./cityPlaces";
import * as T from "three";
import type { District } from "../types";
import { StaticBatch } from "../staticBatch";
import { buildSignAtlas, type SignEntry, type SignStyle } from "../signArt";
import {
  designBuildings,
  type ParcelDesign,
  type Trade,
} from "./buildingGrammar";
/** Trade phrases, not invented glyphs or copied real brand marks. Thai shaping
 * happens before atlas downsampling using the locally licensed Rush Thai font. */
export const TRADE_SIGNS: Record<
  Exclude<Trade, "residence" | "closed">,
  { style: SignStyle; text: string[] }
> = {
  noodle: { style: "noodle", text: ["ก๋วยเตี๋ยว", "บะหมี่", "โจ๊ก"] },
  gold: { style: "gold", text: ["ร้านทอง", "金店", "ทองคำ"] },
  tea: { style: "heritage", text: ["ชาไทย", "茶樓", "น้ำชา"] },
  coffee: { style: "heritage", text: ["กาแฟ", "กาแฟสด", "COFFEE"] },
  food: { style: "noodle", text: ["ร้านอาหาร", "อาหารตามสั่ง", "食堂"] },
  fruit: { style: "heritage", text: ["ผลไม้", "น้ำผลไม้", "水果"] },
  clothes: { style: "hotel", text: ["เสื้อผ้า", "ร้านตัดเสื้อ", "TAILOR"] },
  medicine: { style: "pharmacy", text: ["ร้านยา", "สมุนไพร", "藥行"] },
  hotel: { style: "hotel", text: ["โรงแรม", "GUESTHOUSE", "HOSTEL"] },
  workshop: {
    style: "heritage",
    text: ["ซ่อมเครื่องยนต์", "อะไหล่", "โรงกลึง"],
  },
  gallery: { style: "heritage", text: ["หอศิลป์", "GALLERY", "งานศิลปะ"] },
  retail: { style: "hotel", text: ["MARKET", "BOUTIQUE", "ร้านค้า"] },
};
export const SIGN_ENTRIES: SignEntry[] = Object.entries(TRADE_SIGNS)
  .flatMap(([trade, v]) =>
    v.text.map((text, i) => ({
      key: `${trade}:${i}`,
      text,
      style: v.style,
      variant: i,
    })),
  )
  .concat(DISTRICT_SIGN_ENTRIES, CURATED_SIGNS, [
    {
      key: "odeon-inscription",
      text: "聖壽無疆",
      style: "heritage",
      variant: 0,
    },
  ]);
export function buildBangkokSigns(d: District, designs = designBuildings(d)) {
  const atlas = buildSignAtlas(SIGN_ENTRIES, true),
    batch = new StaticBatch(),
    root = new T.Group();
  const matH = new T.MeshStandardMaterial({
    map: atlas.h.tex,
    emissiveMap: atlas.h.tex,
    emissive: "#ffffff",
    emissiveIntensity: 0.16,
    roughness: 0.57,
    side: T.FrontSide,
  });
  const matV = new T.MeshStandardMaterial({
    map: atlas.v.tex,
    emissiveMap: atlas.v.tex,
    emissive: "#ffffff",
    emissiveIntensity: 0.16,
    roughness: 0.59,
    side: T.FrontSide,
  });
  const tile = (i: number, v: boolean) => {
    const a = v ? atlas.v : atlas.h,
      g = new T.PlaneGeometry(1, 1),
      uv = g.attributes.uv;
    for (let n = 0; n < uv.count; n++)
      uv.setXY(
        n,
        ((i % a.cols) + 0.012 + uv.getX(n) * 0.976) / a.cols,
        (a.rows - 1 - Math.floor(i / a.cols) + 0.012 + uv.getY(n) * 0.976) /
          a.rows,
      );
    return g;
  };
  const h = SIGN_ENTRIES.map((_, i) => tile(i, false)),
    v = SIGN_ENTRIES.map((_, i) => tile(i, true)),
    temp = new T.Object3D();
  const place = (
    p: ParcelDesign,
    u: number,
    y: number,
    z: number,
    w: number,
    height: number,
    i: number,
    vertical = false,
    rotation = 0,
  ) => {
    const b = p.parcel,
      yaw = b.yaw ?? 0,
      c = Math.cos(yaw),
      s = Math.sin(yaw);
    temp.position.set(b.x + c * u + s * z, y, b.z - s * u + c * z);
    temp.rotation.set(0, yaw + rotation, 0);
    temp.scale.set(w, height, 1);
    temp.updateMatrix();
    batch.add(vertical ? v[i]! : h[i]!, vertical ? matV : matH, [
      temp.matrix.clone(),
    ]);
  };
  for (const p of designs.filter((p) => !p.parcel.artRole))
    for (const a of p.bays) {
      if (a.trade === "residence" || a.trade === "closed") continue;
      const i = atlas.index.get(
        curatedSignKey(p, a) ?? `${a.trade}:${a.sign}`,
      )!;
      const W = a.width - 0.16,
        sw = Math.min(W - 0.55, a.type === "workshop" ? W * 0.65 : W - 0.55);
      place(p, a.u, 4.32, a.front + 0.558, sw - 0.1, 0.95, i);
      if (a.cabinet)
        for (const side of [-1, 1])
          place(
            p,
            a.u + W * 0.31 + side * 0.407,
            Math.min(a.height - 2, 8.1),
            a.front + 1.25,
            1.2,
            4.48,
            i,
            true,
            (side * Math.PI) / 2,
          );
    }
  for (const sign of districtSigns(designs)) {
    const i = atlas.index.get(sign.key)!;
    if (sign.blade)
      for (const side of [-1, 1])
        place(
          sign.p,
          sign.u + side * 0.286,
          sign.y,
          sign.v,
          sign.width,
          sign.height,
          i,
          !sign.round,
          (side * Math.PI) / 2,
        );
    else
      place(sign.p, sign.u, sign.y, sign.v + 0.235, sign.width, sign.height, i);
  }
  const byParcel = new Map(designs.map((p) => [p.parcel, p]));
  for (const node of cityPlaces(d, designs).filter((p) => p.parcel)) {
    const b = node.parcel!,
      p = byParcel.get(b);
    if (p)
      place(
        p,
        0,
        3.95,
        b.d / 2 + 0.26,
        Math.min(b.w - 1.2, 6.8),
        0.66,
        atlas.index.get("hotel:0")!,
      );
  }
  for (const f of completeStreetFabric(d).faces) {
    if (f.parcel.chinatown) continue;
    const p = byParcel.get(f.parcel);
    if (!p) continue;
    const a = p.bays[0]!;
    if (a.trade === "residence" || a.trade === "closed") continue;
    const count = Math.max(
        1,
        Math.floor(
          (f.width - 0.4) /
            (["siam", "silom", "sukhumvit", "icon"].includes(p.region)
              ? 6.5
              : 5),
        ),
      ),
      bw = (f.width - 0.4) / count,
      index = atlas.index.get(`${a.trade}:${a.sign}`)!,
      c = Math.cos(f.yaw),
      s = Math.sin(f.yaw);
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) * bw - (f.width - 0.4) / 2,
        v = f.depth / 2 + 0.32;
      temp.position.set(
        f.parcel.x + c * u + s * v,
        3.95,
        f.parcel.z - s * u + c * v,
      );
      temp.rotation.set(0, f.yaw, 0);
      temp.scale.set(bw - 0.5, 0.67, 1);
      temp.updateMatrix();
      batch.add(h[index]!, matH, [temp.matrix.clone()]);
    }
  }
  // Lettering shares the existing atlas/material; no per-landmark canvases.
  for (const l of d.landmarks.filter(
    (l) => l.id === "gate" || l.id === "khaosan",
  )) {
    const site = l.plot ?? l,
      yaw = l.yaw ?? 0,
      c = Math.cos(yaw),
      s = Math.sin(yaw);
    const board = (
      key: string,
      x: number,
      y: number,
      z: number,
      w: number,
      height: number,
      rotation = 0,
    ) => {
      temp.position.set(site.x + c * x + s * z, y, site.z - s * x + c * z);
      temp.rotation.set(0, yaw + rotation, 0);
      temp.scale.set(w, height, 1);
      temp.updateMatrix();
      batch.add(h[atlas.index.get(key)!]!, matH, [temp.matrix.clone()]);
    };
    if (l.id === "gate")
      for (const side of [-1, 1])
        board(
          "odeon-inscription",
          0,
          12.8,
          side * 4.4,
          13,
          2.1,
          side < 0 ? Math.PI : 0,
        );
    else {
      for (const side of [-1, 1])
        for (let i = 0; i < 5; i++)
          board(
            [
              "khao-hostel",
              "khao-travel",
              "khao-cafe",
              "khao-tailor",
              "khao-live",
            ][i]!,
            side * 6.35,
            4.4,
            -14 + i * 6.5,
            4.6,
            1,
            side < 0 ? Math.PI / 2 : -Math.PI / 2,
          );
      for (const side of [-1, 1])
        for (const end of [-1, 1])
          board(
            side < 0 ? "khao-hostel" : "khao-cafe",
            side * 11,
            3.6,
            end < 0 ? -17.4 : 15.5,
            6.8,
            0.7,
            end < 0 ? Math.PI : 0,
          );
    }
  }
  batch.finish().forEach((chunk) => {
    chunk.name = "BangkokSign";
    root.add(chunk);
  });
  return root;
}
