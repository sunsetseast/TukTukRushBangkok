import type { SignEntry } from "../signArt";
import type { ParcelDesign } from "./buildingGrammar";
import type { DistrictSign } from "./districtSigns";
/** Ordinary trade words; no invented brands. All glyphs already occur in the
 * licensed shipped Thai/Chinese subsets. Secondary Thai stays horizontally shaped. */
export const CHINATOWN_SIGN_ENTRIES: SignEntry[] = [
  {
    key: "ct-gold",
    text: "金飾",
    secondary: "ทองรูปพรรณ",
    style: "gold",
    variant: 0,
    layout: "neon",
    palette: ["#971c2f", "#f7b44b", "#ffe4a1"],
  },
  {
    key: "ct-noodle",
    text: "麵館",
    secondary: "บะหมี่เกี๊ยว",
    style: "noodle",
    variant: 1,
    layout: "neon",
    palette: ["#152f35", "#66dbc9", "#d2ffdc"],
  },
  {
    key: "ct-food",
    text: "食堂",
    secondary: "ร้านอาหาร",
    style: "noodle",
    variant: 2,
    layout: "neon",
    palette: ["#a92736", "#ffc67e", "#fff0bd"],
  },
  {
    key: "ct-tea",
    text: "茶樓",
    secondary: "ชาจีน",
    style: "heritage",
    variant: 3,
    layout: "neon",
    palette: ["#302038", "#db7cbd", "#ffcff2"],
  },
  {
    key: "ct-herbs",
    text: "參茸藥行",
    secondary: "สมุนไพร",
    style: "pharmacy",
    variant: 4,
    layout: "painted",
    palette: ["#e5d6b1", "#3f6657", "#345c46"],
  },
  {
    key: "ct-clothes",
    text: "絲綢",
    secondary: "ร้านตัดเสื้อ",
    style: "heritage",
    variant: 5,
    layout: "painted",
    palette: ["#234d55", "#bda97c", "#f3deb3"],
  },
  {
    key: "ct-merchant",
    text: "เครื่องครัว",
    secondary: "MARKET",
    style: "heritage",
    variant: 6,
    layout: "painted",
    palette: ["#d4c5a4", "#6d523a", "#493d2d"],
  },
  {
    key: "ct-workshop",
    text: "อะไหล่",
    secondary: "ซ่อมเครื่องยนต์",
    style: "heritage",
    variant: 7,
    layout: "painted",
    palette: ["#485f59", "#b7b291", "#e0d1a8"],
  },
  {
    key: "ct-coffee",
    text: "กาแฟ",
    secondary: "COFFEE",
    style: "heritage",
    variant: 8,
    layout: "painted",
    palette: ["#ddd0b3", "#5c6e59", "#384b3e"],
  },
];
export function chinatownSigns(p: ParcelDesign): DistrictSign[] {
  const b = p.parcel,
    ct = b.chinatown;
  if (!ct || ct.role) return [];
  const a = p.bays[0]!,
    seed = a.seed,
    W = b.w,
    F = b.d / 2,
    H = b.height,
    yao = ct.character === "yaowarat",
    quiet = ["songwat", "talatnoi"].includes(ct.character);
  const key =
    ct.identity === "hua-seng-heng"
      ? "chinatown-hsh"
      : ct.identity === "tang-to-kang"
        ? "chinatown-ttk"
        : a.trade === "gold"
          ? "ct-gold"
          : a.trade === "noodle"
            ? "ct-noodle"
            : a.trade === "food"
              ? "ct-food"
              : a.trade === "tea"
                ? "ct-tea"
                : a.trade === "medicine"
                  ? "ct-herbs"
                  : a.trade === "clothes"
                    ? "ct-clothes"
                    : a.trade === "workshop"
                      ? "ct-workshop"
                      : ["coffee", "gallery"].includes(a.trade)
                        ? "ct-coffee"
                        : "ct-merchant";
  if (["closed", "residence"].includes(a.trade)) return [];
  if (quiet)
    return seed % 4 !== 0
      ? []
      : [
          {
            p,
            key,
            u: -W * 0.3,
            y: 5.45,
            v: F + 1.05 + 1.35 / 2,
            width: 1.35,
            height: 1.7,
            blade: true,
          },
        ];
  const height = Math.min(H - 6.3, 8.7, (yao ? 7.2 : 4.8) + (seed % 4) * 0.72),
    width = yao
      ? Math.min(2.25, 2.1 + (seed % 4) * 0.22)
      : 1.8 + (seed % 3) * 0.25;
  const signs: DistrictSign[] = [
    {
      p,
      key,
      u: W * (seed % 2 ? -0.3 : 0.3),
      y: 5.65 + height / 2,
      v: F + width / 2 + 1.65,
      width,
      height,
      blade: true,
    },
  ];
  // Smaller secondary cabinets at a different height/palette break long rows.
  // Keep the existing shop fascia unobscured; every bracket returns to its owner.
  if (yao && seed % 3 === 0 && H > 16.8)
    signs.push({
      p,
      key: a.trade === "gold" ? "ct-gold" : "ct-food",
      u: -signs[0]!.u,
      y: H - 1.5,
      v: F + 0.38,
      width: Math.min(W * 0.32, 5.2),
      height: 1.35,
      blade: false,
    });
  if (yao && seed % 4 === 1)
    signs.push({
      p,
      key,
      u: -signs[0]!.u,
      y: 6.9,
      v: F + 1.65 + 1.35 / 2,
      width: 1.35,
      height: 2.6,
      blade: true,
    });
  return signs;
}
