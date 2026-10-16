import type { District } from "../types";
import {
  designBuildings,
  type ParcelDesign,
  type Bay,
  type Surface,
} from "./buildingGrammar";
import type { ArtPiece, Shape, Layer } from "./architecturalBatch";
export type Piece = (
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  depth: number,
  color: string,
  yaw: number,
) => void;
export type FacadeStats = {
  total: number;
  districts: string[];
  market: number;
  heritage: number;
  modern: number;
};
export function familyForRegion(id: string | undefined) {
  return ["chinatown", "khaosan", "north"].includes(id ?? "")
    ? "market"
    : ["siam", "silom", "sukhumvit"].includes(id ?? "")
      ? "modern"
      : ["westbank", "icon", "south"].includes(id ?? "")
        ? "riverside"
        : "heritage";
}

/** A shell is segmented around real openings. The dark room sits 2.2m behind
 * its columns; upper windows have masonry reveals, not plates on a solid box.
 * Ground props stay inside the original collider. Steps explain the closed
 * shop boundary; projecting canopies are overhead, never new driving barriers. */
export function emitDistrictArchitecture(
  designs: ParcelDesign[],
  emit: (piece: ArtPiece) => void,
) {
  for (const p of designs) {
    const b = p.parcel,
      yaw = b.yaw ?? 0,
      c = Math.cos(yaw),
      s = Math.sin(yaw);
    if (b.artRole === "background") {
      const a = p.bays[0]!,
        H = ["siam", "silom", "sukhumvit"].includes(p.region)
          ? Math.min(b.height, 80)
          : Math.min(a.height, 31),
        F = b.d / 2;
      const put = (
        u: number,
        y: number,
        v: number,
        w: number,
        h: number,
        depth: number,
        color: string,
        shape: Shape = "box",
        surface: Surface = a.surface,
      ) =>
        emit({
          x: b.x + c * u + s * v,
          y,
          z: b.z - s * u + c * v,
          w,
          h,
          d: depth,
          color,
          yaw,
          surface,
          shape,
        });
      put(0, H / 2, 0, b.w, H, b.d, a.wall);
      put(0, H + 0.1, 0, b.w, 0.35, b.d, a.trim);
      if (a.roof === "gable")
        put(0, H + 0.25, 0, b.w, 2.3, b.d, "#9c7456", "gable");
      else put(-b.w * 0.2, H + 1.5, 0, b.w * 0.42, 2.7, b.d * 0.5, a.trim);
      const urban = ["siam", "silom", "sukhumvit"].includes(p.region),
        count = urban
          ? Math.min(8, Math.floor(H / 5))
          : Math.min(3, Math.floor(H / 4));
      // Existing rear masses gain recessed bands, slab edges and corner piers.
      for (let f = 0; f < count; f++) {
        const y = 3.2 + (f * (H - 3)) / Math.max(1, count),
          wh = urban ? 2.5 : 1.8;
        for (const side of [-1, 1]) {
          put(
            0,
            y,
            side * (F + 0.015),
            b.w * 0.86,
            wh,
            0.045,
            urban ? "#3b6577" : "#48645c",
            "box",
            urban ? "panel" : "wood",
          );
          put(
            0,
            y - wh / 2 - 0.12,
            side * (F + 0.19),
            b.w * 0.94,
            0.24,
            0.42,
            a.trim,
            "box",
            "concrete",
          );
          if (urban)
            for (let col = 1; col < 4; col++)
              put(
                (col / 4 - 0.5) * b.w * 0.86,
                y,
                side * (F + 0.09),
                0.13,
                wh,
                0.18,
                a.trim,
                "box",
                "metal",
              );
          else
            for (const u of [-b.w * 0.22, b.w * 0.22])
              put(
                u,
                y,
                side * (F + 0.1),
                0.12,
                wh,
                0.24,
                a.trim,
                "box",
                "wood",
              );
        }
      }
      for (const side of [-1, 1])
        put(side * b.w * 0.47, H / 2, F + 0.12, 0.34, H, 0.38, a.trim);
      if (["siam", "silom", "sukhumvit"].includes(p.region))
        for (let y = 6; y < H - 1; y += 6)
          for (const side of [-1, 1])
            emit({
              x: b.x + s * side * (b.d / 2 + 0.04),
              y,
              z: b.z + c * side * (b.d / 2 + 0.04),
              w: b.w * 0.84,
              h: 0.8,
              d: 0.1,
              color: y % 12 ? "#91c7be" : "#e3bc81",
              yaw,
              layer: "night",
              surface: "panel",
            });
      continue;
    }
    for (const a of p.bays) {
      const W = a.width - 0.16,
        F = a.front,
        H = a.height,
        floor = (H - 1.5) / a.floors,
        shop = 3.35,
        modern = ["office", "retail", "apartment"].includes(a.type);
      let structuralLayer: Layer = "core";
      const put = (
        u: number,
        y: number,
        v: number,
        w: number,
        h: number,
        d: number,
        color: string,
        surface: Surface = a.surface,
        layer: Layer = structuralLayer,
        shape: Shape = "box",
        rotation = 0,
      ) =>
        emit({
          x: b.x + c * (a.u + u) + s * v,
          y,
          z: b.z - s * (a.u + u) + c * v,
          w,
          h,
          d,
          color,
          surface,
          layer,
          shape,
          yaw: yaw + rotation,
        });
      const B = (
        u: number,
        y: number,
        v: number,
        w: number,
        h: number,
        d: number,
        col: string,
        mat: Surface = a.surface,
        layer: Layer = structuralLayer,
      ) => put(u, y, v, w, h, d, col, mat, layer);
      const roof = H + 0.2,
        interior = a.occupied ? "#694b37" : "#354641";
      // Deep room / back structure with different rear color and service bands.
      B(
        0,
        H / 2,
        (F - 2.15 - a.depth / 2) / 2,
        W - 0.95,
        H,
        F - 2.15 + a.depth / 2,
        a.wall,
      );
      B(0, 1.55, F - 2.1, W - 0.35, 3.1, 0.18, interior, "wood");
      if (a.occupied) {
        B(
          0,
          3.26,
          F - 1.3,
          W * 0.75,
          0.08,
          1.15,
          a.trade === "gold" ? "#ffe0a0" : modern ? "#b5dce5" : "#eab77b",
          "panel",
          "night",
        );
        if (a.trade === "gold")
          for (const u of [-W * 0.23, 0, W * 0.23])
            B(
              u,
              1.35,
              F - 1.65,
              W * 0.16,
              0.42,
              0.24,
              "#d9ad55",
              "metal",
              "near",
            );
      }
      B(0, 0.28, F - 1, W, 0.56, 2.2, a.trim, "tile");
      B(0, 0.2, b.d / 2 - 0.8, W, 0.4, 1.6, a.trim, "tile");
      const cornerSide = a.corner && a.occupied ? (a.u > 0 ? 1 : -1) : 0;
      for (const side of [-1, 1]) {
        if (side === cornerSide)
          for (const v of [F - 1.92, F - 0.12])
            B(side * (W / 2 - 0.23), 1.9, v, 0.46, 3.8, 0.42, a.wall);
        else B(side * (W / 2 - 0.23), 1.9, F - 0.9, 0.46, 3.8, 2.1, a.wall);
      }
      B(0, 3.75, F - 0.8, W, 0.8, 2.1, a.wall);
      if (a.trade === "closed" || a.trade === "residence") {
        B(
          0,
          1.9,
          F - 0.25,
          W - 0.9,
          3,
          0.18,
          a.trade === "residence" ? a.trim : "#818a84",
          a.trade === "residence" ? "wood" : "metal",
        );
        if (a.trade === "residence")
          B(-W * 0.2, 1.9, F - 0.11, 0.18, 2.4, 0.08, "#d3b579", "metal");
      } else if (
        a.type === "gold" ||
        a.type === "retail" ||
        a.type === "guesthouse"
      ) {
        for (const side of [-1, 1]) {
          B(
            side * W * 0.27,
            1.85,
            F - 0.55,
            W * 0.32,
            2.7,
            0.15,
            "#3c6570",
            "panel",
          );
          B(
            side * W * 0.27,
            2.96,
            F - 0.42,
            W * 0.35,
            0.13,
            0.2,
            a.accent,
            "metal",
          );
        }
        B(0, 1.8, F - 0.6, 0.16, 2.9, 0.18, a.trim, "metal");
      }
      if (a.type === "arcade") {
        put(
          0,
          2.85,
          F - 0.05,
          W * 0.75,
          1.65,
          0.4,
          a.trim,
          "plaster",
          "core",
          "arch",
        );
        for (const side of [-1, 1])
          put(
            side * W * 0.39,
            1.5,
            F - 0.12,
            0.48,
            2.85,
            0.48,
            a.trim,
            "plaster",
            "core",
            "cylinder",
          );
      }
      // Unequal upper-window grids and masonry gaps around the openings.
      const levels = Math.min(a.floors - 1, modern ? 2 : 3),
        span = (W - 0.5) / a.windows;
      structuralLayer = "near";
      for (let f = 1; f <= levels; f++) {
        const y = shop + 0.9 + (f - 1) * floor,
          wh = Math.min(2.15, floor - 0.8),
          ww = Math.min(span * 0.64, modern ? 2.5 : 1.9);
        B(0, y - wh / 2 - 0.33, F - 0.66, W, 0.65, 1.7, a.wall);
        B(0, y + wh / 2 + 0.23, F - 0.65, W, 0.46, 1.7, a.wall);
        for (let n = 0; n <= a.windows; n++)
          B(
            -W / 2 + 0.25 + n * span,
            y,
            F - 0.6,
            Math.max(0.3, span - ww),
            wh,
            1.6,
            a.wall,
          );
        for (let n = 0; n < a.windows; n++) {
          const u = (n - (a.windows - 1) / 2) * span;
          B(
            u,
            y,
            F - 1.32,
            ww,
            wh,
            0.1,
            modern
              ? ["#2e5365", "#3b6571", "#345969"][(a.seed + n + f) % 3]!
              : "#243c46",
            "panel",
          );
          B(
            u,
            y + wh / 2 - 0.12,
            F - 0.28,
            ww,
            0.19,
            0.75,
            "#3f4945",
            "concrete",
          );
          if (!modern && (a.seed + n + f) % 3 === 0)
            for (const side of [-1, 1])
              put(
                u + side * (ww / 2 - 0.05),
                y,
                F - 0.18,
                0.3,
                wh,
                0.1,
                a.trim,
                "wood",
                "near",
                "box",
                side * 0.28,
              );
          if (modern && p.region === "siam")
            B(
              u + ww / 2 + 0.08,
              y,
              F + 0.06,
              0.12,
              wh + 0.28,
              0.75,
              a.trim,
              "metal",
            );
          B(
            u,
            y - wh / 2 - 0.06,
            F - 0.08,
            ww + 0.35,
            0.19,
            0.42,
            a.trim,
            "plaster",
          );
          B(
            u,
            y + wh / 2 + 0.08,
            F - 0.1,
            ww + 0.42,
            0.2,
            0.45,
            a.trim,
            "plaster",
          );
          const timber =
            a.type === "timber" ||
            a.type === "residence" ||
            a.type === "arcade";
          if (timber) {
            for (const side of [-1, 1])
              B(
                u + side * (ww / 2 + 0.2),
                y,
                F + 0.04,
                0.32,
                wh,
                0.24,
                a.trim,
                "wood",
              );
            B(u, y, F - 1.19, 0.09, wh, 0.1, a.trim, "wood");
          } else B(u, y, F - 0.94, 0.09, wh, 0.1, a.trim, "metal");
          if ((a.seed + f + n) % 4 !== 0)
            B(
              u,
              y,
              F - 1.15,
              ww * 0.78,
              wh * 0.82,
              0.06,
              (a.seed + f + n) % 3 ? "#e7b580" : "#8cbac8",
              "panel",
              "night",
            );
          if (a.type === "arcade")
            put(
              u,
              y + wh * 0.46,
              F + 0.02,
              ww + 0.4,
              0.7,
              0.22,
              a.trim,
              "plaster",
              "core",
              "arch",
            );
        }
        if (a.balcony && (a.type === "apartment" || f === 1)) {
          B(
            0,
            y - wh / 2 - 0.12,
            F + 0.38,
            W - 0.25,
            0.2,
            1.55,
            a.trim,
            "concrete",
          );
          B(
            0,
            y - wh / 2 + 0.85,
            F + 1.06,
            W - 0.38,
            0.12,
            0.1,
            a.accent,
            "metal",
          );
          for (const u of [-W * 0.42, 0, W * 0.42])
            B(u, y - wh / 2 + 0.4, F + 1.04, 0.11, 0.85, 0.12, a.trim, "metal");
          for (let n = 0; n < 5; n++)
            B(
              ((n - 2) * (W - 0.7)) / 5,
              y - wh / 2 + 0.42,
              F + 1.02,
              0.065,
              0.72,
              0.08,
              a.accent,
              "metal",
              "detail",
            );
        }
      }
      structuralLayer = "core";
      B(
        0,
        (H + shop) / 2,
        F - 0.7,
        W,
        H - shop,
        1.5,
        a.wall,
        a.surface,
        "coarse",
      );
      for (let n = 0; n < Math.min(levels, 2); n++)
        B(
          0,
          shop + 1.1 + n * floor,
          F + 0.08,
          W * 0.66,
          1.5,
          0.08,
          a.trim,
          "panel",
          "coarse",
        );
      // Typologies change the VOLUME: gables, stepped roof cabinets, stacked
      // apartment balconies, sawtooth workshop roof, retail overhang and fins.
      if (a.roof === "gable") {
        put(
          0,
          roof,
          F - a.depth / 2 + 0.2,
          W,
          2.25,
          a.depth,
          a.type === "timber" ? "#945c43" : "#ae7856",
          "tile",
          "core",
          "gable",
        );
        B(0, roof + 0.03, F - 0.25, W + 0.08, 0.17, 0.7, a.trim, "wood");
      } else if (a.roof === "sawtooth") {
        for (const u of [-W * 0.25, W * 0.25])
          put(
            u,
            roof,
            F - a.depth / 2,
            W * 0.5,
            2.1,
            a.depth,
            "#8a8d7b",
            "metal",
            "core",
            "gable",
          );
      } else if (a.roof === "terrace") {
        B(0, roof, F - a.depth / 2, W, 0.5, a.depth, a.trim, "concrete");
        B(
          -W * 0.17,
          roof + 1.3,
          F - a.depth * 0.6,
          W * 0.52,
          2.4,
          a.depth * 0.38,
          a.wall,
          "concrete",
        );
        put(
          W * 0.28,
          roof + 1.2,
          F - a.depth * 0.7,
          1.7,
          2.4,
          1.7,
          "#819d9b",
          "metal",
          "detail",
          "cylinder",
        );
      } else {
        B(0, roof + 0.42, F - 0.42, W, 1, 0.8, a.wall);
        B(0, roof + 1, F - 0.42, W + 0.06, 0.23, 1.05, a.trim);
        if (a.type === "arcade" || a.type === "gold") {
          put(
            0,
            roof + 0.86,
            F - 0.22,
            W * 0.45,
            1.45,
            0.48,
            a.wall,
            "plaster",
            "core",
            "gable",
          );
          for (const side of [-1, 1])
            put(
              side * W * 0.43,
              roof + 1.25,
              F - 0.36,
              0.45,
              0.55,
              0.45,
              a.accent,
              "plaster",
              "core",
              "orb",
            );
        }
      }
      if (modern && a.floors > 3) {
        B(
          0,
          (H + shop + floor * 2) / 2,
          F - 0.9,
          W - 0.65,
          H - shop - floor * 2,
          0.15,
          "#507684",
          "panel",
        );
        for (const u of [-W * 0.3, 0, W * 0.3])
          B(
            u,
            (H + shop + floor * 2) / 2,
            F - 0.73,
            0.14,
            H - shop - floor * 2,
            0.15,
            a.trim,
            "metal",
          );
      }
      if (a.type === "office")
        for (const side of [-1, 1])
          B(
            side * W * 0.43,
            H * 0.53,
            F + 0.04,
            0.48,
            H * 0.86,
            0.58,
            a.trim,
            "panel",
          );
      if (a.type === "retail") {
        B(0, 4.7, F + 0.5, W, 0.4, 2.1, a.accent, "panel");
        B(0, H * 0.7, F + 0.18, W * 0.88, 2.5, 0.25, "#3b7688", "panel");
        for (let n = 0; n < 4; n++)
          B(
            (n - 1.5) * W * 0.2,
            H * 0.7,
            F + 0.39,
            0.24,
            3,
            0.55,
            a.trim,
            "panel",
          );
      }
      // Regional modules attach to existing bays and preserve entrance clearance.
      if (p.region === "khaosan" && a.occupied) {
        B(
          0,
          3.58,
          F + 0.92,
          W * 0.92,
          0.035,
          0.035,
          "#394847",
          "metal",
          "near",
        );
        for (let j = 0; j < 6; j++)
          put(
            (j - 2.5) * W * 0.14,
            3.48 - Math.sin((j / 5) * Math.PI) * 0.14,
            F + 0.92,
            0.13,
            0.19,
            0.13,
            j % 2 ? "#ebbd79" : "#b3d4bc",
            "panel",
            "night",
            "orb",
          );
      }
      if (p.region === "oldtown" && !modern) {
        B(
          0,
          H - 0.38,
          F + 0.13,
          W + 0.08,
          0.18,
          0.64,
          a.trim,
          "plaster",
          "near",
        );
        B(0, H - 0.62, F + 0.03, W, 0.12, 0.38, a.wall, "plaster", "near");
      }
      if (
        p.region === "talatnoi" &&
        ["warehouse", "workshop", "timber"].includes(a.type)
      ) {
        B(0, 0.66, F - 0.08, W - 0.4, 0.68, 0.14, "#9b7963", "brick", "near");
        B(0, 3.6, F + 0.1, W, 0.16, 0.8, "#68786d", "metal", "near");
      }
      if (p.region === "siam" && modern) {
        B(0, 4.88, F + 0.12, W, 0.16, 1.9, "#ddc89d", "metal", "near");
        B(0, 4.74, F + 0.12, W * 0.85, 0.045, 1.4, "#c4e3e2", "panel", "night");
      }
      if (p.region === "silom" && a.type === "office")
        for (const u of [-W * 0.2, W * 0.2])
          B(
            u,
            H * 0.6,
            F + 0.2,
            0.16,
            H * 0.68,
            0.58,
            "#7e939a",
            "metal",
            "near",
          );
      if (p.region === "sukhumvit" && a.type === "apartment")
        for (let f = 0; f < Math.min(3, levels); f++) {
          B(
            W * 0.34,
            5 + f * floor,
            F + 0.16,
            0.8,
            0.5,
            0.55,
            "#adb9b4",
            "metal",
            "near",
          );
          B(
            W * 0.34,
            5 + f * floor,
            F + 0.46,
            0.65,
            0.35,
            0.035,
            "#536870",
            "metal",
            "detail",
          );
        }
      // Sign cabinet geometry is shared with lettering placement in signage.ts.
      if (a.occupied) {
        const signW = Math.min(
          W - 0.55,
          a.type === "workshop" ? W * 0.65 : W - 0.55,
        );
        B(0, 4.32, F + 0.2, signW + 0.12, 1.2, 0.5, a.trim, "metal");
        B(0, 4.32, F + 0.48, signW, 1.04, 0.13, a.accent, "metal");
        if (a.cabinet) {
          const u = W * 0.31,
            y = Math.min(H - 2, 8.1);
          B(u, y, F + 0.75, 0.55, 5, 1.6, a.trim, "metal");
          B(u, y, F + 1.25, 0.77, 4.8, 1.35, a.accent, "metal");
          for (const yy of [y - 1.8, y + 1.8])
            B(u, yy, F + 0.3, 0.13, 0.16, 1.6, a.trim, "metal");
        }
      }
      // Canopy profiles differ by business; apartment/residential facades avoid
      // a commercial sign-and-awning recipe entirely.
      if (
        ["noodle", "food", "coffee", "tea", "fruit", "clothes"].includes(
          a.trade,
        )
      ) {
        const can = a.trade === "coffee" ? "#52877c" : a.accent;
        B(0, 3.22, F + 0.52, W - 0.12, 0.15, 1.65, can, "cloth");
        B(0, 3.04, F + 1.29, W - 0.12, 0.3, 0.16, can, "cloth");
        for (const side of [-1, 1])
          B(
            side * W * 0.43,
            3.08,
            F + 0.45,
            0.07,
            0.25,
            1.65,
            a.trim,
            "metal",
            "detail",
          );
      }
      // Occupied interior counters, merchandising and room light.
      structuralLayer = "near";
      if (a.occupied) {
        B(0, 2.92, F - 1.65, W * 0.72, 0.22, 0.42, "#f3cb84", "panel", "night");
        if (a.trade === "noodle" || a.trade === "food") {
          B(-W * 0.22, 0.91, F - 0.94, W * 0.36, 1.5, 0.7, "#a6b6b4", "metal");
          B(-W * 0.22, 1.72, F - 0.9, W * 0.39, 0.12, 0.82, "#dce0ca", "metal");
          for (const u of [-W * 0.31, -W * 0.12]) {
            put(
              u,
              1.98,
              F - 0.85,
              0.45,
              0.48,
              0.45,
              "#cacdbb",
              "metal",
              "core",
              "cylinder",
            );
            put(
              u,
              2.23,
              F - 0.85,
              0.49,
              0.1,
              0.49,
              "#ece3c3",
              "metal",
              "detail",
              "cylinder",
            );
          }
          for (const u of [W * 0.12, W * 0.34]) {
            put(
              u,
              0.65,
              F - 0.65,
              0.43,
              0.18,
              0.43,
              a.accent,
              "wood",
              "core",
              "cylinder",
            );
            B(u, 0.32, F - 0.65, 0.13, 0.55, 0.13, a.trim, "metal");
          }
          B(W * 0.24, 1.05, F - 1.2, W * 0.32, 0.15, 0.62, "#cfbe92", "wood");
        } else if (a.trade === "gold") {
          B(0, 0.65, F - 1.1, W * 0.7, 1.2, 0.65, "#9a3540", "wood");
          B(0, 1.43, F - 1.06, W * 0.72, 0.45, 0.72, "#718d85", "panel");
          for (let i = 0; i < 4; i++)
            put(
              (i - 1.5) * W * 0.13,
              1.53,
              F - 0.67,
              0.24,
              0.32,
              0.1,
              "#eac259",
              "metal",
              "core",
              "orb",
            );
        } else if (a.trade === "workshop") {
          B(-W * 0.23, 0.55, F - 0.6, W * 0.3, 1, 0.85, "#7a6b52", "wood");
          for (let n = 0; n < 3; n++) {
            put(
              W * 0.23,
              0.35 + n * 0.35,
              F - 0.75,
              0.83,
              0.28,
              0.83,
              "#414c4c",
              "metal",
              "core",
              "cylinder",
            );
            B(
              -W * 0.22,
              1.3 + n * 0.27,
              F - 1.8,
              W * 0.42,
              0.16,
              0.4,
              "#9ca3a0",
              "metal",
              "detail",
            );
          }
        } else if (a.trade === "fruit") {
          for (let n = 0; n < 3; n++) {
            B(
              (n - 1) * W * 0.23,
              0.6,
              F - 0.7,
              W * 0.2,
              1,
              0.6,
              "#94704c",
              "wood",
            );
            put(
              (n - 1) * W * 0.23,
              1.2,
              F - 0.67,
              W * 0.18,
              0.5,
              0.5,
              ["#d39841", "#94ac50", "#d16b4e"][n]!,
              "plaster",
              "core",
              "orb",
            );
          }
        } else if (a.trade === "hotel") {
          B(-W * 0.25, 1, F - 1.45, W * 0.25, 1.8, 0.6, a.trim, "wood");
          B(W * 0.29, 1.18, F - 1.33, 0.75, 2.25, 0.45, "#bb9270", "wood");
        } else if (a.trade === "coffee" || a.trade === "tea") {
          B(-W * 0.18, 0.85, F - 1.1, W * 0.55, 1.5, 0.7, a.trim, "wood");
          B(-W * 0.25, 1.75, F - 1.08, 0.7, 0.48, 0.5, "#b6bfba", "metal");
          put(
            W * 0.29,
            0.9,
            F - 0.63,
            0.82,
            0.15,
            0.82,
            "#c5a46e",
            "wood",
            "core",
            "cylinder",
          );
          B(W * 0.29, 0.45, F - 0.63, 0.12, 0.85, 0.12, a.trim, "metal");
        } else {
          B(0, 0.6, F - 1.6, W * 0.7, 1, 0.5, a.trim, "wood");
          for (let n = 0; n < 3; n++)
            B(
              (n - 1) * W * 0.24,
              1.7,
              F - 1.7,
              W * 0.2,
              1.2,
              0.35,
              ["#c69867", "#769e93", "#c97870"][n]!,
              "cloth",
            );
        }
      }
      structuralLayer = "core";
      // Side/rear surfaces visible when turning: pilasters, service windows and
      // rooftop equipment. Set-back outer panels also define corner businesses.
      for (const side of [-1, 1]) {
        const external =
          Math.abs(a.u + (side * a.width) / 2 - (side * b.w) / 2) < 0.01;
        if (!external) continue;
        const x = side * (W / 2 - 0.22),
          back = -a.depth / 2,
          sideFront = F - 2.15,
          sideDepth = sideFront - back;
        // Side shell has real openings too. A recessed plane backs each window;
        // slabs and masonry jambs define deep reveals around it.
        B(x, 1.8, (sideFront + back) / 2, 0.46, 3.6, sideDepth, a.wall);
        const rows = Math.min(3, a.floors - 1),
          windowDepth = Math.min(2.3, sideDepth * 0.16);
        for (let f = 0; f < rows; f++) {
          const y = 5.1 + f * floor;
          if (y + 1.1 > H) break;
          B(x, y - 1.25, (sideFront + back) / 2, 0.46, 0.5, sideDepth, a.wall);
          B(x, y + 1.25, (sideFront + back) / 2, 0.46, 0.5, sideDepth, a.wall);
          const points = [
            back,
            back + sideDepth * 0.32 - windowDepth / 2,
            back + sideDepth * 0.32 + windowDepth / 2,
            back + sideDepth * 0.73 - windowDepth / 2,
            back + sideDepth * 0.73 + windowDepth / 2,
            sideFront,
          ];
          for (let j = 0; j < points.length; j += 2)
            B(
              x,
              y,
              (points[j]! + points[j + 1]!) / 2,
              0.46,
              2,
              points[j + 1]! - points[j]!,
              a.wall,
            );
          for (const v of [back + sideDepth * 0.32, back + sideDepth * 0.73]) {
            B(
              side * (W / 2 - 0.55),
              y,
              v,
              0.08,
              2,
              windowDepth,
              "#466a66",
              "wood",
              "near",
            );
            B(
              side * (W / 2 + 0.02),
              y - 1.08,
              v,
              0.2,
              0.17,
              windowDepth + 0.3,
              a.trim,
              a.surface,
              "near",
            );
            B(
              side * (W / 2 + 0.01),
              y + 1.09,
              v,
              0.2,
              0.19,
              windowDepth + 0.36,
              a.trim,
              a.surface,
              "near",
            );
            if (a.type === "timber")
              for (const end of [-1, 1])
                B(
                  side * (W / 2 + 0.03),
                  y,
                  v + end * (windowDepth / 2 + 0.16),
                  0.18,
                  2,
                  0.28,
                  a.trim,
                  "wood",
                  "near",
                );
          }
        }
        // Crown and service line finish the rear corner instead of a blank cube.
        B(x, H - 0.35, (sideFront + back) / 2, 0.5, 0.7, sideDepth, a.trim);
        B(
          side * (W / 2 + 0.04),
          H * 0.4,
          back + 0.7,
          0.1,
          H * 0.8,
          0.1,
          a.trim,
          "metal",
          "detail",
        );
      }
      B(0, 4.4, -a.depth / 2 - 0.03, W * 0.55, 0.25, 0.12, a.trim);
      if (cornerSide) {
        // An actual second entrance between segmented side jambs, not a
        // colored corner stripe. The shared doorstep marks the solid shop plot.
        B(
          cornerSide * (W / 2 - 0.25),
          1.82,
          F - 1.02,
          0.12,
          2.8,
          1.25,
          "#385b61",
          "panel",
        );
        B(
          cornerSide * (W / 2 - 0.1),
          1.82,
          F - 1.02,
          0.08,
          2.8,
          0.09,
          a.trim,
          "metal",
        );
        B(
          cornerSide * (W / 2 + 0.32),
          3.16,
          F - 1.02,
          1.3,
          0.17,
          1.8,
          a.accent,
          "cloth",
        );
        B(
          cornerSide * (W / 2 - 0.3),
          2.97,
          F - 1.02,
          0.08,
          0.16,
          0.9,
          "#e5b77c",
          "panel",
          "night",
        );
      }
      if (!modern) {
        B(
          W * 0.31,
          6.2,
          F + 0.34,
          0.82,
          0.6,
          0.6,
          "#bbbba6",
          "metal",
          "detail",
        );
        B(
          W * 0.31,
          6.2,
          F + 0.67,
          0.62,
          0.38,
          0.04,
          "#55665f",
          "metal",
          "detail",
        );
        if (a.seed % 3 === 0)
          B(
            0,
            H - 1.5,
            F + 0.07,
            W * 0.72,
            0.18,
            0.22,
            a.trim,
            "metal",
            "detail",
          );
      }
      if (
        p.region === "talatnoi" ||
        a.trade === "residence" ||
        a.type === "riverhouse"
      ) {
        for (const u of [-W * 0.37, W * 0.37]) {
          put(
            u,
            0.55,
            F - 0.2,
            0.65,
            0.85,
            0.65,
            "#aa7858",
            "plaster",
            "core",
            "cylinder",
          );
          put(
            u,
            1.4,
            F - 0.18,
            1.1,
            1.6,
            0.95,
            "#547e52",
            "plaster",
            "core",
            "orb",
          );
        }
      }
      // Tiny original repairs/brick scars, kept in near detail, never photo decals.
      if (!modern)
        for (let n = 0; n < 3; n++)
          B(
            -W * 0.3 + n * 0.25,
            5 + n * 0.17,
            F + 0.08,
            0.4,
            0.19,
            0.045,
            n % 2 ? "#b8956d" : "#9c8066",
            "brick",
            "detail",
          );
      if (p.region === "chinatown") {
        for (const u of [-W * 0.38, W * 0.38]) {
          put(
            u,
            3.02,
            F + 0.65,
            0.48,
            0.62,
            0.48,
            "#c44239",
            "cloth",
            "core",
            "orb",
          );
          B(u, 2.62, F + 0.65, 0.13, 0.2, 0.13, "#d5af61", "metal", "detail");
        }
      }
    }
  }
}
/** Compatibility emitter for structural test probes; production retains shapes. */
export function emitBangkokArchitecture(
  d: District,
  shell: Piece,
  trim: Piece,
  windows: Piece,
): FacadeStats {
  const designs = designBuildings(d),
    stats: FacadeStats = {
      total: designs.length,
      districts: [...new Set(designs.map((p) => p.region))].sort(),
      market: 0,
      heritage: 0,
      modern: 0,
    };
  for (const p of designs) {
    const f = familyForRegion(p.region);
    if (f === "market") stats.market++;
    else if (f === "modern") stats.modern++;
    else stats.heritage++;
  }
  emitDistrictArchitecture(designs, (o) =>
    (o.layer === "night" ? windows : o.layer === "detail" ? trim : shell)(
      o.x,
      o.y,
      o.z,
      o.w,
      o.h,
      o.d,
      o.color,
      o.yaw,
    ),
  );
  return stats;
}
