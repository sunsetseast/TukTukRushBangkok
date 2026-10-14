import type { District } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import { degreeMap } from "../roadGeometry";
import { planEnvironment } from "./environmentPlan";
import { stableHash } from "./buildingGrammar";
export function emitEnvironment(d: District, emit: (p: ArtPiece) => void) {
  let siteId: string | undefined;
  const put = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    depth: number,
    color: string,
    yaw = 0,
    shape: ArtPiece["shape"] = "box",
    layer: ArtPiece["layer"] = "core",
  ) =>
    emit({
      x,
      y,
      z,
      w,
      h,
      d: depth,
      color,
      yaw,
      shape,
      layer,
      siteId,
      surface: shape === "orb" ? "plaster" : "concrete",
    });
  const nodes = new Map(d.nodes.map((n) => [n.id, n])),
    degree = degreeMap(d);
  for (const r of d.roads) {
    if (r.shortcut || r.roundabout || r.bridge) continue;
    const a = nodes.get(r.a)!,
      b = nodes.get(r.b)!,
      len = Math.hypot(b.x - a.x, b.z - a.z),
      yaw = Math.atan2(b.x - a.x, b.z - a.z),
      sx = Math.sin(yaw),
      cz = Math.cos(yaw),
      from = (degree.get(r.a) ?? 0) > 2 ? 13 : 0,
      to = len - ((degree.get(r.b) ?? 0) > 2 ? 13 : 0),
      seed = stableHash(`${r.a}:${r.b}`);
    const local = (
      u: number,
      t: number,
      y: number,
      w: number,
      h: number,
      depth: number,
      color: string,
      rotation = 0,
      shape: ArtPiece["shape"] = "box",
      layer: ArtPiece["layer"] = "core",
    ) =>
      put(
        a.x + sx * t + cz * u,
        y,
        a.z + cz * t - sx * u,
        w,
        h,
        depth,
        color,
        yaw + rotation,
        shape,
        layer,
      );
    if (to > from)
      for (const side of [-1, 1]) {
        const t = (from + to) / 2;
        local(side * (r.width / 2 + 3), t, 0.14, 6, 0.16, to - from, "#b8b3a3");
        local(
          side * (r.width / 2 + 0.12),
          t,
          0.18,
          0.22,
          0.09,
          to - from,
          "#ded7bb",
        );
        local(
          side * (r.width / 2 - 0.12),
          t,
          0.147,
          0.2,
          0.01,
          to - from,
          "#5d665f",
        );
        for (let v = from + 3; v < to; v += 5.3)
          local(
            side * (r.width / 2 + 2.8),
            v,
            0.227,
            5.5,
            0.014,
            0.045,
            "#898b7f",
            0,
            "box",
            "detail",
          );
        if (seed % 3 === 0) {
          const v = from + (to - from) * 0.62;
          local(
            side * (r.width / 2 - 0.25),
            v,
            0.156,
            0.45,
            0.025,
            1.1,
            "#6d7975",
          );
          for (let i = 0; i < 5; i++)
            local(
              side * (r.width / 2 - 0.25),
              v - 0.4 + i * 0.2,
              0.17,
              0.43,
              0.025,
              0.025,
              "#344c4c",
              0,
              "box",
              "detail",
            );
        }
      }
    if (seed % 13 === 0)
      local(0, len * 0.55, 0.154, 1, 0.02, 1, "#637274", 0, "cylinder");
    if (seed % 5 === 0 && !r.oneWay)
      for (const side of [-1, 1]) {
        const t = len * 0.5;
        local(side * r.width * 0.24, t, 0.155, 0.18, 0.012, 2.5, "#d2cab4");
        local(
          side * r.width * 0.24,
          t - side * 1.3,
          0.155,
          1,
          0.012,
          1,
          "#d2cab4",
          side > 0 ? Math.PI : 0,
          "arrow",
        );
      }
    if (
      (!r.oneWay && (degree.get(r.a) ?? 0) > 2) ||
      (r.oneWay && (degree.get(r.b) ?? 0) > 2)
    ) {
      const t = r.oneWay ? len - 12.5 : 12.5;
      for (let u = -r.width / 2 + 1; u < r.width / 2 - 1; u += 1.35)
        local(u, t, 0.16, 0.78, 0.012, 2.7, "#e4dbc0");
      local(
        ((r.oneWay ? -1 : 1) * r.width) / 4,
        r.oneWay ? t - 2.5 : t + 2.5,
        0.16,
        r.width / 2 - 1,
        0.012,
        0.22,
        "#e2d5b2",
      );
    }
  }
  for (const site of planEnvironment(d)) {
    siteId = site.id;
    const b = site.body,
      yaw = b.yaw ?? 0,
      c = Math.cos(yaw),
      s = Math.sin(yaw),
      seed = site.seed,
      green = ["#60845c", "#436d59", "#73965e"][seed % 3]!;
    const B = (
      u: number,
      y: number,
      v: number,
      w: number,
      h: number,
      depth: number,
      color: string,
      shape: ArtPiece["shape"] = "box",
      layer: ArtPiece["layer"] = "core",
      turn = 0,
    ) =>
      put(
        b.x + c * u + s * v,
        y,
        b.z - s * u + c * v,
        w,
        h,
        depth,
        color,
        yaw + turn,
        shape,
        layer,
      );
    if (["tree", "palm"].includes(site.kind)) {
      const H = site.kind === "palm" ? 9.5 : 5.8 + (seed % 4) * 0.5;
      B(0, 0.5, 0, b.w, 0.6, b.d, "#b7b08e");
      B(0, H / 2 + 0.25, 0, 0.32, H, 0.32, "#7c6950", "cylinder");
      if (site.kind === "tree")
        for (const [u, y, v, w, h, depth] of [
          [0, H, 0, 5, 3.5, 5],
          [-1.5, H - 0.6, 0.4, 3.9, 3, 3.7],
          [1.4, H + 0.6, -0.5, 3.7, 3.2, 4],
        ])
          B(u!, y!, v!, w!, h!, depth!, green, "orb");
      else
        for (let i = 0; i < 6; i++)
          B(0, H, 0, 0.65, 0.38, 7, green, "orb", "core", (i * Math.PI) / 3);
    } else if (["lamp", "signal"].includes(site.kind)) {
      B(0, 3.5, 0, 0.25, 6.6, 0.25, "#5c6d66", "cylinder");
      B(0, 6.65, 0.6, 0.22, 0.18, 1.5, "#5c6d66");
      if (site.kind === "lamp")
        B(0, 6.52, 1.2, 0.65, 0.15, 0.75, "#ffd597", "box", "night");
      else {
        B(0, 5.7, 0, 0.75, 1.8, 0.6, "#354c48");
        for (let i = 0; i < 3; i++)
          B(
            0,
            6.2 - i * 0.5,
            0.33,
            0.32,
            0.32,
            0.06,
            ["#ad594e", "#bda559", "#43825d"][i]!,
            "orb",
          );
      }
    } else if (site.kind === "scooter") {
      for (const z of [-0.9, 0.9])
        B(0, 0.6, z, 0.35, 0.75, 0.62, "#304747", "orb");
      B(
        0,
        0.8,
        0,
        0.6,
        0.75,
        1.5,
        ["#579184", "#be5d5b", "#d8b976"][seed % 3]!,
      );
      B(0, 1.3, -0.25, 0.55, 0.17, 0.85, "#3e4d4b");
      B(0, 1.5, 0.6, 1.05, 0.09, 0.15, "#687b78");
    } else if (site.kind === "bench") {
      for (const x of [-1.1, 1.1]) B(x, 0.55, 0, 0.25, 0.65, 1, "#566760");
      B(0, 0.87, 0, 3, 0.16, 1, "#89765a");
      B(0, 1.32, -0.47, 3, 0.65, 0.13, "#89765a");
    } else if (site.kind === "workshop") {
      for (let i = 0; i < 4; i++)
        B(
          -0.9 + (i % 2) * 0.8,
          0.5 + Math.floor(i / 2) * 0.45,
          0,
          0.65,
          0.45,
          0.7,
          "#414c49",
          "cylinder",
        );
      B(0.75, 0.75, 0.1, 1, 1.2, 1.6, "#819184");
      B(0.75, 1.5, 0.1, 0.8, 0.15, 0.8, "#c2b398");
    } else {
      const col = {
        noodle: "#479292",
        grill: "#a34d3e",
        fruit: "#b1a84d",
        tea: "#52766e",
      }[site.kind as "noodle" | "grill" | "fruit" | "tea"];
      B(0, 0.85, 0, b.w - 0.3, 1, b.d - 0.3, col);
      B(0, 1.42, 0, b.w, 0.18, b.d, "#d5cbb6");
      if (site.kind !== "fruit")
        for (const u of [-b.w * 0.43, b.w * 0.43])
          B(u, 2.2, 0, 0.07, 1.7, 0.07, "#778780", "cylinder");
      if (site.kind === "noodle") {
        B(0, 3, 0, b.w, 0.15, b.d, "#dab55e");
        B(-0.55, 1.72, 0, 0.65, 0.55, 0.65, "#a5bab2", "cylinder");
        B(0.6, 2, 0.2, 0.65, 0.85, 0.5, "#b3d3c9");
        for (const u of [-0.6, 0, 0.6])
          B(u, 1.65, -0.6, 0.3, 0.2, 0.3, "#e6dfc9", "cylinder", "detail");
      } else if (site.kind === "grill") {
        B(-0.8, 1.65, 0, 1.35, 0.25, 1.6, "#42544e");
        for (let v = -0.6; v < 0.7; v += 0.2)
          B(-0.8, 1.8, v, 1.35, 0.06, 0.06, "#da9d58", "box", "detail");
        B(0.75, 1.88, 0, 0.8, 0.7, 0.8, "#b57449", "cylinder");
        B(0, 2.9, 0, b.w, 0.22, b.d, "#bc714b");
      } else if (site.kind === "fruit") {
        B(0, 2.7, 0, b.w, 0.2, b.d, "#c8a964");
        for (let i = 0; i < 9; i++)
          B(
            -1.1 + (i % 3) * 0.8,
            1.75,
            Math.floor(i / 3) * 0.65 - 0.65,
            0.55,
            0.35,
            0.5,
            ["#d4b64d", "#a56842", "#69934f"][i % 3]!,
            "orb",
          );
      } else {
        B(0, 2.65, 0, b.w * 0.75, 0.18, b.d * 0.75, "#9db69c");
        for (const u of [-0.55, 0.4])
          B(u, 1.83, 0, 0.48, 0.75, 0.48, "#d29c56", "cylinder");
        B(0, 1.75, -0.65, 1.35, 0.42, 0.35, "#c7d7c6");
      }
      for (const u of [-b.w * 0.32, b.w * 0.32])
        B(u, 0.55, -b.d * 0.37, 0.25, 0.45, 0.25, "#384c45", "orb");
    }
  }
  siteId = undefined;
  for (const o of d.obstacles.filter((o) => o.protected)) {
    put(o.x, -0.06, o.z, o.w, 0.25, o.d, "#4a7952");
    put(o.x, 0.1, o.z, o.w * 0.84, 0.05, 2.8, "#aeb19a");
    put(o.x, 0.1, o.z, 2.8, 0.05, o.d * 0.84, "#aeb19a");
    for (const side of [-1, 1]) {
      put(o.x + (side * o.w) / 2, 0.55, o.z, 0.24, 1, o.d, "#859981");
      put(o.x, 0.55, o.z + (side * o.d) / 2, o.w, 1, 0.24, "#859981");
      put(o.x + side * (o.w / 2 - 8), 0.1, o.z, 3, 0.05, o.d - 16, "#afb79a");
    }
    put(
      o.x + o.w * 0.18,
      0.13,
      o.z - o.d * 0.17,
      Math.min(38, o.w * 0.35),
      0.05,
      Math.min(64, o.d * 0.25),
      "#678e83",
      0,
      "cylinder",
    );
    for (let i = 0; i < 42; i++) {
      const seed = stableHash(`${o.x}:${o.z}:${i}`),
        x = o.x + ((seed % 100) / 100 - 0.5) * (o.w - 18),
        z = o.z + ((Math.floor(seed / 100) % 100) / 100 - 0.5) * (o.d - 18);
      if (Math.abs(x - o.x) < 3 || Math.abs(z - o.z) < 3) continue;
      put(x, 3, z, 0.6, 6, 0.6, "#7c6c53", 0, "cylinder");
      put(x, 6.8, z, 7, 5.2, 7, "#4e7c53", seed % 6, "orb");
      put(x + 2, 7.4, z + 1, 4.2, 3.8, 4.4, "#608c5d", seed % 5, "orb");
    }
  }
  for (const l of d.landmarks.filter((l) =>
    ["arun", "pho", "icon", "paragon"].includes(l.id ?? ""),
  )) {
    const a = nodes.get(l.accessNode!)!,
      p = l.plot!,
      len = Math.hypot(p.x - a.x, p.z - a.z),
      yaw = Math.atan2(p.x - a.x, p.z - a.z),
      modern = ["icon", "paragon"].includes(l.id!),
      depth = Math.max(1, len - l.size! * 0.4),
      cx = (a.x + p.x) / 2,
      cz = (a.z + p.z) / 2;
    // Ground-only civic composition uses the already cleared 24m approach.
    // These low surfaces add no walls or unregistered solid street furniture.
    const paving = (
      u: number,
      v: number,
      w: number,
      d: number,
      color: string,
      y = 0.19,
      layer: ArtPiece["layer"] = "core",
    ) =>
      put(
        cx + Math.cos(yaw) * u + Math.sin(yaw) * v,
        y,
        cz - Math.sin(yaw) * u + Math.cos(yaw) * v,
        w,
        0.035,
        d,
        color,
        yaw,
        "box",
        layer,
      );
    paving(0, 0, 24, depth, modern ? "#c5c4ae" : "#b8ae94");
    paving(0, 0, modern ? 8 : 6, depth, modern ? "#e0d9c0" : "#d8cbb0", 0.22);
    for (const side of [-1, 1]) {
      paving(side * 8.4, 0, 4.8, depth, "#6e865c", 0.23);
      paving(side * 5.7, 0, 0.22, depth, "#e3d3ad", 0.25);
      for (let v = -depth / 2 + 2; v < depth / 2; v += 5.5) {
        paving(side * 8.4, v, 4.8, 0.15, "#a49d80", 0.26);
        paving(side * 5.7, v, 0.35, 1.1, "#e4bd78", 0.27, "night");
      }
    }
    for (let v = -depth / 2 + 1; v < depth / 2; v += 3.5)
      paving(0, v, modern ? 8 : 6, 0.055, "#a9a493", 0.245, "detail");
  }
}
