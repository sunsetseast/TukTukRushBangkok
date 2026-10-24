import assert from "node:assert/strict";
import fs from "node:fs";
import type { RoadNode } from "../src/game/types";
import type { VehicleContact } from "../src/game/vehicle";
import { lanePoint } from "../src/game/traffic";
Object.assign(globalThis, {
  window: { addEventListener() {}, removeEventListener() {} },
  document: { addEventListener() {}, removeEventListener() {}, hidden: false },
});
const { GameEngine } = await import("../src/game/engine");
const { routeFromPoint } = await import("../src/game/bangkok/world");
let contacts: VehicleContact[] = [];
const e = new GameEngine({
    seed: 26,
    trafficSeed: process.env.CHINATOWN_TRAFFIC_SEED
      ? Number(process.env.CHINATOWN_TRAFFIC_SEED)
      : undefined,
    observeContact: (c) => contacts.push(c),
  }),
  d = e.model.district,
  nodes = new Map(d.nodes.map((n) => [n.id, n]));
const stops = new Map<string, RoadNode>();
for (const l of d.landmarks)
  if (l.accessNode) stops.set(l.id!, nodes.get(l.accessNode)!);
const way = (id: string, corridor: string, x: number, y: number) => {
  const ids = new Set(
    d.roads.filter((r) => r.corridor === corridor).flatMap((r) => [r.a, r.b]),
  );
  const p = d.nodes
    .filter((n) => ids.has(n.id))
    .sort(
      (a, b) =>
        Math.hypot(a.x - (x - 500) * 4, a.z - (y - 600) * 4) -
        Math.hypot(b.x - (x - 500) * 4, b.z - (y - 600) * 4),
    )[0];
  assert(p, id + " has a real road");
  stops.set(id, p);
};
way("yaowarat-east", "yaowarat", 533, 581);
way("yaowarat-west", "yaowarat", 395, 520);
way("ratchawong", "ratchawong", 421, 552);
way("mangkon", "mangkon", 454, 574);
way("plaeng-nam", "plaeng-nam", 498, 523);
way("song-wat", "songwat", 458, 637);
way("talat-noi", "wanit-2-south", 465, 730);
way("bang-rak", "charoen_s", 535, 835);
way("memorial-east", "memorial", 330, 600);
if(process.env.BANG_RAK_GEOGRAPHY_ROUTES==="1"){
 way("si-phraya-east","si-phraya",536.38,795);
 way("si-phraya-west","si-phraya",458.75,805.5);
 way("captain-bush-bend","charoen-krung-30",460.5,812.5);
}
const pairs = process.env.BANG_RAK_GEOGRAPHY_ROUTES==="1" ? [
 ["river-city","si-phraya-east"],["si-phraya-east","river-city"],
 ["captain-bush-bend","grand-postal"],["grand-postal","captain-bush-bend"],
 ["captain-bush-bend","river-city"],["river-city","captain-bush-bend"],
] : process.env.BANG_RAK_ROUTES === "1" ? [
 ["river-city","grand-postal"],["grand-postal","river-city"],["grand-postal","warehouse-30"],["warehouse-30","grand-postal"],["warehouse-30","oriental"],["oriental","warehouse-30"],["grand-postal","oriental"],["oriental","grand-postal"],
] : [
  ["yaowarat-east", "yaowarat-west"],
  ["gate", "traimit"],
  ["hua", "gate"],
  ["yaowarat-east", "ratchawong"],
  ["yaowarat-east", "song-wat"],
  ["song-wat", "talat-noi"],
  ["talat-noi", "river-city"],
  ["river-city", "bang-rak"],
  ["yaowarat-east", "memorial-east"],
  ["yaowarat-east", "icon"],
  ["yaowarat-east", "pho"],
  ["yaowarat-east", "paragon"],
  ["plaeng-nam", "mangkon"],
  ["wat-mangkon", "holy-rosary"],
];
const results: any[] = [],
  traffic = process.env.CHINATOWN_TRAFFIC === "1",
  legal = process.env.CHINATOWN_LEGAL === "1",
  lanes = process.env.CHINATOWN_LANES === "1" || legal;
