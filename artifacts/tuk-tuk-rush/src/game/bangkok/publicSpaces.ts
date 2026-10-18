import type { District, Point, Obstacle, RoadNode, Landmark } from "../types";
import type { CivicSegment } from "./civicRoads";
import lumpini from "./lumphini-normalized.json";
import sanam from "./sanam-normalized.json";
import { distanceToSegment, orientedFootprintsOverlap } from "../world";
export type PublicSpace = {
  id: string;
  name: string;
  origin: Point;
  boundary: Point[];
  water: { points: Point[]; hole: boolean }[];
  paths: {
    points: Point[];
    width: number;
    mode: "pedestrian" | "vehicle";
    elevation?: number;
  }[];
  gates: {
    name: string;
    point: Point;
    vehicle: boolean;
    accessNode?: string;
    yaw?: number;
  }[];
  trees: Point[];
  fences: Obstacle[];
  facilities?: Obstacle[];
  dropoff?: string;
  adaptation: string;
};
const map = ([x, z]: number[]): Point => ({
  x: (x! - 500) * 4,
  z: (z! - 600) * 4,
});
export function insidePublicPolygon(p: Point, ps: Point[]) {
  let inside = false;
  for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) {
    const a = ps[i]!,
      b = ps[j]!;
    if (
      a.z > p.z !== b.z > p.z &&
      p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x
    )
      inside = !inside;
  }
  return inside;
}
const normalized = (
  points: number[][],
  center: number[],
  w: number,
  h: number,
) => points.map(([x, y]) => map([center[0]! + x! * w, center[1]! + y! * h]));
export function publicWaterAt(d: District, p: Point) {
  return (d.publicSpaces ?? []).some(
    (s) =>
      s.water.some((w) => !w.hole && insidePublicPolygon(p, w.points)) &&
      !s.water.some((w) => w.hole && insidePublicPolygon(p, w.points)),
  );
}
export function inPublicGround(d: District, o: Obstacle) {
  const monument = d.landmarks.find((l) => l.id === "victory");
  if (
    monument &&
    Math.hypot(o.x - monument.x, o.z - monument.z) <
      100 + Math.hypot(o.w, o.d) / 2
  )
    return true;
  const c = Math.cos(o.yaw ?? 0),
    s = Math.sin(o.yaw ?? 0),
    corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([x, z]) => ({
      x: o.x + (c * x! * o.w) / 2 + (s * z! * o.d) / 2,
      z: o.z - (s * x! * o.w) / 2 + (c * z! * o.d) / 2,
    }));
  return (d.publicSpaces ?? []).some(
    (p) =>
      insidePublicPolygon(o, p.boundary) ||
      corners.some((q) => insidePublicPolygon(q, p.boundary)) ||
      p.boundary.some((q) => {
        const dx = q.x - o.x,
          dz = q.z - o.z;
        return (
          Math.abs(dx * c - dz * s) < o.w / 2 &&
          Math.abs(dx * s + dz * c) < o.d / 2
        );
      }),
  );
}
/** Road changes occur before graph splitting. Every visible at-grade meeting is
 * also a routing/traffic junction; parking is player access, not transit traffic. */
