import { storefrontMount } from "./storefrontMounts";
import type { District } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import type { ParcelDesign, Surface } from "./buildingGrammar";
import { distanceToSegment } from "../world";

/** Bounded gateway-to-curve slice of the existing one-way road. */
export const YAOWARAT_BENCHMARK = {
  firstNode: "bkk:504",
  lastNode: "bkk:514",
  titlePlayer: { x: 71.94, z: -65.43, heading: -2.020483893706025 },
  sunset: 22,
} as const;
export function cinematicParcel(p: ParcelDesign) {
  return (
    p.region === "chinatown" &&
    p.corridor === "yaowarat" &&
    !p.parcel.artRole &&
    p.parcel.x > -510 &&
    p.parcel.x < 100 &&
    p.parcel.z > -445 &&
    p.parcel.z < -30
  );
}
/** Composed row, not independently randomized decorations. Retains each shop's trade. */
export function composeYaowarat(p: ParcelDesign) {
  if (!cinematicParcel(p)) return p;
  const walls = [
    "#d8c29d",
    "#cfa184",
    "#8da99a",
    "#ead7b4",
    "#b2b5ad",
    "#d8b59b",
  ];
  const trims = ["#335b59", "#72433b", "#245b60", "#45685f"];
  p.bays.forEach((a, i) => {
    const n = (Math.round((p.parcel.x + 150) / 23) + i + 18) % walls.length;
    a.floors = Math.max(
      2,
      Math.min(5, Math.floor((p.parcel.height - 1.1) / 3.2)),
    );
    a.height = Math.min(p.parcel.height, a.floors * 3.2 + 1.1);
    const trades = [
      "gold",
      "tea",
      "noodle",
      "food",
      "retail",
      "hotel",
      "fruit",
      "coffee",
      "clothes",
    ] as const;
    a.trade =
      trades[(Math.floor((100 - p.parcel.x) / 26) + i * 2) % trades.length]!;
    a.type = a.trade === "gold" ? "gold" : n % 3 === 0 ? "arcade" : "shophouse";
    a.occupied = true;
    a.wall = walls[n]!;
    a.trim = trims[(n + i) % trims.length]!;
    a.accent =
      a.trade === "gold"
        ? "#c53436"
        : a.trade === "noodle"
          ? "#267f70"
          : ["#d26348", "#2c8c8c", "#b46469"][n % 3]!;
    a.roof = n % 4 === 0 ? "gable" : "parapet";
    a.cabinet = i === 0 && a.seed % 3 !== 0;
    a.windows = Math.max(1, Math.min(3, Math.floor(a.width / 2.7)));
  });
  return p;
}

/** Hero facade replaces the ordinary emitter for these parcels. Near details share
 * the existing array material/batches; a complete coarse facade remains at distance. */
