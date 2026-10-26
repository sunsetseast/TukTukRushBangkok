import type {
  District,
  Point,
  RoadNode,
  WorldNavigation,
  DrivingSurface,
} from "../../types";
import type { GeographicDataset, GeographicRail } from "./dataset";
import { distanceToSegment } from "../../world";
import { VEHICLE_COLLISION_RADIUS } from "../../vehicleEnvelope";
import { inRiverWater } from "../waterGeometry";

export type GameplayMetadata = Pick<
  GeographicDataset,
  "crs" | "origin" | "bounds" | "chunks" | "waterUnion"
> & {
  schema: 2;
  ways: { id: string; name: string; thai?: string }[];
  rail: Pick<GeographicRail, "catalog" | "stations" | "interchanges"> & {
    transfers: {
      from: string;
      to: string;
      kind: string;
      sourceAreas: string[];
      sharedMembers: string[];
    }[];
  };
  decodedBytes: number;
  nodeCount: number;
  edgeCount: number;
  sourceSha256: string;
};
async function decoded(url: string) {
  const r = await fetch(url);
  if (!r.ok || !r.body) throw Error(`Geography unavailable: ${r.status}`);
  return r.headers.get("content-encoding") === "gzip"
    ? r
    : new Response(r.body.pipeThrough(new DecompressionStream("gzip")));
}
export async function loadGameplayGeography() {
  const base = `${import.meta.env.BASE_URL}assets/geography/`;
  const [metadata, buffer] = await Promise.all([
    decoded(base + "gameplay.v2.json.gz").then((r) => r.json()),
    decoded(base + "navigation.v2.bin.gz").then((r) => r.arrayBuffer()),
  ]);
  return new GeographicNetwork(metadata, buffer);
}
class Heap {
  private values: { id: number; cost: number }[] = [];
  push(id: number, cost: number) {
    const v = { id, cost },
      a = this.values;
    let i = a.length;
    a.push(v);
    while (i) {
      const parent = (i - 1) >> 1;
      if (a[parent]!.cost <= cost) break;
      a[i] = a[parent]!;
      i = parent;
    }
    a[i] = v;
  }
  pop() {
    const a = this.values,
      first = a[0];
    if (!first) return;
    const v = a.pop()!;
    if (a.length) {
      let i = 0;
      while (i * 2 + 1 < a.length) {
        let k = i * 2 + 1;
        if (k + 1 < a.length && a[k + 1]!.cost < a[k]!.cost) k++;
        if (a[k]!.cost >= v.cost) break;
        a[i] = a[k]!;
        i = k;
      }
      a[i] = v;
    }
    return first;
  }
}
type Snap = {
  edge: number;
  point: Point;
  distance: number;
  heading: number;
  height: number;
  name: string;
  thai?: string;
};
/** One packed global graph also serves indexed physical-surface and street-name queries.
 * No District copy of hundreds of thousands of nodes/road objects is created. */
