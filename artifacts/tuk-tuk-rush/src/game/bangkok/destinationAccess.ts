import { COMMERCIAL_DISTRICT_BOUNDS, commercialSiteMasses } from "./commercialDistrictArt";
import { urbanCourtReserved } from "./urbanBlocks";
import { WAT_PHO_MASSES, WAT_PHO_WALLS } from "./watPhoCompound";
import { inPublicGround } from "./publicSpaces";
import { inAuthoredSite } from "./authoredSites";
import type {
  DestinationAccess,
  District,
  Obstacle,
  Point,
  RoadNode,
} from "../types";
import { distanceToSegment, orientedFootprintsOverlap } from "../world";
import { blockedByRiver, riverDistance } from "./world";
import { arrivalFurniturePoint } from "./arrivalDecoration";
import { inLandmarkParcel } from './landmarkParcels';

const sites = [
  [
    "pho",
    "temple",
    "old_w",
    "Chetuphon visitor/service forecourt; compressed outer arrival, not public driving in the sacred courts.",
  ],
  [
    "arun",
    "temple",
    "west",
    "Wang Doem-side visitor drop-off; fictional compact outer loop, central prang precinct remains pedestrian.",
  ],
  [
    "paknam",
    "temple",
    "paknam",
    "Canal-side Ratchamongkhon approach and outer visitor parking, compact arcade circulation.",
  ],
  [
    "palace",
    "palace",
    "palace_n",
    "Na Phra Lan perimeter drop-off outside the ceremonial enclosure; no palace interior driving.",
  ],
  [
    "icon",
    "mall",
    "charoen_nakhon",
    "Charoen Nakhon vehicle arrival, covered taxi loop; retail and river promenade remain inaccessible to vehicles.",
  ],
  [
    "paragon",
    "mall",
    "phaya",
    "Compact Siam Paragon vehicle forecourt, separate from the Siam pedestrian skywalk.",
  ],
  [
    "central",
    "mall",
    "ratchadamri",
    "Ratchadamri-side retail drop-off adaptation.",
  ],
  [
    "terminal",
    "mall",
    "asok_ratchada",
    "Asok-side Terminal 21 arrival adaptation.",
  ],
  [
    "asiatique",
    "waterfront",
    "asiatique",
    "Warehouse-market visitor loop outside the pedestrian riverfront.",
  ],
  [
    "traimit",
    "temple",
    "charoen_n",
    "Outer temple visitor forecourt; Golden Buddha hall and stairs remain pedestrian.",
  ],
] as const;

export function accessPoint(a: DestinationAccess, x: number, z: number): Point {
  const c = Math.cos(a.yaw),
    s = Math.sin(a.yaw);
  return { x: a.origin.x + c * x + s * z, z: a.origin.z - s * x + c * z };
}
export function destinationReservation(a: DestinationAccess): Obstacle {
  return { ...a.origin, yaw: a.yaw, w: 60, d: 56, height: 0, color: "#eee" };
}
export function inDestinationGrounds(d: District, o: Obstacle) {
  if (inLandmarkParcel(d,o) || urbanCourtReserved(d,o) || inPublicGround(d, o) || inAuthoredSite(d, o)) return true;
  return (
    d.destinations?.some((a) => {
      if (orientedFootprintsOverlap(o, destinationReservation(a), 2))
        return true;
      const plot = d.landmarks.find((l) => l.id === a.landmarkId)!.plot!;
      const length = Math.hypot(plot.x - a.origin.x, plot.z - a.origin.z);
      const sightline: Obstacle = {
        x: (plot.x + a.origin.x) / 2,
        z: (plot.z + a.origin.z) / 2,
        w: 34,
        d: length,
        yaw: Math.atan2(plot.x - a.origin.x, plot.z - a.origin.z),
        height: 0,
        color: "#eee",
      };
      return orientedFootprintsOverlap(o, sightline, 2);
    }) ?? false
  );
}

/** Authored site identity + deterministic geometric fitting. The SAME edges feed
 * physics recovery, mission routing, map, asphalt union and arrival art.
 * Normal city traffic stays on public streets; visitor lanes are player access. */
