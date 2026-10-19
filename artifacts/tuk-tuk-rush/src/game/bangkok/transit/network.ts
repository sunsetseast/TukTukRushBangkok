import * as T from "three";
import type { District, Obstacle, Point } from "../../types";
import {
  distanceToSegment,
  obstacleDistance,
  orientedFootprintsOverlap,
} from "../../world";
import { blockedByRiver, toWorld } from "../world";
import { MASTER_PLAN } from "../masterPlan";
import { stationEnvelope } from './stationGeometry';

export type LineId = "sukhumvit" | "silom" | "gold";
export const SIAM_JUNCTION={offsetApproach:450,offsetRun:100,gradeApproach:650,gradeRun:200} as const;
export type RailStation = Point & {
  entrances?: (Point & { yaw: number })[];
  id: string;
  code: string;
  name: string;
  thai: string;
  line: LineId;
  distance: number;
  yaw: number;
  family:
    | "side"
    | "siam"
    | "gold"
    | "terminal"
    | "river"
    | "business"
    | "asok"
    | "silom";
  length: number;
  interchange?: string;
  landmark?: string;
  mrt?: string;
};
export type RailSample = Point & {
  distance: number;
  tx: number;
  tz: number;
  y: number;
};
export type RailLine = {
  id: LineId;
  name: string;
  color: string;
  stations: RailStation[];
  samples: RailSample[];
  length: number;
  continuation: [string, string];
};
export type RailSupport = Point & {
  water?: boolean;
  yaw: number;
  height: number;
  arm: number;
  line: LineId;
};
export type RailNetwork = {
  lines: RailLine[];
  supports: RailSupport[];
  removedParcels: number;
};
type Stop = [
  string,
  string,
  string,
  string,
  number,
  number,
  RailStation["family"]?,
  string?,
  string?,
];
const stops: Record<LineId, Stop[]> = {
  sukhumvit: [
    [
      "mo-chit",
      "N8",
      "Mo Chit",
      "หมอชิต",
      770,
      65,
      "side",
      undefined,
      "MRT Chatuchak Park",
    ],
    ["saphan-khwai", "N7", "Saphan Khwai", "สะพานควาย", 747, 107],
    ["ari", "N5", "Ari", "อารีย์", 725, 145],
    ["sanam-pao", "N4", "Sanam Pao", "สนามเป้า", 728, 187],
    [
      "victory-monument",
      "N3",
      "Victory Monument",
      "อนุสาวรีย์ชัยสมรภูมิ",
      717,
      278,
      "business",
      "victory",
    ],
    ["phaya-thai", "N2", "Phaya Thai", "พญาไท", 680, 340],
    ["ratchathewi", "N1", "Ratchathewi", "ราชเทวี", 680-(398-340)*40/115, 398],
    ["siam", "CEN", "Siam", "สยาม", 710, 455, "siam", "paragon"],
    ["chit-lom", "E1", "Chit Lom", "ชิดลม", 822, 461.46, "side", "central"],
    ["phloen-chit", "E2", "Phloen Chit", "เพลินจิต", 850, 476.538],
    ["nana", "E3", "Nana", "นานา", 875, 490],
    [
      "asok",
      "E4",
      "Asok",
      "อโศก",
      945,
      550,
      "asok",
      "terminal",
      "MRT Sukhumvit",
    ],
    ["phrom-phong","E5","Phrom Phong","พร้อมพงษ์",...MASTER_PLAN.phromPhong,"business","emporium"],
  ],
  silom: [
    [
      "national-stadium",
      "W1",
      "National Stadium",
      "สนามกีฬาแห่งชาติ",
      640,
      455,
      "terminal",
      "mbk",
    ],
    ["siam", "CEN", "Siam", "สยาม", 710, 455, "siam", "paragon"],
    ["ratchadamri", "S1", "Ratchadamri", "ราชดำริ", 785, 575],
    [
      "sala-daeng",
      "S2",
      "Sala Daeng",
      "ศาลาแดง",
      750,
      778,
      "silom",
      undefined,
      "MRT Si Lom",
    ],
    [
      "chong-nonsi",
      "S3",
      "Chong Nonsi",
      "ช่องนนทรี",
      660,
      905,
      "business",
      "mahanakhon",
    ],
    ["saint-louis", "S4", "Saint Louis", "เซนต์หลุยส์", 610, 947],
    ["surasak", "S5", "Surasak", "สุรศักดิ์", 553, 956],
    [
      "saphan-taksin",
      "S6",
      "Saphan Taksin",
      "สะพานตากสิน",
      477,
      965,
      "river",
      "state",
    ],
    [
      "krung-thon-buri",
      "S7",
      "Krung Thon Buri",
      "กรุงธนบุรี",
      270,
      965,
      "business",
    ],
    ["wongwian-yai", "S8", "Wongwian Yai", "วงเวียนใหญ่", 195, 965],
  ],
  gold: [
    [
      "krung-thon-buri-gold",
      "G1",
      "Krung Thon Buri",
      "กรุงธนบุรี",
      280,
      940,
      "gold",
    ],
    [
      "charoen-nakhon",
      "G2",
      "Charoen Nakhon",
      "เจริญนคร",
      285,
      820,
      "gold",
      "icon",
    ],
    ["khlong-san", "G3", "Khlong San", "คลองสาน", 242, 750, "gold"],
  ],
};

