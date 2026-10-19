import {HISTORIC_SITE_PLANS,historicBoundaryColliders,historicFurnitureColliders} from './historicDistricts';
import type { District, Landmark, Obstacle, Point, RoadNode } from "../types";
import type { RealPlace } from "./realPlaces";
import {
  distanceToSegment,
  obstacleDistance,
  orientedFootprintsOverlap,
} from "../world";
import { riverDistance, toWorld } from "./world";

export type SiteMass = {
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  yaw?: number;
};
export type SiteZone = SiteMass & {
  use: "terrace" | "court" | "garden" | "pool" | "forecourt";
  access: "pedestrian" | "private" | "vehicle";
};
export type SiteFurniture = Obstacle & {
  planting: "island" | "tree";
  crownWidth: number;
};
export type AuthoredSite = {
  id: string;
  district: "bang-rak" | "khlong-san" | "siam" | "lumphini" | "riverside";
  origin: Point;
  yaw: number;
  boundary: Point[];
  reservations: Obstacle[];
  solids: Obstacle[];
  furniture?: SiteFurniture[];
  zones: SiteZone[];
  entrance: Point;
  accessNode: string;
  publicNode: string;
  lod: { near: number; far: number };
  clearedParcels: number;
};
const mass = (
  name: string,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  yaw = 0,
): SiteMass => ({ name, x, z, w, d, h, yaw });
/** Physical wings, not a whole-property collider. These same dimensions drive
 * the new hero meshes. Courts and gaps remain genuinely empty in physics. */
export function siteMasses(p: RealPlace): SiteMass[] {
  if(HISTORIC_SITE_PLANS[p.id])return HISTORIC_SITE_PLANS[p.id]!.masses;
  switch (p.id) {
    case "emporium": return [mass("ivory retail podium",0,0,84,84,29),mass("hotel tower",19,-17,32,34,102),mass("entrance",-16,46,32,8,8)];
    case "emquartier": return [mass("Glass Quartier",-28,8,39,72,38),mass("Helix Quartier",25,14,39,61,46),mass("Waterfall tower",8,-27,49,36,82)];
    case "emsphere": return [mass("bronze retail and arena",0,0,80,70,32),mass("retail entrance",0,38,58,6,10)];
    case "oriental":
      return [
        mass("River Wing", -18, -12, 68, 27, 49),
        mass("Garden Wing", 35, -12, 23, 27, 35),
        mass("Authors Wing", 30, 23, 40, 25, 12),
        mass("river restaurant", -25, 29, 44, 15, 6),
      ];
    case "shangri":
      return [
        mass("Shangri-La Wing", -24, -10, 69, 26, 77),
        mass("Krungthep Wing", 43, -3, 24, 34, 47),
        mass("river pavilion", -35, 28, 26, 16, 8),
        mass("garden pavilion", 9, 28, 22, 16, 7),
        mass("connecting hotel lobby", 20, -10, 22, 20, 9),
      ];
    case "four-seasons":
      return [
        mass("Cascade rear", 0, -29, 168, 17, 39),
        ...[-1, 1].flatMap((s) => [
          mass("Cascade side", s * 75, -8, 17, 27, 34),
          mass("Cascade terrace", s * 72, 14, 21, 18, 25),
          mass("Palm Courtyard", s * 35, 29, 62, 16, 13),
        ]),
      ];
    case "capella":
      return [
        mass("room wing", 0, -20, 90, 18, 29),
        mass("court west", -38, 3, 14, 29, 10),
        mass("court east", 38, 3, 14, 29, 10),
        mass("villa one", -20, 23, 17, 14, 6),
        mass("villa two", 3, 23, 17, 14, 6),
        mass("villa three", 26, 23, 17, 14, 6),
      ];
    case "embassy":
      return [
        mass("retail loop", -10, 0, 75, 62, 25),
        mass("hotel loop", 25, -5, 35, 48, 116),
      ];
    case "dusit":
      return [
        mass("park-facing hotel", -24, 0, 34, 33, 110),
        mass("Central Park offices", 23, -14, 27, 28, 125),
        mass("retail roof garden", 0, 23, 91, 24, 14),
      ];
    case "one-bangkok":
      return [
        mass("Ritz-Carlton / residences", -37, 17, 28, 32, 126),
        mass("office tower three", 5, -23, 30, 30, 145),
        mass("office tower four", 41, 19, 28, 34, 107),
        mass("Parade retail", -30, -26, 31, 23, 18),
        mass("The Storeys", 4, 24, 29, 27, 23),
      ];
    case "okura":
      return [
        mass("Park Ventures tower", 0, -4, 39, 32, 111),
        mass("landscaped podium", 0, 18, 48, 13, 10),
      ];
    case "anantara":
      return [
        mass("north guest wing", -38, -4, 18, 67, 19),
        mass("south guest wing", 38, -4, 18, 67, 19),
        mass("garden wing", 0, -31, 59, 17, 17),
        mass("river restaurant", -30, 29, 24, 17, 9),
        mass("river pavilion", 31, 29, 24, 17, 9),
      ];
    default:
      return [mass(p.name, 0, 0, p.footprint[0], p.footprint[1], p.height)];
  }
}
export function sitePoint(
  origin: Point,
  yaw: number,
  x: number,
  z: number,
): Point {
  return {
    x: origin.x + Math.cos(yaw) * x + Math.sin(yaw) * z,
    z: origin.z - Math.sin(yaw) * x + Math.cos(yaw) * z,
  };
}
export function siteObstacle(
  origin: Point,
  yaw: number,
  m: SiteMass,
  id?: string,
): Obstacle {
  return {
    ...sitePoint(origin, yaw, m.x, m.z),
    w: m.w,
    d: m.d,
    height: m.h,
    yaw: yaw + (m.yaw ?? 0),
    color: "#ded6bf",
    landmarkId: id,
  };
}
const corners = (o: Obstacle) =>
  [
    [-o.w / 2, -o.d / 2],
    [o.w / 2, -o.d / 2],
    [o.w / 2, o.d / 2],
    [-o.w / 2, o.d / 2],
  ].map(([x, z]) => sitePoint(o, o.yaw ?? 0, x!, z!));
