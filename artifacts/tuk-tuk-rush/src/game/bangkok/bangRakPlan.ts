import { appendProtectedParcels, rectangleBoundary } from "./landmarkParcels";
import type { District, Obstacle, Point, Road } from "../types";
import { distanceToSegment, orientedFootprintsOverlap } from "../world";
import { sitePoint, siteObstacle, type SiteMass } from "./authoredSites";
import { riverClearance } from "./waterGeometry";

/** Bounded extension of the existing world plan, in the approved game's metres.
 * Preserve Chinatown and both hotel/arts compounds. Sois terminate at their own
 * property approaches: there is no invented road through a riverfront compound. */
export const BANG_RAK_PLAN = {
  version: 1,
  boundary: [
    { x: -210, z: 876 },
    { x: 219, z: 876 },
    { x: 219, z: 1050 },
    { x: 90, z: 1050 },
    { x: 90, z: 1040 },
    { x: -16, z: 981 },
    { x: -210, z: 981 },
  ],
  sources: [
    "https://library.tcdc.or.th/visit/bkk_contact",
    "https://www.docomomothailand.org/pages/no6.html",
    "https://departmentofarchitecture.co.th/portfolio/thailand-creative-and-design-center-tcdc/",
    "https://www.warehouse30.com/timeline/siamese-revolution-of-1932/",
    "https://www.thailandtourismdirectory.go.th/en/attraction/103358",
  ],
  compromises: [
    "Existing Charoen Krung and all Chinatown parcels are frozen. Soi 30 and 32 are compressed public approach stubs; no private inter-compound through road.",
    "Postal facade is 92m wide versus the documented 103.8m; its T stem is shortened to preserve the approved Mandarin Oriental grounds.",
    "Eight Warehouse 30 shed interpretations fit two compact rows; courtyard/door geometry is original, not a cadastral replica or current tenant directory.",
    "PR43 adds the direct Si Phraya / Captain Bush loop through an explicit versioned frontage migration. The full eastern district remains deferred.",
  ],
  postal: {
    id: "grand-postal",
    name: "Grand Postal Building / TCDC",
    origin: { x: 58, z: 990 },
    yaw: Math.PI / 2,
    masses: [
      {
        name: "civic frontage north wing",
        x: -29,
        z: 0,
        w: 34,
        d: 27,
        h: 19.6,
      },
      {
        name: "monumental central entrance",
        x: 0,
        z: 2,
        w: 24,
        d: 31,
        h: 23.2,
      },
      { name: "civic frontage south wing", x: 29, z: 0, w: 34, d: 27, h: 19.6 },
      { name: "T plan rear library wing", x: 0, z: -35, w: 18, d: 68, h: 17.2 },
    ] as SiteMass[],
    court: {
      x: 0,
      z: 31,
      w: 92,
      d: 30,
      h: 0,
      name: "pedestrian postal forecourt",
    } as SiteMass,
  },
  lanes: [
    {
      id: "charoen-krung-30",
      name: "Charoen Krung Soi 30 / Captain Bush Lane",
      thai: "ซอยเจริญกรุง 30",
      near: { x: 141.83908045973334, z: 886.6666666677334 },
      end: { x: -158, z: 883 },
      width: 9,
    },
    {
      id: "charoen-krung-32",
      name: "Charoen Krung Soi 32",
      thai: "ซอยเจริญกรุง 32",
      near: { x: 140.91954022986667, z: 913.3333333338667 },
      end: { x: -158, z: 928 },
      width: 8,
    },
  ],
} as const;
export type BangRakFamily =
  "warehouse" | "merchant" | "gallery" | "timber" | "workshop" | "cafe";
export type BangRakParcel = {
  id: string;
  family: BangRakFamily;
  body: Obstacle;
  trade: "gallery" | "coffee" | "workshop" | "food" | "residence" | "retail";
  road: string;
};
export type BangRakState = {
  parcels: BangRakParcel[];
  removed: Obstacle[];
  rejected: { id: string; reason: string }[];
  roads: Road[];
  court: Obstacle;
};
const states = new WeakMap<District, BangRakState>();
export const bangRakState = (d: District) => states.get(d);
export const isBangRak = (o: Obstacle) =>
  o.environmentId?.startsWith("br:") ?? false;