/** Primary BTS sequences, transformed into the existing north-up design map.
 * N6 is intentionally absent (no operating station). E5 is now represented
 * above the same Sukhumvit road controls as the reconstructed EM District. */
export function createRailNetwork(d: District): RailNetwork {
  const lines: RailLine[] = [];
  const nodes=new Map(d.nodes.map(n=>[n.id,n]));
  const anchor=(stop:Stop,id:LineId)=>{
    const corridors=id==="sukhumvit"?(stop[1].startsWith("N")?["phaya"]:["old_siam","sukhumvit","sukhumvit-east"]):id==="silom"?["old_siam","ratchadamri","silom","narathiwas","sathorn","taksin","krung_thon_buri"]:[];
    const p=toWorld([stop[4],stop[5]]);
    if(!corridors.length)return p;
    const candidates=d.roads.filter(r=>corridors.includes(r.corridor??"")).map(r=>distanceToSegment(p,nodes.get(r.a)!,nodes.get(r.b)!));
    return candidates.reduce((a,b)=>a.distance<b.distance?a:b).point;
  };
  for (const id of ["sukhumvit", "silom", "gold"] as const) {
    const controls: Point[] = [];
    for (const stop of stops[id]) {
      // N3 is south of the monument. The real guideway bends around the west
      // edge of the traffic circle; it must not cut through the 50m memorial.
      if (id === "sukhumvit" && stop[0] === "victory-monument")
        controls.push(toWorld([725, 202]), toWorld([696, 211]), toWorld([692, 231]), toWorld([699, 254]));
      if (id === "sukhumvit" && stop[0] === "siam")
        controls.push(toWorld([644,442]),toWorld([645,455]),toWorld([660,455]),toWorld([680,455]));
      if(id === "sukhumvit" && stop[0] === "chit-lom")controls.push(toWorld([750,455]),toWorld([790,455]),toWorld([810,455]));
      if(id === "sukhumvit" && stop[0] === "phrom-phong") controls.push(toWorld([...MASTER_PLAN.sukhumvit[3]]));
      if (id === "silom" && stop[0] === "ratchadamri")
        controls.push(toWorld([750, 455]), toWorld([792,455]),toWorld([810,475]));
      if (id === "silom" && stop[0] === "sala-daeng")
        controls.push(toWorld([750, 650]), toWorld([766, 763]));
      if (id === "silom" && stop[0] === "chong-nonsi")
        controls.push(toWorld([650, 875]));
      if (id === "silom" && stop[0] === "saint-louis")
        controls.push(toWorld([680, 935]));
      if (id === "silom" && stop[0] === "krung-thon-buri")
        controls.push(toWorld([320, 965]));
      if (id === "gold" && stop[0] === "charoen-nakhon")
        controls.push(toWorld([298, 915]), toWorld([295, 866]));
      controls.push(anchor(stop,id));
    }
    const first = controls[0]!,
      second = controls[1]!,
      last = controls.at(-1)!,
      penultimate = controls.at(-2)!;
    const extend = (a: Point, b: Point) => {
      const len = Math.hypot(a.x - b.x, a.z - b.z);
      return {
        x: a.x + ((a.x - b.x) / len) * 70,
        z: a.z + ((a.z - b.z) / len) * 70,
      };
    };
    controls.unshift(extend(first, second));
    controls.push(extend(last, penultimate));
    // A free Catmull spline overshoots a straight street before/after turns.
    // At Siam that put the two lines' side-by-side tracks into each other.
    // Tangential quadratic corner fillets stay inside the control polyline's
    // convex corridor, retain true straight sections and have continuous turns.
    const curve = new T.CurvePath<T.Vector3>();
    let previous=new T.Vector3(controls[0]!.x,0,controls[0]!.z);
    for(let i=1;i<controls.length-1;i++){
      const p=new T.Vector3(controls[i]!.x,0,controls[i]!.z),
        before=new T.Vector3(controls[i-1]!.x,0,controls[i-1]!.z),
        after=new T.Vector3(controls[i+1]!.x,0,controls[i+1]!.z),
        trim=Math.min(24,p.distanceTo(before)*.24,p.distanceTo(after)*.24),
        entry=p.clone().add(before.sub(p).normalize().multiplyScalar(trim)),
        leave=p.clone().add(after.sub(p).normalize().multiplyScalar(trim));
      if(previous.distanceTo(entry)>.001)curve.add(new T.LineCurve3(previous,entry));
      curve.add(new T.QuadraticBezierCurve3(entry,p,leave));previous=leave;
    }
    curve.add(new T.LineCurve3(previous,new T.Vector3(last.x,0,last.z)));
    curve.arcLengthDivisions = controls.length * 160;
    curve.updateArcLengths();
    const count = Math.ceil(curve.getLength() / 5),
      samples: RailSample[] = [];
    let length = 0;
    for (let i = 0; i <= count; i++) {
      const v = curve.getPointAt(i / count),
        tan = curve.getTangentAt(i / count);
      if (i)
        length += Math.hypot(v.x - samples[i - 1]!.x, v.z - samples[i - 1]!.z);
      samples.push({
        x: v.x,
        z: v.z,
        distance: length,
        tx: tan.x,
        tz: tan.z,
        y: id === "gold" ? 12 : 13,
      });
    }
    const stations = stops[id].map(
      ([station, code, name, thai, x, z, family = "side", landmark, mrt]) => {
        const p = anchor([station,code,name,thai,x,z],id),
          near = samples.reduce((best, s) =>
            Math.hypot(s.x - p.x, s.z - p.z) <
            Math.hypot(best.x - p.x, best.z - p.z)
              ? s
              : best,
          );
        return {
          x: near.x,
          z: near.z,
          id: station,
          code,
          name,
          thai,
          line: id,
          distance: near.distance,
          yaw: Math.atan2(near.tx, near.tz),
          family,
          length: family === "siam" ? 94 : id === "gold" ? 45 : 72,
          landmark,
          mrt,
          interchange:
            station === "siam"
              ? "siam"
              : station.startsWith("krung-thon-buri")
                ? "krung-thon-buri"
                : undefined,
        } satisfies RailStation;
      },
    );
    lines.push({
      id,
      name:
        id === "gold"
          ? "Gold Line"
          : id === "silom"
            ? "BTS Silom Line"
            : "BTS Sukhumvit Line",
      color: id === "gold" ? "#e5b64d" : id === "silom" ? "#168a70" : "#8dcc58",
      stations,
      samples,
      length,
      continuation:
        id === "sukhumvit"
          ? ["Toward Khu Khot", "Toward Kheha (beyond Phrom Phong)"]
          : id === "silom"
            ? ["National Stadium terminus", "Toward Bang Wa"]
            : ["Krung Thon Buri terminus", "Khlong San terminus"],
    });
  }
  return { lines, supports: [], removedParcels: 0 };
}

