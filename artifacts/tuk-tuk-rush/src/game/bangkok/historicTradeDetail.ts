import type { ParcelDesign } from "./buildingGrammar";
import type { ArtPiece } from "./architecturalBatch";

/** Original, bounded merchant/workshop compositions inside existing shells.
 * Quiet historic streets retain working architecture rather than neon infill. */
export function emitHistoricTradeDetail(
  p: ParcelDesign,
  emit: (q: ArtPiece) => void,
) {
  const b = p.parcel,
    ct = b.chinatown,
    a = p.bays[0]!;
  if (!ct || ct.character === "yaowarat") return;
  const F = b.d / 2,
    W = b.w,
    H = b.height,
    v = a.seed % 5,
    yaw = b.yaw ?? 0,
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  const put = (
    u: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    surface: ArtPiece["surface"] = "metal",
    shape: ArtPiece["shape"] = "box",
    layer: ArtPiece["layer"] = "near",
  ) =>
    emit({
      x: b.x + c * u + s * z,
      z: b.z - s * u + c * z,
      y,
      w,
      h,
      d,
      color,
      surface,
      shape,
      layer,
      yaw,
      siteId: b.environmentId,
    });
  if (ct.role === "rear") {
    const back = -F - 0.17,
      count = Math.max(1, Math.floor(W / 9));
    for (let i = 0; i < count; i++) {
      const u = ((i + 0.5) / count - 0.5) * W,
        bw = W / count;
      put(
        u,
        2.45,
        back,
        bw * 0.64,
        3.8,
        0.09,
        v % 2 ? "#64746b" : "#796c55",
        "wood",
        "box",
        "core",
      );
      for (const side of [-1, 1]) {
        put(
          u + side * bw * 0.34,
          2.7,
          back - 0.05,
          0.24,
          4.5,
          0.23,
          "#c9b897",
          "brick",
          "box",
          "core",
        );
        put(u + side * bw * 0.24, 2.1, back - 0.09, 0.08, 2.6, 0.09, "#343f3a");
        put(
          u + side * bw * 0.07,
          2.1,
          back - 0.16,
          0.12,
          0.28,
          0.12,
          "#b6ac89",
        );
      }
      put(
        u,
        4.65,
        back - 0.12,
        bw * 0.75,
        0.25,
        0.4,
        "#d4c5a5",
        "plaster",
        "box",
        "core",
      );
      put(
        u,
        5.5,
        back - 0.04,
        bw * 0.57,
        0.65,
        0.1,
        "#354b46",
        "wood",
        "box",
        "core",
      );
      for (let j = 0; j < 4; j++) {
        put(
          u + (j - 1.5) * bw * 0.12,
          5.5,
          back - 0.11,
          0.08,
          0.65,
          0.08,
          "#a69c7d",
        );
        put(
          u,
          1 + j * 0.8,
          back - 0.07,
          bw * 0.59,
          0.07,
          0.07,
          "#4b5a4f",
          "wood",
        );
      }
    }
    for (const u of [-W * 0.43, W * 0.43]) {
      put(
        u,
        H * 0.48,
        back - 0.06,
        0.13,
        H * 0.9,
        0.13,
        "#5d675d",
        "metal",
        "box",
        "core",
      );
      put(u, H - 0.4, back - 0.12, 0.38, 0.5, 0.28, "#687469");
    }
    return;
  }
  if (ct.character === "songwat") {
    const cafe = ["coffee", "tea", "gallery"].includes(a.trade);
    put(
      0,
      3.38,
      F - 0.12,
      W - 0.9,
      0.18,
      0.22,
      "#443f34",
      "metal",
      "box",
      "core",
    );
    for (const u of [-W * 0.37, W * 0.37]) {
      put(u, 3.24, F - 0.03, 0.28, 0.3, 0.16, "#777966", "metal", "cylinder");
      put(u, 1.85, F - 0.21, 0.11, 2.6, 0.12, "#3d4940");
    }
    for (let i = 0; i < 5; i++)
      put(
        (i - 2) * W * 0.14,
        3.02,
        F - 0.24,
        0.1,
        0.42,
        0.12,
        "#aa9772",
        "wood",
      );
    if (!cafe) {
      const opening = v % 2 ? W * 0.36 : W * 0.63;
      put(
        W * 0.18,
        1.65,
        F - 0.38,
        opening,
        2.9,
        0.12,
        v % 2 ? "#75664e" : "#455a50",
        "wood",
      );
      for (let j = 0; j < 6; j++)
        put(
          W * 0.18,
          0.5 + j * 0.45,
          F - 0.28,
          opening - 0.2,
          0.06,
          0.06,
          "#a09874",
          "wood",
        );
      put(-W * 0.29, 0.7, F - 1.5, W * 0.2, 1.05, 1.1, "#ac8d60", "wood");
      for (let i = 0; i < 3; i++)
        put(
          -W * 0.36 + i * W * 0.07,
          1.36,
          F - 1.5,
          W * 0.055,
          0.22,
          0.75,
          "#d3b88a",
          "wood",
        );
    } else {
      put(-W * 0.27, 1.6, F - 0.2, W * 0.23, 2.5, 0.1, "#264d49", "panel");
      for (let i = 0; i < 3; i++)
        put(
          W * 0.1 + i * W * 0.13,
          1.2,
          F - 1.7,
          0.7,
          0.14,
          0.85,
          "#b08b62",
          "wood",
        );
      put(W * 0.3, 2.2, F - 3.35, W * 0.3, 1.5, 0.12, "#c6b28d", "plaster");
      put(W * 0.3, 2.2, F - 3.22, W * 0.21, 1.05, 0.1, "#647665", "wood");
    }
  } else if (ct.character === "talatnoi") {
    const work = a.trade === "workshop",
      color = ["#57736b", "#7e6452", "#8c8d71", "#4c6665", "#a58c70"][v]!;
    for (const side of [-1, 1]) {
      put(
        side * W * 0.4,
        1.85,
        F - 0.12,
        W * 0.09,
        3.1,
        0.18,
        color,
        "metal",
        "box",
        "core",
      );
      for (let j = 0; j < 3; j++)
        put(
          side * (W * 0.37 + j * 0.08),
          1.85,
          F - 0.04,
          0.045,
          3,
          0.06,
          "#bac0a2",
        );
      put(side * W * 0.43, 3.33, F + 0.08, 0.35, 0.2, 0.3, "#b4a583", "brick");
    }
    if (work) {
      put(W * 0.24, 1.05, F - 1.8, W * 0.28, 0.16, 1.1, "#8c8e72", "wood");
      for (let i = 0; i < 3; i++) {
        put(W * 0.13 + i * W * 0.1, 1.32, F - 1.75, 0.5, 0.42, 0.55, "#65776e");
        put(
          W * 0.13 + i * W * 0.1,
          1.6,
          F - 1.75,
          0.26,
          0.18,
          0.28,
          "#b4b29a",
          "metal",
          "cylinder",
        );
        put(
          -W * 0.31,
          0.5 + i * 0.28,
          F - 2.6,
          0.9,
          0.25,
          0.9,
          "#283c35",
          "metal",
          "cylinder",
        );
        put(-W * 0.31, 2.1 + i * 0.2, F - 3.4, 0.55, 0.06, 0.1, "#bdac80");
      }
      put(-W * 0.1, 2.5, F - 3.4, 0.12, 0.8, 0.12, "#b9aa86");
    } else if (v % 2) {
      put(-W * 0.27, 1.7, F - 0.22, W * 0.22, 2.7, 0.12, "#6b5141", "wood");
      put(-W * 0.22, 1.65, F - 0.12, 0.12, 0.22, 0.12, "#c5ad76");
      put(W * 0.3, 0.5, F - 0.6, 0.7, 0.3, 0.7, "#8c6e51", "wood");
    }
  } else if (ct.character === "commercial") {
    if (a.trade === "clothes" || v === 2) {
      put(0, 2.4, F - 1.4, W * 0.68, 0.1, 0.1, "#b2b8a0");
      for (let i = 0; i < 5; i++) {
        const u = (i - 2) * W * 0.12;
        put(
          u,
          1.86,
          F - 1.4,
          W * 0.1,
          0.9,
          0.16,
          ["#b97858", "#658b81", "#d1b37b", "#7d6678", "#c8c2a4"][i]!,
          "cloth",
        );
        put(u, 2.34, F - 1.4, 0.08, 0.16, 0.1, "#d0c09b");
      }
    } else
      for (let i = 0; i < 4; i++) {
        const u = (i - 1.5) * W * 0.17;
        put(u, 0.95, F - 1.1, W * 0.13, 1.1, 0.95, "#8b7654", "wood");
        put(u, 1.6, F - 1.1, W * 0.14, 0.13, 1, "#d1be92", "wood");
        put(
          u,
          1.83,
          F - 1.1,
          W * 0.1,
          0.36,
          0.6,
          i % 2 ? "#8b9d83" : "#b77b5e",
          "cloth",
        );
      }
  }
  for (let j = 0; j < 3; j++)
    put(
      (j % 2 ? 1 : -1) * (W / 2 - 0.28),
      0.8 + j * 0.85,
      F + 0.03,
      0.3,
      0.25 + (v % 3) * 0.11,
      0.06,
      ["#a18b6a", "#b9a385", "#c4b492"][j]!,
      "brick",
    );
}