export class GeographicNetwork implements WorldNavigation, DrivingSurface {
  readonly x: Float32Array;
  readonly z: Float32Array;
  readonly y: Float32Array;
  readonly a: Uint32Array;
  readonly b: Uint32Array;
  readonly width: Float32Array;
  readonly way: Uint32Array;
  readonly components: Uint32Array;
  readonly offsets: Uint32Array;
  readonly incident: Uint32Array;
  private cells = new Map<string, Uint32Array>();
  private costs: Float64Array;
  private parent: Int32Array;
  private seen: Uint32Array;
  private stamp = 0;
  private water: District;
  private waterCells = new Map<string, number[]>();
  private cached?: {
    edge: number;
    target: number;
    start: number;
    tail: Point[];
  };
  stops: RoadNode[] = [];
  height = 0;
  queries = 0;
  examined = 0;
  constructor(
    readonly metadata: GameplayMetadata,
    readonly buffer: ArrayBuffer,
  ) {
    const h = new Uint32Array(buffer, 0, 4),
      n = h[1]!,
      e = h[2]!;
    if (
      h[0] !== 0x47454f32 ||
      h[3] !== 1 ||
      metadata.schema !== 2 ||
      metadata.crs !== "EPSG:32647" ||
      metadata.origin[0] !== 660000 ||
      metadata.origin[1] !== 1520000 ||
      metadata.nodeCount !== n ||
      metadata.edgeCount !== e ||
      buffer.byteLength !== 16 + 12 * n + 16 * e
    )
      throw Error("Invalid geographic gameplay frame");
    let o = 16;
    const f = (length: number) => {
        const a = new Float32Array(buffer, o, length);
        o += length * 4;
        return a;
      },
      u = (length: number) => {
        const a = new Uint32Array(buffer, o, length);
        o += length * 4;
        return a;
      };
    this.x = f(n);
    this.z = f(n);
    this.y = f(n);
    this.a = u(e);
    this.b = u(e);
    this.width = f(e);
    this.way = u(e);
    this.components = Uint32Array.from({ length: n }, (_, i) => i);
    const root = (i: number): number => {
      while (this.components[i] !== i) {
        this.components[i] = this.components[this.components[i]!]!;
        i = this.components[i]!;
      }
      return i;
    };
    for (let i = 0; i < e; i++)
      this.components[root(this.b[i]!)] = root(this.a[i]!);
    for (let i = 0; i < n; i++) this.components[i] = root(i);
    this.offsets = new Uint32Array(n + 1);
    const buckets = new Map<string, number[]>();
    for (let i = 0; i < e; i++) {
      const a = this.a[i]!,
        b = this.b[i]!;
      if (
        a >= n ||
        b >= n ||
        this.way[i]! >= metadata.ways.length ||
        this.width[i]! < VEHICLE_COLLISION_RADIUS * 2
      )
        throw Error("Corrupt geographic road segment");
      this.offsets[a + 1]!++;
      this.offsets[b + 1]!++;
      const m = this.width[i]! / 2 + VEHICLE_COLLISION_RADIUS;
      for (
        let x = Math.floor((Math.min(this.x[a]!, this.x[b]!) - m) / 128);
        x <= Math.floor((Math.max(this.x[a]!, this.x[b]!) + m) / 128);
        x++
      )
        for (
          let z = Math.floor((Math.min(this.z[a]!, this.z[b]!) - m) / 128);
          z <= Math.floor((Math.max(this.z[a]!, this.z[b]!) + m) / 128);
          z++
        ) {
          const key = `${x}:${z}`;
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key)!.push(i);
        }
    }
    for (let i = 1; i <= n; i++) this.offsets[i]! += this.offsets[i - 1]!;
    this.incident = new Uint32Array(e * 2);
    const cursor = this.offsets.slice();
    for (let i = 0; i < e; i++) {
      this.incident[cursor[this.a[i]!]!++] = i;
      this.incident[cursor[this.b[i]!]!++] = i;
    }
    for (const [k, v] of buckets) this.cells.set(k, Uint32Array.from(v));
    this.costs = new Float64Array(n);
    this.parent = new Int32Array(n);
    this.seen = new Uint32Array(n);
    const polygons = metadata.waterUnion.map((p) =>
      p.map((r) => r.map(([x, z]) => ({ x, z }))),
    );
    this.water = {
      nodes: [],
      roads: [],
      buildings: [],
      obstacles: [],
      landmarks: [],
      waterPolygons: polygons,
    };
    polygons.forEach((p, i) => {
      const ring = p[0]!;
      let minX = Infinity,
        minZ = Infinity,
        maxX = -Infinity,
        maxZ = -Infinity;
      for (const q of ring) {
        minX = Math.min(minX, q.x);
        maxX = Math.max(maxX, q.x);
        minZ = Math.min(minZ, q.z);
        maxZ = Math.max(maxZ, q.z);
      }
      for (let x = Math.floor(minX / 128); x <= Math.floor(maxX / 128); x++)
        for (let z = Math.floor(minZ / 128); z <= Math.floor(maxZ / 128); z++) {
          const k = `${x}:${z}`;
          if (!this.waterCells.has(k)) this.waterCells.set(k, []);
          this.waterCells.get(k)!.push(i);
        }
    });
  }
  private memoryBytes?: number;
  get allocatedBytes() {
    return (this.memoryBytes ??=
      this.buffer.byteLength +
      this.components.byteLength +
      this.offsets.byteLength +
      this.incident.byteLength +
      this.costs.byteLength +
      this.parent.byteLength +
      this.seen.byteLength +
      [...this.cells.values()].reduce((n, a) => n + a.byteLength, 0));
  }
  node(i: number): RoadNode {
    return { id: `geo:${i}`, x: this.x[i]!, z: this.z[i]! };
  }
  private snapEdge(i: number, p: Point): Snap {
    const a = this.a[i]!,
      b = this.b[i]!,
      q = distanceToSegment(p, this.node(a), this.node(b)),
      length = Math.hypot(this.x[b]! - this.x[a]!, this.z[b]! - this.z[a]!),
      t = length
        ? Math.hypot(q.point.x - this.x[a]!, q.point.z - this.z[a]!) / length
        : 0;
    return {
      edge: i,
      ...q,
      height: this.y[a]! * (1 - t) + this.y[b]! * t,
      heading: Math.atan2(this.x[b]! - this.x[a]!, this.z[b]! - this.z[a]!),
      ...this.metadata.ways[this.way[i]!]!,
    };
  }
  private nearby(p: Point, radius = 0) {
    const x = Math.floor(p.x / 128),
      z = Math.floor(p.z / 128),
      result: number[] = [];
    for (let a = x - radius; a <= x + radius; a++)
      for (let b = z - radius; b <= z + radius; b++)
        for (const i of this.cells.get(`${a}:${b}`) ?? []) result.push(i);
    return result;
  }
  nearest(p: Point, atHeight = this.height): Snap {
    this.queries++;
    let best: Snap | undefined;
    for (let ring = 0; ring <= 8; ring++) {
      for (const i of this.nearby(p, ring)) {
        this.examined++;
        const q = this.snapEdge(i, p);
        if (Math.abs(q.height - atHeight) > 0.65) continue;
        if (!best || q.distance < best.distance) best = q;
      }
      // Search beyond the winning distance so a neighboring cell cannot be missed.
      if (best && best.distance < (ring ? ring * 128 : 1)) return best;
    }
    if (!best) throw Error("No physical road at this level");
    return best;
  }
  access(p: Point, connectedTo: RoadNode) {
    const component = this.components[Number(connectedTo.id.slice(4))];
    let best: Snap | undefined;
    for (const i of this.nearby(p, 2)) {
      if (this.components[this.a[i]!] !== component) continue;
      const q = this.snapEdge(i, p);
      if (Math.abs(q.height) > 0.01) continue;
      if (!best || q.distance < best.distance) best = q;
    }
    if (!best || best.distance > 200)
      throw Error("No connected source approach within 200m");
    return best;
  }
  surface(p: Point, previous = this.height) {
    let edge = -1,
      best = Infinity;
    for (const i of this.cells.get(
      `${Math.floor(p.x / 128)}:${Math.floor(p.z / 128)}`,
    ) ?? []) {
      const a = this.a[i]!,
        b = this.b[i]!,
        dx = this.x[b]! - this.x[a]!,
        dz = this.z[b]! - this.z[a]!,
        length2 = dx * dx + dz * dz;
      const t = length2
        ? Math.max(
            0,
            Math.min(
              1,
              ((p.x - this.x[a]!) * dx + (p.z - this.z[a]!) * dz) / length2,
            ),
          )
        : 0;
      const x = this.x[a]! + dx * t,
        z = this.z[a]! + dz * t,
        d2 = (p.x - x) ** 2 + (p.z - z) ** 2,
        margin = this.width[i]! / 2 - VEHICLE_COLLISION_RADIUS + 1e-4;
      if (
        d2 > margin * margin ||
        d2 >= best ||
        Math.abs(this.y[a]! * (1 - t) + this.y[b]! * t - previous) > 0.65
      )
        continue;
      edge = i;
      best = d2;
    }
    return edge < 0 ? undefined : this.snapEdge(edge, p);
  }
  private wet(p: Point) {
    const ids =
      this.waterCells.get(
        `${Math.floor(p.x / 128)}:${Math.floor(p.z / 128)}`,
      ) ?? [];
    for (const id of ids)
      if (
        inRiverWater(
          { ...this.water, waterPolygons: [this.water.waterPolygons![id]!] },
          p,
        )
      )
        return true;
    return false;
  }
  blocked(p: Point, _before: Point) {
    const s = this.surface(p);
    if (s) {
      this.height = s.height;
      return false;
    }
    if (this.height > 0.65) return true;
    const r = VEHICLE_COLLISION_RADIUS;
    for (const [dx, dz] of [
      [0, 0],
      [r, 0],
      [-r, 0],
      [0, r],
      [0, -r],
      [r * 0.707, r * 0.707],
      [-r * 0.707, r * 0.707],
      [r * 0.707, -r * 0.707],
      [-r * 0.707, -r * 0.707],
    ])
      if (this.wet({ x: p.x + dx!, z: p.z + dz! })) return true;
    this.height = 0;
    return false;
  }
  reset(p: Point) {
    this.height = 0;
    this.height = this.surface(p, 0)?.height ?? 0;
    this.cached = undefined;
  }
  private solve(
    p: Point,
    target: RoadNode,
  ):
    { snap: Snap; start: number; tail: Point[]; distance: number } | undefined {
    const goal = Number(target.id.slice(4));
    if (
      !target.id.startsWith("geo:") ||
      !Number.isInteger(goal) ||
      goal < 0 ||
      goal >= this.x.length
    )
      return;
    const snap = this.nearest(p),
      e = snap.edge;
    if (this.cached?.edge === e && this.cached.target === goal) {
      const c = this.cached;
      return {
        snap,
        start: c.start,
        tail: c.tail,
        distance: this.pathLength([p, snap.point, ...c.tail]),
      };
    }
    const heap = new Heap(),
      stamp = ++this.stamp;
    const heuristic = (i: number) =>
      Math.hypot(this.x[i]! - this.x[goal]!, this.z[i]! - this.z[goal]!);
    for (const i of [this.a[e]!, this.b[e]!]) {
      const cost = Math.hypot(
        this.x[i]! - snap.point.x,
        this.z[i]! - snap.point.z,
      );
      this.seen[i] = stamp;
      this.costs[i] = cost;
      this.parent[i] = -1;
      heap.push(i, cost + heuristic(i));
    }
    let found = false;
    for (let q = heap.pop(); q; q = heap.pop()) {
      const at = q.id;
      if (q.cost > this.costs[at]! + heuristic(at) + 1e-5) continue;
      if (at === goal) {
        found = true;
        break;
      }
      for (let k = this.offsets[at]!; k < this.offsets[at + 1]!; k++) {
        const edge = this.incident[k]!,
          to = this.a[edge] === at ? this.b[edge]! : this.a[edge]!;
        const cost =
          this.costs[at]! +
          Math.hypot(this.x[to]! - this.x[at]!, this.z[to]! - this.z[at]!);
        if (this.seen[to] !== stamp || cost < this.costs[to]! - 1e-8) {
          this.seen[to] = stamp;
          this.costs[to] = cost;
          this.parent[to] = at;
          heap.push(to, cost + heuristic(to));
        }
      }
    }
    if (!found) return;
    const chain: number[] = [];
    for (let i = goal; i !== -1; i = this.parent[i]!) chain.push(i);
    chain.reverse();
    const tail = chain.map((i) => this.node(i));
    this.cached = { edge: e, target: goal, start: chain[0]!, tail };
    return {
      snap,
      start: chain[0]!,
      tail,
      distance: this.pathLength([p, snap.point, ...tail]),
    };
  }
  private pathLength(points: Point[]) {
    let n = 0;
    for (let i = 1; i < points.length; i++)
      n += Math.hypot(
        points[i]!.x - points[i - 1]!.x,
        points[i]!.z - points[i - 1]!.z,
      );
    return n;
  }
  path(p: Point, target: RoadNode) {
    const r = this.solve(p, target);
    return r ? [p, r.snap.point, ...r.tail] : [];
  }
  distances(p: Point, targets: RoadNode[]) {
    const m = new Map<string, number>();
    for (const t of targets) {
      const r = this.solve(p, t);
      if (r) m.set(t.id, r.distance);
    }
    return m;
  }
}
