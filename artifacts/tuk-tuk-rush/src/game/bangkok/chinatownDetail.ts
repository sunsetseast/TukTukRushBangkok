import { STOREFRONT } from "./storefrontMounts";
import { emitHistoricTradeDetail } from "./historicTradeDetail";
import { CHINATOWN_COMPOSITIONS } from "./chinatownCompositions";
import type { ArtPiece } from "./architecturalBatch";
import type { ParcelDesign } from "./buildingGrammar";
/** Original modular frontage compositions. Everything below 4.7m stays inside
 * the authoritative shell; elevated ornament projects at most 1.8m. */
export function emitChinatownDetail(
  p: ParcelDesign,
  emit: (o: ArtPiece) => void,
) {
  const b = p.parcel,
    ct = b.chinatown;
  if (!ct) return;
  emitHistoricTradeDetail(p, emit);
  const a = p.bays[0]!,
    seed = a.seed,
    W = b.w,
    H = b.height,
    F = b.d / 2,
    yaw = b.yaw ?? 0,
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  const song = ct.character === "songwat",
    talat = ct.character === "talatnoi",
    yao = ct.character === "yaowarat",
    v = seed % 6;
  const gold = a.trade === "gold",
    food = ["noodle", "food"].includes(a.trade),
    cafe = ["coffee", "tea", "gallery"].includes(a.trade),
    work = a.trade === "workshop";
  const composition = CHINATOWN_COMPOSITIONS[b.environmentId ?? ""];
  const accent =
    composition?.accent ??
    (gold
      ? "#a51d30"
      : song
        ? ["#506454", "#795943", "#546d68"][v % 3]!
        : talat
          ? ["#526f67", "#776653", "#4c676e"][v % 3]!
          : ["#9c2938", "#267b76", "#c47c42", "#663a5c", "#344e66", "#9d452d"][
              v
            ]!);
  const put = (
    u: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    opts: Partial<ArtPiece> = {},
  ) =>
    emit({
      x: b.x + c * u + s * z,
      z: b.z - s * u + c * z,
      y,
      w,
      h,
      d,
      color,
      yaw,
      surface: "plaster",
      layer: "core",
      siteId: b.environmentId,
      ...opts,
    });
  const metal = { surface: "metal" as const },
    near = { layer: "near" as const },
    warm = { glow: gold ? "#d77d24" : "#b77638" };
  if (ct.role === "rear") {
    // Bank/court-facing service elevations: mounted lamps, lintels, loading
    // bumpers and ventilation. No invented public promenade or changed body.
    for (const side of [-1, 1]) {
      put(side * W * 0.38, 3.3, F + 0.14, 0.28, 5.7, 0.3, "#6f7969", metal);
      put(side * W * 0.38, 5.6, F + 0.3, 0.65, 0.22, 0.65, "#d1c6a4", {
        ...metal,
        glow: "#725b39",
      });
      put(side * W * 0.34, 0.75, F + 0.14, 0.5, 1.2, 0.28, "#4a5149", metal);
    }
    for (let i = 0; i < 4; i++)
      put(
        -W * 0.32 + i * W * 0.2,
        1.1 + (i % 2) * 0.9,
        F + 0.015,
        W * 0.1,
        0.4,
        0.035,
        ["#a49c80", "#b7a88a"][i % 2]!,
        { surface: "brick", ...near },
      );
    // River-facing elevations retain industrial boundary walls. Buttresses,
    // high ventilation panels and patched brick articulate the previously blank
    // warehouse backs without inventing waterside shops or a public promenade.
    put(0, 0.42, -F - 0.06, W, 0.7, 0.18, "#8c8871", { surface: "brick" });
    for (const u of [-W * 0.32, 0, W * 0.32]) {
      put(u, H * 0.48, -F - 0.12, 0.3, H * 0.91, 0.28, "#b1a88b");
      put(u, H - 1.55, -F - 0.08, W * 0.21, 0.7, 0.12, "#526a61", metal);
      put(u, H - 1.15, -F - 0.16, W * 0.23, 0.13, 0.3, "#c8bb9b");
    }
    for (let i = 0; i < 4; i++)
      put(
        (i - 1.5) * W * 0.2,
        1.2 + (i % 2) * 0.7,
        -F - 0.02,
        W * 0.12,
        0.28,
        0.04,
        "#a18d70",
        { surface: "brick", ...near },
      );
    put(0, H - 0.45, F + 0.16, W * 0.7, 0.2, 0.25, "#baac8e");
    return;
  }
  // The opening is 3.8m deep. A colored back wall, ceiling, reveal, jambs,
  // counters and side displays give parallax from the moving chase camera.
  put(
    0,
    2.1,
    F - 3.6,
    W - 0.9,
    3.8,
    0.16,
    gold ? "#8b1d28" : food ? "#a77d50" : work ? "#4b554c" : "#675e4e",
    {
      glow: gold ? "#923717" : food ? "#77532c" : cafe ? "#69512c" : "#1f2720",
    },
  );
  put(0, 3.95, F - 1.8, W - 0.8, 0.16, 3.6, "#c6b89b", {
    glow: food || gold || cafe ? "#987447" : "#242d27",
  });
  for (const side of [-1, 1]) {
    put(side * (W / 2 - 0.5), 2, F - 1.7, 0.22, 3.8, 3.6, accent, {
      glow: gold ? "#7b3620" : "#161817",
    });
    put(side * (W / 2 - 0.42), 2, F + 0.1, 0.38, 3.9, 0.24, accent);
  }
  put(0, 0.38, F - 1.8, W - 0.8, 0.14, 3.6, "#afa48a", {
    surface: gold ? "tile" : "concrete",
    glow: gold ? "#634a28" : "#272b25",
  });
  if (gold) {
    put(0, 0.85, F - 0.95, W - 1.6, 1.1, 1.3, "#781c27", { glow: "#6c2e18" });
    put(0, 1.45, F - 0.95, W - 1.6, 0.1, 1.45, "#f3d283", {
      ...metal,
      glow: "#f7b94e",
    });
    put(0, 1.16, F - 0.19, W - 1.8, 0.42, 0.06, "#ae9a61", {
      glow: "#6c682f",
      surface: "panel",
    });
    // Red velvet display walls with necklace rails, hooks, small gold busts.
    for (let i = 0; i < 5; i++) {
      const u = ((i - 2) * (W - 2)) / 5;
      put(u, 2.7, F - 3.43, 0.65, 0.95, 0.08, "#e9b84d", {
        ...metal,
        glow: "#da943b",
      });
      put(u, 2.8, F - 3.34, 0.4, 0.68, 0.09, "#941f2c");
      put(u, 1.66, F - 0.95, 0.48, 0.4, 0.44, "#e4b458", {
        ...near,
        ...metal,
        glow: "#ae742b",
        shape: "orb",
      });
    }
    put(0, 3.6, F - 0.25, W - 1.4, 0.12, 0.15, "#ffe0a1", {
      ...metal,
      glow: "#ffc163",
    });
    for (const side of [-1, 1])
      put(side * W * 0.39, 2.3, F - 1.5, 0.15, 2.8, 0.15, "#d4aa55", {
        ...metal,
        glow: "#5c3919",
      });
  } else if (food) {
    put(-W * 0.2, 1.05, F - 1.1, W * 0.44, 1.4, 1.5, "#81968e", {
      ...metal,
      glow: "#3b4d3c",
    });
    put(-W * 0.2, 1.82, F - 1.1, W * 0.46, 0.12, 1.7, "#ded6bd", {
      ...metal,
      ...warm,
    });
    put(-W * 0.2, 2.35, F - 1.85, W * 0.44, 0.9, 0.1, "#8d9f8d", {
      surface: "panel",
      glow: "#4a5c41",
    });
    put(-W * 0.2, 2.92, F - 1.6, W * 0.46, 0.1, 0.65, "#d7cdac", {
      ...metal,
      ...warm,
    });
    for (let i = 0; i < 3; i++) {
      put(-W * 0.34 + i * W * 0.13, 2, F - 1, 0.55, 0.32, 0.55, "#b9c1ac", {
        ...metal,
        ...near,
        shape: "cylinder",
      });
      // Suspended roast-food shapes attached to the display rail.
      put(
        -W * 0.34 + i * W * 0.13,
        2.45,
        F - 1.75,
        0.32,
        0.58,
        0.3,
        "#bd7037",
        { ...near, shape: "orb" },
      );
    }
    put(W * 0.25, 1, F - 1.65, W * 0.22, 0.16, 1.2, "#b98253");
    for (const dz of [-0.8, -2.55]) {
      put(
        W * 0.25,
        0.54,
        F + dz,
        0.65,
        0.14,
        0.65,
        v % 2 ? "#27a29a" : "#d84d3c",
      );
      for (const side of [-1, 1])
        put(W * 0.25 + side * 0.22, 0.26, F + dz, 0.08, 0.5, 0.08, "#66776a", {
          ...metal,
          ...near,
        });
    }
    put(0, 3.5, F - 0.4, W - 0.9, 0.12, 0.12, "#ffe1a6", {
      ...metal,
      glow: "#ffd07a",
    });
  } else if (cafe) {
    put(-W * 0.29, 1.7, F - 0.35, W * 0.28, 3, 0.12, "#274e4a", {
      surface: "panel",
      glow: "#1f4139",
    });
    put(W * 0.16, 1, F - 1, W * 0.48, 1.35, 1.2, "#9b6e49", {
      glow: "#51401e",
      surface: "wood",
    });
    put(W * 0.2, 1.95, F - 1, 0.85, 0.65, 0.65, "#a6b6a7", {
      ...metal,
      ...near,
    });
    for (const u of [-W * 0.18, W * 0.28]) {
      put(u, 3.3, F - 1.8, 0.7, 0.24, 0.7, "#b68a4a", {
        ...metal,
        shape: "cylinder",
      });
      put(u, 3.12, F - 1.8, 0.48, 0.1, 0.48, "#ffe2a2", {
        ...metal,
        glow: "#f7bc68",
      });
    }
    for (let i = 0; i < 3; i++)
      put(-W * 0.3 + i * 0.65, 2.4, F - 3.4, 0.32, 0.6, 0.3, "#a5ae80", {
        ...near,
        shape: "cylinder",
      });
    put(-W * 0.22, 2.05, F + 0.12, 0.12, 3.2, 0.16, "#aa9b79", metal);
  } else if (work) {
    put(0, 3.48, F - 0.2, W - 0.8, 0.85, 0.16, "#667467", metal);
    for (let i = 0; i < 4; i++)
      put(0, 3.2 + i * 0.17, F - 0.08, W - 1, 0.045, 0.08, "#9a9c84", {
        ...metal,
        ...near,
      });
    put(-W * 0.24, 0.85, F - 1.2, W * 0.32, 1.2, 1.5, "#566c65", metal);
    put(-W * 0.24, 1.65, F - 1.2, W * 0.34, 0.2, 1.6, "#96a293", metal);
    put(-W * 0.28, 2.15, F - 2, 0.7, 1, 0.7, "#748b81", {
      ...metal,
      ...near,
      shape: "cylinder",
    });
    for (let i = 0; i < 3; i++) {
      put(W * 0.2 + i * 0.65, 0.5, F - 0.75, 0.55, 0.85, 0.55, "#333d38", {
        ...metal,
        ...near,
        shape: "cylinder",
      });
      put(W * 0.2 + i * 0.65, 0.72, F - 0.75, 0.33, 0.3, 0.33, "#a09b7e", {
        ...metal,
        ...near,
      });
    }
    put(0, 2.6, F - 3.45, W * 0.7, 0.12, 0.12, "#a59e81", metal);
    for (let i = 0; i < 5; i++)
      put(-W * 0.25 + i * W * 0.12, 2.27, F - 3.3, 0.12, 0.5, 0.14, "#9a9e87", {
        ...metal,
        ...near,
      });
    put(0, 3.05, F - 0.45, W * 0.5, 0.12, 0.18, "#e4d8b4", {
      ...metal,
      glow: "#8c8b66",
    });
  } else if (a.trade === "clothes" || a.trade === "retail") {
    put(-W * 0.24, 1.4, F - 1, W * 0.36, 0.15, 1.2, "#997955", {
      surface: "wood",
    });
    for (let i = 0; i < 5; i++)
      put(
        -W * 0.36 + i * 0.65,
        1.8,
        F - 1,
        0.46,
        0.75,
        0.65,
        ["#b15250", "#4d9695", "#c7a866"][i % 3]!,
        { ...near, surface: "cloth" },
      );
    put(W * 0.23, 2.6, F - 1.3, W * 0.3, 0.1, 0.1, "#b8b7a1", metal);
    for (let i = 0; i < 4; i++)
      put(
        W * 0.1 + i * 0.6,
        1.95,
        F - 1.3,
        0.45,
        1.2,
        0.25,
        ["#e0c5a0", "#647b83", "#a76e63"][i % 3]!,
        { ...near, surface: "cloth" },
      );
  } else if (a.trade === "medicine") {
    put(0, 1, F - 1, W - 0.9, 1.25, 1.2, "#865b3a", {
      surface: "wood",
      glow: "#3f321d",
    });
    for (let j = 0; j < 3; j++) {
      put(0, 1.8 + j * 0.65, F - 3.4, W - 1, 0.12, 0.4, "#b9925e", {
        surface: "wood",
      });
      for (let i = 0; i < 5; i++)
        put(
          (i - 2) * W * 0.16,
          2.03 + j * 0.65,
          F - 3.35,
          0.4,
          0.38,
          0.35,
          "#b7b48a",
          { ...near, shape: "cylinder" },
        );
    }
  } else {
    // Residential/closed fronts and wholesale shutter rhythm are intentional.
    const shutter = a.trade === "closed" || a.trade === "residence";
    put(
      0,
      1.95,
      F - 0.5,
      W - 1,
      3.3,
      0.15,
      shutter ? "#58675c" : "#626e5b",
      metal,
    );
    for (let i = 0; i < 7; i++)
      put(0, 0.6 + i * 0.43, F - 0.4, W - 1, 0.06, 0.08, "#87907a", {
        ...near,
        ...metal,
      });
    if (!shutter)
      for (let i = 0; i < 3; i++)
        put((i - 1) * 1.2, 0.8, F - 1.2, 1, 0.95, 1, "#ac9166", {
          ...near,
          surface: "wood",
        });
  }
  // Curated canopy variants, inset behind the curb. This is a rigid shop
  // awning with a shallow slope rather than the old half-sphere placeholder.
  if (!work && a.trade !== "residence" && v !== 5) {
    put(0, STOREFRONT.awningY, F + 0.55, W - 0.35, 0.17, 1.7, accent, {
      surface: "cloth",
      pitch: 0.12,
    });
    put(0, STOREFRONT.awningLipY, F + 1.34, W - 0.35, 0.28, 0.12, accent, {
      surface: "cloth",
    });
    if (v % 2 === 0)
      for (let i = 0; i < 6; i++)
        put(
          ((i - 2.5) * (W - 0.4)) / 6,
          STOREFRONT.awningY + 0.025,
          F + 0.55,
          (W - 0.4) / 12,
          0.025,
          1.7,
          "#d4c2a1",
          { surface: "cloth", pitch: 0.12, ...near },
        );
  }
  // AC compressors, balcony grilles, ceramic friezes and rainwater pipes.
  if (v % 2 === 0) {
    put(-W * 0.29, 6.1, F + 0.5, 1.5, 0.9, 0.8, "#b4baa4", metal);
    for (let i = 0; i < 4; i++)
      put(-W * 0.29, 5.84 + i * 0.16, F + 0.92, 1.2, 0.05, 0.04, "#697e74", {
        ...near,
        ...metal,
      });
  }
  if (v === 1 || v === 4) {
    put(0, 8, F + 0.6, W * 0.78, 0.2, 1.5, "#c9c0a5");
    put(0, 8.6, F + 1.22, W * 0.78, 0.12, 0.1, accent, metal);
    for (let i = 0; i < 7; i++)
      put((i - 3) * W * 0.11, 8.35, F + 1.22, 0.07, 0.65, 0.1, accent, {
        ...near,
        ...metal,
      });
  }
  put(W * 0.43, H * 0.5, F + 0.21, 0.13, H - 0.5, 0.13, "#69766b", {
    ...near,
    ...metal,
  });
  if (song || talat) {
    put(0, H + 0.45, F - 0.12, W * 0.65, 0.5, 0.38, "#cbbb98");
    for (let i = 0; i < 4; i++)
      put(
        (i - 1.5) * W * 0.19,
        H - 0.8,
        F + 0.24,
        0.25,
        0.45,
        0.15,
        "#a99b7c",
        near,
      );
    for (let i = 0; i < 4; i++)
      put(
        -W * 0.36 + i * W * 0.2,
        0.75 + (i % 3) * 0.85,
        F + 0.025,
        W * 0.12,
        0.35,
        0.04,
        ["#a28e70", "#c0a584", "#bdaf90"][i % 3]!,
        { ...near, surface: "brick" },
      );
  } else if (v === 0 || v === 3) {
    put(0, H + 0.65, F - 0.1, W * 0.45, 0.65, 0.45, accent);
    put(0, H + 1.05, F - 0.1, W * 0.52, 0.16, 0.55, "#dbc9a1");
    for (let i = 0; i < 5; i++)
      put((i - 2) * W * 0.17, 5.25, F + 0.15, W * 0.09, 0.26, 0.12, accent, {
        surface: "tile",
        ...near,
      });
  }
  if (yao && (food || cafe))
    for (const u of [-W * 0.35, W * 0.35]) {
      put(u, 3.12, F - 0.2, 0.6, 0.8, 0.6, "#c63a2d", {
        shape: "orb",
        glow: "#8d2313",
      });
      put(u, 3.58, F - 0.2, 0.06, 0.5, 0.06, "#665141", near);
      put(u, 2.67, F - 0.2, 0.28, 0.1, 0.28, "#dfa959", {
        ...metal,
        glow: "#a96526",
      });
      put(u, 2.46, F - 0.2, 0.07, 0.35, 0.07, "#b23029", near);
    }
  if (composition) {
    // Six deliberately composed elevations on approved central plots.
    for (const u of [-W * 0.36, 0, W * 0.36]) {
      put(u, 6.7, F + 0.22, 0.28, 2.8, 0.3, accent);
      put(u, 8.2, F + 0.35, 1.1, 0.22, 0.5, "#dfceaa");
    }
    put(0, 8.45, F + 0.4, W - 0.2, 0.28, 0.9, "#d4c1a0");
    if (composition.treatment === "tea-balcony") {
      put(0, 5.75, F + 0.65, W - 0.6, 0.2, 1.4, "#b89c77");
      put(0, 6.5, F + 1.24, W - 0.6, 0.18, 0.15, accent);
      for (let i = 0; i < 10; i++)
        put(
          ((i - 4.5) * (W - 0.9)) / 10,
          6.12,
          F + 1.24,
          0.08,
          0.7,
          0.1,
          accent,
          { ...metal, ...near },
        );
      for (const u of [-W * 0.25, W * 0.25]) {
        put(u, 5.9, F + 0.6, 0.65, 0.5, 0.65, "#a27754");
        put(u, 6.45, F + 0.6, 1, 1, 0.8, "#587553", { shape: "orb", ...near });
      }
    } else if (composition.treatment === "kitchen") {
      put(0, 3.15, F - 2.9, W * 0.8, 0.14, 0.6, "#bcc3ad", metal);
      for (let i = 0; i < 5; i++)
        put((i - 2) * W * 0.14, 2.6, F - 2.9, 0.36, 0.65, 0.35, "#a96234", {
          shape: "orb",
          ...near,
        });
      for (const side of [-1, 1]) {
        put(side * W * 0.4, 1.8, F - 1.65, 0.7, 0.15, 1.3, "#85998d", metal);
        put(side * W * 0.4, 2.1, F - 1.65, 0.45, 0.4, 0.45, "#d5c8a5", {
          shape: "cylinder",
          ...near,
        });
      }
    }
  }
  if ((work || talat) && v % 3 === 1) {
    const u = -W * 0.3;
    for (const z of [F - 0.55, F - 2.05])
      put(u, 0.53, z, 0.74, 0.18, 0.74, "#2b3734", {
        ...metal,
        shape: "cylinder",
        pitch: Math.PI / 2,
        yaw: yaw + Math.PI / 2,
      });
    put(u, 0.98, F - 1.2, 0.6, 0.65, 1.3, accent, metal);
    put(u, 1.36, F - 1.5, 0.62, 0.13, 0.82, "#303e38");
    put(u, 1.55, F - 0.6, 0.9, 0.08, 0.12, "#a5afa3", metal);
    put(u, 1.3, F - 0.48, 0.4, 0.55, 0.18, accent, metal);
  }
  if (ct.identity === "hua-seng-heng") {
    // Existing verified branch only: pale stone frame, red-and-gold threshold
    // and an articulated lintel; no brand photo or transplanted logo texture.
    for (const side of [-1, 1]) {
      put(side * (W / 2 - 0.8), 2.2, F + 0.2, 0.6, 4.2, 0.4, "#e3d2af", {
        glow: "#70491e",
      });
      put(side * (W / 2 - 0.8), 0.5, F + 0.28, 0.85, 0.3, 0.55, "#c9ab6c");
    }
    for (let i = 0; i < 3; i++)
      put(0, 5.1 + i * 0.22, F + 0.18, W - i * 0.3, 0.15, 0.5, "#ddc89d");
  } else if (ct.identity === "tang-to-kang") {
    // Cream merchant-house ornament remains at its original verified site.
    for (const u of [-W * 0.3, 0, W * 0.3]) {
      put(u, H - 0.9, F + 0.2, W * 0.2, 0.7, 0.2, "#e4d6b2", {
        shape: "arch",
        ...near,
      });
      put(u, H - 0.4, F + 0.2, 0.35, 0.35, 0.35, "#bda578", {
        shape: "orb",
        ...near,
      });
    }
    put(0, H + 0.8, F - 0.18, W * 0.45, 0.9, 0.4, "#d0bd97");
    put(0, H + 1.35, F - 0.18, W * 0.53, 0.16, 0.6, "#eee1c1");
  }
  // Opaque, warm threshold paving approximates reflected light without alpha
  // overdraw. Three decreasing bands stay in the 2.4m existing apron.
  if (gold || food || cafe)
    for (let i = 0; i < 3; i++)
      put(
        0,
        0.235,
        F + 0.32 + i * 0.55,
        W - 0.7,
        0.025,
        0.54,
        ["#a59170", "#a19a87", "#a39f8e"][i]!,
        { glow: ["#654523", "#352b1b", "#141814"][i], surface: "concrete" },
      );
}
