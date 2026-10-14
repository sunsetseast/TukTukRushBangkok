import type { District, Obstacle, Point } from "../types";
import {
  distanceToSegment,
  orientedFootprintsOverlap,
  obstacleDistance,
} from "../world";
import { riverDistance, regionAt } from "./world";
import { stableHash } from "./buildingGrammar";
import { degreeMap } from "../roadGeometry";
import type { StreetPerson } from "../streetLife";
export type SiteKind =
  | "noodle"
  | "grill"
  | "fruit"
  | "tea"
  | "scooter"
  | "tree"
  | "palm"
  | "workshop"
  | "bench"
  | "lamp"
  | "signal";
export type EnvironmentSite = {
  id: string;
  kind: SiteKind;
  region: string;
  seed: number;
  body: Obstacle;
  axis?: boolean;
};
const cache = new WeakMap<District, EnvironmentSite[]>();
/** Mutable broad phase for deterministic placement. Exact oriented tests win. */
export function placementIndex(d: District) {
  const nodes = new Map(d.nodes.map((n) => [n.id, n])),
    grid = new Map<string, Set<Obstacle>>(),
    roads = new Map<string, Set<number>>(),
    segments = d.roads.map((r) => ({
      r,
      a: nodes.get(r.a)!,
      b: nodes.get(r.b)!,
    }));
  const cells = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    f: (k: string) => void,
  ) => {
    for (let x = Math.floor(minX / 80); x <= Math.floor(maxX / 80); x++)
      for (let z = Math.floor(minZ / 80); z <= Math.floor(maxZ / 80); z++)
        f(`${x}:${z}`);
  };
  const insert = (o: Obstacle) => {
    const c = Math.abs(Math.cos(o.yaw ?? 0)),
      s = Math.abs(Math.sin(o.yaw ?? 0)),
      rx = (c * o.w + s * o.d) / 2 + 1,
      rz = (s * o.w + c * o.d) / 2 + 1;
    cells(o.x - rx, o.x + rx, o.z - rz, o.z + rz, (k) => {
      if (!grid.has(k)) grid.set(k, new Set());
      grid.get(k)!.add(o);
    });
  };
  d.obstacles.forEach(insert);
  segments.forEach(({ r, a, b }, i) => {
    const pad = r.width / 2 + 1;
    cells(
      Math.min(a.x, b.x) - pad,
      Math.max(a.x, b.x) + pad,
      Math.min(a.z, b.z) - pad,
      Math.max(a.z, b.z) + pad,
      (k) => {
        if (!roads.has(k)) roads.set(k, new Set());
        roads.get(k)!.add(i);
      },
    );
  });
  const nearby = (p: Point, r: number) => {
    const os = new Set<Obstacle>(),
      rs = new Set<number>();
    cells(p.x - r, p.x + r, p.z - r, p.z + r, (k) => {
      grid.get(k)?.forEach((o) => os.add(o));
      roads.get(k)?.forEach((i) => rs.add(i));
    });
    return { os, rs };
  };
  const clear = (o: Obstacle) => {
    const radius = Math.hypot(o.w, o.d) / 2,
      q = nearby(o, radius + 2);
    return (
      riverDistance(d, o) > d.riverWidth! / 2 + radius + 2 &&
      [...q.os].every((b) => !orientedFootprintsOverlap(o, b, 0.6)) &&
      [...q.rs].every((i) => {
        const { r, a, b } = segments[i]!;
        return (
          distanceToSegment(o, a, b).distance >= r.width / 2 + radius + 1.7
        );
      })
    );
  };
  const person = (p: Point) => {
    const q = nearby(p, 1);
    return (
      [...q.os].every((o) => obstacleDistance(p, o) > 0.6) &&
      [...q.rs].every((i) => {
        const { r, a, b } = segments[i]!;
        return distanceToSegment(p, a, b).distance >= r.width / 2 + 0.8;
      })
    );
  };
  return { insert, clear, person };
}
export function planEnvironment(d: District) {
  const prior = cache.get(d);
  if (prior) return prior;
  const sites: EnvironmentSite[] = [],
    index = placementIndex(d),
    nodes = new Map(d.nodes.map((n) => [n.id, n])),
    degrees = degreeMap(d);
  const add = (
    kind: SiteKind,
    p: Point,
    yaw: number,
    region: string,
    seed: number,
    axis?: boolean,
  ) => {
    const sizes: Record<SiteKind, [number, number, number]> = {
      noodle: [2.7, 2.3, 2.9],
      grill: [3.3, 2.7, 2.8],
      fruit: [3.5, 2.4, 2.6],
      tea: [2.2, 2.2, 3.3],
      scooter: [1.2, 2.5, 1.3],
      tree: [1.4, 1.4, 7],
      palm: [1.2, 1.2, 10],
      workshop: [3.3, 2.4, 1.7],
      bench: [3, 1.25, 1],
      lamp: [0.4, 0.4, 7],
      signal: [0.4, 0.4, 6],
    };
    const [w, depth, height] = sizes[kind],
      id = `env:${kind}:${Math.round(p.x * 100)}:${Math.round(p.z * 100)}`,
      body: Obstacle = {
        ...p,
        w,
        d: depth,
        height,
        yaw,
        color: "#757e61",
        artRole: "furniture",
        environmentId: id,
      };
    if (!index.clear(body)) return;
    d.obstacles.push(body);
    index.insert(body);
    sites.push({ id, kind, region, seed, body, axis });
  };
  for (const r of d.roads) {
    if (r.bridge || r.shortcut || r.roundabout) continue;
    const a = nodes.get(r.a)!,
      b = nodes.get(r.b)!,
      len = Math.hypot(b.x - a.x, b.z - a.z),
      yaw = Math.atan2(b.x - a.x, b.z - a.z),
      seed = stableHash(`${r.a}:${r.b}`),
      t = len * (0.35 + (seed % 35) / 100),
      x = a.x + Math.sin(yaw) * t,
      z = a.z + Math.cos(yaw) * t,
      region = regionAt(d, { x, z })?.id ?? "residential";
    for (const side of [-1, 1]) {
      if ((seed + (side + 1) * 3) % 7 > 2) continue;
      const menu: SiteKind[] =
        region === "chinatown"
          ? ["noodle", "grill", "fruit", "tea", "scooter", "lamp"]
          : region === "talatnoi"
            ? ["workshop", "tea", "tree", "scooter", "bench"]
            : ["siam", "icon"].includes(region)
              ? ["palm", "tree", "bench", "lamp"]
              : region === "oldtown"
                ? ["tree", "bench", "lamp", "tea"]
                : ["tree", "scooter", "tea", "lamp"];
      const kind = menu[(seed + (side + 1) * 11) % menu.length]!,
        off =
          r.width / 2 +
          (["tree", "palm", "lamp", "signal"].includes(kind) ? 3.1 : 4.9);
      add(
        kind,
        {
          x: x + Math.cos(yaw) * off * side,
          z: z - Math.sin(yaw) * off * side,
        },
        yaw + (side > 0 ? Math.PI / 2 : -Math.PI / 2),
        region,
        seed,
      );
    }
    if (!r.oneWay && (degrees.get(r.a) ?? 0) >= 3 && seed % 3 === 0) {
      const t = r.width / 2 + 8,
        off = r.width / 2 + 3;
      add(
        "signal",
        {
          x: a.x + Math.sin(yaw) * t + Math.cos(yaw) * off,
          z: a.z + Math.cos(yaw) * t - Math.sin(yaw) * off,
        },
        yaw,
        region,
        seed,
        Math.abs(b.x - a.x) > Math.abs(b.z - a.z),
      );
    }
  }
  for (const l of d.landmarks.filter((l) =>
    ["arun", "pho", "icon", "paragon"].includes(l.id ?? ""),
  )) {
    const a = nodes.get(l.accessNode!)!,
      p = l.plot!,
      yaw = Math.atan2(p.x - a.x, p.z - a.z),
      len = Math.hypot(p.x - a.x, p.z - a.z);
    for (let t = 14; t < len - l.size! * 0.5; t += 12)
      for (const side of [-1, 1])
        add(
          ["icon", "paragon"].includes(l.id!) ? "palm" : "tree",
          {
            x: a.x + Math.sin(yaw) * t + Math.cos(yaw) * side * 8,
            z: a.z + Math.cos(yaw) * t - Math.sin(yaw) * side * 8,
          },
          yaw,
          l.id!,
          stableHash(`${l.id}:${t}:${side}`),
        );
  }
  cache.set(d, sites);
  return sites;
}
export function environmentPeople(d: District): StreetPerson[] {
  const index = placementIndex(d),
    people: StreetPerson[] = [];
  for (const site of planEnvironment(d).filter((s) =>
    ["noodle", "grill", "fruit", "tea"].includes(s.kind),
  )) {
    if (people.length >= 80) break;
    const b = site.body,
      yaw = b.yaw ?? 0;
    for (const side of [-1, 1]) {
      const p = {
        x: b.x + Math.cos(yaw) * side * (b.w / 2 + 1),
        z: b.z - Math.sin(yaw) * side * (b.w / 2 + 1),
      };
      if (index.person(p))
        people.push({
          start: p,
          end: p,
          ...p,
          heading: yaw + Math.PI,
          role: side < 0 ? "vendor" : "customer",
          seed: site.seed % 1000,
          height: 1,
        });
    }
  }
  return people;
}
