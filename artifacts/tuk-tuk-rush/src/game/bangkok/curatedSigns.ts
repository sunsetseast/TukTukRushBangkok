import type { SignEntry } from "../signArt";
import type { Bay, ParcelDesign } from "./buildingGrammar";
import { cinematicParcel } from "./yaowarat";
/** Ordinary trade descriptions, not fabricated transliterations or real logos.
 * Meanings and font coverage are recorded in the art standard / cmap tests. */
export const CURATED_SIGNS: SignEntry[] = [
  { key: "chinatown-hsh", text: "ฮั่วเซ่งเฮง", style: "gold", variant: 0 },
  { key: "chinatown-ttk", text: "ตั้งโต๊ะกัง", style: "gold", variant: 1 },
  { key: "premium-gold-th", text: "ทองรูปพรรณ", style: "gold", variant: 0 },
  { key: "premium-gold-cn", text: "金飾", style: "gold", variant: 1 },
  {
    key: "premium-noodle-th",
    text: "บะหมี่เกี๊ยว",
    style: "noodle",
    variant: 0,
  },
  { key: "premium-noodle-cn", text: "麵館", style: "noodle", variant: 1 },
  { key: "premium-tea-th", text: "ชาจีน", style: "heritage", variant: 0 },
  { key: "premium-tea-cn", text: "茶行", style: "heritage", variant: 1 },
  { key: "premium-food-th", text: "ข้าวต้ม", style: "noodle", variant: 0 },
  { key: "premium-food-cn", text: "粥", style: "noodle", variant: 1 },
  {
    key: "premium-retail-th",
    text: "เครื่องครัว",
    style: "heritage",
    variant: 0,
  },
  { key: "premium-clothes-cn", text: "絲綢", style: "heritage", variant: 1 },
  { key: "premium-hotel-th", text: "ห้องพัก", style: "hotel", variant: 0 },
  { key: "premium-fruit-th", text: "ผลไม้สด", style: "heritage", variant: 0 },
];
const keys: Record<string, string[]> = {
  gold: ["premium-gold-th", "premium-gold-cn"],
  noodle: ["premium-noodle-th", "premium-noodle-cn"],
  tea: ["premium-tea-th", "premium-tea-cn"],
  food: ["premium-food-th", "premium-food-cn"],
  retail: ["premium-retail-th"],
  clothes: ["premium-clothes-cn"],
  hotel: ["premium-hotel-th"],
  fruit: ["premium-fruit-th"],
};
export function curatedSignKey(p: ParcelDesign, a: Bay) {
  if (p.parcel.chinatown?.identity === "hua-seng-heng") return "chinatown-hsh";
  if (p.parcel.chinatown?.identity === "tang-to-kang") return "chinatown-ttk";
  if (!cinematicParcel(p)) return undefined;
  const choices = keys[a.trade];
  return choices?.[(a.seed >>> 4) % choices.length];
}
