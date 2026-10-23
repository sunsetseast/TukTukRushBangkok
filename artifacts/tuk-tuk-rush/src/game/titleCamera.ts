import type { District } from "./types";
import { YAOWARAT_BENCHMARK } from "./bangkok/yaowarat";
/** Presentation-only pose. Never writes the player's vehicle, chase history or QA lease. */
export function titleDrivePose(d: District) {
  if (d.worldId !== "bangkok")
    return d.spawn ?? { x: -280, z: 40, heading: Math.PI / 2 };
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const road = d.roads
    .filter((r) => r.corridor === "yaowarat")
    .sort((a, b) => {
      const p = nodes.get(a.a)!,
        q = nodes.get(b.a)!;
      return Math.hypot(p.x + 60, p.z + 188) - Math.hypot(q.x + 60, q.z + 188);
    })[0];
  const a = road && nodes.get(road.a),
    b = road && nodes.get(road.b);
  if (!a || !b) return d.spawn ?? YAOWARAT_BENCHMARK.titlePlayer;
  const heading = Math.atan2(b.x - a.x, b.z - a.z);
  return {
    x: (a.x + b.x) / 2 + Math.cos(heading) * 2,
    z: (a.z + b.z) / 2 - Math.sin(heading) * 2,
    heading,
  };
}
export function composeTitleCamera(
  p: { x: number; z: number; heading: number },
  aspect: number,
) {
  const fx = Math.sin(p.heading),
    fz = Math.cos(p.heading),
    rx = -fz,
    rz = fx,
    offset = aspect > 1 ? 3.3 : 0;
  return {
    position: [
      p.x - fx * (aspect > 1 ? 11.7 : 13) - rx * offset,
      aspect > 1 ? 3.8 : 4.7,
      p.z - fz * (aspect > 1 ? 11.7 : 13) - rz * offset,
    ] as [number, number, number],
    target: [
      p.x + fx * (aspect > 1 ? 25 : 9) - rx * offset,
      aspect > 1 ? 2.6 : 0.35,
      p.z + fz * (aspect > 1 ? 25 : 9) - rz * offset,
    ] as [number, number, number],
    fov: aspect > 1 ? 54 : 63,
  };
}
