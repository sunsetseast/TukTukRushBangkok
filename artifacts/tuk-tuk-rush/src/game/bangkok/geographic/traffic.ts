import type { GeographicNetwork } from "./network";
import type { RuntimeTurnRestriction } from "./controlImport";

/** One lightweight, client-side simulated vehicle. World metres; no replay/save
 * state is changed. Traffic only uses the verified OSM source graph.
 */
export type GeographicTrafficKind = "taxi" | "car" | "motorcycle" | "tuktuk";
export type TrafficVehicle = {
  id: number;
  kind: GeographicTrafficKind;
  edge: number;
  from: number;
  to: number;
  progress: number;
  speed: number;
  x: number;
  z: number;
  y: number;
  heading: number;
  stoppedSeconds: number;
};
export type VerifiedApproachControl = {
  /** Node/edge IDs must be matched to a source-tagged OSM control; NEVER
   * derive signs or traffic lights merely from road geometry.
   */
  at: number;
  incomingEdge: number;
  kind: "stop" | "yield" | "signal";
  sourceId: string;
  /** Only verified phase schedules can be supplied. */
  cycleSeconds?: number;
  greenSeconds?: number;
  offsetSeconds?: number;
};
export type TrafficNetwork = Pick<GeographicNetwork,
  "x" | "z" | "y" | "a" | "b" | "width" | "way" | "directions" |
  "motorAllowed" | "offsets" | "incident" | "trafficEdgesNear">;
type Vector = {x: number; z: number};
const MAX_RADIUS = 265;
const SPAWN_RADIUS = 200;
const laneWidth = 1.05;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export function legalTrafficTraversal(net: TrafficNetwork, edge: number, from: number) {
  if (net.width[edge]! < 4.2 || !net.motorAllowed[net.way[edge]!]!) return false;
  const a = net.a[edge]!, b = net.b[edge]!, direction = net.directions[net.way[edge]!]!;
  return (from === a || from === b) &&
    (direction === 0 || (direction === 1 && from === a) || (direction === -1 && from === b));
}
export function leftSideTrafficPosition(net: TrafficNetwork, vehicle: TrafficVehicle) {
  const ax = net.x[vehicle.from]!, az = net.z[vehicle.from]!,
    bx = net.x[vehicle.to]!, bz = net.z[vehicle.to]!,
    dx = bx - ax, dz = bz - az,
    length = Math.hypot(dx, dz) || 1,
    t = clamp(vehicle.progress / length, 0, 1);
  // Local x east, z south; (dz, -dx) is the driver's LEFT.
  const side = Math.min(1.7, Math.max(.35, net.width[vehicle.edge]! / 2 - laneWidth));
  // Easing to the centerline at junctions avoids a discontinuity on turns.
  const easing = clamp(Math.min(vehicle.progress, length - vehicle.progress) / 4, 0, 1);
  return {
    x: ax + dx * t + dz / length * side * easing,
    z: az + dz * t - dx / length * side * easing,
    y: net.y[vehicle.from]! * (1 - t) + net.y[vehicle.to]! * t,
    heading: Math.atan2(dx, dz),
  };
}
export class GeographicTrafficSimulation {
  readonly vehicles: TrafficVehicle[] = [];
  readonly stats = { spawned: 0, removed: 0, blockedOncoming: 0, stoppedForControl: 0 };
  private seed: number;
  private nextId = 0;
  private elapsed = 0;
  private spawnAt = 0;
  private clock = 0;
  private controls: Map<string, VerifiedApproachControl>;
  private restrictions: Map<string, RuntimeTurnRestriction[]>;

