import { cinematicParcel } from "./yaowarat";
import type { ParcelDesign } from "./buildingGrammar";
import type { ArtPiece } from "./architecturalBatch";
import type { SignEntry } from "../signArt";
export const DISTRICT_SIGN_ENTRIES: SignEntry[] = [
  { key: "canyon-gold", text: "ทองคำ", style: "gold", variant: 0 },
  { key: "canyon-chinese", text: "金店", style: "gold", variant: 1 },
  { key: "canyon-tea", text: "茶樓", style: "heritage", variant: 0 },
  { key: "canyon-food", text: "食堂", style: "noodle", variant: 1 },
  { key: "canyon-herbs", text: "參茸藥行", style: "heritage", variant: 2 },
  { key: "canyon-jewel", text: "珠寶", style: "gold", variant: 3 },
  { key: "canyon-silk", text: "絲綢", style: "heritage", variant: 1 },
  { key: "canyon-noodles", text: "麵館", style: "noodle", variant: 2 },
  { key: "khao-travel", text: "TRAVEL & TOURS", style: "hotel", variant: 1 },
  { key: "khao-hostel", text: "GUESTHOUSE", style: "hotel", variant: 0 },
  { key: "khao-live", text: "LIVE MUSIC", style: "hotel", variant: 2 },
  { key: "khao-cafe", text: "CAFE & BAR", style: "heritage", variant: 3 },
  { key: "khao-tailor", text: "TAILOR", style: "hotel", variant: 1 },
  { key: "khao-market", text: "NIGHT MARKET", style: "heritage", variant: 2 },
  { key: "khao-roof", text: "ROOFTOP", style: "hotel", variant: 3 },
];
export type DistrictSign = {
  p: ParcelDesign;
  key: string;
  u: number;
  y: number;
  v: number;
  width: number;
  height: number;
  blade: boolean;
  round?: boolean;
  hero?: boolean;
};
/** Ordinary trade labels only; real branches require verified properties. */
export function districtSigns(designs: ParcelDesign[]): DistrictSign[] {
  const signs: DistrictSign[] = [];
  for (const p of designs) {
    const b = p.parcel;
    if (b.artRole || !["chinatown", "khaosan"].includes(p.region)) continue;
    const seed = p.bays[0]!.seed,
      F = b.d / 2,
      key: string|undefined = undefined,
      khao = p.region === "khaosan";
    const menu = khao
      ? [
          "khao-hostel",
          "khao-live",
          "khao-cafe",
          "khao-tailor",
          "khao-market",
          "khao-roof",
          "khao-travel",
        ]
      : [
          "canyon-gold",
          "canyon-chinese",
          "canyon-herbs",
          "canyon-food",
          "canyon-tea",
          "canyon-jewel",
          "canyon-silk",
          "canyon-noodles",
        ];
    const showcase = cinematicParcel(p);
    const height = showcase
        ? Math.min(5.4 + (seed % 3) * 0.8,Math.min(...p.bays.map(a=>a.height))-5.8)
        : khao
          ? 2 + (seed % 3) * 0.65
          : 5.5 + (seed % 4) * 1.2,
      y = showcase
        ? 5.2+height/2
        : khao
          ? 7.4 + (seed % 4) * 0.7
          : Math.max(9, Math.min(15, b.height - 2));
    signs.push({
      p,
      key: key ?? menu[seed % menu.length]!,
      u: b.w * 0.28,
      y,
      v: F + (showcase ? 2.3 : khao ? 2.6 : 3.2),
      width: showcase
        ? 1.9 + (seed % 3) * 0.2
        : khao
          ? 3.4 + (seed % 3) * 0.55
          : 2.7 + (seed % 3) * 0.65,
      height,
      blade: true,
      round: khao && seed % 4 === 0,
      hero: !!key,
    });
    if (seed % 3 !== 0 || key)
      signs.push({
        p,
        key: key ?? menu[(seed + 1) % menu.length]!,
        u: -b.w * 0.22,
        y: khao ? 5.8 : 5.9,
        v: F + 1.4,
        width: Math.min(b.w * 0.75, khao ? 6.8 : 10),
        height: khao ? 1.8 : 1.9,
        blade: false,
        hero: !!key,
      });
  }
  return signs;
}
export function emitDistrictSigns(
  designs: ParcelDesign[],
  emit: (p: ArtPiece) => void,
) {
  for (const sign of districtSigns(designs)) {
    const { p, u, y, v, width, height, blade } = sign,
      b = p.parcel,
      yaw = b.yaw ?? 0,
      F = b.d / 2,
      c = Math.cos(yaw),
      s = Math.sin(yaw);
    const B = (
      x: number,
      h: number,
      z: number,
      w: number,
      H: number,
      d: number,
      color: string,
      layer: ArtPiece["layer"] = "core",
      shape: ArtPiece["shape"] = "box",
      pitch = 0,
    ) =>
      emit({
        x: b.x + c * x + s * z,
        y: h,
        z: b.z - s * x + c * z,
        w,
        h: H,
        d,
        color,
        yaw,
        layer,
        shape,
        pitch,
        surface: "metal",
      });
    // Cabinet's back reaches its facade; two steel arms make the mounting legible.
    for (const h of [y - height * 0.32, y + height * 0.32])
      B(u, h, (F + v) / 2, 0.18, 0.16, v - F + width * 0.45, "#435457");
    B(u, y, F + 0.1, 0.32, height + 0.5, 0.22, "#5c5550");
    B(
      u,
      y,
      v,
      blade ? 0.55 : width + 0.25,
      height + 0.25,
      blade ? width + 0.25 : 0.45,
      "#324946",
    );
    if (sign.round)
      B(
        u,
        y,
        v,
        0.62,
        height + 0.5,
        width + 0.3,
        "#a34154",
        "core",
        "cylinder",
        Math.PI / 2,
      );
    else
      for (const side of [-1, 1])
        B(
          u,
          y + side * height * 0.5,
          v,
          blade ? 0.6 : width + 0.35,
          0.1,
          blade ? width + 0.35 : 0.5,
          p.region === "khaosan" ? "#86cab9" : "#ebc569",
          "night",
        );
    if (sign.hero) {
      B(0, 2.6, F + 0.15, b.w - 0.5, 4.5, 0.24, "#942c38");
      for (const x of [-b.w * 0.42, 0, b.w * 0.42])
        B(x, 2.7, F + 0.35, 0.28, 4.8, 0.24, "#dcbe75");
      B(0, 4.9, F + 0.2, b.w, 0.35, 0.35, "#e1c172", "night");
    }
  }
}