const roadBody = (a: Point, b: Point, w: number): Obstacle => ({
  x: (a.x + b.x) / 2,
  z: (a.z + b.z) / 2,
  w,
  d: Math.hypot(b.x - a.x, b.z - a.z),
  yaw: Math.atan2(b.x - a.x, b.z - a.z),
  height: 0,
  color: "#ccc",
});

function zonesFor(d: District, p: RealPlace, origin: Point): SiteZone[] {
  const [w, depth] = p.footprint;
  const rear = Math.min(...siteMasses(p).map((m) => m.z - m.d / 2));
  const zones: SiteZone[] = [
    {
      ...mass("arrival forecourt", 0, rear - 14, Math.min(w, 52), 16, 0),
      use: "forecourt",
      access: "vehicle",
    },
  ];
  if (p.bank) {
    const shore = riverDistance(d, origin) - d.riverWidth! / 2 - 7;
    // A bounded river-facing esplanade replaces the previous unplanned grass.
    // Corner-water and road tests below clip this design to actual dry land.
    for (let z = depth / 2 + 6; z < shore; z += 12)
      zones.push({
        ...mass("river terrace", 0, z, w + 6, 12, 0),
        use: "terrace",
        access: "pedestrian",
      });
  }
  if (
    ["oriental", "shangri", "four-seasons", "capella", "anantara"].includes(
      p.id,
    )
  )
    zones.push({
      ...mass("interior garden", 0, 13, Math.min(w * 0.48, 52), 27, 0),
      use: "garden",
      access: "private",
    });
  if (p.id === "one-bangkok")
    zones.push({
      ...mass("public pedestrian court", 0, 2, 22, 17, 0),
      use: "court",
      access: "pedestrian",
    });
  return zones;
}