export function reconstructPublicRoads(
  segments: CivicSegment[],
  controls: Record<string, Point>,
) {
  const replace = (corridor: string, end: Point, ps: number[][]) => {
    const i = segments.findIndex(
      (s) =>
        s.road.corridor === corridor &&
        Math.hypot(s.b.x - end.x, s.b.z - end.z) < 0.01 &&
        Math.hypot(
          s.a.x - controls.pinklao_e!.x,
          s.a.z - controls.pinklao_e!.z,
        ) < 0.01,
    );
    if (i < 0) throw Error("Missing Sanam perimeter " + corridor);
    const old = segments.splice(i, 1)[0]!;
    const points = ps.map(map);
    for (let j = 1; j < points.length; j++)
      segments.push({ ...old, a: points[j - 1]!, b: points[j]!, cuts: [0, 1] });
  };
  replace("old_w", controls.palace_w!, [
    [310, 230],
    [272, 248],
    [267, 322],
    [250, 335],
  ]);
  replace("old_e", controls.palace_e!, [
    [310, 230],
    [349, 248],
    [350, 323],
    [350, 335],
  ]);
  const addStreet = (
    ps: number[][],
    corridor: string,
    name: string,
    width: number,
  ) => {
    const points = ps.map(map);
    for (let i = 1; i < points.length; i++)
      segments.push({
        a: points[i - 1]!,
        b: points[i]!,
        cuts: [0, 1],
        road: { a: "", b: "", width, name, corridor },
      });
  };
  addStreet(
    [
      [710, 455],
      [710, 540],
      [765, 540],
      [765, 455],
    ],
    "siam-square",
    "Siam Square commercial streets",
    10,
  );
  addStreet(
    [
      [945, 550],
      [940, 400],
      [825, 360],
    ],
    "asok-north",
    "Asok Montri / Phetchaburi approach",
    20,
  );
  const parking = [
    [855, 694],
    [847, 694],
    [847, 666],
    [855, 666],
  ].map(map);
  for (let i = 1; i < parking.length; i++)
    segments.push({
      a: parking[i - 1]!,
      b: parking[i]!,
      cuts: [0, 1],
      road: {
        a: "",
        b: "",
        width: 8,
        name: "Lumphini Wireless school-side parking",
        corridor: "lumphini-parking",
        noTraffic: true,
        surface: "arrival",
      },
    });
  // Museum approach remains outside the teak compound. The Saen Saep-side lane
  // is compressed; lake paths elsewhere are never added to the vehicle graph.
  const museum = [
    [640, 455],
    [626, 451],
    [626, 440],
  ].map(map);
  for (let i = 1; i < museum.length; i++)
    segments.push({
      a: museum[i - 1]!,
      b: museum[i]!,
      cuts: [0, 1],
      road: {
        a: "",
        b: "",
        width: 7,
        name: "Kasemsan 2 — museum drop-off",
        corridor: "jim-thompson-lane",
        noTraffic: true,
        surface: "arrival",
      },
    });
}
function fence(p: Point, q: Point, id: string): Obstacle {
  return {
    x: (p.x + q.x) / 2,
    z: (p.z + q.z) / 2,
    w: 0.5,
    d: Math.hypot(q.x - p.x, q.z - p.z),
    yaw: Math.atan2(q.x - p.x, q.z - p.z),
    height: 1.5,
    color: "#59745b",
    environmentId: `public-boundary:${id}`,
  };
}
/** Source outlines are OSM reference geometry; the affine compression preserves
 * lake/island topology. Public traffic never enters the recreation paths. */