  constructor(
    readonly network: TrafficNetwork,
    seed = 20261102,
    verifiedControls: VerifiedApproachControl[] = [],
    verifiedRestrictions: RuntimeTurnRestriction[] = [],
  ) {
    this.seed = seed >>> 0;
    this.controls = new Map();
    this.restrictions = new Map();
    for(const r of verifiedRestrictions) {
      if(!r.id || r.via<0 || r.via>=network.x.length ||
        r.fromWay<0 || r.toWay<0 ||
        r.fromWay>=network.motorAllowed.length ||
        r.toWay>=network.motorAllowed.length)
        throw Error("Invalid source-backed Bangkok turn restriction");
      const key=`${r.via}:${r.fromWay}`;
      const list=this.restrictions.get(key) ?? [];
      list.push(r);this.restrictions.set(key,list);
    }
    for (const c of verifiedControls) {
      if (!c.sourceId || c.at < 0 || c.at >= network.x.length ||
          c.incomingEdge < 0 || c.incomingEdge >= network.a.length ||
          (network.a[c.incomingEdge] !== c.at && network.b[c.incomingEdge] !== c.at))
        throw Error("Unverified or invalid Bangkok traffic control");
      if (c.kind === "signal" && !(c.cycleSeconds && c.greenSeconds &&
        c.cycleSeconds > c.greenSeconds && c.greenSeconds > 0))
        throw Error("A signal needs a verified, non-conflicting phase schedule");
      const key = `${c.at}:${c.incomingEdge}`;
      if (this.controls.has(key)) throw Error("Duplicate verified approach control");
      this.controls.set(key, c);
    }
  }
  private rand() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }
  private chooseKind(): GeographicTrafficKind {
    const n = this.rand();
    return n < .24 ? "taxi" : n < .56 ? "car" : n < .88 ? "motorcycle" : "tuktuk";
  }
  private length(v: Pick<TrafficVehicle, "from"|"to">) {
    return Math.hypot(this.network.x[v.from]! - this.network.x[v.to]!,
      this.network.z[v.from]! - this.network.z[v.to]!);
  }
  /** OSM turn restriction relations, not proximity-inferred junction rules. */
  private legalTurn(v: TrafficVehicle, nextEdge: number) {
    const fromWay=this.network.way[v.edge]!;
    const toWay=this.network.way[nextEdge]!;
    const restrictions=this.restrictions.get(`${v.to}:${fromWay}`) ?? [];
    if(restrictions.some(r => r.type==="no" && r.toWay===toWay))return false;
    const only=restrictions.filter(r=>r.type==="only");
    return !only.length || only.some(r=>r.toWay===toWay);
  }
  private pickNext(v: TrafficVehicle) {
    const net = this.network, at = v.to;
    const oldDx = net.x[v.to]! - net.x[v.from]!,
      oldDz = net.z[v.to]! - net.z[v.from]!,
      oldLen = Math.hypot(oldDx, oldDz) || 1;
    const choices: {edge: number; to: number; rank: number}[] = [];
    for (let i = net.offsets[at]!; i < net.offsets[at + 1]!; i++) {
      const e = net.incident[i]!;
      if (!legalTrafficTraversal(net, e, at) || !this.legalTurn(v,e)) continue;
      const to = net.a[e] === at ? net.b[e]! : net.a[e]!;
      // An ordinary AI car does not turn around in the middle of the street.
      if (to === v.from || to === at) continue;
      if (Math.abs(net.y[to]! - net.y[at]!) > 2) continue;
      const dx = net.x[to]! - net.x[at]!, dz = net.z[to]! - net.z[at]!,
        len = Math.hypot(dx, dz);
      if (len < 6) continue;
      const straight = (dx * oldDx + dz * oldDz) / (len * oldLen);
      choices.push({edge:e,to,rank:straight * 2 + this.rand() * 1.3});
    }
    if (!choices.length) return;
    choices.sort((a, b) => b.rank - a.rank);
    return choices[0]!;
  }
  private spawn(player: Vector) {
    const net = this.network;
    const edges = net.trafficEdgesNear(player, SPAWN_RADIUS);
    if (!edges.length) return;
    for (let tries = 0; tries < 20; tries++) {
      const e = edges[Math.floor(this.rand() * edges.length)]!,
        a = net.a[e]!, b = net.b[e]!;
      const from = net.directions[net.way[e]!] === -1 ? b :
        net.directions[net.way[e]!] === 1 ? a : this.rand() < .5 ? a : b;
      if (!legalTrafficTraversal(net, e, from)) continue;
      const to = from === a ? b : a, length = this.length({from, to});
      if (length < 12 || Math.abs(net.y[from]! - net.y[to]!) > 6) continue;
      const progress = length * (.2 + this.rand() * .6);
      const v: TrafficVehicle = {
        id: ++this.nextId, kind: this.chooseKind(), edge: e, from, to,
        progress, speed: 0, x: 0, z: 0, y: 0, heading: 0, stoppedSeconds: 0,
      };
      Object.assign(v, leftSideTrafficPosition(net, v));
      const distance = Math.hypot(v.x - player.x, v.z - player.z);
      if (distance < 38 || distance > SPAWN_RADIUS ||
          this.vehicles.some(other => Math.hypot(v.x - other.x, v.z - other.z) < 15))
        continue;
      this.vehicles.push(v);
      this.stats.spawned++;
      return;
    }
  }
  get simulationClockSeconds() { return this.clock; }
  private signalAllows(control: VerifiedApproachControl) {
    if (control.kind !== "signal") return true;
    const time = (this.clock + (control.offsetSeconds ?? 0)) % control.cycleSeconds!;
    return time < control.greenSeconds!;
  }
  update(delta: number, player: Vector, playing: boolean, quality: "low"|"medium" = "medium") {
    if (!playing) { this.vehicles.length = 0; this.elapsed = 0; this.spawnAt = 0; return; }
    const dt = clamp(delta, 0, .08);
    this.clock += dt;
    this.elapsed += dt;
    const max = quality === "low" ? 9 : 16;
    if (this.elapsed - this.spawnAt >= .75 && this.vehicles.length < max) {
      this.spawnAt = this.elapsed;
      this.spawn(player);
    }
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i]!, net = this.network, length = this.length(v),
        remainder = Math.max(0, length - v.progress);
      if (Math.hypot(v.x - player.x, v.z - player.z) > MAX_RADIUS) {
        this.vehicles.splice(i, 1); this.stats.removed++; continue;
      }
      // Contextual game-speed targets, NOT certified posted speed limits.
      let desired = v.kind === "motorcycle" ? 9 : v.kind === "tuktuk" ? 7 : 8;
      if (net.width[v.edge]! < 6) desired = Math.min(desired, 5.5);
      const control = this.controls.get(`${v.to}:${v.edge}`);
      // An explicit source-backed signal or stop sign is the only reason to
      // impose a traffic-control stop. Untagged nodes are never fake red lights.
      let stopForControl = false;
      if (control && remainder < 12) {
        if (control.kind === "signal" && !this.signalAllows(control)) stopForControl = true;
        if (control.kind === "stop" && v.stoppedSeconds < 1.2) stopForControl = true;
        if (control.kind === "yield") {
          const conflicting = this.vehicles.some(other =>
            other.id!==v.id && other.edge!==v.edge &&
            other.to===v.to && this.length(other)-other.progress < 20);
          if (conflicting) stopForControl = true;
        }
      }
      if (stopForControl) {
        const room = Math.max(0, remainder - 3.5);
        desired = Math.min(desired, Math.sqrt(2 * 5 * room));
        this.stats.stoppedForControl++;
      }
      // Same-direction following on this exact sourced edge. No teleporting,
      // overlapping traffic or racing through stopped queues.
      for (const other of this.vehicles) {
        if (other.id === v.id) continue;
        if (other.edge === v.edge && other.from === v.from &&
            other.progress > v.progress) {
          const gap = other.progress - v.progress - (other.kind === "motorcycle" ? 2 : 3.5);
          desired = Math.min(desired, Math.max(0, (gap - 4) * .8));
        }
      }
      // Yield to the player when directly ahead in this lane's corridor.
      const px = player.x - v.x, pz = player.z - v.z,
        forwardX = Math.sin(v.heading), forwardZ = Math.cos(v.heading),
        along = px * forwardX + pz * forwardZ,
        lateral = Math.abs(px * forwardZ - pz * forwardX);
      if (along > 0 && along < 12 && lateral < 2.3)
        desired = Math.min(desired, Math.max(0, (along - 6) * 1.2));
      // One vehicle at a time in each immediate junction conflict area.
      // This is a conservative collision proxy, NOT an imported signal phase.
      const approaches = net.offsets[v.to + 1]! - net.offsets[v.to]!;
      if (approaches >= 3 && remainder < 9) {
        const conflicts = this.vehicles.some(other => other.id !== v.id &&
          (other.to === v.to || other.from === v.to) &&
          (other.id < v.id && this.length(other) - other.progress < 9 ||
           other.from === v.to && other.progress < 6));
        if (conflicts) desired = Math.min(desired, Math.sqrt(2 * 5 * Math.max(0, remainder - 3.5)));
      }
      const accel = desired < v.speed ? 5 : 2.5;
      v.speed += clamp(desired - v.speed, -accel * dt, accel * dt);
      let movement = v.speed * dt;
      // STOP line must hold even during large frame-time spikes.
      if (stopForControl) movement = Math.min(movement, Math.max(0, remainder - 3.5));
      v.progress = Math.min(length, v.progress + movement);
      if (stopForControl && length - v.progress <= 3.6 && v.speed < .2)
        v.stoppedSeconds += dt;
      if (v.progress >= length - 1e-4) {
        const next = this.pickNext(v);
        if (!next) { this.vehicles.splice(i, 1); this.stats.removed++; continue; }
        const previous = v.to;
        v.from = previous; v.to = next.to; v.edge = next.edge;
        v.progress = 0; v.stoppedSeconds = 0;
      }
      Object.assign(v, leftSideTrafficPosition(net, v));
    }
  }
}