export function emitYaowaratFacade(
  p: ParcelDesign,
  emit: (piece: ArtPiece) => void,
) {
  const b = p.parcel,
    yaw = b.yaw ?? 0,
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  for (const [index, a] of p.bays.entries()) {
    const W = a.width - 0.12,
      H = a.height,
      F = a.front,
      cream = "#f5dba4",
      iron = "#304954";
    const put = (
      u: number,
      y: number,
      v: number,
      w: number,
      h: number,
      d: number,
      color: string,
      surface: Surface = "plaster",
      layer: ArtPiece["layer"] = "near",
      shape: ArtPiece["shape"] = "box",
      rotation = 0,
      pitch = 0,
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
        pitch,
        siteId: cinematicParcel(p) ? "yaowarat" : "tha-tien",
      });
    // Continuous side/rear walls, deep shop room, and independently articulated front skin.
    put(
      0,
      H / 2,
      (F - 2.4 - b.d / 2) / 2,
      W,
      H,
      F - 2.4 + b.d / 2,
      a.wall,
      a.surface,
      "core",
    );
    put(
      0,
      1.8,
      F - 2.25,
      W - 0.5,
      3.6,
      0.15,
      a.trade === "gold" ? "#6d2631" : "#5b3d36",
      "wood",
      "core",
    );
    put(0, 0.32, F - 1.15, W, 0.32, 2.2, "#b1aaa0", "concrete", "core");
    for (const side of [-1, 1]) {
      put(
        side * (W / 2 - 0.22),
        H / 2,
        F - 0.75,
        0.44,
        H,
        1.6,
        a.wall,
        "plaster",
        "core",
      );
      put(
        side * (W / 2 - 0.16),
        2.05,
        F + 0.08,
        0.23,
        3.6,
        0.28,
        cream,
        "tile",
      );
      put(
        side * (W / 2 - 0.16),
        0.75,
        F + 0.17,
        0.34,
        0.22,
        0.45,
        a.trim,
        "tile",
      );
      put(side * (W / 2 - 0.16), 3.7, F + 0.12, 0.39, 0.2, 0.43, cream);
    }
    put(0, 3.93, F - 0.5, W, 0.78, 1.8, a.wall, "plaster", "core");
    put(0, 4.58, F - 0.18, W, 0.38, 1.2, a.trim, "plaster", "core");
    // The lettering in signage.ts sits on this recessed, physically supported lightbox.
    const mount = storefrontMount(p, a);
    for (const side of [-1, 1])
      put(
        side * mount.width * 0.36,
        mount.y,
        (a.front + mount.v) / 2,
        0.16,
        0.2,
        mount.v - a.front + 0.15,
        a.trim,
        "metal",
        "core",
      );
    put(
      0,
      mount.y,
      mount.v,
      mount.width + 0.12,
      mount.height,
      mount.depth,
      a.accent,
      "metal",
      "core",
    );
    put(
      0,
      mount.y,
      mount.face - 0.13,
      mount.width,
      1.04,
      0.08,
      cream,
      "panel",
      "core",
    );
    put(0, 4.99, F + 0.25, W + 0.1, 0.18, 0.9, cream, "plaster", "core");
    const floor = Math.min(3.2, (H - 4.5) / Math.max(1, a.floors - 1)),
      span = (W - 0.6) / a.windows,
      ww = Math.min(1.9, span * 0.66),
      wh = 2.05;
    for (let f = 1; f < a.floors; f++) {
      const y = 6.5 + (f - 1) * floor;
      put(0, y - 1.4, F - 0.65, W, 0.78, 1.7, a.wall);
      put(0, y + 1.36, F - 0.65, W, 0.67, 1.7, a.wall);
      for (let n = 0; n <= a.windows; n++) {
        const u = -W / 2 + 0.3 + n * span;
        put(u, y, F - 0.67, Math.max(0.3, span - ww), wh, 1.7, a.wall);
      }
      for (let n = 0; n < a.windows; n++) {
        const u = (n - (a.windows - 1) / 2) * span,
          lit = (a.seed + f + n) % 4 === 0;
        put(u, y, F - 1.5, ww, wh, 0.1, "#183c4b", "panel");
        put(
          u,
          y,
          F - 1.42,
          ww * 0.8,
          wh * 0.87,
          0.045,
          lit ? "#f7b35d" : "#588591",
          "panel",
          lit ? "night" : "near",
        );
        for (const side of [-1, 1]) {
          put(
            u + side * (ww / 2 + 0.12),
            y,
            F - 0.22,
            0.19,
            wh + 0.32,
            0.42,
            cream,
          );
          // Folded shutters reveal a dark room, rather than flat painted rectangles.
          if ((index + f) % 2 === 0)
            put(
              u + side * (ww / 2 + 0.38),
              y,
              F + 0.08,
              0.48,
              wh,
              0.1,
              a.trim,
              "wood",
              "near",
              "box",
              side * 0.32,
            );
        }
        if (!cinematicParcel(p)) {
          put(
            u,
            y + 0.62,
            F - 0.08,
            ww + 0.22,
            1.12,
            0.22,
            cream,
            "plaster",
            "near",
            "arch",
          );
          put(
            u,
            y + 0.66,
            F - 0.19,
            ww * 0.86,
            0.9,
            0.06,
            a.trim,
            "wood",
            "near",
            "arch",
          );
        } else put(u, y + wh / 2 + 0.16, F - 0.11, ww + 0.6, 0.22, 0.6, cream);
        put(u, y - wh / 2 - 0.15, F + 0.1, ww + 0.65, 0.2, 0.8, a.trim);
        put(u, y, F - 1.27, 0.08, wh, 0.11, cream, "wood");
        if ((a.seed + f + n) % 3 === 0) {
          put(
            u,
            y - wh / 2 + 0.38,
            F + 0.5,
            ww + 0.45,
            0.09,
            0.12,
            iron,
            "metal",
          );
          for (const side of [-1, 1])
            put(
              u + side * ww * 0.45,
              y - wh / 2 + 0.16,
              F + 0.5,
              0.065,
              0.5,
              0.09,
              iron,
              "metal",
            );
        }
      }
      // Deep horizontal ledges make the row read from the driving camera.
      put(0, y - 1.65, F + 0.12, W + 0.08, 0.17, 0.8, cream, "plaster", "core");
      if ((index + f) % 3 === 0) {
        put(0, y - 1.25, F + 0.5, W - 0.35, 0.18, 1.45, a.trim, "concrete");
        put(0, y - 0.3, F + 1.13, W - 0.5, 0.1, 0.1, cream, "metal");
        for (let k = 0; k < 7; k++)
          put(
            ((k - 3) * (W - 0.7)) / 7,
            y - 0.73,
            F + 1.13,
            0.06,
            0.85,
            0.07,
            iron,
            "metal",
            "detail",
          );
        for (const side of [-1, 1])
          put(
            side * (W / 2 - 0.28),
            y - 0.72,
            F + 1.13,
            0.1,
            0.95,
            0.1,
            cream,
            "metal",
          );
      }
    }
    // A real alternate coarse skin; the detailed openings are culled, not stacked on a box.
    put(0, (H + 5) / 2, F - 0.7, W, H - 5, 1.6, a.wall, "plaster", "coarse");
    for (let f = 1; f < a.floors; f++)
      put(
        0,
        6.0 + (f - 1) * floor,
        F + 0.14,
        W * 0.7,
        1.8,
        0.1,
        a.trim,
        "wood",
        "coarse",
      );
    // Shared roof silhouette survives Fast mode and distance culling.
    put(0, H + 0.15, F - b.d / 2, W, 0.3, b.d, cream, "concrete", "core");
    put(0, H + 0.65, F - 0.35, W, 1, 0.7, a.wall, "plaster", "core");
    put(0, H + 1.2, F - 0.32, W + 0.17, 0.22, 1.05, cream, "plaster", "core");
    if (a.roof === "gable") {
      put(
        0,
        H + 1,
        F - 0.25,
        W * 0.58,
        1.15,
        0.55,
        a.wall,
        "plaster",
        "core",
        "gable",
      );
      put(
        0,
        H + 1.55,
        F + 0.06,
        0.65,
        0.48,
        0.16,
        a.accent,
        "plaster",
        "near",
        "orb",
      );
    }
    for (const side of [-1, 1]) {
      put(
        side * (W / 2 - 0.27),
        H + 1.45,
        F - 0.35,
        0.4,
        0.62,
        0.7,
        a.trim,
        "plaster",
        "core",
      );
      // Visible pipes and restrained AC servicing, not clutter on every window.
      put(
        side * (W / 2 - 0.1),
        H * 0.47,
        F + 0.34,
        0.07,
        H * 0.86,
        0.09,
        "#776b59",
        "metal",
        "detail",
      );
    }
    put(W * 0.31, 8.7, F + 0.42, 0.92, 0.64, 0.66, "#d7c7a6", "metal");
    put(W * 0.31, 8.7, F + 0.78, 0.7, 0.43, 0.04, iron, "metal", "detail");
    for (let k = 0; k < 4; k++)
      put(
        W * 0.31,
        8.53 + k * 0.11,
        F + 0.81,
        0.7,
        0.035,
        0.05,
        "#a2afa5",
        "metal",
        "detail",
      );
    // Projecting, two-sided trade blade: real brackets and cabinet support the
    // shared atlas lettering. Its lower edge stays well above the walkway.
    if (a.cabinet && !["chinatown", "khaosan"].includes(p.region)) {
      const u = W * 0.31,
        y = Math.min(H - 2, 8.1);
      put(u, y, F + 0.75, 0.55, 5, 1.6, iron, "metal", "core");
      put(u, y, F + 1.25, 0.77, 4.8, 1.35, a.accent, "metal", "core");
      for (const yy of [y - 1.8, y + 1.8])
        put(u, yy, F + 0.3, 0.13, 0.16, 1.6, iron, "metal");
      for (const yy of [y - 2.4, y + 2.4])
        put(u, yy, F + 1.25, 0.82, 0.12, 1.4, cream, "metal");
    }
    // Arcade fanlights, tiled stall thresholds and a drained pedestrian edge
    // distinguish the row during daylight without making whole walls emissive.
    if (a.type === "arcade" || a.type === "gold") {
      put(
        0,
        2.85,
        F - 0.65,
        W - 0.85,
        0.72,
        0.18,
        cream,
        "plaster",
        "near",
        "arch",
      );
      for (const side of [-1, 1])
        put(
          side * (W / 2 - 0.42),
          1.65,
          F - 0.65,
          0.23,
          2.5,
          0.3,
          cream,
          "tile",
        );
    }
    put(0, 0.035, F + 0.9, W, 0.06, 2.5, "#a29b8c", "concrete", "core");
    put(0, 0.078, F + 2.15, W - 0.2, 0.05, 0.28, "#44514c", "metal", "near");
    for (let k = 0; k < Math.floor(W / 0.45); k++)
      put(
        -W / 2 + 0.3 + k * 0.45,
        0.11,
        F + 2.15,
        0.06,
        0.025,
        0.22,
        "#a8a58f",
        "metal",
        "detail",
      );
    // Coherent side/rear windows rather than an exposed blank colored box.
    if (index === 0 || index === p.bays.length - 1) {
      const side = index === 0 ? -1 : 1;
      for (let f = 1; f < a.floors; f++) {
        const y = 6 + (f - 1) * floor;
        put(
          side * (W / 2 - 0.08),
          y,
          -b.d * 0.18,
          0.12,
          1.8,
          1.5,
          a.trim,
          "wood",
        );
        put(
          side * (W / 2 + 0.04),
          y - 1,
          -b.d * 0.18,
          0.32,
          0.18,
          1.9,
          cream,
          "plaster",
        );
      }
    }
    // Constructed awning: sloping canvas, scalloped valance, tubular supports.
    if (a.occupied) {
      put(
        0,
        3.47,
        F + 0.7,
        W - 0.22,
        0.12,
        2,
        a.accent,
        "cloth",
        "core",
        "box",
        0,
        0.12,
      );
      put(0, 3.22, F + 1.66, W - 0.22, 0.36, 0.13, a.accent, "cloth", "core");
      for (let k = 0; k < Math.floor(W / 0.65); k++)
        put(
          -W / 2 + 0.5 + k * 0.65,
          3.17,
          F + 1.73,
          0.28,
          0.28,
          0.07,
          cream,
          "cloth",
        );
      for (const side of [-1, 1])
        put(side * W * 0.42, 3.16, F + 0.72, 0.07, 0.12, 1.9, iron, "metal");
      put(0, 3.2, F - 0.6, W * 0.8, 0.1, 1.5, "#ffd595", "panel", "night");
      put(0, 2.7, F - 2.03, W * 0.73, 0.8, 0.035, "#d88442", "panel", "night");
      // Each trade has a different interior silhouette.
      if (a.trade === "gold") {
        put(0, 1.18, F - 0.83, W * 0.72, 0.78, 0.65, "#963c3b", "wood");
        put(0, 1.65, F - 0.78, W * 0.72, 0.14, 0.72, "#ffe29a", "metal");
        for (let j = 0; j < 5; j++) {
          put(
            (j - 2) * W * 0.125,
            1.95,
            F - 0.9,
            0.28,
            0.43,
            0.15,
            "#efb943",
            "metal",
            "near",
            "arch",
          );
          put(
            (j - 2) * W * 0.125,
            1.74,
            F - 0.82,
            0.42,
            0.08,
            0.24,
            iron,
            "wood",
          );
        }
      } else if (["food", "noodle", "tea", "coffee"].includes(a.trade)) {
        put(-W * 0.18, 1.05, F - 0.72, W * 0.45, 1.5, 0.85, "#3e8380", "tile");
        put(-W * 0.18, 1.84, F - 0.72, W * 0.48, 0.12, 1, "#d5d4bf", "metal");
        for (const u of [-W * 0.28, -W * 0.08]) {
          put(
            u,
            2.07,
            F - 0.7,
            0.52,
            0.4,
            0.52,
            "#c5c5ab",
            "metal",
            "near",
            "cylinder",
          );
          put(
            u,
            2.31,
            F - 0.7,
            0.57,
            0.09,
            0.57,
            "#f5d5a0",
            "metal",
            "detail",
            "cylinder",
          );
        }
        put(W * 0.28, 0.95, F - 0.55, 0.95, 0.12, 0.8, cream, "wood");
        for (const u of [W * 0.13, W * 0.42]) {
          put(
            u,
            0.61,
            F + 0.25,
            0.44,
            0.12,
            0.44,
            a.accent,
            "metal",
            "near",
            "cylinder",
          );
          for (const side of [-1, 1])
            put(
              u + side * 0.14,
              0.36,
              F + 0.25,
              0.06,
              0.44,
              0.08,
              iron,
              "metal",
              "detail",
            );
        }
      } else {
        for (let k = 0; k < 3; k++) {
          put(
            (k - 1) * W * 0.24,
            0.75,
            F - 0.7,
            W * 0.21,
            1.2,
            0.65,
            "#98714c",
            "wood",
          );
          put(
            (k - 1) * W * 0.24,
            1.5,
            F - 0.7,
            W * 0.19,
            0.38,
            0.5,
            ["#f2ab3d", "#6eac59", "#ed7151"][k]!,
            "plaster",
            "near",
            "orb",
          );
        }
      }
    } else put(0, 1.9, F - 0.15, W - 0.7, 3.15, 0.14, a.trim, "metal", "core");
    // Pots, broad leaves and utility meter remain inside the existing parcel.
    put(
      -W * 0.38,
      0.7,
      F - 0.1,
      0.5,
      0.8,
      0.5,
      "#ae6647",
      "plaster",
      "near",
      "cylinder",
    );
    for (const k of [-1, 0, 1])
      put(
        -W * 0.38 + k * 0.16,
        1.35 + Math.abs(k) * 0.14,
        F - 0.15,
        0.26,
        0.85,
        0.3,
        k ? "#39976b" : "#74b75c",
        "plaster",
        "near",
        "orb",
        k * 0.5,
      );
    put(
      W * 0.43,
      2.25,
      F + 0.21,
      0.25,
      0.4,
      0.16,
      "#a6a69a",
      "metal",
      "detail",
    );
  }
}