/** Allocation-free distance interpolation; callers retain their own output. */
export function sampleRail(
  line: RailLine,
  distance: number,
  out: RailSample,
  offset = 0,
  direction = 1,
) {
  const ds = Math.max(0, Math.min(line.length, distance));
  let lo = 0,
    hi = line.samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (line.samples[mid]!.distance < ds) lo = mid;
    else hi = mid;
  }
  const a = line.samples[lo]!,
    b = line.samples[hi]!,
    t = (ds - a.distance) / Math.max(0.0001, b.distance - a.distance);
  const tx = a.tx + (b.tx - a.tx) * t,
    tz = a.tz + (b.tz - a.tz) * t,
    len = Math.hypot(tx, tz);
  out.tx = tx / len;
  out.tz = tz / len;
  out.x = a.x + (b.x - a.x) * t + out.tz * offset;
  out.z = a.z + (b.z - a.z) * t - out.tx * offset;
  out.distance = ds;
  out.y = line.id === "gold" ? 12 : 13;
  const siam = line.stations.find((s) => s.id === "siam");
  if (siam) {
    const fade = Math.max(
      0,
      Math.min(1, (SIAM_JUNCTION.gradeApproach - Math.abs(ds - siam.distance)) / SIAM_JUNCTION.gradeRun),
    );
    // Both directions meet at the same elevation in the terminal crossover.
    const runout = Math.max(0, Math.min(1, (ds - 80) / 55, (line.length - ds - 80) / 55));
    if (direction < 0) out.y += 6 * fade * runout;
  }
  return out;
}

