import type { District, Obstacle } from "../types";
import { distanceToSegment } from "../world";

export type Typology =
  | "shophouse"
  | "arcade"
  | "timber"
  | "noodle"
  | "gold"
  | "concrete"
  | "guesthouse"
  | "apartment"
  | "retail"
  | "office"
  | "workshop"
  | "warehouse"
  | "riverhouse"
  | "residence";
export type Trade =
  | "noodle"
  | "gold"
  | "tea"
  | "coffee"
  | "food"
  | "fruit"
  | "clothes"
  | "medicine"
  | "hotel"
  | "workshop"
  | "gallery"
  | "residence"
  | "closed"
  | "retail";
export type Surface =
  | "plaster"
  | "concrete"
  | "brick"
  | "tile"
  | "wood"
  | "metal"
  | "cloth"
  | "panel";
export type Bay = {
  id: string;
  u: number;
  width: number;
  depth: number;
  height: number;
  front: number;
  type: Typology;
  trade: Trade;
  roof: "gable" | "parapet" | "terrace" | "sawtooth";
  floors: number;
  windows: number;
  balcony: boolean;
  corner: boolean;
  wall: string;
  trim: string;
  accent: string;
  surface: Surface;
  seed: number;
  sign: number;
  cabinet: boolean;
  occupied: boolean;
};
export type ParcelDesign = {
  id: string;
  parcel: Obstacle;
  region: string;
  corridor: string;
  hero?: string;
  bays: Bay[];
};
export const stableHash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};
export const buildingIdentity = (b: Obstacle) =>
  `bkk:${Math.round(b.x * 100)}:${Math.round(b.z * 100)}:${Math.round((b.yaw ?? 0) * 10000)}`;

