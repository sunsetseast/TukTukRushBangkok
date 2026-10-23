import type { Trade } from "./buildingGrammar";
/** Six deliberately selected, existing plots form a continuous central driving
 * sequence. Internal art labels describe fictional shops, never real brands. */
export const CHINATOWN_COMPOSITIONS: Record<
  string,
  {
    trade: Trade;
    wall: string;
    accent: string;
    treatment: "kitchen" | "tea-balcony" | "gold-gallery" | "apothecary";
  }
> = {
  "ctparcel:ctblock:9:0:0": {
    trade: "noodle",
    wall: "#c4b28e",
    accent: "#28766b",
    treatment: "kitchen",
  },
  "ctparcel:ctblock:24:8:0": {
    trade: "tea",
    wall: "#b9bfa7",
    accent: "#6e354a",
    treatment: "tea-balcony",
  },
  "ctparcel:ctblock:24:8:1": {
    trade: "food",
    wall: "#c4ac91",
    accent: "#a62c36",
    treatment: "kitchen",
  },
  "ctparcel:ctblock:10:2:1": {
    trade: "gold",
    wall: "#d1bea0",
    accent: "#942739",
    treatment: "gold-gallery",
  },
  "ctparcel:ctblock:10:2:3": {
    trade: "medicine",
    wall: "#aebcae",
    accent: "#33675f",
    treatment: "apothecary",
  },
  "ctparcel:ctblock:25:3:2": {
    trade: "noodle",
    wall: "#ceb79a",
    accent: "#a44c37",
    treatment: "kitchen",
  },
};