export function reserveRailCorridors(d: District) {
  const net = d.transit!,
    nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const samples = net.lines.flatMap((l) =>
    l.samples.filter((_, i) => i % 2 === 0),
  );
  const removed = new Set(
    d.buildings.filter(
      (b) => b.height > 9 && samples.some((p) => obstacleDistance(p, b) < 6),
    ),
  );
  for (const s of net.lines.flatMap((l) => l.stations)) {
    const box: Obstacle = stationEnvelope(s);
    for (const b of d.buildings)
      if (b.height > 7 && orientedFootprintsOverlap(b, box, 1)) removed.add(b);
  }
  net.removedParcels = removed.size;
  d.buildings = d.buildings.filter((b) => !removed.has(b));
  d.obstacles = d.obstacles.filter((b) => !removed.has(b));
  const clear = (p: Point, r = 1.5) =>
    !blockedByRiver(d, p, r) &&
    d.roads.every(
      (q) =>
        distanceToSegment(p, nodes.get(q.a)!, nodes.get(q.b)!).distance >
        q.width / 2 + r + 1,
    ) &&
    d.obstacles.every((o) => obstacleDistance(p, o) > r + 1);
  for (const line of net.lines)
    for (let distance = 18; distance < line.length; distance += 34) {
      const s: RailSample = { x: 0, z: 0, tx: 0, tz: 0, distance: 0, y: 0 };
      sampleRail(line, distance, s);
      // Side cantilevers put solid columns OUTSIDE live lanes and water. Span
      // concrete bears the guideway across intersections/river without fake piers.
      for (const arm of [0, 15, -15, 20, -20, 25, -25]) {
        const p = { x: s.x + s.tz * arm, z: s.z - s.tx * arm };
        if (!clear(p)) continue;
        const support = {
          ...p,
          yaw: Math.atan2(s.tx, s.tz),
          height: s.y - 1.4,
          arm: -arm,
          line: line.id,
        };
        net.supports.push(support);
        d.obstacles.push({
          ...p,
          w: 1.8,
          d: 2.1,
          yaw: support.yaw,
          height: support.height,
          color: "#8e9b9b",
          environmentId: `rail-support:${line.id}:${distance}`,
        });
        break;
      }
    }
  // Taksin's dedicated rail crossing: portal piers in water/embankment, outside
  // both vehicle lanes. Underwater footings ground the bridge; the main channel
  // span remains clear for the river boats.
  for (const x of [-660, -540, -290])
    for (const side of [-1, 1]) {
      const p = { x, z: 1460 + side * 16 };
      if (
        d.roads.some(
          (r) =>
            distanceToSegment(p, nodes.get(r.a)!, nodes.get(r.b)!).distance <
            r.width / 2 + 2,
        )
      )
        continue;
      net.supports.push({
        ...p,
        yaw: Math.PI / 2,
        height: 11.6,
        arm: side * 16,
        line: "silom",
        water: true,
      });
      d.obstacles.push({
        ...p,
        w: 1.8,
        d: 2.1,
        yaw: Math.PI / 2,
        height: 11.6,
        color: "#8e9b9b",
        environmentId: `rail-taksin-pier:${x}:${side}`,
      });
    }
  const seen = new Set<string>();
  for (const s of net.lines.flatMap((l) => l.stations)) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    s.entrances = [];
    const c = Math.cos(s.yaw),
      sn = Math.sin(s.yaw);
    for (const side of [-1, 1]) {
      for (const along of [-s.length / 2 - 13, s.length / 2 + 13, 0]) {
        const p = {
            x:
              s.x +
              c * side * (s.id === "saphan-taksin" ? 28 : 18) +
              sn * along,
            z:
              s.z -
              sn * side * (s.id === "saphan-taksin" ? 28 : 18) +
              c * along,
          },
          center = { x: p.x + sn * 6, z: p.z + c * 6 };
        const footprint: Obstacle = {
          ...center,
          yaw: s.yaw,
          w: 3,
          d: 13,
          height: 7,
          color: "#bcc0b5",
          environmentId: `rail-stairs:${s.id}:${side}`,
        };
        if (
          blockedByRiver(d, p, 3) ||
          d.roads.some(
            (r) =>
              distanceToSegment(center, nodes.get(r.a)!, nodes.get(r.b)!)
                .distance <
              r.width / 2 + 8,
          )
        )
          continue;
        if (
          d.obstacles.some(
            (o) =>
              !d.buildings.includes(o) &&
              orientedFootprintsOverlap(o, footprint, 2),
          )
        )
          continue;
        const hidden = new Set(
          d.buildings.filter((b) => orientedFootprintsOverlap(b, footprint, 2)),
        );
        net.removedParcels += hidden.size;
        d.buildings = d.buildings.filter((b) => !hidden.has(b));
        d.obstacles = d.obstacles.filter((b) => !hidden.has(b));
        s.entrances.push({ ...p, yaw: s.yaw });
        d.obstacles.push(footprint);
        break;
      }
    }
  }
}