type Grammar = {
  types: Typology[];
  walls: string[];
  trims: string[];
  accents: string[];
  bayCount: number[];
};
export const GRAMMARS: Record<string, Grammar> = {
  paknam:{types:['residence','timber','arcade'],walls:['#f4dfb0','#d5e5bd','#f0bc91'],trims:['#3e8066','#ad653e'],accents:['#e1ac42','#37a99b'],bayCount:[2,3]},
  chinatown: {
    types: ["shophouse", "gold", "noodle", "arcade", "concrete", "timber"],
    walls: ["#f4d9a2", "#e5ad79", "#9ed6c3", "#f1bb92", "#d5b9d0"],
    trims: ["#476b60", "#752e31", "#494544"],
    accents: ["#bd303e", "#dcaa40", "#2e8984"],
    bayCount: [3, 4, 3, 2],
  },
  talatnoi: {
    types: [
      "workshop",
      "timber",
      "warehouse",
      "arcade",
      "riverhouse",
      "residence",
    ],
    walls: ["#ccb99d", "#b6c9b3", "#c89e83", "#e2d1af"],
    trims: ["#315b50", "#654639", "#565a56"],
    accents: ["#83775a", "#9e5743", "#558b82"],
    bayCount: [3, 2, 3, 4],
  },
  oldtown: {
    types: ["arcade", "timber", "residence", "shophouse", "guesthouse"],
    walls: ["#f1dfb6", "#d6c79f", "#c4d1b3", "#e6be9a"],
    trims: ["#52745c", "#694732", "#8a5140"],
    accents: ["#bc784c", "#d9bb65", "#588875"],
    bayCount: [3, 3, 2],
  },
  siam: {
    types: ["retail", "retail", "office", "concrete", "apartment"],
    walls: ["#c7d7da", "#e4ddd0", "#92a9b4"],
    trims: ["#35475c", "#587484"],
    accents: ["#4eb0b4", "#dda761", "#bc709f"],
    bayCount: [1, 1, 2],
  },
  silom: {
    types: ["office", "apartment", "concrete", "guesthouse", "noodle"],
    walls: ["#adbec5", "#dfcfb6", "#89a1ad"],
    trims: ["#3c5265", "#6b6259"],
    accents: ["#75a99a", "#cc9a67"],
    bayCount: [1, 2, 3],
  },
  sukhumvit: {
    types: ["apartment", "office", "guesthouse", "retail", "concrete"],
    walls: ["#c6d0c6", "#dec9b2", "#9db2bd"],
    trims: ["#466373", "#575852"],
    accents: ["#579d96", "#b68a69"],
    bayCount: [2, 1, 3],
  },
  icon: {
    types: ["retail", "riverhouse", "guesthouse", "apartment"],
    walls: ["#ebd9b7", "#c3d4d4", "#b5bfb4"],
    trims: ["#405f66", "#736149"],
    accents: ["#d7ad52", "#80b3ad"],
    bayCount: [1, 2, 3],
  },
  westbank: {
    types: ["riverhouse", "timber", "residence", "warehouse", "noodle"],
    walls: ["#d6c5a3", "#b2c7ba", "#cfa27e"],
    trims: ["#5c6150", "#705041"],
    accents: ["#bb7e50", "#459186"],
    bayCount: [2, 3, 3],
  },
  khaosan: {
    types: ["guesthouse", "timber", "noodle", "shophouse", "arcade"],
    walls: ["#f0d49f", "#bdddab", "#f1ac8a", "#a5d9e6"],
    trims: ["#52543e", "#526b75"],
    accents: ["#b85973", "#ddac4f", "#448c81"],
    bayCount: [3, 2, 4],
  },
  north: {
    types: ["concrete", "residence", "workshop", "apartment", "shophouse"],
    walls: ["#c4c6b0", "#d4b794", "#abc5bd"],
    trims: ["#53685b", "#655b4d"],
    accents: ["#8baf71", "#bb7950"],
    bayCount: [2, 3, 2],
  },
  south: {
    types: ["warehouse", "riverhouse", "concrete", "guesthouse", "residence"],
    walls: ["#d3b795", "#b3c3b8", "#d4d2bd"],
    trims: ["#566d65", "#72604d"],
    accents: ["#a36e4e", "#5c938b"],
    bayCount: [2, 3, 1],
  },
  connector: {
    types: ["residence", "concrete", "timber", "workshop", "shophouse"],
    walls: ["#d6c3a6", "#c7deab", "#e7ad91"],
    trims: ["#596958", "#665646"],
    accents: ["#889d62", "#a27657"],
    bayCount: [3, 2, 3],
  },
};
/** Art-directed sequences attach to existing corridor/landmark parcels. No alternate scene. */
export const HERO_STREETS = [
  {
    id: "yaowarat-gate",
    region: "chinatown",
    landmark: "gate",
    radius: 470,
    sequence: [
      "gold",
      "noodle",
      "arcade",
      "shophouse",
      "timber",
      "gold",
    ] as Typology[],
  },
  {
    id: "songwat-workshops",
    region: "talatnoi",
    landmark: "gate",
    radius: 1200,
    sequence: [
      "workshop",
      "timber",
      "arcade",
      "warehouse",
      "riverhouse",
      "workshop",
    ] as Typology[],
  },
  {
    id: "watpho-heritage",
    region: "oldtown",
    landmark: "pho",
    radius: 470,
    sequence: [
      "arcade",
      "residence",
      "timber",
      "guesthouse",
      "shophouse",
    ] as Typology[],
  },
  {
    id: "siam-retail",
    region: "siam",
    landmark: "paragon",
    radius: 550,
    sequence: [
      "retail",
      "office",
      "retail",
      "apartment",
      "concrete",
    ] as Typology[],
  },
  {
    id: "iconsiam-river",
    region: "icon",
    landmark: "icon",
    radius: 520,
    sequence: ["retail", "riverhouse", "guesthouse", "apartment"] as Typology[],
  },
] as const;
const TRADE: Record<Typology, Trade[]> = {
  shophouse: ["tea", "clothes", "food", "fruit", "closed"],
  arcade: ["coffee", "gallery", "food", "closed"],
  timber: ["residence", "tea", "coffee", "closed"],
  noodle: ["noodle"],
  gold: ["gold"],
  concrete: ["food", "clothes", "closed", "medicine"],
  guesthouse: ["hotel"],
  apartment: ["residence", "coffee", "closed"],
  retail: ["retail"],
  office: ["retail", "coffee"],
  workshop: ["workshop"],
  warehouse: ["workshop", "gallery", "closed"],
  riverhouse: ["food", "coffee", "residence"],
  residence: ["residence"],
};
export function designBuildings(d: District): ParcelDesign[] {
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const roads = d.roads
    .filter((r) => !r.bridge && !r.shortcut)
    .map((r) => ({ r, a: nodes.get(r.a)!, b: nodes.get(r.b)! }));
  return d.buildings.map((b) => {
    const id = buildingIdentity(b),
      seed = stableHash(id),
      region = b.regionId ?? "connector",
      g = GRAMMARS[region] ?? (region==='paknam'?GRAMMARS.westbank!:GRAMMARS.connector!);
    const road = roads.reduce((best, r) =>
      distanceToSegment(b, r.a, r.b).distance <
      distanceToSegment(b, best.a, best.b).distance
        ? r
        : best,
    );
    const hero = HERO_STREETS.find(
      (h) =>
        h.region === region &&
        d.landmarks.some(
          (l) =>
            l.id === h.landmark && Math.hypot(l.x - b.x, l.z - b.z) < h.radius,
        ),
    );
    const count = Math.min(g.bayCount[seed % g.bayCount.length]!,Math.max(1,Math.floor(b.w/5.5)));
    const weights = Array.from(
        { length: count },
        (_, i) => 0.8 + (stableHash(`${id}:width:${i}`) % 9) / 20,
      ),
      sum = weights.reduce((a, v) => a + v, 0);
    let edge = -b.w / 2;
    const bays = weights.map((weight, i): Bay => {
      const s = stableHash(`${id}:${i}`),
        width = (b.w * weight) / sum,
        u = edge + width / 2;
      edge += width;
      const type = hero
        ? hero.sequence[
            (Math.floor(
              (b.x * Math.cos(b.yaw ?? 0) - b.z * Math.sin(b.yaw ?? 0)) / 26,
            ) +
              i +
              10000) %
              hero.sequence.length
          ]!
        : g.types[(s >>> 4) % g.types.length]!;
      const tall = ["office", "apartment"].includes(type),
        modern = ["retail", "office", "apartment"].includes(type);
      const floors = tall
        ? 5 + (s % 8)
        : type === "warehouse"
          ? 1
          : modern
            ? 2 + (s % 3)
            : 2 + (s % 3);
      const height = floors * (modern ? 3.9 : 3.35) + 1.5,
        front =
          b.d / 2 -
          (type === "residence" ? 1.6 : modern ? 1.1 : ((s >>> 8) % 3) * 0.23);
      const depth = b.d - ((s >>> 12) % 4) * 0.6;
      const trades = TRADE[type];
      let trade = trades[(s >>> 9) % trades.length]!;
      if (region === "chinatown" && trade === "gallery") trade = "tea";
      return {
        id: `${id}:${i}`,
        u,
        width,
        depth,
        height,
        front,
        type,
        trade,
        floors,
        windows: width > 9 ? 3 : ((s >>> 13) % 2) + 1,
        balcony:
          type === "apartment" ||
          type === "riverhouse" ||
          (!modern && s % 3 === 0),
        corner:
          (i === 0 || i === count - 1) &&
          d.roads.some(
            (r) =>
              r.corridor !== road.r.corridor &&
              distanceToSegment(b, nodes.get(r.a)!, nodes.get(r.b)!).distance <
                44,
          ),
        roof:
          type === "warehouse"
            ? "sawtooth"
            : type === "timber" || type === "residence" || type === "riverhouse"
              ? "gable"
              : type === "apartment" || type === "office"
                ? "terrace"
                : "parapet",
        wall: g.walls[(s >>> 6) % g.walls.length]!,
        trim: g.trims[(s >>> 10) % g.trims.length]!,
        accent: g.accents[(s >>> 14) % g.accents.length]!,
        surface:
          type === "workshop"
            ? "brick"
            : type === "timber"
              ? "wood"
              : type === "warehouse"
                ? "metal"
                : modern
                  ? "panel"
                  : "plaster",
        seed: s,
        sign: (s >>> 7) % 3,
        cabinet:
          region === "chinatown" && trade !== "closed" && trade !== "residence",
        occupied: trade !== "closed" && trade !== "residence",
      };
    });
    return {
      id,
      parcel: b,
      region,
      corridor: road.r.corridor ?? "",
      hero: hero?.id,
      bays,
    };
  });
}
