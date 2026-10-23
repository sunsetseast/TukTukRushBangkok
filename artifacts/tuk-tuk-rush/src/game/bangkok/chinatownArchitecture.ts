import type { ArtPiece } from "./architecturalBatch";
import type { ParcelDesign } from "./buildingGrammar";
/** Original modular Chinese-Thai facades. Street identity controls materials,
 * opening rhythm, roof and activity instead of applying neon to every parcel. */
export function emitChinatownArchitecture(
  p: ParcelDesign,
  emit: (o: ArtPiece) => void,
) {
  const b = p.parcel,
    ct = b.chinatown;
  if (!ct) return false;
  const yaw = b.yaw ?? 0,
    c = Math.cos(yaw),
    s = Math.sin(yaw),
    W = b.w,
    H = b.height,
    F = b.d / 2,
    seed = p.bays[0]!.seed;
  const song = ct.character === "songwat",
    talat = ct.character === "talatnoi",
    yao = ct.character === "yaowarat",
    gold =
      ct.identity === "hua-seng-heng" ||
      ct.identity === "tang-to-kang" ||
      p.bays[0]!.trade === "gold";
  const wall = song
    ? ["#ddcfaf", "#c9c3a6", "#cbb995"][seed % 3]!
    : talat
      ? ["#ccb69a", "#afbeaa", "#c6a68b"][seed % 3]!
      : b.color;
  const trim = song ? "#eae0c3" : talat ? "#718471" : "#efe0bc",
    wood = song ? "#4e5c45" : talat ? "#405b51" : "#455452";
  const put = (
    u: number,
    y: number,
    v: number,
    w: number,
    h: number,
    d: number,
    color: string,
    surface: ArtPiece["surface"] = "plaster",
    layer: ArtPiece["layer"] = "core",
    shape: ArtPiece["shape"] = "box",
    rotation = 0,
  ) =>
    emit({
      x: b.x + c * u + s * v,
      y,
      z: b.z - s * u + c * v,
      w,
      h,
      d,
      color,
      yaw: yaw + rotation,
      surface,
      layer,
      shape,
      siteId: b.environmentId,
    });
  put(0, (H + 4.6) / 2, 0, W, H - 4.6, b.d, wall, "concrete");
  put(0, 2.3, -b.d / 2 + 0.4, W, 4.6, 0.8, wall, "concrete");
  for (const side of [-1, 1])
    put(side * (W / 2 - 0.3), 2.3, 0, 0.6, 4.6, b.d, wall, "concrete");
  put(0, 0.45, F - 2.4, W - 1, 0.2, 4.8, "#a99c7f", "concrete");
  put(0, 1.8, F - 3.8, W - 1, 3.5, 0.2, gold ? "#6c302e" : "#445a4c", "wood");
  put(0, 0.18, 0, W + 0.1, 0.36, b.d + 0.1, "#a5997e", "concrete");
  // Party walls and continuously aligned cornices articulate the coherent row.
  for (const side of [-1, 1])
    put(side * (W / 2 - 0.2), H / 2, F + 0.07, 0.35, H, 0.24, trim);
  put(0, 4.7, F + 0.26, W, 0.35, 0.8, trim);
  put(0, H - 0.4, F + 0.14, W, 0.65, 0.45, trim);
  if (song) {
    put(0, H + 0.5, 0, W, 2.3, b.d, "#7d6953", "tile", "core", "gable");
    put(0, H + 1.6, F + 0.22, W * 0.84, 0.2, 0.4, trim);
  } else {
    put(0, H + 0.3, 0, W, 0.6, b.d, "#999b88", "concrete");
    put(0, H + 1, F - 0.22, W, 0.8, 0.45, wall);
  }
  // Ground floor. Gold cases and workshop shutters are visible at chase height.
  put(
    0,
    2.2,
    F - 4.1,
    W - 1,
    4.3,
    0.15,
    gold ? "#692b2a" : song ? "#465340" : talat ? "#3b514c" : "#344e4d",
    "wood",
  );
  if (gold) {
    put(0, 1.2, F - 0.9, W - 1.7, 0.8, 1.4, "#a86e2f", "metal");
    for (let x = -W * 0.32; x < W * 0.4; x += 1.4) {
      put(
        x,
        1.95,
        F + 0.82,
        0.55,
        0.35,
        0.16,
        "#e3bc64",
        "metal",
        "night",
        "cylinder",
        Math.PI / 2,
      );
      put(x, 2.8, F + 0.16, 0.24, 0.7, 0.1, "#f6c770", "metal", "night");
    }
  } else if (talat && seed % 3 === 0) {
    for (let x = -W * 0.4; x < W * 0.43; x += 0.65)
      put(x, 2.2, F + 0.2, 0.08, 4.1, 0.08, "#788679", "metal", "near");
    put(-W * 0.25, 1.1, F + 0.35, W * 0.3, 1.8, 0.7, "#687468", "metal");
  } else {
    put(-W * 0.16, 1.1, F - 1.1, W * 0.57, 0.9, 1.5, "#8b7859", "wood");
    for (const u of [-W * 0.28, 0, W * 0.24]) {
      put(
        u,
        1.8,
        F - 1.15,
        0.7,
        0.55,
        0.65,
        ["#c9a85f", "#afc194", "#cd795a"][(seed + Math.round(u + W)) % 3]!,
        "plaster",
        "near",
        "orb",
      );
    }
    put(0, 2.1, F - 3.3, W - 1.5, 3.1, 0.15, "#526b5c", "wood");
    put(0, 2, F + 0.28, 0.13, 4, 0.2, trim);
    put(0, 1, F + 0.28, W - 1, 0.18, 0.2, trim);
    if (yao || seed % 3 === 1)
      put(0, 3.8, F + 0.3, W - 1, 0.15, 0.13, "#e5b970", "metal", "night");
  }
  // Deep merchant lintel and securely mounted horizontal sign cabinet.
  if (
    gold ||
    (yao && seed % 3 !== 0) ||
    (song && seed % 4 === 0) ||
    (talat && seed % 5 === 0)
  ) {
    // Recessed warm light belongs inside the shop. Shared emissive instances
    // provide depth at night without allocating a light for every storefront.
    put(
      0,
      3.05,
      F - 3.15,
      W * 0.64,
      1.25,
      0.08,
      gold ? "#ffcd7f" : "#e8ad68",
      "metal",
      "night",
    );
    put(
      -W * 0.28,
      3.65,
      F - 0.7,
      0.42,
      0.32,
      0.42,
      "#f0c483",
      "metal",
      "night",
      "cylinder",
    );
  }
  put(
    0,
    4.32,
    F + 0.26,
    W - 0.7,
    1.25,
    0.55,
    song ? "#736448" : gold ? "#a13136" : talat ? "#59726a" : "#9d614e",
    "wood",
  );
  if (p.bays[0]!.cabinet) {
    const y = Math.min(H - 2, 8.1),
      u = (W - 0.12) * 0.31;
    put(u, y, F + 1.25, 0.72, 4.7, 1.4, "#a54b3e", "metal");
    for (const y1 of [y - 1.4, y + 1.4])
      put(u, y1, F + 0.63, 0.18, 0.18, 1.4, "#40534e", "metal");
  }
  const floors = Math.max(2, Math.floor((H - 2) / 3.5));
  for (let floor = 1; floor < floors; floor++) {
    const y = 6.5 + ((floor - 1) * (H - 6)) / (floors - 1);
    put(0, y - 1.3, F + 0.1, W, 0.18, 0.28, trim);
    const columns = W > 14 ? 3 : 2;
    for (let j = 0; j < columns; j++) {
      const u = ((j + 0.5) * W) / columns - W / 2;
      put(u, y, F + 0.08, (W / columns) * 0.64, 2.05, 0.16, wood, "wood");
      put(u, y + 1.12, F + 0.2, (W / columns) * 0.8, 0.21, 0.38, trim);
      put(u, y - 1.08, F + 0.24, (W / columns) * 0.81, 0.2, 0.5, trim);
      if (song || talat) {
        for (const side of [-1, 1])
          put(
            u + ((side * W) / columns) * 0.18,
            y,
            F + 0.2,
            0.12,
            2,
            0.1,
            "#9b9c79",
            "wood",
            "near",
          );
        for (let k = 0; k < 5; k++)
          put(
            u,
            y - 0.7 + k * 0.35,
            F + 0.2,
            (W / columns) * 0.62,
            0.07,
            0.09,
            "#7b8b72",
            "wood",
            "near",
          );
      } else if ((seed + j + floor) % 4 === 0)
        put(
          u,
          y,
          F + 0.17,
          (W / columns) * 0.52,
          1.8,
          0.07,
          "#bd9a64",
          "metal",
          "night",
        );
    }
    if (yao && floor === 2 && seed % 3 === 0) {
      put(0, y - 1.05, F + 0.7, W - 0.5, 0.28, 1.8, trim);
      put(0, y - 0.5, F + 1.45, W - 0.7, 0.85, 0.12, wood, "metal");
      for (let u = -W * 0.42; u < W * 0.45; u += 0.8)
        put(u, y - 0.5, F + 1.45, 0.07, 0.85, 0.1, wood, "metal", "near");
    }
    // Corner returns are authored elevations too. The old frontage-only mass
    // left blank walls directly in the driver's view at diagonal intersections.
    if (p.bays[0]!.corner)
      for (const side of [-1, 1])
        for (const v of [-b.d * 0.26, b.d * 0.08, b.d * 0.34]) {
          put(side * (W / 2 + 0.04), y, v, 0.12, 1.9, 2.7, wood, "wood");
          put(side * (W / 2 + 0.16), y + 1.05, v, 0.3, 0.18, 3.05, trim);
          put(side * (W / 2 + 0.18), y - 1.05, v, 0.42, 0.18, 3.05, trim);
        }
    if (song || talat)
      for (const u of [-W * 0.25, W * 0.25]) {
        put(u, y, -F - 0.04, W * 0.28, 1.85, 0.12, wood, "wood");
        put(u, y - 1, -F - 0.18, W * 0.34, 0.16, 0.38, trim);
      }
  }
  if (p.bays[0]!.corner)
    for (const side of [-1, 1])
      put(side * (W / 2 + 0.04), 2.1, F - 4, 0.12, 3.6, 3.2, wood, "wood");
  // Deliberate weathering, planted doorways and roof utilities stay in the plot.
  if (talat || song)
    for (let i = 0; i < 3; i++)
      put(
        (i - 1) * W * 0.25,
        1.2 + i * 0.6,
        F + 0.015,
        W * 0.16,
        0.35,
        0.03,
        ["#baaa8e", "#adac91", "#d1bf9f"][i]!,
        "brick",
        "near",
      );
  if (talat) {
    for (const side of [-1, 1]) {
      put(
        side * W * 0.42,
        0.45,
        F + 0.65,
        0.7,
        0.9,
        0.7,
        "#9a6c4f",
        "plaster",
        "near",
      );
      put(
        side * W * 0.42,
        1.25,
        F + 0.65,
        1.1,
        1.6,
        1,
        "#628166",
        "plaster",
        "near",
        "orb",
      );
    }
  }
  if (!song && seed % 2 === 0) {
    put(
      W * 0.23,
      H + 0.9,
      -b.d * 0.24,
      1.8,
      1.2,
      1.4,
      "#bac4b5",
      "metal",
      "near",
    );
    put(
      -W * 0.2,
      H + 1.2,
      -b.d * 0.3,
      1.3,
      2.4,
      1.3,
      "#9da9a2",
      "metal",
      "near",
      "cylinder",
    );
  }
  return true;
}
