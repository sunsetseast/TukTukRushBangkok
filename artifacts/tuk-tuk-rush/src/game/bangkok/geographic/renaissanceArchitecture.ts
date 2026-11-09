import type { ArtPiece } from "../architecturalBatch";
import type { Facade } from "./chinatownFacades";
import type { ChinatownSite } from "./chinatownSites";
export type Place = (
  u: number,
  y: number,
  v: number,
  w: number,
  h: number,
  d: number,
  color: string,
  layer?: ArtPiece["layer"],
  shape?: ArtPiece["shape"],
  rotation?: number,
  surface?: ArtPiece["surface"],
) => void;
type Sign = (
  u: number,
  y: number,
  v: number,
  w: number,
  h: number,
  vertical?: boolean,
  rotation?: number,
  reverse?: boolean,
  trade?: number,
) => void;
/** Opening-aware source-edge architecture. Source visual walls are omitted only
 * where this complete wall/room replacement is installed. No collision edits. */
export function emitRenaissanceFacade(
  f: Facade,
  put: Place,
  sign: Sign,
  site: (ChinatownSite & { sign: number }) | undefined,
  trades: number[],
) {
  const W = f.width,
    H = f.height,
    seed = f.seed,
    song = f.style === "songwat",
    n = trades.length,
    bay = W / n,
    base = Math.min(3.45, H * 0.43),
    fh = (H - base) / (f.floors - 1),
    out = f.outset;
  const modern = !song && seed % 5 === 2,
    brick = song && seed % 3 === 1;
  const wall = (
    song
      ? ["#cdbb96", "#ddd0ae", "#bbb6a0", "#d8c8aa"]
      : ["#c8b18f", "#b9c5b6", "#d2b9a2", "#9db1b4", "#cebfa4", "#b6b3a5"]
  )[seed % (song ? 4 : 6)]!;
  const stone = song ? "#e4d4b1" : "#ded2ba",
    metal = "#364d4b",
    wallSurface = brick ? "brick" : modern ? "concrete" : "plaster";
  // Continuous grounded threshold with ceramic tread and a distinct dry gutter.
  const pavement = Math.max(
    0.2,
    Math.min(f.setback ? f.setback - 0.35 : out, 4.5),
  );
  put(
    0,
    0.08,
    pavement / 2,
    W - 0.04,
    0.14,
    pavement,
    "#938c7c",
    "core",
    "box",
    0,
    "concrete",
  );
  put(
    0,
    0.17,
    0.18,
    W - 0.12,
    0.06,
    0.45,
    song ? "#9c8666" : "#7c8b85",
    "core",
    "box",
    0,
    "tile",
  );
  if (pavement > 0.6) {
    put(
      0,
      0.065,
      pavement - 0.08,
      W - 0.08,
      0.09,
      0.12,
      "#4b5351",
      "near",
      "box",
      0,
      "concrete",
    );
    for (let k = 0; k < n; k++)
      put(
        -W / 2 + (k + 0.5) * bay,
        0.115,
        pavement - 0.16,
        0.44,
        0.015,
        0.18,
        "#343c3d",
        "detail",
        "box",
        0,
        "metal",
      );
  }
  for (let j = 0; j < n; j++) {
    const u = -W / 2 + (j + 0.5) * bay,
      span = bay - 0.34,
      type = trades[j]!,
      gold = type === 0,
      food = [1, 4, 11].includes(type),
      tea = type === 2;
    const accent = gold
      ? "#8f2432"
      : song
        ? "#496a5c"
        : food
          ? "#28665f"
          : ["#506f70", "#794946", "#475c70"][seed % 3]!;
    const depth = Math.min(1.15, Math.max(0.6, bay * 0.2)),
      roomTop = base - 0.75;
    // Actual room behind the source edge: rear wall, side returns, ceiling, floor.
    put(
      u,
      roomTop / 2,
      -depth,
      span,
      roomTop,
      0.13,
      gold ? "#603b2c" : food ? "#c4b490" : "#6b7665",
      "core",
      "box",
      0,
      gold ? "wood" : food ? "tile" : "plaster",
    );
    put(
      u,
      0.15,
      -depth / 2,
      span,
      0.12,
      depth,
      food ? "#777768" : "#8b7459",
      "core",
      "box",
      0,
      "tile",
    );
    put(u, roomTop, -depth / 2, span, 0.14, depth, "#bba98a", "core");
    for (const side of [-1, 1]) {
      put(
        u + (side * span) / 2,
        roomTop / 2,
        -depth / 2,
        0.14,
        roomTop,
        depth,
        side < 0 ? "#827c69" : stone,
        "core",
      );
      put(
        u + side * (bay / 2 - 0.1),
        base / 2,
        0.1,
        0.21,
        base,
        0.34,
        stone,
        "core",
        "box",
        0,
        wallSurface,
      );
      put(
        u + side * (bay / 2 - 0.1),
        0.45,
        0.19,
        0.26,
        0.8,
        0.18,
        song ? "#968c70" : "#5b7873",
        "near",
        "box",
        0,
        "tile",
      );
    }
    // Deep, framed fascia; no canopy across its lettering envelope.
    const sy = base - 0.37;
    put(u, sy, 0.2, span, 0.66, 0.32, accent, "core");
    sign(u, sy, 0.375, span - 0.12, 0.53, false, 0, false, site?.sign ?? type);
    put(u, base + 0.015, 0.21, bay - 0.02, 0.16, 0.48, stone, "core");
    for (const side of [-1, 1])
      put(
        u + side * (span / 2 - 0.04),
        sy,
        0.39,
        0.045,
        0.64,
        0.04,
        gold ? "#d3b46a" : "#b9b99e",
        "near",
        "box",
        0,
        "metal",
      );
    // Individual occupation, not a full-height uniformly glowing storefront.
    put(
      u,
      roomTop - 0.15,
      -0.36,
      span * 0.72,
      0.055,
      0.17,
      gold ? "#ffcf75" : "#f6d3a0",
      "night",
    );
    const counter = Math.min(0.64, out * 0.55);
    if (gold) {
      put(
        u,
        0.61,
        counter,
        span * 0.76,
        0.91,
        0.48,
        "#734a30",
        "core",
        "box",
        0,
        "wood",
      );
      put(
        u,
        1.11,
        counter,
        span * 0.8,
        0.12,
        0.55,
        "#cfb16b",
        "near",
        "box",
        0,
        "metal",
      );
      put(
        u,
        0.99,
        counter + 0.255,
        span * 0.72,
        0.2,
        0.035,
        "#54767b",
        "near",
        "box",
        0,
        "panel",
      );
      for (let k = 0; k < 4; k++) {
        const x = u - span * 0.28 + k * span * 0.185;
        put(
          x,
          1.32,
          -depth + 0.22,
          0.38,
          0.08,
          0.3,
          "#d2b678",
          "near",
          "box",
          0,
          "metal",
        );
        put(x, 1.64, -depth + 0.18, 0.22, 0.38, 0.19, "#392f2b", "near", "orb");
        put(
          x,
          1.71,
          -depth + 0.3,
          0.17,
          0.23,
          0.045,
          "#e4ba61",
          "detail",
          "arch",
          0,
          "metal",
        );
        put(
          x,
          1.12,
          counter,
          0.28,
          0.035,
          0.23,
          "#e0c483",
          "detail",
          "box",
          0,
          "metal",
        );
      }
      put(u, 1.24, counter, span * 0.72, 0.028, 0.3, "#e3b965", "night");
      for (const side of [-1, 1]) {
        put(
          u + side * (span / 2 - 0.1),
          roomTop / 2,
          0.21,
          0.08,
          roomTop,
          0.1,
          "#c9a557",
          "core",
          "box",
          0,
          "metal",
        );
        put(
          u + side * span * 0.34,
          2.03,
          -depth + 0.18,
          0.06,
          0.5,
          0.06,
          "#f2cf87",
          "night",
        );
      }
    } else if (food) {
      // Tiled kitchen, stainless worktop, deep shelf, hood and stove.
      put(
        u,
        1.86,
        -depth + 0.16,
        span * 0.9,
        0.13,
        0.36,
        "#80684b",
        "near",
        "box",
        0,
        "wood",
      );
      put(
        u,
        0.61,
        counter,
        span * 0.76,
        0.9,
        0.46,
        "#486f62",
        "core",
        "box",
        0,
        "tile",
      );
      put(
        u,
        1.1,
        counter,
        span * 0.82,
        0.09,
        0.6,
        "#bec4b9",
        "core",
        "box",
        0,
        "metal",
      );
      put(
        u,
        roomTop - 0.36,
        -0.25,
        span * 0.45,
        0.36,
        0.62,
        "#8f9d98",
        "near",
        "box",
        0,
        "metal",
      );
      for (const side of [-1, 1]) {
        put(
          u + side * span * 0.23,
          1.33,
          counter,
          0.48,
          0.4,
          0.45,
          "#adbab2",
          "near",
          "cylinder",
          0,
          "metal",
        );
        put(
          u + side * span * 0.23,
          1.55,
          counter,
          0.5,
          0.055,
          0.48,
          "#d0d3bd",
          "detail",
          "cylinder",
          0,
          "metal",
        );
        put(
          u + side * span * 0.32,
          2.04,
          -depth + 0.21,
          0.22,
          0.23,
          0.22,
          "#e3cf9d",
          "detail",
          "cylinder",
          0,
          "tile",
        );
      }
      for (let k = 0; k < 4; k++)
        put(
          u - span * 0.26 + k * span * 0.17,
          1.95,
          -depth + 0.22,
          0.2,
          0.12,
          0.19,
          k % 2 ? "#c48b5d" : "#ead7b3",
          "near",
          "orb",
        );
      if (out > 1.25 && j === 0) {
        const x = u + span * 0.36;
        put(x, 0.42, 1.03, 0.32, 0.08, 0.33, "#a34c3c", "near", "cylinder");
        for (const side of [-1, 1])
          put(
            x + side * 0.11,
            0.23,
            1.03,
            0.045,
            0.4,
            0.08,
            "#743e32",
            "detail",
            "box",
            0,
            "metal",
          );
      }
    } else if (type === 7) {
      // Source-backed hotel podium: deep glazed foyer and reception, no food shelves.
      put(
        u,
        1.45,
        -depth + 0.12,
        span * 0.78,
        2.5,
        0.06,
        "#33565e",
        "core",
        "box",
        0,
        "panel",
      );
      for (const side of [-1, 1])
        put(
          u + side * span * 0.25,
          1.45,
          -0.3,
          0.055,
          2.45,
          0.08,
          "#b7a479",
          "near",
          "box",
          0,
          "metal",
        );
      put(
        u - span * 0.2,
        0.73,
        -0.22,
        span * 0.36,
        1.1,
        0.48,
        "#8b6241",
        "near",
        "box",
        0,
        "wood",
      );
      put(
        u,
        roomTop - 0.08,
        -0.42,
        span * 0.65,
        0.055,
        0.22,
        "#eac28a",
        "night",
      );
    } else if (type === 6 || type === 8) {
      for (const side of [-1, 1])
        for (let k = 0; k < 3; k++)
          put(
            u + side * span * 0.43 + k * 0.05,
            1.26,
            0.1,
            0.04,
            2.35,
            0.16,
            "#4b6657",
            "near",
            "box",
            0,
            "metal",
          );
      for (let k = 0; k < 3; k++)
        put(
          u + span * 0.27,
          0.35 + k * 0.34,
          -0.2,
          0.62,
          0.32,
          0.5,
          "#aa8a56",
          "near",
          "box",
          0,
          "wood",
        );
      put(
        u,
        roomTop - 0.15,
        -0.2,
        span * 0.72,
        0.1,
        0.14,
        "#89704d",
        "near",
        "box",
        0,
        "wood",
      );
    } else if (type === 3) {
      put(
        u,
        0.65,
        counter,
        span * 0.74,
        0.95,
        0.5,
        "#73573d",
        "core",
        "box",
        0,
        "wood",
      );
      put(
        u,
        1.35,
        counter,
        0.76,
        0.48,
        0.38,
        "#718d89",
        "near",
        "box",
        0,
        "metal",
      );
      put(
        u + 0.62,
        1.39,
        counter,
        0.22,
        0.47,
        0.24,
        "#394d51",
        "near",
        "cylinder",
        0,
        "metal",
      );
      for (let k = 0; k < 4; k++)
        put(
          u - span * 0.26 + k * span * 0.17,
          1.8,
          -depth + 0.19,
          0.14,
          0.22,
          0.14,
          "#e4d6b8",
          "near",
          "cylinder",
          0,
          "tile",
        );
    } else if ((seed + j) % 5 === 0 && !site) {
      // A closed tenant breaks the repeated fully lit restaurant rhythm.
      put(
        u,
        1.25,
        0.09,
        span * 0.92,
        2.25,
        0.11,
        "#647877",
        "core",
        "box",
        0,
        "metal",
      );
      put(
        u,
        0.3,
        0.16,
        span * 0.9,
        0.065,
        0.05,
        "#3b4646",
        "near",
        "box",
        0,
        "metal",
      );
    } else {
      put(
        u,
        0.58,
        counter,
        span * 0.72,
        0.75,
        0.46,
        tea ? "#876f49" : "#537169",
        "core",
        "box",
        0,
        "wood",
      );
      for (let shelf = 0; shelf < 2; shelf++) {
        put(
          u,
          1.18 + shelf * 0.56,
          -depth + 0.24,
          span * 0.85,
          0.07,
          0.4,
          "#a28558",
          "near",
          "box",
          0,
          "wood",
        );
        for (let k = 0; k < 4; k++)
          put(
            u - span * 0.29 + k * span * 0.19,
            1.39 + shelf * 0.56,
            -depth + 0.2,
            0.25,
            0.32,
            0.25,
            tea ? "#c4b783" : ["#b9c3a2", "#ad7954", "#c1a573"][k % 3]!,
            "near",
            "cylinder",
            0,
            "tile",
          );
      }
    }
    // Sloped cloth canopy, complete stripes, metal support arms and valance.
    if (out > 0.7 && !gold) {
      const deep = Math.min(1.17, out - 0.08),
        stripes = 6;
      for (let k = 0; k < stripes; k++) {
        const x = u - span / 2 + ((k + 0.5) * span) / stripes;
        put(
          x,
          roomTop - 0.22,
          deep * 0.5,
          span / stripes - 0.012,
          0.075,
          deep,
          k % 2 ? accent : "#d8c9a8",
          "near",
          "box",
          0,
          "cloth",
        );
        put(
          x,
          roomTop - 0.38,
          deep - 0.04,
          span / stripes - 0.012,
          0.24,
          0.065,
          k % 2 ? accent : "#d8c9a8",
          "near",
          "box",
          0,
          "cloth",
        );
      }
      for (const side of [-1, 1])
        put(
          u + side * span * 0.42,
          roomTop - 0.32,
          deep * 0.46,
          0.045,
          0.07,
          deep * 0.95,
          metal,
          "near",
          "box",
          0,
          "metal",
        );
    }
    // Upper wall is built around openings, never a giant coloured panel.
    for (let floor = 0; floor < f.floors - 1; floor++) {
      const lo = base + floor * fh,
        cy = lo + fh * 0.53,
        ww = span * (modern ? 0.81 : 0.64),
        hh = Math.min(2.05, fh * 0.62),
        reserve = site?.composition === "goldTower" && j === 0;
      if (reserve) {
        put(
          u,
          lo + fh / 2,
          0.035,
          bay - 0.02,
          fh,
          0.18,
          wall,
          "core",
          "box",
          0,
          wallSurface,
        );
        continue;
      }
      const lower = cy - hh / 2,
        upper = cy + hh / 2,
        side = (bay - ww) / 2;
      put(
        u,
        (lo + lower) / 2,
        0.035,
        bay - 0.02,
        lower - lo,
        0.18,
        wall,
        "core",
        "box",
        0,
        wallSurface,
      );
      put(
        u,
        (upper + lo + fh) / 2,
        0.035,
        bay - 0.02,
        lo + fh - upper,
        0.18,
        wall,
        "core",
        "box",
        0,
        wallSurface,
      );
      for (const s of [-1, 1]) {
        put(
          u + s * (ww / 2 + side / 2),
          cy,
          0.035,
          side - 0.01,
          hh,
          0.18,
          wall,
          "core",
          "box",
          0,
          wallSurface,
        );
        put(
          u + s * (ww / 2 + 0.065),
          cy,
          0.13,
          0.13,
          hh + 0.22,
          0.25,
          stone,
          "core",
        );
        put(
          u + s * (ww / 2 - 0.035),
          cy,
          -0.14,
          0.075,
          hh,
          0.34,
          "#626e66",
          "core",
          "box",
          0,
          "wood",
        );
      }
      put(
        u,
        cy,
        -0.27,
        ww,
        hh,
        0.055,
        modern ? "#456c79" : song ? "#354d42" : "#2d4a54",
        "core",
        "box",
        0,
        "panel",
      );
      if (modern || (seed + floor + j) % 2 === 0)
        put(
          u,
          cy,
          0.015,
          0.065,
          hh,
          0.11,
          modern ? "#98aaa5" : "#657566",
          "core",
          "box",
          0,
          modern ? "metal" : "wood",
        );
      put(u, cy - hh / 2 - 0.06, 0.18, ww + 0.3, 0.14, 0.46, stone, "core");
      put(u, cy + hh / 2 + 0.08, 0.12, ww + 0.31, 0.16, 0.32, stone, "core");
      // Visible inner top edge gives a contact shadow without a shadow map.
      if (!modern)
        put(u, cy + hh / 2 - 0.04, -0.06, ww, 0.07, 0.36, "#535b52", "core");
      if (song || (seed + j + floor) % 4 === 0)
        for (const s of [-1, 1]) {
          put(
            u + s * ww * 0.4,
            cy,
            0.1,
            ww * 0.23,
            hh,
            0.1,
            accent,
            "near",
            "box",
            0,
            "wood",
          );
          for (let sl = 0; sl < 3; sl++)
            put(
              u + s * ww * 0.4,
              cy - hh * 0.35 + sl * hh * 0.3,
              0.18,
              ww * 0.23,
              0.045,
              0.045,
              "#627b67",
              "detail",
              "box",
              0,
              "wood",
            );
        }
      if (song)
        put(
          u,
          cy + hh / 2 + 0.14,
          0.16,
          ww * 0.84,
          0.35,
          0.18,
          stone,
          "near",
          "arch",
        );
      if ((seed + floor + j) % 3 === 0) {
        // Warm curtains occupy only part of the glass, remaining truly recessed.
        put(
          u - ww * 0.19,
          cy,
          -0.225,
          ww * 0.39,
          hh * 0.88,
          0.02,
          "#c9a36b",
          "night",
        );
        put(
          u + ww * 0.3,
          cy,
          -0.21,
          ww * 0.12,
          hh * 0.9,
          0.02,
          "#695f4c",
          "core",
          "box",
          0,
          "cloth",
        );
      }
      if (!modern && (seed + j + floor) % 3 !== 1 && out > 0.7) {
        put(u, cy - hh * 0.56, 0.42, ww + 0.46, 0.13, 0.92, stone, "core");
        for (const y of [cy - hh * 0.24, cy - hh * 0.49])
          put(
            u,
            y,
            0.84,
            ww + 0.4,
            0.055,
            0.055,
            metal,
            "near",
            "box",
            0,
            "metal",
          );
        for (let k = 0; k < 4; k++)
          put(
            u - ww / 2 + (k * ww) / 3,
            cy - hh * 0.36,
            0.84,
            0.035,
            0.52,
            0.035,
            metal,
            "near",
            "box",
            0,
            "metal",
          );
      }
      if (!song && (seed + j + floor) % 4 === 1) {
        const x = u + span * 0.34;
        put(
          x,
          cy - hh * 0.49,
          0.39,
          0.73,
          0.46,
          0.45,
          "#bcc2b4",
          "near",
          "box",
          0,
          "metal",
        );
        for (let k = 0; k < 4; k++)
          put(
            x,
            cy - hh * 0.49 - 0.14 + k * 0.09,
            0.63,
            0.62,
            0.027,
            0.04,
            "#566962",
            "detail",
            "box",
            0,
            "metal",
          );
        for (const s of [-1, 1])
          put(
            x + s * 0.26,
            cy - hh * 0.49 - 0.29,
            0.3,
            0.045,
            0.16,
            0.55,
            metal,
            "detail",
            "box",
            0,
            "metal",
          );
      }
    }
  }
  // Cornice built in layers, with side-readable volumes and parapet coping.
  put(0, H - 0.16, 0.12, W, 0.3, 0.4, stone, "core");
  put(
    0,
    H + 0.045,
    0.16,
    W + 0.03,
    0.12,
    0.52,
    song ? "#b39d79" : "#9b9c89",
    "core",
    "box",
    0,
    "concrete",
  );
  for (let j = 0; j < n; j++) {
    const u = -W / 2 + (j + 0.5) * bay;
    if (!modern) {
      put(u, H - 0.64, 0.17, bay * 0.75, 0.18, 0.23, stone, "near");
      if (song || seed % 3 === 0)
        put(u, H - 0.54, 0.2, bay * 0.48, 0.31, 0.2, stone, "near", "arch");
    }
  }
  for (const side of [-1, 1]) {
    put(side * (W / 2 - 0.07), H / 2, 0.13, 0.14, H, 0.34, stone, "core");
    put(
      side * (W / 2 - 0.24),
      H / 2,
      0.33,
      0.075,
      H - 0.45,
      0.11,
      "#6c7769",
      "near",
      "cylinder",
      0,
      "metal",
    );
  }
  // Proper double-sided projecting cabinet with brackets behind each face.
  if (!song && W > 4 && out > 0.85 && H > 7) {
    const u = -W / 2 + 0.33,
      sh = Math.min(4.6, H - 3.7),
      sy = Math.min(H - sh / 2 - 0.45, 7.8),
      v = 0.85;
    put(
      u,
      sy,
      v,
      1.3,
      sh,
      0.22,
      seed % 2 ? "#224f53" : "#812b33",
      "core",
      "box",
      Math.PI / 2,
    );
    for (const end of [-1, 1]) {
      put(
        u,
        sy + end * (sh / 2 - 0.07),
        v,
        1.34,
        0.1,
        0.26,
        "#d5bd7b",
        "near",
        "box",
        Math.PI / 2,
        "metal",
      );
      put(
        u,
        sy + end * (sh / 2 - 0.22),
        0.32,
        0.1,
        0.07,
        0.74,
        metal,
        "core",
        "box",
        0,
        "metal",
      );
    }
    sign(
      u,
      sy,
      v,
      1.21,
      sh - 0.2,
      true,
      Math.PI / 2,
      false,
      site?.sign ?? trades[0],
    );
    sign(
      u,
      sy,
      v,
      1.21,
      sh - 0.2,
      true,
      Math.PI / 2,
      true,
      site?.sign ?? trades[0],
    );
  }
  if (site?.composition === "heritageGold") {
    for (const side of [-1, 1]) {
      put(side * (W / 2 - 0.27), H / 2, 0.2, 0.42, H, 0.42, "#e9d9b7", "core");
      for (let level = 1; level < 7; level++)
        put(
          side * (W / 2 - 0.27),
          (level * H) / 7,
          0.35,
          0.62,
          0.18,
          0.38,
          "#bca27c",
          "near",
        );
    }
    for (let level = 1; level < 7; level++)
      if ((level * H) / 7 > base + 0.4)
        put(0, (level * H) / 7, 0.23, W, 0.15, 0.4, "#ddc9a3", "near");
    put(0, H - 0.8, 0.24, W * 0.69, 0.68, 0.23, "#e2c99c", "near", "arch");
  }
  if (site?.composition === "goldTower") {
    const u = -W / 2 + bay / 2,
      sh = Math.min(7.5, H - base - 0.5),
      sy = base + 0.24 + sh / 2;
    put(u, sy, 0.28, bay * 0.6, sh, 0.35, "#7e2530", "core");
    sign(u, sy, 0.47, bay * 0.52, sh - 0.25, true);
    for (const side of [-1, 1])
      put(
        u + side * bay * 0.31,
        sy,
        0.48,
        0.065,
        sh + 0.06,
        0.06,
        "#e1be68",
        "near",
        "box",
        0,
        "metal",
      );
  }
  // The source width also determines cable span; no random street scattering.
  if (!song) {
    for (let k = 0; k < 4; k++)
      put(
        0,
        Math.min(H - 0.8, 5.7) + k * 0.12,
        0.72,
        W - 0.12,
        0.018,
        0.024,
        "#252e30",
        "near",
        "box",
        0,
        "metal",
      );
    put(
      -W / 2 + 0.4,
      3.9,
      0.68,
      0.095,
      7.8,
      0.095,
      "#747e73",
      "near",
      "cylinder",
      0,
      "concrete",
    );
  }
}