/** Three restrained overhead lantern spans, supported from actual frontage poles.
 * They are >7m above the lane. No collision or traffic graph changes. */
export function emitYaowaratLanterns(
  d: District,
  emit: (piece: ArtPiece) => void,
) {
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const streets = d.roads
    .filter((r) => r.corridor === "yaowarat")
    .filter((r) => {
      const a = nodes.get(r.a)!,
        b = nodes.get(r.b)!,
        yaw = Math.atan2(b.x - a.x, b.z - a.z),
        mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      return [-1, 1].every((side) => {
        const p = {
          x: mid.x + Math.cos(yaw) * 9.7 * side,
          z: mid.z - Math.sin(yaw) * 9.7 * side,
        };
        return d.roads.every(
          (q) =>
            distanceToSegment(p, nodes.get(q.a)!, nodes.get(q.b)!).distance >
            q.width / 2 + 1.05,
        );
      });
    });
  if (!streets.length) return;
  for (const fraction of [0.28, 0.5, 0.72]) {
    const road = streets[Math.floor((streets.length - 1) * fraction)]!;
    const a = nodes.get(road.a)!,
      next = nodes.get(road.b)!;
    const p = { x: (a.x + next.x) / 2, z: (a.z + next.z) / 2 },
      yaw = Math.atan2(next.x - p.x, next.z - p.z),
      c = Math.cos(yaw),
      s = Math.sin(yaw);
    const put = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      depth: number,
      color: string,
      layer: ArtPiece["layer"] = "near",
      shape: ArtPiece["shape"] = "box",
      pitch = 0,
    ) =>
      emit({
        x: p.x + s * 8 + c * x + s * z,
        y,
        z: p.z + c * 8 - s * x + c * z,
        w,
        h,
        d: depth,
        color,
        yaw,
        layer,
        shape,
        pitch,
        surface: "metal",
        siteId: "yaowarat",
      });
    for (const side of [-1, 1]) {
      put(side * 9.7, 4.5, 0, 0.17, 9, 0.17, "#39504e", "core", "cylinder");
      put(side * 9.7, 8.9, 0, 0.5, 0.13, 0.5, "#d6ac51");
    }
    // Piecewise catenary cable rather than a straight floating lantern array.
    for (let k = 0; k < 12; k++) {
      const x = (k - 5.5) * 1.62,
        y = 8.3 + 0.7 * (x / 9.7) ** 2;
      put(x, y, 0, 1.65, 0.035, 0.035, "#343f4b", "near");
    }
    for (let k = 0; k < 7; k++) {
      const x = (k - 3) * 2.6,
        y = 8.3 + 0.7 * (x / 9.7) ** 2;
      put(x, y - 0.55, 0, 0.62, 0.82, 0.62, "#db5337", "night", "orb");
      put(x, y - 0.1, 0, 0.28, 0.12, 0.28, "#e5b64d", "near", "cylinder");
      put(x, y - 1, 0, 0.13, 0.34, 0.13, "#ecb954", "near");
    }
  }
}