/** Explicitly authored anchors are validated, never searched or silently moved.
 * Invoke before parcel generation, or again to clear replaceable procedural lots.
 * Stable IDs and existing public graph nodes survive local reconstruction. */
export function placeAuthoredSites(d: District, places: RealPlace[]) {
  d.authoredSites ??= [];
  extendCharoenNakhon(d);
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  for (const p of places) {
    if (p.id === "state") continue; // Existing State Tower remains Lebua's only asset.
    if (d.authoredSites.some((s) => s.id === p.id)) continue;
    // Local reconstruction replaces only this site's private circulation.
    // Public graph IDs and other compounds remain intact; no duplicate nodes.
    const prefix = `real-arrival:${p.id}:`;
    for (let i = d.roads.length - 1; i >= 0; i--)
      if (d.roads[i]!.corridor === `real-arrival:${p.id}`) d.roads.splice(i, 1);
    for (const n of d.nodes.filter((n) => n.id.startsWith(prefix)))
      nodes.delete(n.id);
    for (let i = d.nodes.length - 1; i >= 0; i--)
      if (d.nodes[i]!.id.startsWith(prefix)) d.nodes.splice(i, 1);
    const origin = toWorld(p.map),
      yaw = p.yaw,
      masses = siteMasses(p),
      solids = masses.map((m) => siteObstacle(origin, yaw, m, p.id));
    const sameBank = (q: Point) => {
      if (!p.bank) return true;
      const nearest = d
        .river!.slice(1)
        .map((b, i) => distanceToSegment(q, d.river![i]!, b))
        .sort((a, b) => a.distance - b.distance)[0]!.point;
      return p.bank === "east" ? q.x > nearest.x : q.x < nearest.x;
    };
    const streets = d.roads.filter(
      (r) =>
        !r.bridge &&
        !r.destinationId &&
        !r.shortcut &&
        !r.corridor?.startsWith("real-arrival:") &&
        sameBank(nodes.get(r.a)!) &&
        sameBank(nodes.get(r.b)!),
    );
    const bodies = streets.map((r) =>
      roadBody(nodes.get(r.a)!, nodes.get(r.b)!, r.width + 4),
    );
    for (const o of solids) {
      if (corners(o).some((q) => riverDistance(d, q) < d.riverWidth! / 2 + 2))
        throw Error(`Authored wing in water: ${p.id}`);
      if (bodies.some((r) => orientedFootprintsOverlap(o, r)))
        throw Error(
          `Authored wing blocks road: ${p.id} ${JSON.stringify(o)} ${JSON.stringify(bodies.filter((r) => orientedFootprintsOverlap(o, r)))}`,
        );
      if (
        d.obstacles.some(
          (q) =>
            !d.buildings.includes(q) &&
            q.landmarkId !== p.id &&
            orientedFootprintsOverlap(o, q, 1),
        )
      )
        throw Error(`Authored wing conflicts with protected site: ${p.id}`);
    }
    const zones = zonesFor(d, p, origin).filter((z) => {
      const o = siteObstacle(origin, yaw, z);
      return (
        corners(o).every((q) => riverDistance(d, q) > d.riverWidth! / 2 + 2) &&
        !bodies.some((r) => orientedFootprintsOverlap(o, r))
      );
    });
    const reserve: SiteMass = [...masses, ...zones].reduce(
      (r, m) => ({
        name: "compound",
        x: 0,
        z: 0,
        w: Math.max(r.w, 2 * Math.abs(m.x) + m.w),
        d: Math.max(r.d, 2 * Math.abs(m.z) + m.d),
        h: 0,
      }),
      mass("compound", 0, 0, p.footprint[0] + 4, p.footprint[1] + 4, 0),
    );
    // Compound reservation is a collection (including irregular wings and open
    // grounds), deliberately separate from collisions. Never add it as a wall.
    const reservations = [
      ...masses.map((m) =>
        siteObstacle(origin, yaw, { ...m, w: m.w + 5, d: m.d + 5, h: 0 }),
      ),
      ...zones.map((m) => siteObstacle(origin, yaw, m)),
      ...(HISTORIC_SITE_PLANS[p.id]?[siteObstacle(origin,yaw,mass('heritage grounds',0,0,p.footprint[0],p.footprint[1],0))]:[]),
    ];
    const cleared = new Set(
      d.buildings.filter((b) =>
        reservations.some((r) => orientedFootprintsOverlap(b, r, 2)),
      ),
    );
    d.buildings = d.buildings.filter((b) => !cleared.has(b));
    d.obstacles = d.obstacles.filter(
      (o) => !cleared.has(o) && o.landmarkId !== p.id,
    );
    d.obstacles.push(...solids);
    if(HISTORIC_SITE_PLANS[p.id])d.obstacles.push(...[...historicBoundaryColliders(p.id),...historicFurnitureColliders(p.id)].map(m=>({...siteObstacle(origin,yaw,m,p.id),artRole:'furniture' as const})));
    const planting: Array<{
      x: number;
      z: number;
      kind: "island" | "tree";
      crown: number;
    }> = [];
    for (const [i, zone] of zones.entries())
      if (zone.use === "terrace") {
        for (const x of i % 2 ? [-zone.w * 0.28, zone.w * 0.28] : [0])
          planting.push({
            x: zone.x + x,
            z: zone.z,
            kind: "island",
            crown: 7 + (i % 3),
          });
      }
    if (p.id === "anantara")
      for (const [x, z] of [
        [-23, -15],
        [23, -15],
        [-12, 25],
        [12, 25],
      ])
        planting.push({ x: x!, z: z!, kind: "tree", crown: 6.5 });
    if (p.id === "four-seasons")
      for (const [x, z] of [
        [-56, -7],
        [56, -7],
        [-50, 14],
        [50, 14],
      ])
        planting.push({ x: x!, z: z!, kind: "tree", crown: 8 });
    const furniture: SiteFurniture[] = planting
      .map((q, i) => ({
        ...siteObstacle(
          origin,
          yaw,
          mass(
            "planted island",
            q.x,
            q.z,
            q.kind === "tree" ? 0.7 : 6,
            q.kind === "tree" ? 0.7 : 6,
            10,
          ),
          p.id,
        ),
        artRole: "furniture" as const,
        environmentId: `site-planting:${p.id}:${i}`,
        planting: q.kind,
        crownWidth: q.crown,
      }))
      .filter(
        (o) =>
          !d.obstacles.some((q) => orientedFootprintsOverlap(o, q, 1)) &&
          !bodies.some((r) => orientedFootprintsOverlap(o, r, 1)),
      );
    d.obstacles.push(...furniture);
    const nearest = streets
      .map((r) => ({
        r,
        ...distanceToSegment(origin, nodes.get(r.a)!, nodes.get(r.b)!),
      }))
      .sort((a, b) => a.distance - b.distance)[0]!;
    let publicNode = [nodes.get(nearest.r.a)!, nodes.get(nearest.r.b)!].sort(
      (a, b) =>
        Math.hypot(a.x - origin.x, a.z - origin.z) -
        Math.hypot(b.x - origin.x, b.z - origin.z),
    )[0]!;
    const rear = Math.min(...masses.map((m) => m.z - m.d / 2));
    const entrance = sitePoint(origin, yaw, 0, rear - 14);
    // Public roadside fallback is always legitimate. Add a private no-traffic
    // drive only when every segment has real dry clearance from ALL structures.
    let accessNode = publicNode.id;
    const candidates = [...new Set(streets.flatMap((r) => [r.a, r.b]))]
      .map((id) => nodes.get(id)!)
      .filter((n) => {
        const localZ =
          (n.x - origin.x) * Math.sin(yaw) + (n.z - origin.z) * Math.cos(yaw);
        return localZ < rear - 12;
      })
      .sort(
        (a, b) =>
          Math.hypot(a.x - entrance.x, a.z - entrance.z) -
          Math.hypot(b.x - entrance.x, b.z - entrance.z),
      )
      .slice(0, 16);
    for (const candidate of p.bank || ["dusit", "one-bangkok"].includes(p.id)
      ? candidates
      : []) {
      const length = Math.hypot(
        candidate.x - entrance.x,
        candidate.z - entrance.z,
      );
      if (length < 16 || length > 650) continue;
      const lane = roadBody(candidate, entrance, 11);
      const blocked = d.obstacles.some((o) =>
        orientedFootprintsOverlap(o, lane, 2),
      );
      const crossing = d.roads.some(
        (r) =>
          r.a !== candidate.id &&
          r.b !== candidate.id &&
          orientedFootprintsOverlap(
            lane,
            roadBody(nodes.get(r.a)!, nodes.get(r.b)!, r.width + 1),
          ),
      );
      const samples = Math.ceil(length / 8);
      const wet = Array.from({ length: samples + 1 }, (_, i) => ({
        x: candidate.x + ((entrance.x - candidate.x) * i) / samples,
        z: candidate.z + ((entrance.z - candidate.z) * i) / samples,
      })).some((q) => riverDistance(d, q) < d.riverWidth! / 2 + 8);
      if (blocked || crossing || wet) continue;
      publicNode = candidate;
      let previous: RoadNode = candidate;
      const count = Math.ceil(length / 24);
      for (let i = 1; i <= count; i++) {
        const n: RoadNode = {
          id: `real-arrival:${p.id}:${i}`,
          x: candidate.x + ((entrance.x - candidate.x) * i) / count,
          z: candidate.z + ((entrance.z - candidate.z) * i) / count,
        };
        d.nodes.push(n);
        nodes.set(n.id, n);
        d.roads.push({
          a: previous.id,
          b: n.id,
          width: 8,
          name: `${p.name} drop-off`,
          corridor: `real-arrival:${p.id}`,
          noTraffic: true,
          surface: "arrival",
        });
        previous = n;
      }
      accessNode = previous.id;
      break;
    }
    const existing = d.landmarks.find((l) => l.id === p.id);
    const l: Landmark = {
      ...origin,
      plot: { ...origin },
      id: p.id,
      name: p.name,
      kind:
        p.category === "hotel"
          ? "hotel"
          : p.category === "heritage"
            ? "museum"
            : "mall",
      size: Math.max(...p.footprint),
      yaw,
      accessNode,
    };
    if (existing) Object.assign(existing, l);
    else d.landmarks.push(l);
    d.authoredSites.push({
      id: p.id,
      origin,
      yaw,
      district:
        p.region === "icon"
          ? "khlong-san"
          : p.region === "siam" || p.region === "sukhumvit"
            ? "siam"
            : p.id === "one-bangkok" || p.id === "dusit"
              ? "lumphini"
              : p.bank === "east"
                ? "bang-rak"
                : "riverside",
      boundary: corners(siteObstacle(origin, yaw, reserve)),
      reservations,
      solids,
      furniture,
      zones,
      entrance,
      accessNode,
      publicNode: publicNode.id,
      lod: { near: 0, far: 300 },
      clearedParcels: cleared.size,
    });
  }
}
export function inAuthoredSite(d: District, o: Obstacle) {
  return (
    d.authoredSites?.some((s) =>
      s.reservations.some((r) => orientedFootprintsOverlap(o, r, 2)),
    ) ?? false
  );
}
export function authoredSite(d: District, id: string) {
  return d.authoredSites?.find((s) => s.id === id);
}

