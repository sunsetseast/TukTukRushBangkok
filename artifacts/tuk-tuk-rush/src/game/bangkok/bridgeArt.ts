import type { District } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import { bridgeBarriers } from "./bridgeBarriers";
import { blockedByRiver } from "./world";
export function emitBridges(d: District, emit: (p: ArtPiece) => void) {
  const nodes = new Map(d.nodes.map((n) => [n.id, n])),
    put = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      depth: number,
      color: string,
      yaw = 0,
    ) => emit({ x, y, z, w, h, d: depth, color, yaw, surface: "metal" });
  for (const o of bridgeBarriers(d)) {
    put(o.x, 0.45, o.z, o.w, 0.55, o.d, "#83958b", o.yaw);
    put(o.x, 1.5, o.z, 0.18, 0.18, o.d, "#aec0b1", o.yaw);
    for (let t = -o.d / 2 + 0.7; t < o.d / 2; t += 4)
      put(
        o.x + Math.sin(o.yaw!) * t,
        0.95,
        o.z + Math.cos(o.yaw!) * t,
        0.2,
        1.6,
        0.2,
        "#6d877e",
      );
  }
  for (const r of d.roads.filter((r) => r.bridge)) {
    const a = nodes.get(r.a)!,
      b = nodes.get(r.b)!,
      yaw = Math.atan2(b.x - a.x, b.z - a.z),
      len = Math.hypot(b.x - a.x, b.z - a.z),
      m = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    put(m.x, -0.9, m.z, r.width + 1.5, 1.4, len + 0.1, "#7b8988", yaw);
    if (
      !blockedByRiver(
        d,
        {
          x: m.x + Math.cos(yaw) * (r.width / 2 + 2),
          z: m.z - Math.sin(yaw) * (r.width / 2 + 2),
        },
        0.7,
      )
    )
      continue;
    const memorial = r.corridor?.includes("memorial");
    for (const side of [-1, 1]) {
      const x = m.x + Math.cos(yaw) * side * (r.width / 2 + 2),
        z = m.z - Math.sin(yaw) * side * (r.width / 2 + 2);
      put(x, -3, z, 1.2, 5, 1.6, "#838b7d", yaw);
      if (memorial) {
        put(x, 4.2, z, 0.4, 8.3, 0.45, "#548778", yaw);
        put(x, 7.5, z, 0.35, 0.35, len, "#658f7b", yaw);
      } else {
        put(x, 3.8, z, 0.18, 7, 0.18, "#5b7368");
        put(x, 7.3, z, 0.6, 0.15, 0.65, "#e4c384");
      }
    }
    if (memorial) put(m.x, 7.7, m.z, r.width + 4, 0.3, 0.4, "#739b84", yaw);
  }
}