export function connectDestinations(d: District) {
  d.destinations = [];
  const publicNodes = [...d.nodes],
    publicRoads = [...d.roads];
  const byId = new Map(publicNodes.map((n) => [n.id, n]));
  for (const [id, kind, corridor, adaptation] of sites) {
    const l = d.landmarks.find((l) => l.id === id)!,
      plot = l.plot!;
    const original = d.obstacles.find((o) => o.landmarkId === id)!;
    let winner: { a: DestinationAccess; n: RoadNode; cost: number } | undefined;
    // Leave the existing architecture in its successful location/orientation.
    // Fit a forecourt outside its rotated envelope and connect at an existing node.
    for (let step = 0; step < 32; step++) {
      const yaw = (step * Math.PI) / 16,
        ux = Math.sin(yaw),
        uz = Math.cos(yaw);
      const relative = yaw - (l.yaw ?? 0);
      const support =
        (Math.abs(Math.sin(relative)) * l.size!) / 2 +
        (Math.abs(Math.cos(relative)) * l.size!) / 2;
      const origin = {
        x: plot.x - ux * (support + 32),
        z: plot.z - uz * (support + 32),
      };
      const prototype: DestinationAccess = {
        id,
        landmarkId: id,
        kind,
        origin,
        yaw,
        publicNode: "",
        arrivalNode: "",
        roadNodes: [],
        arrivalRadius: 9,
        restricted: [],
        adaptation,
        entrance: {
          x: origin.x - ux * 19,
          z: origin.z - uz * 19,
          yaw,
          width: 12,
        },
      };
      const reservation = destinationReservation(prototype);
      const corners = [
        [-30, -28],
        [-30, 28],
        [30, -28],
        [30, 28],
      ].map(([x, z]) => accessPoint(prototype, x!, z!));
      if (
        d.canals?.some((c) =>
          c.points.slice(1).some((q, i) => {
            const b = c.points[i]!;
            return orientedFootprintsOverlap(reservation, {
              x: (q.x + b.x) / 2,
              z: (q.z + b.z) / 2,
              w: c.width + 8,
              d: Math.hypot(q.x - b.x, q.z - b.z),
              yaw: Math.atan2(q.x - b.x, q.z - b.z),
              height: 0,
              color: "#eee",
            });
          }),
        )
      )
        continue;
      if (
        corners.some(
          (p) =>
            p.x < d.bounds!.minX + 3 ||
            p.x > d.bounds!.maxX - 3 ||
            p.z < d.bounds!.minZ + 3 ||
            p.z > d.bounds!.maxZ - 3 ||
            blockedByRiver(d, p, 4),
        )
      )
        continue;
      if (
        d.obstacles.some(
          (o) => o !== original && orientedFootprintsOverlap(o, reservation, 2),
        )
      )
        continue;
      if (
        d.destinations.some((a) =>
          orientedFootprintsOverlap(destinationReservation(a), reservation, 2),
        )
      )
        continue;
      const loop = accessPoint(prototype, 0, -14);
      // All outer grounds are off public asphalt. Do not silently create crossings.
      if (
        publicRoads.some(
          (r) =>
            distanceToSegment(origin, byId.get(r.a)!, byId.get(r.b)!).distance <
            r.width / 2 + 31,
        )
      )
        continue;
      const choices = publicNodes
        .filter(
          (n) =>
            Math.hypot(n.x - loop.x, n.z - loop.z) <
            (id === "paknam" ? 420 : 240),
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - loop.x, a.z - loop.z) -
            Math.hypot(b.x - loop.x, b.z - loop.z),
        );
      for (const n of choices) {
        const len = Math.hypot(n.x - loop.x, n.z - loop.z);
        if (len < 20 || len > (id === "paknam" ? 390 : 210)) continue;
        const align = ((loop.x - n.x) * ux + (loop.z - n.z) * uz) / len;
        if (align < 0.6) continue;
        const drive: Obstacle = {
          x: (n.x + loop.x) / 2,
          z: (n.z + loop.z) / 2,
          w: 14,
          d: len,
          yaw: Math.atan2(loop.x - n.x, loop.z - n.z),
          height: 0,
          color: "#eee",
        };
        if (d.obstacles.some((o) => orientedFootprintsOverlap(o, drive, 1.8)))
          continue;
        let invalid = false;
        for (let t = 15; t < len; t += 4) {
          const p = {
            x: n.x + ((loop.x - n.x) * t) / len,
            z: n.z + ((loop.z - n.z) * t) / len,
          };
          if (
            riverDistance(d, p) < d.riverWidth! / 2 + 7 ||
            publicRoads.some(
              (r) =>
                distanceToSegment(p, byId.get(r.a)!, byId.get(r.b)!).distance <
                  r.width / 2 + 6 &&
                r.a !== n.id &&
                r.b !== n.id,
            )
          ) {
            invalid = true;
            break;
          }
        }
        if (invalid) continue;
        const preferred = publicRoads.some(
          (r) => (r.a === n.id || r.b === n.id) && r.corridor === corridor,
        );
        const cost =
          len + (preferred ? 0 : 95) + Math.hypot(n.x - l.x, n.z - l.z) * 0.15;
        if (!winner || cost < winner.cost) winner = { a: prototype, n, cost };
      }
    }
    if (!winner) throw Error(`No connected visitor forecourt fits ${id}`);
    const { a, n } = winner;
    a.publicNode = n.id;
    const addNode = (key: string, p: Point) => {
      const node = {
        ...p,
        id: `arrival:${id}:${key}`,
        name: `${l.name} · visitor arrival`,
      };
      d.nodes.push(node);
      a.roadNodes.push(node.id);
      return node;
    };
    const loopCoords = [
      [0, -14],
      [-14, -14],
      [-19, -7],
      [-19, 7],
      [-14, 14],
      [0, 14],
      [14, 14],
      [19, 7],
      [19, -7],
      [14, -14],
    ];
    const pullIn = ["asiatique", "traimit"].includes(id);
    if (pullIn) loopCoords.splice(6);
    const twoWay = pullIn || id === "palace";
    const loop = loopCoords.map(([x, z], i) =>
      addNode(`loop${i}`, accessPoint(a, x!, z!)),
    );
    let previous = n;
    const count = Math.ceil(
      Math.hypot(loop[0]!.x - n.x, loop[0]!.z - n.z) / 22,
    );
    for (let i = 1; i <= count; i++) {
      const next =
        i === count
          ? loop[0]!
          : addNode(`drive${i}`, {
              x: n.x + ((loop[0]!.x - n.x) * i) / count,
              z: n.z + ((loop[0]!.z - n.z) * i) / count,
            });
      const bridge = d.canals?.some((c) =>
        c.points
          .slice(1)
          .some(
            (q, j) =>
              distanceToSegment(
                { x: (previous.x + next.x) / 2, z: (previous.z + next.z) / 2 },
                c.points[j]!,
                q,
              ).distance <
              c.width / 2 +
                Math.hypot(next.x - previous.x, next.z - previous.z) / 2 +
                2,
          ),
      );
      d.roads.push({
        a: previous.id,
        b: next.id,
        bridge,
        width: 12,
        name: `${l.name} entrance`,
        destinationId: id,
        corridor: `arrival:${id}`,
        noTraffic: true,
        surface: "arrival",
      });
      previous = next;
    }
    loop.forEach((node, i) => {
      if (pullIn && i === loop.length - 1) return;
      d.roads.push({
        a: node.id,
        b: loop[(i + 1) % loop.length]!.id,
        width: 8,
        name: `${l.name} visitor loop`,
        oneWay: !twoWay,
        destinationId: id,
        corridor: `arrival:${id}`,
        noTraffic: true,
        surface: "arrival",
      });
    });
    a.arrivalNode = loop[5]!.id;
    l.accessNode = a.arrivalNode;
    // Entrance follows the driveway rather than the site's viewing axis.
    const length = Math.hypot(loop[0]!.x - n.x, loop[0]!.z - n.z),
      t = Math.max(0.3, 1 - 35 / length);
    a.entrance = {
      x: n.x + (loop[0]!.x - n.x) * t,
      z: n.z + (loop[0]!.z - n.z) * t,
      yaw: Math.atan2(loop[0]!.x - n.x, loop[0]!.z - n.z),
      width: 14,
    };
    d.destinations.push(a);
  }
}