/** A modest, connected west-bank road extension gives the southern resort a
 * real same-bank passenger approach. Existing public nodes/edges are untouched. */
function extendCharoenNakhon(d: District) {
  if (d.roads.some((r) => r.corridor === "charoen-nakhon-south")) return;
  const target = toWorld([280, 965]),
    oldNodes = d.roads
      .filter((r) => r.corridor === "krungthon")
      .flatMap((r) => [r.a, r.b]);
  const eligible = d.nodes.filter((n) => oldNodes.includes(n.id));
  // Layout uses a stable Krung Thon Buri junction; select that sampled point,
  // never an arbitrary road on the opposite bank.
  const pool = eligible.length
    ? eligible
    : d.nodes.filter(
        (n) => n.x < target.x + 60 && Math.abs(n.z - target.z) < 3,
      );
  let previous = pool.sort(
    (a, b) =>
      Math.hypot(a.x - target.x, a.z - target.z) -
      Math.hypot(b.x - target.x, b.z - target.z),
  )[0]!;
  if (!previous) throw Error("Missing west-bank extension junction");
  for (const [leg, anchor] of [
    [270, 1015],
    [240, 1090],
    [220, 1155],
  ].entries()) {
    const end = toWorld(anchor),
      start = previous,
      count = Math.ceil(Math.hypot(end.x - start.x, end.z - start.z) / 24);
    for (let i = 1; i <= count; i++) {
      const n = {
        id: `site-road:charoen-nakhon:${leg}:${i}`,
        x: start.x + ((end.x - start.x) * i) / count,
        z: start.z + ((end.z - start.z) * i) / count,
      };
      if (riverDistance(d, n) < d.riverWidth! / 2 + 10)
        throw Error("Charoen Nakhon extension in water");
      d.nodes.push(n);
      d.roads.push({
        a: previous.id,
        b: n.id,
        width: 12,
        name: "Charoen Nakhon Road — southern resort approach",
        corridor: "charoen-nakhon-south",
      });
      previous = n;
    }
  }
}

