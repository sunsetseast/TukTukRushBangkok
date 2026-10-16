import type { District, Point } from "../types";
import { regionAt, SCALE, toMap } from "./world";
const cache = new WeakMap<District, ReturnType<typeof build>>();
const points = (ps: Point[]) =>
  ps
    .map((p) => {
      const m = toMap(p);
      return `${m.x},${m.y}`;
    })
    .join(" ");
/** Shared immutable geometry; only discovery and view clipping remain dynamic. */
function build(d: District) {
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const roads = d.roads.map((r) => {
    const a = nodes.get(r.a)!,
      b = nodes.get(r.b)!,
      am = toMap(a),
      bm = toMap(b),
      major = r.width >= 20;
    return {
      path: `M${am.x},${am.y}L${bm.x},${bm.y}`,
      region: regionAt(d, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 })?.id,
      shortcut: r.shortcut ? r.corridor : undefined,
      color: r.bridge
        ? "#f9f5dc"
        : r.destinationId
          ? "#fff5df"
          : r.shortcut
            ? "#c39e6c"
            : major
              ? "#fff3d1"
              : "#e5e1cb",
      width: Math.max(r.width / SCALE, major ? 2.8 : 1.2),
      minX: Math.min(a.x, b.x),
      maxX: Math.max(a.x, b.x),
      minZ: Math.min(a.z, b.z),
      maxZ: Math.max(a.z, b.z),
    };
  });
  const footprints = d.buildings
    .filter((_, i) => i % 6 === 0)
    .map((b) => {
      const m = toMap(b),
        c = Math.cos(-(b.yaw ?? 0)),
        s = Math.sin(-(b.yaw ?? 0));
      return `M${[
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]
        .map(([x, y]) => {
          const dx = (x! * b.w) / SCALE / 2,
            dy = (y! * b.d) / SCALE / 2;
          return `${(m.x + dx * c - dy * s).toFixed(2)},${(m.y + dx * s + dy * c).toFixed(2)}`;
        })
        .join("L")}Z`;
    })
    .join("");
  return {
    roads,
    footprints,
    river: points(d.river ?? []),
    canals: d.canals?.map((c) => points(c.points)),
    regions: d.regions?.map((r) => points(r.polygon)),
    transit: d.transit?.lines.map((l) => points(l.samples)),
  };
}
export function cartography(d: District) {
  let value = cache.get(d);
  if (!value) {
    value = build(d);
    cache.set(d, value);
  }
  return value;
}
export function roadPaths(
  d: District,
  detail: boolean,
  px: number,
  pz: number,
  shortcuts: string[],
) {
  const groups = new Map<
    string,
    { path: string; color: string; width: number; region?: string }
  >();
  for (const r of cartography(d).roads) {
    if (r.shortcut && !shortcuts.includes(r.shortcut)) continue;
    if (
      !detail &&
      (r.minX > px + 280 ||
        r.maxX < px - 280 ||
        r.minZ > pz + 280 ||
        r.maxZ < pz - 280)
    )
      continue;
    const key = `${r.color}:${r.width}:${r.region}`;
    let group = groups.get(key);
    if (!group) {
      group = { path: "", color: r.color, width: r.width, region: r.region };
      groups.set(key, group);
    }
    group.path += r.path;
  }
  return [...groups.values()];
}