export function planPublicSpaces(d: District) {
  const make = (
    id: string,
    name: string,
    origin: number[],
    boundary: Point[],
    water: PublicSpace["water"],
    gates: PublicSpace["gates"],
    paths: PublicSpace["paths"],
  ): PublicSpace => ({
    id,
    name,
    origin: map(origin),
    boundary,
    water,
    gates,
    paths,
    trees: [],
    fences: [],
    adaptation:
      id === "park"
        ? "Wireless school-side parking represented; interior paths pedestrian-only. Affine park compression preserves sourced lake topology, not exact distances."
        : "Perimeter drop-off only; ceremonial lawn/pedestrian paths are not public vehicle roads.",
  });
  const b = normalized(lumpini.boundary.points, [803.5, 729], 88, 144),
    water = lumpini.lakes.map((l) => ({
      points: normalized(l.points, [803.5, 729], 88, 144),
      hole: l.role === "inner",
    }));
  const park = make(
    "park",
    "Lumphini Park",
    [803.5, 729],
    b,
    water,
    [
      { name: "Rama VI / Si Lom gate", point: map([770, 760]), vehicle: false },
      { name: "Ratchadamri gate", point: map([762, 708]), vehicle: false },
      { name: "Sarasin gate", point: map([804, 658]), vehicle: false },
      {
        name: "Wireless school-side parking",
        point: map([848, 694]),
        vehicle: true,
      },
    ],
    [],
  );
  // Perimeter recreation loop plus independent lakeside cross paths. The points
  // are authored to fit the sourced bays and islands, not random splines.
  park.paths.push(
    {
      points: [
        [777, 668],
        [805, 662],
        [840, 667],
        [842, 705],
        [840, 750],
        [834, 788],
        [811, 796],
        [789, 778],
        [769, 746],
        [765, 714],
        [777, 668],
      ].map(map),
      width: 5,
      mode: "pedestrian",
    },
    {
      points: [
        [775, 701],
        [788, 692],
        [804, 701],
        [807, 724],
        [820, 737],
        [832, 758],
        [822, 778],
        [803, 774],
        [789, 751],
        [776, 734],
        [775, 701],
      ].map(map),
      width: 3.8,
      mode: "pedestrian",
    },
    {
      points: [
        [770, 760],
        [786, 779],
        [803, 761],
        [821, 740],
        [841, 726],
      ].map(map),
      width: 5,
      mode: "pedestrian",
    },
    {
      points: [
        [804, 658],
        [805, 680],
        [809, 702],
        [817, 718],
        [840, 721],
      ].map(map),
      width: 4,
      mode: "pedestrian",
    },
  );
  const field = make(
    "sanam",
    "Sanam Luang",
    [309, 285],
    normalized(sanam.boundary.points, [309, 285], 56, 72),
    [],
    [
      {
        name: "Na Phra Lan south entrance",
        point: map([304, 321]),
        vehicle: false,
      },
      {
        name: "Ratchadamnoen north entrance",
        point: map([318, 249]),
        vehicle: false,
      },
    ],
    [],
  );
  // Turenscape/Arsomsilp: original lake east, three constructed wetlands
  // and islet fields west. A compressed plan, not a survey-derived boundary.
  const benBoundary = [
    [869, 674],
    [913, 674],
    [919, 741],
    [911, 752],
    [870, 752],
  ].map(map);
  const benWater: PublicSpace["water"] = [
    {
      points: [
        [899, 682],
        [910, 680],
        [914, 734],
        [907, 743],
        [899, 738],
      ].map(map),
      hole: false,
    },
    {
      points: [
        [873, 680],
        [892, 680],
        [893, 697],
        [888, 703],
        [873, 700],
      ].map(map),
      hole: false,
    },
    {
      points: [
        [873, 707],
        [890, 705],
        [894, 717],
        [889, 725],
        [873, 722],
      ].map(map),
      hole: false,
    },
    {
      points: [
        [874, 731],
        [888, 728],
        [896, 737],
        [892, 747],
        [875, 746],
      ].map(map),
      hole: false,
    },
  ];
  // Islands are holes in the same water mesh and physical water query. Modest
  // count is deliberate for mobile; it preserves the characteristic topology.
  for (const [cx, cy, rows, cols] of [
    [881, 690, 3, 4],
    [881, 714, 2, 4],
    [882, 738, 2, 4],
  ])
    for (let row = 0; row < rows!; row++)
      for (let col = 0; col < cols!; col++) {
        const x = cx! + (col! - (cols! - 1) / 2) * 3.7,
          y = cy! + (row! - (rows! - 1) / 2) * 5;
        benWater.push({
          points: Array.from({ length: 8 }, (_, i) =>
            map([
              x + Math.cos((i * Math.PI) / 4) * 1.1,
              y + Math.sin((i * Math.PI) / 4) * 1.6,
            ]),
          ),
          hole: true,
        });
      }
  const ben = make(
    "benjakitti",
    "Benjakitti Forest and Lake Park",
    [894, 713],
    benBoundary,
    benWater,
    [
      {
        name: "Ratchadaphisek lake gate",
        point: map([917, 721]),
        vehicle: false,
      },
      { name: "North forest gate", point: map([879, 674]), vehicle: false },
      {
        name: "South convention centre gate",
        point: map([902, 751]),
        vehicle: false,
      },
    ],
    [
      {
        points: [
          [871, 676],
          [911, 676],
          [917, 739],
          [909, 750],
          [872, 750],
          [871, 676],
        ].map(map),
        width: 4,
        mode: "pedestrian",
      },
      {
        points: [
          [896, 680],
          [896, 743],
          [905, 747],
          [915, 738],
          [911, 679],
          [896, 680],
        ].map(map),
        width: 3.5,
        mode: "pedestrian",
      },
      {
        points: [
          [872, 702],
          [895, 702],
          [895, 726],
          [872, 726],
        ].map(map),
        width: 4,
        mode: "pedestrian",
      },
      {
        points: [
          [876, 677],
          [876, 694],
          [889, 705],
          [878, 716],
          [890, 730],
          [883, 747],
        ].map(map),
        width: 2.8,
        mode: "pedestrian",
        elevation: 6.2,
      },
      {
        points: [
          [872, 688],
          [893, 695],
          [881, 711],
          [893, 718],
          [881, 738],
          [895, 742],
        ].map(map),
        width: 2.3,
        mode: "pedestrian",
        elevation: 1.8,
      },
    ],
  );
  ben.adaptation =
    "Original east lake and three west wetland/islet fields based on Turenscape/Arsomsilp project plan. Width and southern convention-centre spacing compressed. Pedestrian skywalk/boardwalks have no road nodes; vehicle stops stay on Ratchadaphisek.";
  ben.facilities = [-54, -24].map((x) => ({
    x: ben.origin.x + x,
    z: ben.origin.z - 142,
    w: 22,
    d: 10,
    height: 9.6,
    color: "#c4c2a5",
    environmentId: `park-factory:${x}`,
  }));
  d.obstacles.push(...ben.facilities);
  d.publicSpaces = [park, field, ben];
  const nodes = new Map(d.nodes.map((n) => [n.id, n])),
    roadSegments = d.roads.map((r) => ({
      r,
      a: nodes.get(r.a)!,
      b: nodes.get(r.b)!,
    }));
  for (const s of d.publicSpaces) {
    const l = d.landmarks.find((l) => l.id === s.id)!;
    l.plot = { ...s.origin };
    l.x = s.origin.x;
    l.z = s.origin.z;
    l.size =
      Math.max(
        ...s.boundary.map((p) =>
          Math.hypot(p.x - s.origin.x, p.z - s.origin.z),
        ),
      ) * 2;
    for (const [i, g] of s.gates.entries()) {
      const edge = s.boundary
        .map((p, j) => ({
          a: p,
          b: s.boundary[(j + 1) % s.boundary.length]!,
          ...distanceToSegment(
            g.point,
            p,
            s.boundary[(j + 1) % s.boundary.length]!,
          ),
        }))
        .sort((a, b) => a.distance - b.distance)[0]!;
      g.yaw = Math.atan2(-(edge.b.z - edge.a.z), edge.b.x - edge.a.x);
      if (!g.vehicle)
        for (const x of [-3, -1.5, 0, 1.5, 3]) {
          d.obstacles.push({
            x: g.point.x + Math.cos(g.yaw) * x,
            z: g.point.z - Math.sin(g.yaw) * x,
            w: 0.4,
            d: 0.4,
            height: 1.1,
            color: "#aeb7a4",
            environmentId: `park-bollard:${s.id}:${i}:${x}`,
          });
        }

      const candidates = d.nodes.filter(
        (n) =>
          !d.roads.some((r) => (r.a === n.id || r.b === n.id) && r.shortcut),
      );
      g.accessNode = candidates.reduce((a, n) =>
        Math.hypot(n.x - g.point.x, n.z - g.point.z) <
        Math.hypot(a.x - g.point.x, a.z - g.point.z)
          ? n
          : a,
      ).id;
      if (!g.vehicle) {
        const n = nodes.get(g.accessNode)!;
        const road = roadSegments
          .filter(({ r }) => !r.shortcut)
          .map((q) => ({ ...q, ...distanceToSegment(g.point, q.a, q.b) }))
          .sort((a, b) => a.distance - b.distance)[0]!;
        const dx = g.point.x - road.point.x,
          dz = g.point.z - road.point.z,
          len = Math.hypot(dx, dz) || 1;
        const curb = {
          x: road.point.x + (dx / len) * (road.r.width / 2 + 2),
          z: road.point.z + (dz / len) * (road.r.width / 2 + 2),
        };
        s.paths.push({ points: [g.point, curb], width: 4, mode: "pedestrian" });
      }
      if (g.vehicle || !s.dropoff) s.dropoff = g.accessNode;
    }
    l.accessNode = s.dropoff;
    // Perimeter fence has real entrance gaps and is never stamped across a road.
    for (let i = 1; i <= s.boundary.length; i++) {
      const a = s.boundary[i - 1]!,
        b = s.boundary[i % s.boundary.length]!,
        len = Math.hypot(b.x - a.x, b.z - a.z),
        count = Math.max(1, Math.ceil(len / 5));
      for (let j = 0; j < count; j++) {
        const p = {
            x: a.x + ((b.x - a.x) * j) / count,
            z: a.z + ((b.z - a.z) * j) / count,
          },
          q = {
            x: a.x + ((b.x - a.x) * (j + 1)) / count,
            z: a.z + ((b.z - a.z) * (j + 1)) / count,
          },
          o = fence(p, q, `${s.id}:${i}:${j}`);
        if (
          s.gates.some((g) => distanceToSegment(g.point, p, q).distance < 13) ||
          roadSegments.some(
            ({ r, a, b }) =>
              distanceToSegment(o, a, b).distance < r.width / 2 + 4,
          )
        )
          continue;
        s.fences.push(o);
      }
    }
    d.obstacles.push(...s.fences);
    const xs = s.boundary.map((p) => p.x),
      zs = s.boundary.map((p) => p.z),
      minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minZ = Math.min(...zs),
      maxZ = Math.max(...zs);
    // Deliberate tree belts and groves, open ceremonial lawn/recreation lawns.
    let i = 0;
    for (let x = minX + 9; x < maxX - 5; x += s.id === "park" ? 11 : 16)
      for (let z = minZ + 8; z < maxZ - 5; z += s.id === "park" ? 12 : 17) {
        i++;
        const p = {
          x: x + Math.sin(i * 17.3) * 4,
          z: z + Math.cos(i * 9.2) * 4,
        };
        if (!insidePublicPolygon(p, s.boundary) || publicWaterAt(d, p))
          continue;
        const edge = Math.min(
          ...s.boundary.map(
            (a, j) =>
              distanceToSegment(p, a, s.boundary[(j + 1) % s.boundary.length]!)
                .distance,
          ),
        );
        if (s.id === "sanam" && edge > 13) continue;
        if (s.id === "park" && edge > 20 && i % 5 < 2) continue;
        if (
          s.paths.some((path) =>
            path.points
              .slice(1)
              .some(
                (b, j) =>
                  distanceToSegment(p, path.points[j]!, b).distance <
                  path.width + 4,
              ),
          )
        )
          continue;
        if (
          roadSegments.some(
            ({ r, a, b }) =>
              distanceToSegment(p, a, b).distance < r.width / 2 + 8,
          )
        )
          continue;
        s.trees.push(p);
        d.obstacles.push({
          ...p,
          w: 0.6,
          d: 0.6,
          height: 10,
          color: "#748e64",
          environmentId: `park-tree:${s.id}:${i}`,
        });
      }
  }
  // Micro-islands are smaller than the general tree grid. Plant dry centers
  // explicitly; the forest park must not become a treeless water surface.
  for (const [i, island] of ben.water.filter((w) => w.hole).entries()) {
    const p = {
      x: island.points.reduce((n, p) => n + p.x, 0) / island.points.length,
      z: island.points.reduce((n, p) => n + p.z, 0) / island.points.length,
    };
    if (
      publicWaterAt(d, p) ||
      ben.paths.some((path) =>
        path.points
          .slice(1)
          .some(
            (q, j) =>
              distanceToSegment(p, path.points[j]!, q).distance <
              path.width + 2,
          ),
      )
    )
      continue;
    ben.trees.push(p);
    d.obstacles.push({
      ...p,
      w: 0.6,
      d: 0.6,
      height: 10,
      color: "#748e64",
      environmentId: `wetland-island-tree:${i}`,
    });
  }
  return d.publicSpaces;
}