/** Chosen in the PR25 city audit and now authored explicitly. These important
 * destinations no longer search radial candidate plots during world creation. */
export const EXISTING_SITE_ANCHORS: Record<string, [number, number]> = {
  pho: [290,443],
  icon: [338.25825214724773, 833.2582521472477],
  paragon: [730, 415],
  central: [786, 429.8701257427382],
  mahanakhon: [663.5484941563911, 879.7835429045635],
  state: [550, 895],
  baiyoke: [755, 365],
  mbk: [658, 490],
  terminal: [918, 499],
  swing:[410,427],flowers:[318,535],
};
export function registerExistingSites(d: District) {
  for (const [id] of Object.entries(EXISTING_SITE_ANCHORS)) {
    const prior = d.authoredSites?.find((s) => s.id === id);
    if (prior) {
      prior.solids = d.obstacles.filter(
        (o) => o.landmarkId === id && !o.artRole,
      );
      continue;
    }
    const l = d.landmarks.find((l) => l.id === id)!,
      solids = d.obstacles.filter((o) => o.landmarkId === id && !o.artRole),
      origin = l.plot!;
    d.authoredSites!.push({
      id,
      origin,
      yaw: l.yaw ?? 0,
      district:
        id === "icon"
          ? "khlong-san"
          : id === "state" || id === "mahanakhon"
            ? "bang-rak"
            : "siam",
      boundary: corners({
        ...origin,
        w: l.size! + 4,
        d: l.size! + 4,
        height: 0,
        color: "#fff",
      }),
      reservations: [...solids.map((o) => ({ ...o, height: 0 })),...(HISTORIC_SITE_PLANS[id]?[{...origin,w:HISTORIC_SITE_PLANS[id]!.width,d:HISTORIC_SITE_PLANS[id]!.depth,yaw:l.yaw??0,height:0,color:'#c9b997'}]:[])],
      solids,
      zones: [],
      entrance: d.nodes.find((n) => n.id === l.accessNode)!,
      accessNode: l.accessNode!,
      publicNode: l.accessNode!,
      lod: { near: 0, far: 300 },
      clearedParcels: 0,
    });
  }
}

export const EXISTING_SITE_WORLD_ANCHORS: Record<string, Point> = Object.fromEntries(
  Object.entries(EXISTING_SITE_ANCHORS).map(([id,[x,y]]) => [id,{x:(x-500)*4,z:(y-600)*4}]),
);