export function bangRakLocal(o: Obstacle, u: number, v: number) {
  return sitePoint(o, o.yaw ?? 0, u, v);
}
export function planBangRak(d: District) {
  if (states.has(d)) return states.get(d)!;
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const roads: Road[] = [];
  for (const lane of BANG_RAK_PLAN.lanes) {
    const start = d.nodes.reduce((a, b) =>
      Math.hypot(a.x - lane.near.x, a.z - lane.near.z) <
      Math.hypot(b.x - lane.near.x, b.z - lane.near.z)
        ? a
        : b,
    );
    if (Math.hypot(start.x - lane.near.x, start.z - lane.near.z) > 0.01)
      throw Error("Missing approved Charoen Krung junction");
    let prev = start;
    const steps = Math.ceil(
      Math.hypot(start.x - lane.end.x, start.z - lane.end.z) / 24,
    );
    for (let i = 1; i <= steps; i++) {
      const n = {
        id: `br:${lane.id}:${i}`,
        x: start.x + ((lane.end.x - start.x) * i) / steps,
        z: start.z + ((lane.end.z - start.z) * i) / steps,
        name: lane.name,
      };
      d.nodes.push(n);
      nodes.set(n.id, n);
      const r: Road = {
        spawnTraffic: false,
        a: prev.id,
        b: n.id,
        width: lane.width,
        name: lane.name,
        corridor: lane.id,
      };
      roads.push(r);
      d.roads.push(r);
      prev = n;
    }
  }
  const roadBody = (r: Road, extra = 0): Obstacle => {
    const a = nodes.get(r.a)!,
      b = nodes.get(r.b)!;
    return {
      x: (a.x + b.x) / 2,
      z: (a.z + b.z) / 2,
      w: r.width + extra,
      d: Math.hypot(b.x - a.x, b.z - a.z) + extra,
      yaw: Math.atan2(b.x - a.x, b.z - a.z),
      height: 0,
      color: "#aaa",
    };
  };
  const hero = BANG_RAK_PLAN.postal;
  const court = siteObstacle(hero.origin, hero.yaw, hero.court, hero.id);
  // The south-east corner follows the bend in the frozen arterial. Paving has
  // a narrow bounded apron; its detailed strips are tested against asphalt.
  court.d = 20;
  court.z = hero.origin.z;
  court.x = 88;
  const reserve = [
    ...hero.masses.map((m) => siteObstacle(hero.origin, hero.yaw, m, hero.id)),
    court,
    { x: -65, z: 904, w: 190, d: 40, height: 0, color: "#aaa" },
    { x: -89, z: 953, w: 160, d: 30, height: 0, color: "#aaa" },
  ];
  const removed = new Set<Obstacle>();
  for (const o of d.obstacles) {
    if (o.landmarkId || o.protected || o.chinatown) continue;
    if (
      roads.some((r) => orientedFootprintsOverlap(o, roadBody(r, 11))) ||
      reserve.some((r) => orientedFootprintsOverlap(o, r, 3))
    )
      removed.add(o);
  }
  d.buildings = d.buildings.filter((o) => !removed.has(o));
  d.obstacles = d.obstacles.filter((o) => !removed.has(o));
  const state: BangRakState = {
    parcels: [],
    removed: [...removed],
    rejected: [],
    roads,
    court,
  };
  states.set(d, state);
  const solids = hero.masses.map((m) => ({
    ...siteObstacle(hero.origin, hero.yaw, m, hero.id),
    protected: true,
    environmentId: `br:postal:${m.name}`,
  }));
  for (const o of solids) {
    if (
      d.obstacles.some(
        (q) =>
          q.landmarkId !== hero.id &&
          (q.landmarkId || q.chinatown || q.protected) &&
          orientedFootprintsOverlap(o, q, 0.2),
      )
    )
      throw Error("Postal conflicts with approved property");
    d.obstacles.push(o);
  }
  d.obstacles.push(
    {
      ...siteObstacle(
        hero.origin,
        hero.yaw,
        { name: "monument", x: 0, z: 33, w: 3.8, d: 3.8, h: 4.4 },
        hero.id,
      ),
      artRole: "furniture",
      environmentId: "br:postal-monument",
    },
    {
      ...siteObstacle(
        hero.origin,
        hero.yaw,
        { name: "stairs", x: 0, z: 21.4, w: 16, d: 5, h: 1.8 },
        hero.id,
      ),
      artRole: "furniture",
      environmentId: "br:postal-stairs",
    },
    ...[-38, 38].map((u) => ({
      ...siteObstacle(
        hero.origin,
        hero.yaw,
        { name: "planter", x: u, z: 29, w: 6, d: 3, h: 1.5 },
        hero.id,
      ),
      artRole: "furniture" as const,
      environmentId: `br:postal-planter:${u}`,
    })),
  );
  const roadVolumes = d.roads.map((r) => roadBody(r, 5));
  const add = (
    id: string,
    family: BangRakFamily,
    x: number,
    z: number,
    w: number,
    depth: number,
    h: number,
    yaw: number,
    road: string,
    trade: BangRakParcel["trade"],
  ) => {
    const body: Obstacle = {
      x,
      z,
      w,
      d: depth,
      height: h,
      yaw,
      color: "#cebea4",
      environmentId: `br:${id}`,
      regionId: "bang-rak",
      landmarkId: family === "warehouse" ? "warehouse-30" : undefined,
      bangRak: { family, trade, road },
      protected: true,
    };
    const corners = [
      [-w / 2, -depth / 2],
      [w / 2, -depth / 2],
      [w / 2, depth / 2],
      [-w / 2, depth / 2],
    ].map(([u, v]) => bangRakLocal(body, u!, v!));
    const reason = corners.some((p) => riverClearance(d, p) < 2)
      ? "water"
      : roadVolumes.some((r) => orientedFootprintsOverlap(body, r))
        ? "street setback"
        : d.obstacles.some((q) => orientedFootprintsOverlap(body, q, 1))
          ? "existing property"
          : undefined;
    if (reason) {
      state.rejected.push({ id: body.environmentId!, reason });
      return;
    }
    d.buildings.push(body);
    d.obstacles.push(body);
    state.parcels.push({ id: body.environmentId!, family, body, trade, road });
  };
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 4; col++)
      add(
        `warehouse-${row * 4 + col + 1}`,
        "warehouse",
        -132 + col * 43,
        898 + row * 9.5,
        40,
        row === 0 ? 9 : 7,
        7.1,
        row === 0 ? Math.PI : 0,
        row === 0 ? "charoen-krung-30" : "charoen-krung-32",
        col === 3 ? "coffee" : "gallery",
      );
  // Fitted, composed properties rather than a global random-colour sweep.
  for (const [i, x] of [-143, -116, -89, -62, -35].entries())
    add(
      `merchant-rear-${i}`,
      i === 3 ? "workshop" : i % 2 ? "timber" : "merchant",
      x,
      955,
      25,
      25,
      11 + (i % 3) * 2,
      Math.PI,
      "charoen-krung-32",
      i === 1 ? "residence" : i === 3 ? "workshop" : "retail",
    );
  for (const [i, z] of [887, 912, 944, 970, 997, 1026].entries()) {
    const r = d.roads
      .filter((r) => r.corridor === "charoen_s")
      .reduce((a, b) =>
        Math.abs((nodes.get(a.a)!.z + nodes.get(a.b)!.z) / 2 - z) <
        Math.abs((nodes.get(b.a)!.z + nodes.get(b.b)!.z) / 2 - z)
          ? a
          : b,
      );
    const a = nodes.get(r.a)!,
      b = nodes.get(r.b)!,
      hit = distanceToSegment({ x: 145, z }, a, b),
      dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz),
      yaw = Math.atan2(-dz / len, dx / len);
    const center = {
      x: hit.point.x + (dz / len) * 26,
      z: hit.point.z - (dx / len) * 26,
    };
    // Recompose only mutable old arterial lots, never an existing Chinatown bay.
    const proposed: Obstacle = {
      ...center,
      w: 22,
      d: 23,
      height: 13,
      yaw,
      color: "#aaa",
    };
    const mutable = d.buildings.filter(
      (o) =>
        !o.chinatown &&
        !o.landmarkId &&
        !o.protected &&
        orientedFootprintsOverlap(o, proposed, 1),
    );
    for (const o of mutable) {
      removed.add(o);
      state.removed.push(o);
    }
    d.buildings = d.buildings.filter((o) => !mutable.includes(o));
    d.obstacles = d.obstacles.filter((o) => !mutable.includes(o));
    add(
      `charoen-east-${i}`,
      (
        [
          "merchant",
          "gallery",
          "workshop",
          "cafe",
          "timber",
          "merchant",
        ] as BangRakFamily[]
      )[i]!,
      center.x,
      center.z,
      22,
      23,
      13.5 + (i % 2) * 3.5,
      yaw,
      "charoen_s",
      (
        [
          "retail",
          "gallery",
          "workshop",
          "coffee",
          "residence",
          "food",
        ] as const
      )[i]!,
    );
  }
  for (const [id, name, plot, road] of [
    ["grand-postal", hero.name, hero.origin, "charoen_s"],
    ["warehouse-30", "Warehouse 30", { x: -65, z: 904 }, "charoen-krung-32"],
  ] as const) {
    const target =
      id === "grand-postal" ? { x: 140, z: 990 } : { x: 10, z: 920 };
    const eligible = new Set(
      d.roads.filter((r) => r.corridor === road).flatMap((r) => [r.a, r.b]),
    );
    const stop = d.nodes
      .filter((n) => eligible.has(n.id))
      .reduce((a, b) =>
        Math.hypot(a.x - target.x, a.z - target.z) <
        Math.hypot(b.x - target.x, b.z - target.z)
          ? a
          : b,
      );
    d.landmarks.push({
      id,
      name,
      kind: "museum",
      ...plot,
      plot: { ...plot },
      size: id === "grand-postal" ? 114 : 170,
      yaw: id === "grand-postal" ? hero.yaw : 0,
      accessNode: stop.id,
    });
    // Ordinary landmark accessNode is the game's existing roadside discovery /
    // fare contract. Do not insert a pedestrian-only site into the gated
    // temple/mall DestinationAccess loop registry.
  }
  appendProtectedParcels(d, [
    ...d.obstacles
      .filter(
        (o) =>
          ["grand-postal", "warehouse-30"].includes(o.landmarkId ?? "") &&
          !o.artRole,
      )
      .map((o) => ({
        landmarkId: o.landmarkId!,
        use: "structure" as const,
        boundary: rectangleBoundary(o),
      })),
    {
      landmarkId: "grand-postal",
      use: "forecourt",
      boundary: rectangleBoundary(court),
    },
    {
      landmarkId: "warehouse-30",
      use: "compound",
      boundary: rectangleBoundary({ x: -65, z: 902, w: 180, d: 34 }),
    },
  ]);
  return state;
}