for (const [from, to] of pairs.filter(
  (p) =>
    !process.env.CHINATOWN_ROUTE || p.join(">") === process.env.CHINATOWN_ROUTE,
)) {
  e.start("free");
  if (!traffic) e.model.traffic.length = 0;
  const a = stops.get(from!)!,
    b = stops.get(to!)!,
    full = routeFromPoint(d, a, b);
  assert(full.length > 1, from + ">" + to + " connected");
  for (let i = 1; i < full.length; i++)
    assert(
      d.roads.some(
        (r) =>
          (r.a === full[i - 1]!.id && r.b === full[i]!.id) ||
          (!r.oneWay && r.b === full[i - 1]!.id && r.a === full[i]!.id),
      ),
      "Every planned edge obeys its real one-way rule",
    );
  const signalPlan = full.slice(0, -1).map((a, i) => {
    const b = full[i + 1]!,
      r = d.roads.find(
        (r) =>
          (r.a === a.id && r.b === b.id) ||
          (!r.oneWay && r.b === a.id && r.a === b.id),
      )!,
      incident = d.roads.filter(
        (r) => !r.noTraffic && (r.a === b.id || r.b === b.id),
      );
    return {
      signal:
        !r.noTraffic &&
        !r.roundabout &&
        incident.length >= 3 &&
        !incident.some((r) => r.roundabout),
      horizontal: Math.abs(b.x - a.x) > Math.abs(b.z - a.z),
    };
  });
  let points = full;
  if (lanes)
    points = full.map((p, i) => {
      const offsets = [];
      for (const j of [i - 1, i])
        if (j >= 0 && j < full.length - 1) {
          const u = full[j]!,
            v = full[j + 1]!,
            r = d.roads.find(
              (r) =>
                (r.a === u.id && r.b === v.id) ||
                (!r.oneWay && r.b === u.id && r.a === v.id),
            )!;
          offsets.push(lanePoint(u, v, r, j === i ? 0 : 1));
        }
      return {
        ...p,
        x: offsets.reduce((n, p) => n + p.x, 0) / offsets.length,
        z: offsets.reduce((n, p) => n + p.z, 0) / offsets.length,
      };
    });
  const path = points.slice(1),
    start = points[0]!,
    end = points.at(-1)!;
  Object.assign(e.model.player, {
    x: start.x,
    z: start.z,
    heading: Math.atan2(path[0]!.x - start.x, path[0]!.z - start.z),
    speed: 0,
    collision: 0,
  });
  if (legal && traffic) {
    e["trafficSystem"].reset();
    e.model.traffic = e["trafficSystem"].create(e.model.player);
    assert.equal(
      e.model.traffic.length,
      38,
      "Legal replay retains the full production traffic population",
    );
    assert(
      e.model.traffic.every(
        (car) => Math.hypot(car.x - start.x, car.z - start.z) > 8,
      ),
      "Initial traffic uses production spawn clearance at the selected stop",
    );
  }
  e.model.mission = {
    pickup: start,
    destination: end,
    passenger: "Chinatown route certification",
    limit: 100000,
  };
  Object.assign(e.model.snapshot, {
    stage: "delivery",
    target: end,
    tripTime: 100000,
    boarding: 0,
  });
  let index = 0,
    metres = 0,
    frames = 0,
    indicatorFrames = 0,
    encounterCount = 0;
  const lastTrafficContact = new Map<number, number>();
  const physical = {
      static: 0,
      prop: 0,
      bridge: 0,
      traffic: 0,
      water: 0,
      boundary: 0,
    },
    events: any[] = [],
    trace: any[] = [];
  for (
    let step = 0;
    step < 100000 && e.model.snapshot.deliveries === 0;
    step++
  ) {
    const p = e.model.player;
    let q = path[index]!,
      distance = Math.hypot(q.x - p.x, q.z - p.z);
    while (distance < 5 && index < path.length - 1) {
      q = path[++index]!;
      distance = Math.hypot(q.x - p.x, q.z - p.z);
    }
    const angle = Math.atan2(q.x - p.x, q.z - p.z) - p.heading,
      error = Math.atan2(Math.sin(angle), Math.cos(angle)),
      last = index === path.length - 1,
      stop = last && distance < 7.3,
      speed = last && distance < 20 ? 4 : Math.abs(error) > 0.35 ? 5 : 10;
    // The historical matrix follows graph centres without yielding, so on a
    // two-way street it can sideswipe a parked left-lane taxi. Keep that matrix
    // unchanged; the legal replay uses left lanes and normal hazard braking.
    const fx = Math.sin(p.heading),
      fz = Math.cos(p.heading);
    const signalRed =
      legal &&
      signalPlan[index]!.signal &&
      e.intersectionHorizontalGreen !== signalPlan[index]!.horizontal;
    const stopLight = signalRed && distance < 16 && distance > 7;
    const hazard =
      stopLight ||
      (legal &&
        e.model.traffic.some((car) => {
          const dx = car.x - p.x,
            dz = car.z - p.z,
            ahead = dx * fx + dz * fz,
            side = Math.abs(dx * fz - dz * fx);
          if (
            ahead > 0 &&
            ahead < 6 + Math.max(0, p.speed) * 0.8 &&
            side < 3.35
          )
            return true;
          if (car.speed < 0.1 && side > 3.35) return false;
          const vx = Math.sin(car.heading) * car.speed - fx * p.speed,
            vz = Math.cos(car.heading) * car.speed - fz * p.speed,
            vv = vx * vx + vz * vz;
          const t =
            vv > 0.1
              ? Math.max(0, Math.min(1.3, -(dx * vx + dz * vz) / vv))
              : 0;
          return (
            ahead > 1 &&
            Math.hypot(dx, dz) < 20 &&
            dx * vx + dz * vz < 0 &&
            Math.hypot(dx + vx * t, dz + vz * t) < 4.3
          );
        }));
    Object.assign(e.model.input, {
      steer: stop ? 0 : Math.max(-1, Math.min(1, -error * 2.3)),
      gas: !hazard && !stop && p.speed < speed,
      brake: stop || hazard ? p.speed > 0.4 : p.speed > speed + 0.5,
    });
    const x = p.x,
      z = p.z;
    contacts = [];
    e.update(1 / 60);
    metres += Math.hypot(p.x - x, p.z - z);
    frames++;
    if (p.collision) indicatorFrames++;
    const categories = new Set<keyof typeof physical>();
    for (const c of contacts) {
      const id = c.obstacle?.environmentId ?? c.obstacle?.landmarkId ?? "",
        kind =
          c.kind !== "static"
            ? c.kind
            : id.startsWith("bridge-rail:")
              ? "bridge"
              : c.obstacle?.artRole === "furniture"
                ? "prop"
                : "static";
      categories.add(kind);
      if (kind === "traffic" && c.trafficId !== undefined) {
        const last = lastTrafficContact.get(c.trafficId);
        if (last === undefined || step - last > 60) encounterCount++;
        lastTrafficContact.set(c.trafficId, step);
      }
      if (events.length < 60)
        events.push({
          frame: step,
          kind,
          id,
          x: c.x,
          z: c.z,
          trafficId: c.trafficId,
          player: { x: p.x, z: p.z, heading: p.heading, speed: p.speed },
          npc:
            c.trafficId === undefined
              ? undefined
              : { ...e.model.traffic.find((t) => t.id === c.trafficId) },
        });
    }
    categories.forEach((k) => physical[k]++);
    if (step % 30 === 0) trace.push({ x: p.x, z: p.z });
  }
  const r = {
    id: from + ">" + to,
    complete: e.model.snapshot.deliveries === 1,
    final: {
      player: { ...e.model.player },
      traffic: e.model.traffic.filter(
        (c) => Math.hypot(c.x - e.model.player.x, c.z - e.model.player.z) < 30,
      ),
      index,
      path: path.slice(Math.max(0, index - 1), index + 2),
    },
    metres: Math.round(metres),
    frames,
    indicatorFrames,
    physical,
    encounters: encounterCount,
    events,
    trace,
  };
  results.push(r);
  console.log(JSON.stringify({ ...r, events: undefined, trace: undefined }));
}
e.dispose();
const report = {
  pass: results.every(
    (r) =>
      r.complete &&
      (!legal || r.physical.traffic === 0) &&
      r.physical.static +
        r.physical.prop +
        r.physical.bridge +
        r.physical.water +
        r.physical.boundary ===
        0,
  ),
  traffic,
  trafficVehicles: traffic ? e.model.traffic.length : 0,
  driverProtocol: legal
    ? "left-lane/yield/two-phase-signals-v1"
    : "historical graph guidance",
  lanes,
  legal,
  seed: 26,
  trafficSeed: Number(process.env.CHINATOWN_TRAFFIC_SEED ?? 982),
  noMidRouteTeleports: true,
  method:
    "Each independent journey begins at a real road stop; all travel, turns and arrivals use the unchanged production controller at 60Hz.",
  results,
};
fs.writeFileSync(
  new URL(
    process.env.CHINATOWN_OUTPUT ??
      `../../../docs/qa/chinatown-reconstruction/${lanes ? "left-lane" : traffic ? "traffic" : "static"}-routes.json`,
    import.meta.url,
  ),
  JSON.stringify(report, null, 2),
);
assert(
  report.pass,
  "All Chinatown journeys must complete with zero static-world contacts; traffic contacts reported separately",
);