/** Retain sacred/commercial buildings as solid, replace oversized whole-property
 * rectangles by separate hall, wall and chedi footprints. Interior barriers are
 * closed: visitor roads never lead into sacred courts or retail floors. */
/** Fit a physical portal along the existing driveway. The previous fixed post
 * offsets put Wat Pho's gateway in the chase-camera clearance of the diagonal
 * public street. Art and collision use this same pose; no road is moved. */
export function arrivalPortal(d: District, a: DestinationAccess) {
  const nodes = new Map(d.nodes.map((n) => [n.id, n])),
    g = a.entrance,
    halfSpan = 9;
  for (const offset of [0, 2, 4, 6, 8, 10, 12, 14, 16]) {
    const p = {
      x: g.x + Math.sin(g.yaw) * offset,
      z: g.z + Math.cos(g.yaw) * offset,
      yaw: g.yaw,
      halfSpan,
    };
    if (
      [-1, 1].every((side) => {
        const post = {
          x: p.x + Math.cos(p.yaw) * side * halfSpan,
          z: p.z - Math.sin(p.yaw) * side * halfSpan,
        };
        return (
          !blockedByRiver(d, post, 1.3) &&
          d.roads.every(
            (r) =>
              distanceToSegment(post, nodes.get(r.a)!, nodes.get(r.b)!)
                .distance >=
              r.width / 2 + 2.25,
          )
        );
      })
    )
      return p;
  }
  // A tight forecourt remains an open entrance, rather than a floating beam
  // or a post hidden inside a road/turn. Enclosing galleries remain in place.
  return undefined;
}
export function detailDestinationCollisions(d: District) {
  for (const a of d.destinations ?? []) {
    const l = d.landmarks.find((l) => l.id === a.landmarkId)!,
      old = d.obstacles.find((o) => o.landmarkId === l.id)!;
    d.obstacles = d.obstacles.filter((o) => o !== old);
    const add = (x: number, z: number, w: number, depth: number, h: number) => {
      const yaw = l.yaw ?? 0,
        c = Math.cos(yaw),
        s = Math.sin(yaw);
      const o: Obstacle = {
        x: l.plot!.x + c * x + s * z,
        z: l.plot!.z - s * x + c * z,
        w,
        d: depth,
        height: h,
        yaw,
        color: "#dfbd83",
        landmarkId: l.id,
        environmentId: `compound:${l.id}:${a.restricted.length}`,
      };
      a.restricted.push(o);
      d.obstacles.push(o);
    };
    const S = l.size!;
    const retail = COMMERCIAL_DISTRICT_BOUNDS[l.id!];
    if (retail) for (const m of commercialSiteMasses(l.id!)) add(m.x,m.z,m.w,m.d,m.h);
    else if (["icon", "paragon", "central", "terminal"].includes(l.id!))
      add(
        0,
        0,
        S,
        S,
        l.id === "icon"
          ? 39
          : l.id === "terminal"
            ? 118
            : l.id === "central"
              ? 36
              : 30,
      );
    else if (l.id === "pho") {
      add(0, 2, 48, 23, 20);
      for (const x of [-18, -6, 6, 18]) add(x, -18, 8, 8, 20);
      for (const m of [...WAT_PHO_MASSES,...WAT_PHO_WALLS]) add(m.x,m.z,m.w,m.d,m.h);
    } else if (l.id === "arun") {
      add(0, 0, 20, 20, 56);
      for (const x of [-16, 16]) for (const z of [-16, 16]) add(x, z, 9, 9, 23);
    } else if (l.id === "paknam") {
      add(0, 14, 49, 32, 69);
      add(0, -27, 30, 30, 79);
      for (const x of [-34, 34]) add(x, -5, 17, 23, 12);
    } else if (l.id === "palace") {
      for (const x of [-45, -8, 30]) add(x, 15, 30, 57, 28);
      add(-44, -42, 27, 27, 42);
      add(-7, -40, 21, 21, 35);
      add(33, -37, 40, 32, 45);
    } else add(0, 0, S - 2, S - 2, 30);
    // Match existing wall positions, close pedestrian-only boundary explicitly.
    const edge = l.id === "paknam" ? 43 : l.id === "palace" ? 66 : S / 2 - 1;
    if (!retail && l.id!=="pho")
      for (const side of [-1, 1]) {
        add(side * edge, 0, 1, edge * 2 + 1, 3);
        add(0, side * edge, edge * 2 + 1, 1, 3);
      }
    if (l.id === "palace") {
      add(-4,-66.7,1.2,2,7.7);add(4,-66.7,1.2,2,7.7);
    }
    const furniture = (
      p: Point,
      w: number,
      depth: number,
      height: number,
      yaw = a.yaw,
    ) =>
      d.obstacles.push({
        ...arrivalFurniturePoint(d,a,p),
        w,
        d: depth,
        height,
        yaw,
        color: "#d6c8aa",
        environmentId: `arrival-prop:${a.id}:${d.obstacles.length}`,
      });
    furniture(a.origin, 16, 8, 1.1);
    for (const x of [-4, -1.3, 1.3, 4])
      furniture(accessPoint(a, x, 25), 0.25, 0.25, 1);
    if (a.kind === "mall")
      for (const x of [-13, 13])
        furniture(accessPoint(a, x, 22), 0.6, 0.6, 7.3);
    for (const side of [-1, 1])
      for (const z of [-3, 3])
        furniture(accessPoint(a, side * 5, z), 0.45, 0.45, 5);
    const portal = arrivalPortal(d, a);
    for (const side of [-1, 1]) {
      if (portal)
        furniture(
          {
            x: portal.x + Math.cos(portal.yaw) * side * portal.halfSpan,
            z: portal.z - Math.sin(portal.yaw) * side * portal.halfSpan,
          },
          1.7,
          1.7,
          7,
          portal.yaw,
        );
      furniture(accessPoint(a, side * 28, 0), 1, 42, 2.4);
    }
  }
}

export function destinationAt(d: District, p: Point) {
  return d.destinations?.find((a) => {
    const n = d.nodes.find((n) => n.id === a.arrivalNode)!;
    return Math.hypot(p.x - n.x, p.z - n.z) < a.arrivalRadius;
  });
}
